/// <reference lib="es2022" />
import { NextResponse } from 'next/server';
import { getPgPool } from '../../../../lib/pg';
import { noteDatabaseFailure } from '../../../../lib/dbGuard';
import { getFirestore } from '../../../../../portal/lib/firebase-admin';
import {
  bookingCourtNameFromId,
  listMobileBookingInboxEntries,
} from '../../../../../portal/lib/bookingRealtimeSync';

const COURT_TYPES = ['Basketball AC', 'Basketball 3x3', 'Padel', 'Volleyball'] as const;
type BookedPayload = { booked: Record<string, Record<string, string[]>> };
type CacheEntry = { expiresAt: number; payload: BookedPayload };

const CACHE_TTL_MS = 10_000;
const globalCache = globalThis as unknown as { __bookedSlotsCache?: Map<string, CacheEntry> };

function getCache(): Map<string, CacheEntry> {
  if (!globalCache.__bookedSlotsCache) {
    globalCache.__bookedSlotsCache = new Map<string, CacheEntry>();
  }
  return globalCache.__bookedSlotsCache;
}

function withCacheHeaders(response: NextResponse, cacheHit: boolean) {
  response.headers.set('Cache-Control', 'public, max-age=5, s-maxage=5, stale-while-revalidate=15');
  response.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
  return response;
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeStr(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function parseFirestoreDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function resolveCourtType(data: Record<string, unknown>): (typeof COURT_TYPES)[number] | null {
  const direct =
    normalizeText(data.facilityArea) ||
    normalizeText(data.courtName) ||
    bookingCourtNameFromId(normalizeText(data.courtId));
  if (direct && (COURT_TYPES as readonly string[]).includes(direct)) {
    return direct as (typeof COURT_TYPES)[number];
  }
  return null;
}

function mergeBookedRange(
  booked: Record<string, Record<string, string[]>>,
  courtType: (typeof COURT_TYPES)[number],
  startTime: Date,
  endTime: Date,
) {
  const slot = new Date(startTime);
  while (slot.getTime() < endTime.getTime()) {
    const dateStr = toDateStr(slot);
    const timeStr = toTimeStr(slot);
    if (!booked[dateStr]) booked[dateStr] = {};
    if (!booked[dateStr][courtType]) booked[dateStr][courtType] = [];
    if (!booked[dateStr][courtType].includes(timeStr)) {
      booked[dateStr][courtType].push(timeStr);
    }
    slot.setTime(slot.getTime() + 60 * 60 * 1000);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get('startDate') || new Date().toISOString().slice(0, 10);
  let endDate = searchParams.get('endDate');
  if (!endDate) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + 30);
    endDate = toDateStr(d);
  }

  const key = `${startDate}:${endDate}`;
  const cache = getCache();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return withCacheHeaders(NextResponse.json(cached.payload), true);
  }

  try {
    if (!process.env.DATABASE_URL?.trim()) {
      const payload: BookedPayload = { booked: {} };
      return withCacheHeaders(NextResponse.json(payload), false);
    }
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const pool = getPgPool();
    const result = await pool.query<{
      facilityArea: string | null;
      startTime: Date;
      endTime: Date;
      status: string;
    }>(
      `
      SELECT "facilityArea", "startTime", "endTime", "status"
      FROM "Booking"
      WHERE "startTime" < $1
        AND "endTime" > $2
        AND "status" <> 'CANCELLED'
        AND "facilityArea" = ANY($3::text[])
      `,
      [end, start, [...COURT_TYPES]],
    );
    const rows = result.rows;

    const booked: Record<string, Record<string, string[]>> = {};
    for (const row of rows) {
      if (row.status === 'CANCELLED') continue;
      const courtType = row.facilityArea && (COURT_TYPES as readonly string[]).includes(row.facilityArea) ? row.facilityArea : null;
      if (!courtType) continue;

      const slotStart = new Date(row.startTime);
      const slotEnd = row.endTime ? new Date(row.endTime) : new Date(slotStart.getTime() + 60 * 60 * 1000);
      const slot = new Date(slotStart);

      while (slot.getTime() < slotEnd.getTime()) {
        const dateStr = toDateStr(slot);
        const timeStr = toTimeStr(slot);
        if (!booked[dateStr]) booked[dateStr] = {};
        if (!booked[dateStr][courtType]) booked[dateStr][courtType] = [];
        if (!booked[dateStr][courtType].includes(timeStr)) booked[dateStr][courtType].push(timeStr);
        slot.setTime(slot.getTime() + 60 * 60 * 1000);
      }
    }

    try {
      const firestore = getFirestore();
      const pendingEntries = await listMobileBookingInboxEntries({
        firestore,
        limit: 300,
      });
      for (const entry of pendingEntries) {
        const data = entry.data;
        if (data.dbImported === true) continue;
        const status = normalizeText(data.status).toUpperCase();
        if (['CANCELLED', 'CONFLICT', 'ERROR'].includes(status)) continue;

        const courtType = resolveCourtType(data);
        const startTime = parseFirestoreDateValue(data.startTime ?? data.startTimeIso);
        const endTime = parseFirestoreDateValue(data.endTime ?? data.endTimeIso);
        if (!courtType || !startTime || !endTime) continue;
        if (startTime.getTime() >= end.getTime() || endTime.getTime() <= start.getTime()) {
          continue;
        }
        mergeBookedRange(booked, courtType, startTime, endTime);
      }
    } catch (error) {
      console.warn('[booked-slots] firestore overlay skipped', error);
    }

    const payload: BookedPayload = { booked };
    cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
    return withCacheHeaders(NextResponse.json(payload), false);
  } catch (error) {
    noteDatabaseFailure('booked-slots.GET', error);
    console.error('[booked-slots] error', error);
    if (cached) return withCacheHeaders(NextResponse.json(cached.payload), true);
    const payload: BookedPayload = { booked: {} };
    return withCacheHeaders(NextResponse.json(payload), false);
  }
}

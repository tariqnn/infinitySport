/// <reference lib="es2022" />
import { NextResponse } from 'next/server';
import { getPgPool } from '../../../../lib/pg';
import { noteDatabaseFailure } from '../../../../lib/dbGuard';

type BlockedPayload = { blocked: Record<string, Record<string, string[]>> };
type CacheEntry = { expiresAt: number; payload: BlockedPayload };

const CACHE_TTL_MS = 15_000;
const globalCache = globalThis as unknown as { __blockedSlotsCache?: Map<string, CacheEntry> };

function getCache(): Map<string, CacheEntry> {
  if (!globalCache.__blockedSlotsCache) {
    globalCache.__blockedSlotsCache = new Map<string, CacheEntry>();
  }
  return globalCache.__blockedSlotsCache;
}

function withCacheHeaders(response: NextResponse, cacheHit: boolean) {
  response.headers.set('Cache-Control', 'public, max-age=10, s-maxage=10, stale-while-revalidate=20');
  response.headers.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
  return response;
}

function buildBlockedMap(
  rows: Array<{ dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }>,
): Record<string, Record<string, string[]>> {
  const blocked: Record<string, Record<string, string[]>> = {};
  for (const row of rows) {
    if (!row.isBlocked) continue;
    const day = (row.dayOfWeek || '').toUpperCase();
    if (!day) continue;
    if (!blocked[day]) blocked[day] = {};
    if (!blocked[day][row.courtType]) blocked[day][row.courtType] = [];
    blocked[day][row.courtType].push(row.time);
  }
  return blocked;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const key = `date:${date || 'all'}`;
  const cache = getCache();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return withCacheHeaders(NextResponse.json(cached.payload), true);
  }

  try {
    if (!process.env.DATABASE_URL?.trim()) {
      const payload: BlockedPayload = { blocked: {} };
      return withCacheHeaders(NextResponse.json(payload), false);
    }
    const pool = getPgPool();
    let rows: Array<{ dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }> = [];
    if (date) {
      const d = new Date(date);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);

      const result = await pool.query<{
        dayOfWeek: string;
        courtType: string;
        time: string;
        isBlocked: boolean;
      }>(
        `
        SELECT "dayOfWeek", "courtType", "time", "isBlocked"
        FROM "BlockedSlot"
        WHERE "isBlocked" = true
          AND ("startDate" IS NULL OR "startDate" <= $1)
          AND ("endDate" IS NULL OR "endDate" >= $2)
        `,
        [end, start],
      );
      rows = result.rows;
    } else {
      const result = await pool.query<{
        dayOfWeek: string;
        courtType: string;
        time: string;
        isBlocked: boolean;
      }>(
        `
        SELECT "dayOfWeek", "courtType", "time", "isBlocked"
        FROM "BlockedSlot"
        WHERE "isBlocked" = true
        `,
      );
      rows = result.rows;
    }

    const payload: BlockedPayload = { blocked: buildBlockedMap(rows) };
    cache.set(key, { payload, expiresAt: Date.now() + CACHE_TTL_MS });
    return withCacheHeaders(NextResponse.json(payload), false);
  } catch (error) {
    noteDatabaseFailure('blocked-slots.GET', error);
    console.error('[blocked-slots] error', error);
    if (cached) return withCacheHeaders(NextResponse.json(cached.payload), true);
    const payload: BlockedPayload = { blocked: {} };
    return withCacheHeaders(NextResponse.json(payload), false);
  }
}

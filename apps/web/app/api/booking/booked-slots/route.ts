/// <reference lib="es2022" />
import { NextResponse } from 'next/server';

const getApiBaseUrl = () => {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return `http://localhost:${process.env.API_PORT || '4000'}`;
};

const COURT_TYPES = ['Basketball AC', 'Basketball 3x3', 'Padel', 'Volleyball'] as const;

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

/**
 * GET /api/booking/booked-slots?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * Returns { booked: { [dateStr]: { [courtType]: time[] } } }. Uses DB when DATABASE_URL is set.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date().toISOString().slice(0, 10);
    let endDate = searchParams.get('endDate');
    if (!endDate) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + 30);
      endDate = toDateStr(d);
    }
    const endNext = new Date(endDate);
    endNext.setDate(endNext.getDate() + 1);
    const endDateIso = toDateStr(endNext);

    if (process.env.DATABASE_URL?.trim()) {
      try {
        const { prisma } = await import('../../../../lib/db');
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDateIso);
        end.setHours(23, 59, 59, 999);
        const rows = await prisma.booking.findMany({
          where: {
            startTime: { lt: end },
            endTime: { gt: start },
            status: { not: 'CANCELLED' },
            facilityArea: { in: [...COURT_TYPES] },
          },
          select: { facilityArea: true, startTime: true, endTime: true, status: true },
        });
        const booked: Record<string, Record<string, string[]>> = {};
        for (const b of rows) {
          if (b.status === 'CANCELLED') continue;
          const ct = b.facilityArea && (COURT_TYPES as readonly string[]).includes(b.facilityArea) ? b.facilityArea : null;
          if (!ct) continue;
          const startT = new Date(b.startTime);
          const endT = b.endTime ? new Date(b.endTime) : new Date(startT.getTime() + 60 * 60 * 1000);
          let slot = new Date(startT);
          while (slot.getTime() < endT.getTime()) {
            const dateStr = toDateStr(slot);
            const timeStr = toTimeStr(slot);
            if (!booked[dateStr]) booked[dateStr] = {};
            if (!booked[dateStr][ct]) booked[dateStr][ct] = [];
            if (!booked[dateStr][ct].includes(timeStr)) booked[dateStr][ct].push(timeStr);
            slot.setTime(slot.getTime() + 60 * 60 * 1000);
          }
        }
        return NextResponse.json({ booked });
      } catch (e) {
        const err = e as Error;
        console.error('[booked-slots] DB read failed:', err?.message ?? String(e));
        return NextResponse.json({ booked: {} });
      }
    }

    const res = await fetch(
      `${getApiBaseUrl()}/api/portal/bookings?startDate=${startDate}&endDate=${endDateIso}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ booked: {} });

    const rows: Array<{ facilityArea: string | null; startTime: string; endTime?: string; status: string }> = await res.json();
    const booked: Record<string, Record<string, string[]>> = {};
    for (const b of rows) {
      if (b.status === 'CANCELLED') continue;
      const ct = b.facilityArea && (COURT_TYPES as readonly string[]).includes(b.facilityArea) ? b.facilityArea : null;
      if (!ct) continue;
      const start = new Date(b.startTime);
      const end = b.endTime ? new Date(b.endTime) : new Date(start.getTime() + 60 * 60 * 1000);
      let slot = new Date(start);
      while (slot.getTime() < end.getTime()) {
        const dateStr = toDateStr(slot);
        const timeStr = toTimeStr(slot);
        if (!booked[dateStr]) booked[dateStr] = {};
        if (!booked[dateStr][ct]) booked[dateStr][ct] = [];
        if (!booked[dateStr][ct].includes(timeStr)) booked[dateStr][ct].push(timeStr);
        slot.setTime(slot.getTime() + 60 * 60 * 1000);
      }
    }
    return NextResponse.json({ booked });
  } catch (e) {
    const err = e as Error;
    console.error('[booked-slots] Error:', err?.message ?? String(e));
    return NextResponse.json({ booked: {} });
  }
}

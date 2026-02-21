/// <reference lib="es2022" />
import { NextResponse } from 'next/server';

/**
 * Landing booking: blocked slots (red/unavailable) are read DIRECTLY from the database.
 * Same data as Admin "Recurring blocked slots" (e.g. AL Muqawiloon, Apex Academy) – those show as red on the landing.
 * When DATABASE_URL is set we use only Prisma – no external API.
 */

const getApiBaseUrl = () => {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return `http://localhost:${process.env.API_PORT || '4000'}`;
};

/** Build blocked map from DB rows: { [dayOfWeek]: { [courtType]: time[] } } */
function buildBlockedMap(
  rows: Array<{ dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }>
): Record<string, Record<string, string[]>> {
  const blocked: Record<string, Record<string, string[]>> = {};
  for (const r of rows) {
    if (!r.isBlocked) continue;
    const day = (r.dayOfWeek || '').toUpperCase();
    if (!day) continue;
    if (!blocked[day]) blocked[day] = {};
    if (!blocked[day][r.courtType]) blocked[day][r.courtType] = [];
    blocked[day][r.courtType].push(r.time);
  }
  return blocked;
}

/** GET: returns { blocked: { [day]: { [courtType]: time[] } } }. Direct from DB when DATABASE_URL is set. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (process.env.DATABASE_URL?.trim()) {
      try {
        const { prisma } = await import('../../../../lib/db');
        const where: { isBlocked?: boolean; AND?: unknown[] } = { isBlocked: true };
        if (date) {
          const d = new Date(date);
          const start = new Date(d);
          start.setHours(0, 0, 0, 0);
          const end = new Date(d);
          end.setHours(23, 59, 59, 999);
          where.AND = [
            { OR: [{ startDate: null }, { startDate: { lte: end } }] },
            { OR: [{ endDate: null }, { endDate: { gte: start } }] },
          ];
        }
        const rows = await prisma.blockedSlot.findMany({
          where,
          select: { dayOfWeek: true, courtType: true, time: true, isBlocked: true },
        });
        const res = NextResponse.json({ blocked: buildBlockedMap(rows) });
        res.headers.set('Cache-Control', 'no-store');
        return res;
      } catch (e) {
        const err = e as Error;
        console.error('[blocked-slots] DB read failed:', err?.message ?? String(e));
        return NextResponse.json({ blocked: {} });
      }
    }

    if (process.env.NODE_ENV === 'production') {
      console.error('[blocked-slots] DATABASE_URL is required in production for direct DB.');
      return NextResponse.json({ blocked: {} });
    }

    let url = `${getApiBaseUrl()}/api/portal/blocked-slots`;
    if (date) {
      url += `?startDate=${encodeURIComponent(date)}&endDate=${encodeURIComponent(date)}`;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ blocked: {} });
    const rows: Array<{ dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }> = await res.json();
    return NextResponse.json({ blocked: buildBlockedMap(rows) });
  } catch (e) {
    const err = e as Error;
    console.error('[blocked-slots] Error:', err?.message ?? String(e));
    return NextResponse.json({ blocked: {} });
  }
}

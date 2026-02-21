/// <reference lib="es2022" />
import { NextResponse } from 'next/server';

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
    if (!blocked[r.dayOfWeek]) blocked[r.dayOfWeek] = {};
    if (!blocked[r.dayOfWeek][r.courtType]) blocked[r.dayOfWeek][r.courtType] = [];
    blocked[r.dayOfWeek][r.courtType].push(r.time);
  }
  return blocked;
}

// Returns { blocked: { [day]: { [courtType]: time[] } } }. Uses DB when DATABASE_URL is set.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (process.env.DATABASE_URL?.trim()) {
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
      return NextResponse.json({ blocked: buildBlockedMap(rows) });
    }

    let url = `${getApiBaseUrl()}/api/portal/blocked-slots`;
    if (date) {
      url += `?startDate=${encodeURIComponent(date)}&endDate=${encodeURIComponent(date)}`;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ blocked: {} });
    const rows: Array<{ dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }> = await res.json();
    return NextResponse.json({ blocked: buildBlockedMap(rows) });
  } catch {
    return NextResponse.json({ blocked: {} });
  }
}

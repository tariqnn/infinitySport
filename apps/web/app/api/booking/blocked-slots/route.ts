/// <reference lib="es2022" />
import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';

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
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({ blocked: {} });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const where: Prisma.BlockedSlotWhereInput = { isBlocked: true };

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

    const { prisma } = await import('../../../../lib/db');
    const rows = await prisma.blockedSlot.findMany({
      where,
      select: { dayOfWeek: true, courtType: true, time: true, isBlocked: true },
    });

    const res = NextResponse.json({ blocked: buildBlockedMap(rows) });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('[blocked-slots] error', error);
    return NextResponse.json({ blocked: {} });
  }
}

/// <reference lib="es2022" />
import { NextResponse } from 'next/server';
import {
  addDaysToDateKey,
  formatAmmanDateKey,
  formatAmmanTimeKey,
  parseAmmanDayEnd,
  parseAmmanDayStart,
} from '../../../../lib/ammanTime';

const COURT_TYPES = ['Basketball AC', 'Basketball 3x3', 'Padel', 'Volleyball'] as const;

function toDateStr(d: Date): string {
  return formatAmmanDateKey(d);
}

function toTimeStr(d: Date): string {
  return formatAmmanTimeKey(d);
}

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({ booked: {} });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || formatAmmanDateKey(new Date());
    let endDate = searchParams.get('endDate');
    if (!endDate) {
      endDate = addDaysToDateKey(startDate, 30);
    }

    const { prisma } = await import('../../../../lib/db');
    const start = parseAmmanDayStart(startDate);
    const end = parseAmmanDayEnd(endDate);
    if (!start || !end) {
      return NextResponse.json({ booked: {} });
    }

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

    const res = NextResponse.json({ booked });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('[booked-slots] error', error);
    return NextResponse.json({ booked: {} });
  }
}

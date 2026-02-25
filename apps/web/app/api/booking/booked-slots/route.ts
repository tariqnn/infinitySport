/// <reference lib="es2022" />
import { NextResponse } from 'next/server';
import { canAttemptDatabaseQuery, noteDatabaseFailure } from '../../../../lib/dbGuard';

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

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_URL?.trim()) {
      return NextResponse.json({ booked: {} });
    }
    if (!(await canAttemptDatabaseQuery())) {
      return NextResponse.json({ booked: {} });
    }

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

    const { prisma } = await import('../../../../lib/db');
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(toDateStr(endNext));
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
    noteDatabaseFailure('booked-slots.GET', error);
    console.error('[booked-slots] error', error);
    return NextResponse.json({ booked: {} });
  }
}

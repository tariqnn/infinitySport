import { NextResponse } from 'next/server';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:4000';
  return 'https://infinitysport.onrender.com';
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
 * Returns { booked: { [dateStr]: { [courtType]: time[] } } } for existing (non‑cancelled) bookings.
 * Used by the landing booking form to grey out already-booked slots.
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
    // Include the day after so we cover 00:00 (midnight) slots on the last day
    const endNext = new Date(endDate);
    endNext.setDate(endNext.getDate() + 1);
    const endDateIso = toDateStr(endNext);

    const res = await fetch(
      `${getApiBaseUrl()}/api/portal/bookings?startDate=${startDate}&endDate=${endDateIso}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return NextResponse.json({ booked: {} });

    const rows: Array<{ facilityArea: string | null; startTime: string; status: string }> = await res.json();
    const booked: Record<string, Record<string, string[]>> = {};

    for (const b of rows) {
      if (b.status === 'CANCELLED') continue;
      const ct = b.facilityArea && (COURT_TYPES as readonly string[]).includes(b.facilityArea) ? b.facilityArea : null;
      if (!ct) continue;
      const d = new Date(b.startTime);
      const dateStr = toDateStr(d);
      const timeStr = toTimeStr(d);
      if (!booked[dateStr]) booked[dateStr] = {};
      if (!booked[dateStr][ct]) booked[dateStr][ct] = [];
      if (!booked[dateStr][ct].includes(timeStr)) booked[dateStr][ct].push(timeStr);
    }

    return NextResponse.json({ booked });
  } catch {
    return NextResponse.json({ booked: {} });
  }
}

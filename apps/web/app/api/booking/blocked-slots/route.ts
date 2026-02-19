/// <reference lib="es2022" />
import { NextResponse } from 'next/server';

const getApiBaseUrl = () => {
  const envUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return `http://localhost:${process.env.API_PORT || '4000'}`;
};

// Returns { [day]: { [courtType]: time[] } } for slots where isBlocked=true. Pass ?date=YYYY-MM-DD to only get slots active on that date (for single-date blocks).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    let url = `${getApiBaseUrl()}/api/portal/blocked-slots`;
    if (date) {
      url += `?startDate=${encodeURIComponent(date)}&endDate=${encodeURIComponent(date)}`;
    }
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ blocked: {} });
    const rows: { id: string; dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }[] = await res.json();
    const blocked: Record<string, Record<string, string[]>> = {};
    for (const r of rows) {
      if (!r.isBlocked) continue;
      if (!blocked[r.dayOfWeek]) blocked[r.dayOfWeek] = {};
      if (!blocked[r.dayOfWeek][r.courtType]) blocked[r.dayOfWeek][r.courtType] = [];
      blocked[r.dayOfWeek][r.courtType].push(r.time);
    }
    return NextResponse.json({ blocked });
  } catch {
    return NextResponse.json({ blocked: {} });
  }
}

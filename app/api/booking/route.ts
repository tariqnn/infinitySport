/// <reference lib="es2022" />
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';
import { syncBookingRecordToFirestore } from '../../../apps/portal/lib/bookingRealtimeSync';
import { getFirestore } from '../../../apps/portal/lib/firebase-admin';

type CourtType = 'Basketball AC' | 'Basketball 3x3' | 'Padel' | 'Volleyball';

function ensureDatabaseUrl(): boolean {
  const explicitCandidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.PRISMA_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
  ];
  const resolved = explicitCandidates.find(
    (value): value is string => typeof value === 'string' && !!value.trim(),
  );
  if (resolved && !process.env.DATABASE_URL) process.env.DATABASE_URL = resolved;
  if (resolved) return true;

  const inferred = Object.entries(process.env).find(([key, value]) => {
    if (typeof value !== 'string' || !value.trim()) return false;
    if (!/^postgres(ql)?:\/\//i.test(value.trim())) return false;
    return /(DATABASE|POSTGRES|PRISMA|NEON|DB|URL)/i.test(key);
  });
  if (inferred) {
    process.env.DATABASE_URL = (inferred[1] as string).trim();
    console.warn(
      `[booking] DATABASE_URL inferred from env key: ${inferred[0]}`,
    );
    return true;
  }

  const envFileCandidates = [
    path.join(process.cwd(), 'runtime-env.json'),
    path.join(process.cwd(), 'hostinger-output', 'runtime-env.json'),
    path.join(process.cwd(), '.builds', 'source', 'repository', 'hostinger-output', 'runtime-env.json'),
  ];
  for (const envFile of envFileCandidates) {
    try {
      if (!fs.existsSync(envFile)) continue;
      const parsed = JSON.parse(fs.readFileSync(envFile, 'utf8')) as {
        DATABASE_URL?: string;
      };
      if (typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL.trim()) {
        process.env.DATABASE_URL = parsed.DATABASE_URL.trim();
        console.warn(`[booking] DATABASE_URL loaded from file: ${envFile}`);
        return true;
      }
    } catch (error) {
      console.warn(`[booking] failed reading runtime env file: ${envFile}`, error);
    }
  }

  return false;
}

const courtTypeForId = (courtId: string): CourtType | null => {
  if (courtId === 'basketball-ac') return 'Basketball AC';
  if (courtId === 'basketball-3x3') return 'Basketball 3x3';
  if (courtId === 'padel') return 'Padel';
  if (courtId === 'volleyball') return 'Volleyball';
  return null;
};

const dayKey = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map((n) => Number(n));
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
};

async function fetchBlockedMapFromDb(): Promise<Record<string, Partial<Record<CourtType, string[]>>>> {
  const { prisma } = await import('../../../lib/db');
  const rows = await prisma.blockedSlot.findMany({
    where: { isBlocked: true },
    select: { dayOfWeek: true, courtType: true, time: true },
  });
  const blocked: Record<string, Record<string, string[]>> = {};
  for (const row of rows) {
    if (!blocked[row.dayOfWeek]) blocked[row.dayOfWeek] = {};
    if (!blocked[row.dayOfWeek][row.courtType]) blocked[row.dayOfWeek][row.courtType] = [];
    blocked[row.dayOfWeek][row.courtType].push(row.time);
  }
  return blocked;
}

async function sendTwilioWhatsApp(toE164: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    console.log('[booking] TWILIO_* env missing, WhatsApp skipped');
    return;
  }
  if (!toE164.startsWith('+')) return;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const form = new URLSearchParams({
    From: from,
    To: `whatsapp:${toE164}`,
    Body: body,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  });
  if (!res.ok) {
    console.warn('[booking] Twilio WhatsApp failed', await res.text());
  }
}

async function _notifyBookingWhatsAppBoth(input: {
  bookingId: string;
  facilityArea: string;
  customerName: string;
  customerPhone: string;
  dateLabel: string;
  timeRange: string;
}) {
  const owner = process.env.OWNER_WHATSAPP?.trim();
  const status = 'PENDING';

  if (owner) {
    const ownerBody = [
      'Infinity Sports — New booking',
      `ID: ${input.bookingId}`,
      `Status: ${status}`,
      `Court: ${input.facilityArea}`,
      `Date: ${input.dateLabel}`,
      `Time: ${input.timeRange}`,
      `Customer: ${input.customerName}`,
      `Phone: ${input.customerPhone}`,
    ].join('\n');
    try {
      await sendTwilioWhatsApp(owner, ownerBody);
    } catch (e) {
      console.warn('[booking] owner WhatsApp failed', e);
    }
  }

  if (input.customerPhone.startsWith('+')) {
    const userBody = [
      'Infinity Sports — Booking received',
      `Hi ${input.customerName},`,
      'We received your booking request.',
      `Court: ${input.facilityArea}`,
      `Date: ${input.dateLabel}`,
      `Time: ${input.timeRange}`,
      `Status: ${status}`,
      'We will contact you if we need anything else.',
    ].join('\n');
    try {
      await sendTwilioWhatsApp(input.customerPhone, userBody);
    } catch (e) {
      console.warn('[booking] customer WhatsApp failed', e);
    }
  }
}

async function syncLandingBookingToFirestore(input: {
  id: string;
  companyId: string;
  facilityArea: string;
  startTime: Date;
  endTime: Date;
  status: string;
  isPaid: boolean;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string;
}) {
  try {
    const firestore = getFirestore();
    await syncBookingRecordToFirestore({
      firestore,
      booking: {
        id: input.id,
        companyId: input.companyId,
        facilityArea: input.facilityArea,
        startTime: input.startTime,
        endTime: input.endTime,
        status: input.status,
        source: 'WEBSITE',
        isPaid: input.isPaid,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerEmail: input.customerEmail,
        notes: input.notes,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.warn('[booking] firestore sync skipped', error);
  }
}

export async function POST(request: Request) {
  try {
    if (!ensureDatabaseUrl()) {
      const dbLikeKeys = Object.keys(process.env)
        .filter((key) => /(DATABASE|POSTGRES|PRISMA|NEON|DB|URL)/i.test(key))
        .sort();
      console.error(
        '[booking] missing DATABASE_URL at runtime; available env keys:',
        dbLikeKeys,
      );
      return NextResponse.json(
        { error: 'Booking is temporarily unavailable. Please try again later.' },
        { status: 503 },
      );
    }

    const body = await request.json();
    const { courtId, courtName, date, time, duration, name, phone, email } = body ?? {};

    if (!courtId || !courtName || !date || !time || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    const durationHours = typeof duration === 'number' && duration > 0 ? Math.min(3, Math.max(0.5, duration)) : 1;
    const phoneValidation = isValidPhoneNumber(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error || 'Invalid phone number.' },
        { status: 400 },
      );
    }

    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return NextResponse.json({ error: 'Cannot book a date in the past.' }, { status: 400 });
    }

    const courtType = courtTypeForId(courtId);
    if (courtType) {
      const blockedMap = await fetchBlockedMapFromDb();
      const day = dayKey(date);
      const fullTimes = blockedMap[day]?.[courtType] ?? [];
      const slotCount = Math.ceil(durationHours);

      for (let i = 0; i < slotCount; i += 1) {
        const [h, m] = time.split(':').map(Number);
        const mins = (h || 0) * 60 + (m || 0) + i * 60;
        const slotH = Math.floor(mins / 60) % 24;
        const slotM = mins % 60;
        const slotTime = `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
        if (fullTimes.includes(slotTime)) {
          return NextResponse.json(
            { error: 'This time slot is fully booked. Please select another time.' },
            { status: 409 },
          );
        }
      }
    }

    const startTime = new Date(`${date}T${time}:00`);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + Math.round(durationHours * 60));

    if (courtType) {
      const { prisma } = await import('../../../lib/db');
      const existing = await prisma.booking.findMany({
        where: {
          startTime: { lt: endTime },
          endTime: { gt: startTime },
          status: { not: 'CANCELLED' },
          facilityArea: { in: [courtType, courtName] },
        },
        select: { id: true },
      });
      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another time.' },
          { status: 409 },
        );
      }
    }

    const _endTimeStr = endTime.toTimeString().slice(0, 5);

    const { prisma } = await import('../../../lib/db');
    let company = await prisma.company.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Infinity Sport',
          contactName: 'Infinity Sport',
          contactEmail: 'infinitysportsacademyjo@gmail.com',
          status: 'ACTIVE',
        },
        select: { id: true },
      });
    }

    const notes = 'Public booking from landing page';
    const booking = await prisma.booking.create({
      data: {
        companyId: company.id,
        facilityArea: courtType || courtName,
        startTime,
        endTime,
        status: 'PENDING',
        isPaid: false,
        customerName: name,
        customerPhone: phone,
        customerEmail: typeof email === 'string' ? email : null,
        notes,
      },
      select: { id: true },
    });

    await syncLandingBookingToFirestore({
      id: booking.id,
      companyId: company.id,
      facilityArea: courtType || courtName,
      startTime,
      endTime,
      status: 'PENDING',
      isPaid: false,
      customerName: name,
      customerPhone: phone,
      customerEmail: typeof email === 'string' ? email : null,
      notes,
    });

    return NextResponse.json({
      success: true,
      message: 'Booking submitted successfully.',
    });
  } catch (error) {
    console.error('Booking submission error', error);
    return NextResponse.json(
      { error: 'Unable to process your booking. Please try again later.' },
      { status: 500 },
    );
  }
}

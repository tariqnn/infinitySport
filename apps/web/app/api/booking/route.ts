/// <reference lib="es2022" />
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getPgPool } from '../../../lib/pg';
import { isValidPhoneNumber } from '../../../lib/phoneValidation';
import {
  bookingCourtNameFromId,
  listMobileBookingInboxEntries,
  syncBookingRecordToFirestore,
} from '../../../../portal/lib/bookingRealtimeSync';
import {
  isDatabaseUnavailableError,
  noteDatabaseFailure,
} from '../../../lib/dbGuard';
import { getFirestore } from '../../../../portal/lib/firebase-admin';
import {
  ammanWeekdayKey,
  isAmmanDateBeforeToday,
  parseAmmanDateTime,
} from '../../../../../lib/ammanTime';

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

function parseFirestoreDateValue(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { toDate?: unknown }).toDate === 'function'
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function hasPendingMobileBookingOverlap(input: {
  courtName: string;
  startTime: Date;
  endTime: Date;
}) {
  try {
    const firestore = getFirestore();
    const entries = await listMobileBookingInboxEntries({
      firestore,
      limit: 300,
    });
    for (const entry of entries) {
      const data = entry.data;
      if (data.dbImported === true) continue;
      const status = String(data.status ?? '').trim().toUpperCase();
      if (['CANCELLED', 'CONFLICT', 'ERROR'].includes(status)) continue;
      const courtName =
        String(data.facilityArea ?? data.courtName ?? '').trim() ||
        bookingCourtNameFromId(String(data.courtId ?? '').trim()) ||
        '';
      const startTime = parseFirestoreDateValue(data.startTime ?? data.startTimeIso);
      const endTime = parseFirestoreDateValue(data.endTime ?? data.endTimeIso);
      if (!courtName || !startTime || !endTime) continue;
      if (courtName !== input.courtName) continue;
      if (startTime.getTime() < input.endTime.getTime() && endTime.getTime() > input.startTime.getTime()) {
        return true;
      }
    }
  } catch (error) {
    console.warn('[booking] firestore overlap check skipped', error);
  }

  return false;
}

async function fetchBlockedMapFromDb(): Promise<Record<string, Partial<Record<CourtType, string[]>>>> {
  const pool = getPgPool();
  const result = await pool.query<{ dayOfWeek: string; courtType: string; time: string }>(
    'SELECT "dayOfWeek", "courtType", "time" FROM "BlockedSlot" WHERE "isBlocked" = true',
  );
  const rows = result.rows;
  const blocked: Record<string, Record<string, string[]>> = {};
  for (const row of rows) {
    if (!blocked[row.dayOfWeek]) blocked[row.dayOfWeek] = {};
    if (!blocked[row.dayOfWeek][row.courtType]) blocked[row.dayOfWeek][row.courtType] = [];
    blocked[row.dayOfWeek][row.courtType].push(row.time);
  }
  return blocked;
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

    if (isAmmanDateBeforeToday(String(date))) {
      return NextResponse.json({ error: 'Cannot book a date in the past.' }, { status: 400 });
    }

    const courtType = courtTypeForId(courtId);
    if (courtType) {
      const blockedMap = await fetchBlockedMapFromDb();
      const day = ammanWeekdayKey(String(date));
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

    const startTime = parseAmmanDateTime(String(date), String(time));
    if (!startTime) {
      return NextResponse.json({ error: 'Invalid booking date or time.' }, { status: 400 });
    }
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + Math.round(durationHours * 60));
    const pool = getPgPool();

    if (courtType) {
      const pendingOverlap = await hasPendingMobileBookingOverlap({
        courtName: courtType,
        startTime,
        endTime,
      });
      if (pendingOverlap) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another time.' },
          { status: 409 },
        );
      }

      const overlap = await pool.query<{ id: string }>(
        `
        SELECT "id"
        FROM "Booking"
        WHERE "startTime" < $1
          AND "endTime" > $2
          AND "status" <> 'CANCELLED'
          AND "facilityArea" = ANY($3::text[])
        LIMIT 1
        `,
        [endTime, startTime, [courtType, courtName]],
      );
      if ((overlap.rowCount ?? 0) > 0) {
        return NextResponse.json(
          { error: 'This time slot is already booked. Please select another time.' },
          { status: 409 },
        );
      }
    }

    const endTimeStr = endTime.toTimeString().slice(0, 5);
    const companyResult = await pool.query<{ id: string }>(
      `
      SELECT "id"
      FROM "Company"
      WHERE "status" = 'ACTIVE'
      ORDER BY "createdAt" DESC
      LIMIT 1
      `,
    );
    let companyId = companyResult.rows[0]?.id;

    if (!companyId) {
      const insertedCompany = await pool.query<{ id: string }>(
        `
        INSERT INTO "Company" ("id", "name", "contactName", "contactEmail", "status", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())
        RETURNING "id"
        `,
        [
          randomUUID(),
          'Infinity Sport',
          'Infinity Sport',
          'infinitysportsacademyjo@gmail.com',
        ],
      );
      companyId = insertedCompany.rows[0]?.id;
    }

    if (!companyId) {
      throw new Error('Failed to resolve company for booking');
    }

    const bookingId = randomUUID();
    const notes = 'Public booking from landing page';
    await pool.query(
      `
      INSERT INTO "Booking" (
        "id",
        "companyId",
        "facilityArea",
        "startTime",
        "endTime",
        "status",
        "isPaid",
        "customerName",
        "customerPhone",
        "customerEmail",
        "notes",
        "createdAt",
        "updatedAt"
      )
      VALUES ($1, $2, $3, $4, $5, 'PENDING', false, $6, $7, $8, $9, NOW(), NOW())
      `,
      [
        bookingId,
        companyId,
        courtType || courtName,
        startTime,
        endTime,
        name,
        phone,
        typeof email === 'string' ? email : null,
        notes,
      ],
    );

    await syncLandingBookingToFirestore({
      id: bookingId,
      companyId,
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
    noteDatabaseFailure('booking.POST', error);
    console.error('Booking submission error', error);
    const status = isDatabaseUnavailableError(error) ? 503 : 500;
    return NextResponse.json(
      { error: 'Unable to process your booking. Please try again later.' },
      { status },
    );
  }
}

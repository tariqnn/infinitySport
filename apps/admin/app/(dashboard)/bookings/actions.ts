'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../../lib/db';

export interface BookingState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

type BookingStatusValue = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

type BookingListParams = {
  startDate?: string;
  endDate?: string;
};

const DEFAULT_HOURLY_RATE_BY_COURT: Record<string, number> = {
  'Basketball AC': 40,
  'Basketball 3x3': 30,
  Padel: 35,
  Volleyball: 35,
};

function toDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function bookingHoursBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100;
}

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || !error) return undefined;
  if (!('code' in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

async function ensureCourtRateTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "CourtRate" (
      "courtType" TEXT PRIMARY KEY,
      "hourlyRate" INTEGER NOT NULL CHECK ("hourlyRate" > 0),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
    )
  `);

  for (const [courtType, hourlyRate] of Object.entries(DEFAULT_HOURLY_RATE_BY_COURT)) {
    await prisma.$executeRawUnsafe(
      `
        INSERT INTO "CourtRate" ("courtType", "hourlyRate", "createdAt", "updatedAt")
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT ("courtType") DO NOTHING
      `,
      courtType,
      Math.max(1, Math.round(Number(hourlyRate || 0))),
    );
  }
}

async function getEffectiveCourtRates(): Promise<Record<string, number>> {
  const rates: Record<string, number> = { ...DEFAULT_HOURLY_RATE_BY_COURT };
  try {
    await ensureCourtRateTable();

    const rows = (await prisma.$queryRawUnsafe(
      `
        SELECT "courtType", "hourlyRate"
        FROM "CourtRate"
        ORDER BY "courtType" ASC
      `,
    )) as Array<{ courtType: string; hourlyRate: number }>;

    for (const row of rows) {
      const name = String(row.courtType || '').trim();
      const hourlyRate = Number(row.hourlyRate || 0);
      if (!name || !Number.isFinite(hourlyRate) || hourlyRate <= 0) continue;
      rates[name] = hourlyRate;
    }
  } catch (error: unknown) {
    const code = readErrorCode(error);
    // Non-table errors should not break admin bookings UI.
    console.error(`Failed to load CourtRate rows for admin bookings${code ? ` (${code})` : ''}:`, error);
  }
  return rates;
}

function getCourtRate(court: string | null | undefined, rates: Record<string, number>): number {
  if (!court) return 30;
  const byMap = rates[court];
  if (Number.isFinite(byMap)) return Number(byMap);
  return DEFAULT_HOURLY_RATE_BY_COURT[court] ?? 30;
}

export async function listBookingsAction(params: BookingListParams = {}) {
  const where: {
    startTime?: {
      gte?: Date;
      lte?: Date;
    };
  } = {};

  const start = toDate(params.startDate);
  const end = toDate(params.endDate);
  if (start || end) {
    where.startTime = {};
    if (start) where.startTime.gte = start;
    if (end) where.startTime.lte = end;
  }

  const [bookings, rates] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        member: { select: { firstName: true, lastName: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
    getEffectiveCourtRates(),
  ]);

  return bookings.map((booking) => {
    const hours = bookingHoursBetween(booking.startTime, booking.endTime);
    const hourlyRate = getCourtRate(booking.facilityArea, rates);
    const totalAmount = Math.max(0, Math.round(hours * hourlyRate));
    return {
      ...booking,
      hourlyRate,
      totalAmount,
      totalHours: hours,
    };
  });
}

export async function updateBookingPaymentAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const isPaid = formData.get('isPaid')?.toString() === 'true';
    const status = (formData.get('status')?.toString() || 'PENDING') as BookingStatusValue;

    if (!bookingId) return { status: 'error', message: 'Missing booking ID.' };

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isPaid,
        status,
      },
    });

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking updated successfully.' };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code === 'P2025') return { status: 'error', message: 'Booking not found.' };
    return { status: 'error', message: 'Unable to update booking.' };
  }
}

export async function updateBookingStatusAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const status = formData.get('status')?.toString() as BookingStatusValue | undefined;

    if (!bookingId || !status) return { status: 'error', message: 'Missing booking ID or status.' };

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking status updated successfully.' };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code === 'P2025') return { status: 'error', message: 'Booking not found.' };
    return { status: 'error', message: 'Unable to update booking status.' };
  }
}

export async function updateBookingAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const status = formData.get('status')?.toString();
    const isPaid = formData.get('isPaid')?.toString() === 'true';
    const notes = formData.get('notes')?.toString() ?? '';
    const facilityArea = formData.get('facilityArea')?.toString() ?? '';
    const startTimeRaw = formData.get('startTime')?.toString();
    const endTimeRaw = formData.get('endTime')?.toString();

    if (!bookingId) return { status: 'error', message: 'Missing booking ID.' };

    const existing = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, facilityArea: true, startTime: true, endTime: true, status: true },
    });
    if (!existing) return { status: 'error', message: 'Booking not found.' };

    const validStatuses: BookingStatusValue[] = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    const nextStatus: BookingStatusValue = status && validStatuses.includes(status as BookingStatusValue)
      ? (status as BookingStatusValue)
      : (existing.status as BookingStatusValue);
    const nextStart = startTimeRaw ? toDate(startTimeRaw) : existing.startTime;
    const nextEnd = endTimeRaw ? toDate(endTimeRaw) : existing.endTime;
    if (!nextStart || !nextEnd) return { status: 'error', message: 'Invalid start or end time.' };
    if (nextEnd.getTime() <= nextStart.getTime()) {
      return { status: 'error', message: 'End time must be later than start time.' };
    }
    const nextFacility = facilityArea === '' ? null : facilityArea;
    if (nextStatus !== 'CANCELLED' && nextFacility) {
      const conflict = await prisma.booking.findFirst({
        where: {
          id: { not: bookingId },
          facilityArea: nextFacility,
          status: { not: 'CANCELLED' },
          startTime: { lt: nextEnd },
          endTime: { gt: nextStart },
        },
        select: { id: true, startTime: true, endTime: true, customerName: true, customerPhone: true },
      });
      if (conflict) {
        return {
          status: 'error',
          message: `Selected time is not free for this court. Conflicts with booking ${conflict.id}.`,
        };
      }
    }

    const update: { status?: BookingStatusValue; isPaid: boolean; notes: string | null; facilityArea: string | null } = {
      isPaid,
      notes: notes === '' ? null : notes,
      facilityArea: nextFacility,
    };

    if (status && validStatuses.includes(status as BookingStatusValue)) update.status = status as BookingStatusValue;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        ...update,
        startTime: nextStart,
        endTime: nextEnd,
      },
    });

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking updated successfully.' };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code === 'P2025') return { status: 'error', message: 'Booking not found.' };
    return { status: 'error', message: 'Unable to update booking.' };
  }
}

export async function deleteBookingAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  try {
    const raw = formData.get('bookingId') ?? formData.get('id');
    const bookingId = (typeof raw === 'string' ? raw : raw?.toString?.() ?? '').trim();

    if (!bookingId) return { status: 'error', message: 'Missing booking ID.' };

    await prisma.booking.delete({ where: { id: bookingId } });
    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking deleted.' };
  } catch (error: unknown) {
    const code = typeof error === 'object' && error && 'code' in error ? (error as { code?: string }).code : undefined;
    if (code === 'P2025') return { status: 'error', message: 'Booking not found.' };
    return { status: 'error', message: 'Unable to delete booking.' };
  }
}

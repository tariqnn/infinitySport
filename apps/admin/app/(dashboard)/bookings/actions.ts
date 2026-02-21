'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../../lib/db';

export interface BookingState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

type BookingListParams = {
  startDate?: string;
  endDate?: string;
};

function toDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
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

  return prisma.booking.findMany({
    where,
    include: {
      member: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function updateBookingPaymentAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const isPaid = formData.get('isPaid')?.toString() === 'true';
    const status = formData.get('status')?.toString() || 'PENDING';

    if (!bookingId) return { status: 'error', message: 'Missing booking ID.' };

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        isPaid,
        status: status as any,
      },
    });

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking updated successfully.' };
  } catch (error: any) {
    if (error?.code === 'P2025') return { status: 'error', message: 'Booking not found.' };
    return { status: 'error', message: 'Unable to update booking.' };
  }
}

export async function updateBookingStatusAction(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const status = formData.get('status')?.toString();

    if (!bookingId || !status) return { status: 'error', message: 'Missing booking ID or status.' };

    await prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as any },
    });

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking status updated successfully.' };
  } catch (error: any) {
    if (error?.code === 'P2025') return { status: 'error', message: 'Booking not found.' };
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

    if (!bookingId) return { status: 'error', message: 'Missing booking ID.' };

    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    const update: { status?: string; isPaid: boolean; notes: string | null; facilityArea: string | null } = {
      isPaid,
      notes: notes === '' ? null : notes,
      facilityArea: facilityArea === '' ? null : facilityArea,
    };

    if (status && validStatuses.includes(status)) update.status = status;

    await prisma.booking.update({
      where: { id: bookingId },
      data: update,
    });

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking updated successfully.' };
  } catch (error: any) {
    if (error?.code === 'P2025') return { status: 'error', message: 'Booking not found.' };
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
  } catch (error: any) {
    if (error?.code === 'P2025') return { status: 'error', message: 'Booking not found.' };
    return { status: 'error', message: 'Unable to delete booking.' };
  }
}

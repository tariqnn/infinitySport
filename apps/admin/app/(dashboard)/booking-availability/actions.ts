'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '../../../lib/db';
import { getFirestore } from '../../../../portal/lib/firebase-admin';
import { syncBlockedSlotsSnapshotToFirestore } from '../../../../portal/lib/bookingAvailabilityRealtimeSync';

export interface BookingAvailabilityState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

function isPrismaNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'P2025'
  );
}

async function syncBlockedSlotsRealtimeSnapshot() {
  try {
    const firestore = getFirestore();
    const slots = await prisma.blockedSlot.findMany({
      orderBy: [{ label: 'asc' }, { dayOfWeek: 'asc' }, { courtType: 'asc' }, { time: 'asc' }],
    });
    await syncBlockedSlotsSnapshotToFirestore({
      firestore,
      blockedSlots: slots.map((slot) => ({
        id: slot.id,
        dayOfWeek: slot.dayOfWeek,
        courtType: slot.courtType,
        time: slot.time,
        isBlocked: slot.isBlocked,
        label: slot.label,
        startDate: slot.startDate,
        endDate: slot.endDate,
      })),
    });
  } catch (error) {
    console.warn('[booking-availability] firebase sync skipped', error);
  }
}

export async function listBlockedSlotsAction() {
  return prisma.blockedSlot.findMany({
    orderBy: [{ label: 'asc' }, { dayOfWeek: 'asc' }, { courtType: 'asc' }, { time: 'asc' }],
  });
}

export async function updateBlockedSlotAction(
  _prev: BookingAvailabilityState,
  formData: FormData,
): Promise<BookingAvailabilityState> {
  try {
    const id = formData.get('id')?.toString();
    const isBlocked = formData.get('isBlocked') === 'true';
    if (!id) return { status: 'error', message: 'Missing slot ID.' };

    await prisma.blockedSlot.update({
      where: { id },
      data: { isBlocked },
    });

    await syncBlockedSlotsRealtimeSnapshot();
    revalidatePath('/booking-availability');
    return { status: 'success', message: isBlocked ? 'Slot marked as blocked.' : 'Slot marked as free.' };
  } catch (error) {
    if (isPrismaNotFoundError(error)) return { status: 'error', message: 'Blocked slot not found.' };
    return { status: 'error', message: 'Unable to update.' };
  }
}

export async function createClubBookingAction(
  _prev: BookingAvailabilityState,
  formData: FormData,
): Promise<BookingAvailabilityState> {
  try {
    const label = formData.get('label')?.toString()?.trim();
    const courtType = formData.get('courtType')?.toString();
    const time = formData.get('time')?.toString();
    const daysArr = formData.getAll('daysOfWeek');
    const daysRaw = daysArr.length ? daysArr.join(',') : formData.get('daysOfWeek')?.toString();
    const startDateRaw = formData.get('startDate')?.toString() || null;
    const endDateRaw = formData.get('endDate')?.toString() || null;

    if (!label) return { status: 'error', message: 'Club name (label) is required.' };
    if (!courtType) return { status: 'error', message: 'Court type is required.' };
    if (!time) return { status: 'error', message: 'Time is required.' };

    const daysOfWeek = daysRaw ? daysRaw.split(',').map((d) => d.trim()).filter(Boolean) : [];
    if (daysOfWeek.length === 0) return { status: 'error', message: 'Select at least one day.' };

    for (const dayOfWeek of daysOfWeek) {
      await prisma.blockedSlot.upsert({
        where: {
          dayOfWeek_courtType_time: { dayOfWeek, courtType, time },
        },
        update: {
          isBlocked: true,
          label,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          endDate: endDateRaw ? new Date(endDateRaw) : null,
        },
        create: {
          dayOfWeek,
          courtType,
          time,
          isBlocked: true,
          label,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          endDate: endDateRaw ? new Date(endDateRaw) : null,
        },
      });
    }

    await syncBlockedSlotsRealtimeSnapshot();
    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Club booking created.' };
  } catch {
    return { status: 'error', message: 'Unable to create club booking.' };
  }
}

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

export async function createSingleSlotAction(
  _prev: BookingAvailabilityState,
  formData: FormData,
): Promise<BookingAvailabilityState> {
  try {
    const slotDate = formData.get('slotDate')?.toString();
    const courtType = formData.get('courtType')?.toString();
    const time = formData.get('time')?.toString();

    if (!slotDate || !courtType || !time) {
      return { status: 'error', message: 'Date, court type, and time are required.' };
    }

    const d = new Date(`${slotDate}T12:00:00`);
    const dayOfWeek = DAY_NAMES[d.getDay()];

    await prisma.blockedSlot.upsert({
      where: {
        dayOfWeek_courtType_time: { dayOfWeek, courtType, time },
      },
      update: {
        isBlocked: true,
        label: null,
        startDate: new Date(slotDate),
        endDate: new Date(slotDate),
      },
      create: {
        dayOfWeek,
        courtType,
        time,
        isBlocked: true,
        label: null,
        startDate: new Date(slotDate),
        endDate: new Date(slotDate),
      },
    });

    await syncBlockedSlotsRealtimeSnapshot();
    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Slot added.' };
  } catch {
    return { status: 'error', message: 'Unable to add slot.' };
  }
}

export async function deleteBlockedSlotAction(
  _prev: BookingAvailabilityState,
  formData: FormData,
): Promise<BookingAvailabilityState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) return { status: 'error', message: 'Missing slot ID.' };

    await prisma.blockedSlot.delete({ where: { id } });

    await syncBlockedSlotsRealtimeSnapshot();
    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Slot deleted.' };
  } catch (error) {
    if (isPrismaNotFoundError(error)) return { status: 'error', message: 'Blocked slot not found.' };
    return { status: 'error', message: 'Unable to delete slot.' };
  }
}

export async function deleteClubBookingByLabelAction(
  _prev: BookingAvailabilityState,
  formData: FormData,
): Promise<BookingAvailabilityState> {
  try {
    const label = formData.get('label')?.toString();
    if (!label) return { status: 'error', message: 'Missing club booking label.' };

    await prisma.blockedSlot.deleteMany({ where: { label: decodeURIComponent(label) } });

    await syncBlockedSlotsRealtimeSnapshot();
    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Club booking deleted.' };
  } catch {
    return { status: 'error', message: 'Unable to delete club booking.' };
  }
}

export async function updateClubBookingAction(
  _prev: BookingAvailabilityState,
  formData: FormData,
): Promise<BookingAvailabilityState> {
  try {
    const previousLabel = formData.get('editPreviousLabel')?.toString();
    const label = formData.get('label')?.toString()?.trim();
    const courtType = formData.get('courtType')?.toString();
    const time = formData.get('time')?.toString();
    const daysArr = formData.getAll('daysOfWeek');
    const daysRaw = daysArr.length ? daysArr.join(',') : formData.get('daysOfWeek')?.toString();
    const startDateRaw = formData.get('startDate')?.toString() || null;
    const endDateRaw = formData.get('endDate')?.toString() || null;

    if (!previousLabel || !label || !courtType || !time) {
      return { status: 'error', message: 'Missing required fields for update.' };
    }

    const daysOfWeek = daysRaw ? daysRaw.split(',').map((d) => d.trim()).filter(Boolean) : [];
    if (daysOfWeek.length === 0) return { status: 'error', message: 'Select at least one day.' };

    await prisma.blockedSlot.deleteMany({ where: { label: decodeURIComponent(previousLabel) } });
    for (const dayOfWeek of daysOfWeek) {
      await prisma.blockedSlot.upsert({
        where: {
          dayOfWeek_courtType_time: { dayOfWeek, courtType, time },
        },
        update: {
          isBlocked: true,
          label,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          endDate: endDateRaw ? new Date(endDateRaw) : null,
        },
        create: {
          dayOfWeek,
          courtType,
          time,
          isBlocked: true,
          label,
          startDate: startDateRaw ? new Date(startDateRaw) : null,
          endDate: endDateRaw ? new Date(endDateRaw) : null,
        },
      });
    }

    await syncBlockedSlotsRealtimeSnapshot();
    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Club booking updated.' };
  } catch {
    return { status: 'error', message: 'Unable to update club booking.' };
  }
}

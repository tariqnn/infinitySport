'use server';

import { revalidatePath } from 'next/cache';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:4000';
  return 'https://infinitysport.onrender.com';
};

export interface BookingAvailabilityState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function updateBlockedSlotAction(
  _prev: BookingAvailabilityState,
  formData: FormData
): Promise<BookingAvailabilityState> {
  try {
    const id = formData.get('id')?.toString();
    const isBlocked = formData.get('isBlocked') === 'true';

    if (!id) return { status: 'error', message: 'Missing slot ID.' };

    const res = await fetch(`${getApiBaseUrl()}/api/portal/blocked-slots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to update.' };
    }

    revalidatePath('/booking-availability');
    return { status: 'success', message: isBlocked ? 'Slot marked as blocked.' : 'Slot marked as free.' };
  } catch (e) {
    console.error('updateBlockedSlot error', e);
    return { status: 'error', message: 'Unable to update.' };
  }
}

export async function createClubBookingAction(
  _prev: BookingAvailabilityState,
  formData: FormData
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

    const res = await fetch(`${getApiBaseUrl()}/api/portal/blocked-slots/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courtType,
        time,
        daysOfWeek,
        label,
        startDate: startDateRaw || null,
        endDate: endDateRaw || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to create club booking.' };
    }

    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Club booking created.' };
  } catch (e) {
    console.error('createClubBooking error', e);
    return { status: 'error', message: 'Unable to create club booking.' };
  }
}

export async function createSingleSlotAction(
  _prev: BookingAvailabilityState,
  formData: FormData
): Promise<BookingAvailabilityState> {
  try {
    const dayOfWeek = formData.get('dayOfWeek')?.toString();
    const courtType = formData.get('courtType')?.toString();
    const time = formData.get('time')?.toString();

    if (!dayOfWeek || !courtType || !time) {
      return { status: 'error', message: 'Day, court type, and time are required.' };
    }

    const res = await fetch(`${getApiBaseUrl()}/api/portal/blocked-slots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayOfWeek, courtType, time, isBlocked: true }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to add slot.' };
    }

    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Slot added.' };
  } catch (e) {
    console.error('createSingleSlot error', e);
    return { status: 'error', message: 'Unable to add slot.' };
  }
}

export async function deleteBlockedSlotAction(
  _prev: BookingAvailabilityState,
  formData: FormData
): Promise<BookingAvailabilityState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) return { status: 'error', message: 'Missing slot ID.' };

    const res = await fetch(`${getApiBaseUrl()}/api/portal/blocked-slots/${id}`, { method: 'DELETE' });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to delete slot.' };
    }

    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Slot deleted.' };
  } catch (e) {
    console.error('deleteBlockedSlot error', e);
    return { status: 'error', message: 'Unable to delete slot.' };
  }
}

export async function deleteClubBookingByLabelAction(
  _prev: BookingAvailabilityState,
  formData: FormData
): Promise<BookingAvailabilityState> {
  try {
    const label = formData.get('label')?.toString();
    if (!label) return { status: 'error', message: 'Missing club booking label.' };

    const res = await fetch(`${getApiBaseUrl()}/api/portal/blocked-slots/by-label/${encodeURIComponent(label)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to delete club booking.' };
    }

    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Club booking deleted.' };
  } catch (e) {
    console.error('deleteClubBookingByLabel error', e);
    return { status: 'error', message: 'Unable to delete club booking.' };
  }
}

/** Edit = delete by previous label, then bulk create with new data. */
export async function updateClubBookingAction(
  _prev: BookingAvailabilityState,
  formData: FormData
): Promise<BookingAvailabilityState> {
  try {
    const editPreviousLabel = formData.get('editPreviousLabel')?.toString();
    const label = formData.get('label')?.toString()?.trim();
    const courtType = formData.get('courtType')?.toString();
    const time = formData.get('time')?.toString();
    const daysArr = formData.getAll('daysOfWeek');
    const daysRaw = daysArr.length ? daysArr.join(',') : formData.get('daysOfWeek')?.toString();
    const startDateRaw = formData.get('startDate')?.toString() || null;
    const endDateRaw = formData.get('endDate')?.toString() || null;

    if (!editPreviousLabel || !label || !courtType || !time) {
      return { status: 'error', message: 'Missing required fields for update.' };
    }
    const daysOfWeek = daysRaw ? daysRaw.split(',').map((d) => d.trim()).filter(Boolean) : [];
    if (daysOfWeek.length === 0) return { status: 'error', message: 'Select at least one day.' };

    const base = getApiBaseUrl();
    const delRes = await fetch(`${base}/api/portal/blocked-slots/by-label/${encodeURIComponent(editPreviousLabel)}`, {
      method: 'DELETE',
    });
    if (!delRes.ok) {
      const err = await delRes.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to remove previous club booking.' };
    }

    const createRes = await fetch(`${base}/api/portal/blocked-slots/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courtType,
        time,
        daysOfWeek,
        label,
        startDate: startDateRaw || null,
        endDate: endDateRaw || null,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      return { status: 'error', message: (err as { message?: string }).message || 'Failed to save club booking.' };
    }

    revalidatePath('/booking-availability');
    return { status: 'success', message: 'Club booking updated.' };
  } catch (e) {
    console.error('updateClubBooking error', e);
    return { status: 'error', message: 'Unable to update club booking.' };
  }
}

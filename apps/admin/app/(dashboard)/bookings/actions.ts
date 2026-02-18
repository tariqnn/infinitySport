'use server';

import { revalidatePath } from 'next/cache';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();

export interface BookingState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function updateBookingPaymentAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const isPaid = formData.get('isPaid')?.toString() === 'true';
    const status = formData.get('status')?.toString() || 'PENDING';

    if (!bookingId) {
      return { status: 'error', message: 'Missing booking ID.' };
    }

    const response = await fetch(`${API_BASE_URL}/api/portal/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isPaid,
        status,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { status: 'error', message: error.message || 'Failed to update booking.' };
    }

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking updated successfully.' };
  } catch (error) {
    console.error('Booking update error', error);
    return { status: 'error', message: 'Unable to update booking.' };
  }
}

export async function updateBookingStatusAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const status = formData.get('status')?.toString();

    if (!bookingId || !status) {
      return { status: 'error', message: 'Missing booking ID or status.' };
    }

    const response = await fetch(`${API_BASE_URL}/api/portal/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { status: 'error', message: error.message || 'Failed to update booking status.' };
    }

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking status updated successfully.' };
  } catch (error) {
    console.error('Booking status update error', error);
    return { status: 'error', message: 'Unable to update booking status.' };
  }
}

export async function updateBookingAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  try {
    const bookingId = formData.get('bookingId')?.toString();
    const status = formData.get('status')?.toString();
    const isPaid = formData.get('isPaid')?.toString() === 'true';
    const notes = formData.get('notes')?.toString() ?? '';
    const facilityArea = formData.get('facilityArea')?.toString() ?? '';

    if (!bookingId) {
      return { status: 'error', message: 'Missing booking ID.' };
    }
    const validStatuses = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
    const update: { status?: string; isPaid: boolean; notes: string | null; facilityArea: string | null } = {
      isPaid,
      notes: notes === '' ? null : notes,
      facilityArea: facilityArea === '' ? null : facilityArea,
    };
    if (status && validStatuses.includes(status)) {
      update.status = status;
    }

    const response = await fetch(`${API_BASE_URL}/api/portal/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return { status: 'error', message: (error as { message?: string }).message || 'Failed to update booking.' };
    }

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking updated successfully.' };
  } catch (error) {
    console.error('Booking update error', error);
    return { status: 'error', message: 'Unable to update booking.' };
  }
}

export async function deleteBookingAction(
  _prev: BookingState,
  formData: FormData
): Promise<BookingState> {
  try {
    const raw = formData.get('bookingId') ?? formData.get('id');
    const bookingId = (typeof raw === 'string' ? raw : raw?.toString?.() ?? '').trim();

    if (!bookingId) {
      return { status: 'error', message: 'Missing booking ID.' };
    }

    const url = `${API_BASE_URL}/api/portal/bookings/${encodeURIComponent(bookingId)}`;
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const msg = (body as { message?: string }).message;
      if (response.status === 404) {
        return { status: 'error', message: msg || 'Booking not found. It may have been already deleted.' };
      }
      if (response.status === 400) {
        return { status: 'error', message: msg || 'Invalid booking ID. Please refresh the list and try again.' };
      }
      return { status: 'error', message: msg || `Failed to delete booking (${response.status}).` };
    }

    revalidatePath('/bookings');
    return { status: 'success', message: 'Booking deleted.' };
  } catch (error) {
    console.error('Booking delete error', error);
    return { status: 'error', message: 'Unable to delete booking.' };
  }
}

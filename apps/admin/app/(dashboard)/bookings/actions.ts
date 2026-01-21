'use server';

import { revalidatePath } from 'next/cache';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return 'https://infinitysport.onrender.com';
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

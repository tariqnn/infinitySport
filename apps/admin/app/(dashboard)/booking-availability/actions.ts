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

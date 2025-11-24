'use server';

import { revalidatePath } from 'next/cache';
import { landingEventSchema } from '@infinity/types';
import { deleteLandingEvent, upsertLandingEvent } from '@infinity/mock-api';

export interface EventState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function upsertEventAction(_prev: EventState, formData: FormData): Promise<EventState> {
  try {
    const payload = landingEventSchema.parse({
      id: formData.get('id')?.toString() || undefined,
      title: formData.get('title')?.toString() ?? '',
      description: formData.get('description')?.toString() ?? '',
      date: new Date(formData.get('date')?.toString() ?? '').toISOString(),
      location: formData.get('location')?.toString() ?? 'Infinity Campus',
      link: formData.get('link')?.toString() || '/events',
      isActive: formData.get('isActive')?.toString() !== 'hidden'
    });

    await upsertLandingEvent(payload, 'Admin');
    revalidatePath('/events');
    revalidatePath('/');
    return { status: 'success', message: 'Event saved.' };
  } catch (error) {
    console.error('Event save error', error);
    return { status: 'error', message: 'Unable to save event.' };
  }
}

export async function deleteEventAction(_prev: EventState, formData: FormData): Promise<EventState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing id');
    await deleteLandingEvent(id, 'Admin');
    revalidatePath('/events');
    revalidatePath('/');
    return { status: 'success', message: 'Event deleted.' };
  } catch (error) {
    console.error('Event delete error', error);
    return { status: 'error', message: 'Unable to delete event.' };
  }
}
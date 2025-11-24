'use server';

import { revalidatePath } from 'next/cache';
import { createEvent, updateEvent, deleteEvent } from '@infinity/mock-api';
import { eventItemSchema } from '@infinity/types';

export async function createEventAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const title = formData.get('title')?.toString() ?? '';
    const description = formData.get('description')?.toString() ?? '';
    const date = formData.get('date')?.toString() ?? '';
    const location = formData.get('location')?.toString() ?? 'Infinity Campus';
    const category = formData.get('category')?.toString() ?? 'general';

    eventItemSchema.parse({
      id: 'tmp',
      title,
      description,
      date,
      location,
      category
    });
    await createEvent({ title, description, date, location, category });
    revalidatePath('/calendar');
    return { error: undefined };
  } catch {
    return { error: 'Failed to create event.' };
  }
}

export async function updateEventAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const idValue = formData.get('id');
    if (!idValue) {
      return { error: 'Missing event id.' };
    }
    const id = idValue.toString();
    const title = formData.get('title')?.toString() ?? '';
    const description = formData.get('description')?.toString() ?? '';
    const date = formData.get('date')?.toString() ?? '';
    const location = formData.get('location')?.toString() ?? '';
    const category = formData.get('category')?.toString() ?? 'general';

    await updateEvent(id, { title, description, date, location, category });
    revalidatePath('/calendar');
    return { error: undefined };
  } catch {
    return { error: 'Failed to update event.' };
  }
}

export async function deleteEventAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const idValue = formData.get('id');
    if (!idValue) {
      return { error: 'Missing event id.' };
    }
    await deleteEvent(idValue.toString());
    revalidatePath('/calendar');
    return { error: undefined };
  } catch {
    return { error: 'Failed to delete event.' };
  }
}



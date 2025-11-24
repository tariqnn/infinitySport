'use server';

import { revalidatePath } from 'next/cache';
import { deleteLandingAnnouncement, upsertLandingAnnouncement } from '@infinity/mock-api';

export interface AnnouncementState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

function boolFromField(value: FormDataEntryValue | null, key: string) {
  return value?.toString() === key;
}

export async function upsertAnnouncementAction(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  try {
    await upsertLandingAnnouncement(
      {
        id: formData.get('id')?.toString() || undefined,
        title: formData.get('title')?.toString() ?? '',
        message: formData.get('message')?.toString() ?? '',
        link: formData.get('link')?.toString() || undefined,
        startDate: formData.get('startDate')?.toString() || undefined,
        endDate: formData.get('endDate')?.toString() || undefined,
        isPinned: boolFromField(formData.get('isPinned'), 'pinned'),
        isActive: !boolFromField(formData.get('isActive'), 'hidden')
      },
      'Admin'
    );
    revalidatePath('/announcements');
    revalidatePath('/');
    return { status: 'success', message: 'Announcement saved.' };
  } catch (error) {
    console.error('Announcement save error', error);
    return { status: 'error', message: 'Unable to save announcement.' };
  }
}

export async function deleteAnnouncementAction(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing id');
    await deleteLandingAnnouncement(id, 'Admin');
    revalidatePath('/announcements');
    revalidatePath('/');
    return { status: 'success', message: 'Announcement deleted.' };
  } catch (error) {
    console.error('Announcement delete error', error);
    return { status: 'error', message: 'Unable to delete announcement.' };
  }
}

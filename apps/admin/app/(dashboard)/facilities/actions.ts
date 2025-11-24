'use server';

import { revalidatePath } from 'next/cache';
import { deleteLandingFacility, upsertLandingFacility } from '@infinity/mock-api';

export interface FacilityState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function upsertFacilityAction(_prev: FacilityState, formData: FormData): Promise<FacilityState> {
  try {
    await upsertLandingFacility(
      {
        id: formData.get('id')?.toString() || undefined,
        name: formData.get('name')?.toString() ?? '',
        description: formData.get('description')?.toString() ?? '',
        badge: formData.get('badge')?.toString() || undefined,
        mediaUrl: formData.get('mediaUrl')?.toString() || undefined
      },
      'Admin'
    );
    revalidatePath('/facilities');
    revalidatePath('/');
    return { status: 'success', message: 'Facility saved.' };
  } catch (error) {
    console.error('Facility save error', error);
    return { status: 'error', message: 'Unable to save facility.' };
  }
}

export async function deleteFacilityAction(_prev: FacilityState, formData: FormData): Promise<FacilityState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing id');
    await deleteLandingFacility(id, 'Admin');
    revalidatePath('/facilities');
    revalidatePath('/');
    return { status: 'success', message: 'Facility deleted.' };
  } catch (error) {
    console.error('Facility delete error', error);
    return { status: 'error', message: 'Unable to delete facility.' };
  }
}

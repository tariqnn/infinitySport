'use server';

import { revalidatePath } from 'next/cache';
import { landingProgramSchema } from '@infinity/types';
import { deleteLandingProgram, upsertLandingProgram } from '@infinity/mock-api';

export interface ProgramState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function upsertProgramAction(_prev: ProgramState, formData: FormData): Promise<ProgramState> {
  try {
    const payload = landingProgramSchema.parse({
      id: formData.get('id')?.toString() || undefined,
      title: formData.get('title')?.toString() ?? '',
      description: formData.get('description')?.toString() ?? '',
      sportType: formData.get('sportType')?.toString() ?? 'multi',
      badge: formData.get('badge')?.toString() || undefined,
      link: formData.get('link')?.toString() || '/programs',
      mediaUrl: formData.get('mediaUrl')?.toString() || undefined,
      isFeatured: formData.get('isFeatured')?.toString() === 'featured',
      isActive: formData.get('isActive')?.toString() !== 'hidden'
    });

    await upsertLandingProgram(payload, 'Admin');
    revalidatePath('/programs');
    revalidatePath('/');
    return { status: 'success', message: 'Program saved.' };
  } catch (error) {
    console.error('Program save error', error);
    return { status: 'error', message: 'Unable to save program.' };
  }
}

export async function deleteProgramAction(_prev: ProgramState, formData: FormData): Promise<ProgramState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing id');
    await deleteLandingProgram(id, 'Admin');
    revalidatePath('/programs');
    revalidatePath('/');
    return { status: 'success', message: 'Program deleted.' };
  } catch (error) {
    console.error('Program delete error', error);
    return { status: 'error', message: 'Unable to delete program.' };
  }
}
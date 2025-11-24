'use server';

import { revalidatePath } from 'next/cache';
import { landingOfferSchema } from '@infinity/types';
import { deleteLandingOffer, upsertLandingOffer } from '@infinity/mock-api';

export interface OfferState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

function featuresFromTextarea(value?: string | null) {
  return value
    ? value
        .split('\n')
        .map((feature) => feature.trim())
        .filter(Boolean)
    : [];
}

export async function upsertOfferAction(_prev: OfferState, formData: FormData): Promise<OfferState> {
  try {
    const payload = landingOfferSchema.parse({
      id: formData.get('id')?.toString() || undefined,
      name: formData.get('name')?.toString() ?? '',
      price: formData.get('price')?.toString() ?? '',
      badge: formData.get('badge')?.toString() || undefined,
      description: formData.get('description')?.toString() ?? '',
      features: featuresFromTextarea(formData.get('features')?.toString()),
      link: formData.get('link')?.toString() || '/offers',
      isFeatured: formData.get('isFeatured')?.toString() === 'featured',
      isActive: formData.get('isActive')?.toString() !== 'hidden'
    });

    await upsertLandingOffer(payload, 'Admin');
    revalidatePath('/offers');
    revalidatePath('/');
    return { status: 'success', message: 'Offer saved.' };
  } catch (error) {
    console.error('Offer save error', error);
    return { status: 'error', message: 'Unable to save offer.' };
  }
}

export async function deleteOfferAction(_prev: OfferState, formData: FormData): Promise<OfferState> {
  try {
    const id = formData.get('id')?.toString();
    if (!id) throw new Error('Missing id');
    await deleteLandingOffer(id, 'Admin');
    revalidatePath('/offers');
    revalidatePath('/');
    return { status: 'success', message: 'Offer deleted.' };
  } catch (error) {
    console.error('Offer delete error', error);
    return { status: 'error', message: 'Unable to delete offer.' };
  }
}
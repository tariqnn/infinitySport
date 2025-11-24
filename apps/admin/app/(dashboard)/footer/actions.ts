'use server';

import { revalidatePath } from 'next/cache';
import { landingFooterSchema } from '@infinity/types';
import { updateLandingFooter } from '@infinity/mock-api';

export interface FooterState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function updateFooterAction(_prev: FooterState, formData: FormData): Promise<FooterState> {
  try {
    const socialLinks = [0, 1, 2]
      .map((index) => {
        const label = formData.get(`social-${index}-label`)?.toString();
        const url = formData.get(`social-${index}-url`)?.toString();
        const id = formData.get(`social-${index}-id`)?.toString() || `social-${index}`;
        if (!label || !url) return null;
        return { id, label, href: url };
      })
      .filter(Boolean);

    const payload = landingFooterSchema.parse({
      address: formData.get('address')?.toString() ?? '',
      phone: formData.get('phone')?.toString() ?? '',
      email: formData.get('email')?.toString() ?? '',
      contactRecipientEmail: formData.get('contactRecipientEmail')?.toString() ?? '',
      socialLinks
    });

    await updateLandingFooter(payload, 'Admin');
    revalidatePath('/footer');
    revalidatePath('/');
    return { status: 'success', message: 'Footer updated.' };
  } catch (error) {
    console.error('Footer update error', error);
    return { status: 'error', message: 'Unable to update footer.' };
  }
}

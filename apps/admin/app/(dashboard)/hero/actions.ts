'use server';

import { revalidatePath } from 'next/cache';
import { landingHeroSchema, landingHighlightSchema } from '@infinity/types';
import { replaceLandingHighlights, updateLandingHero } from '@infinity/mock-api';

export interface HeroState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

export async function updateHeroAction(_prev: HeroState, formData: FormData): Promise<HeroState> {
  try {
    const heroPayload = landingHeroSchema.partial().parse({
      title: formData.get('title')?.toString(),
      subtitle: formData.get('subtitle')?.toString(),
      badge: formData.get('badge')?.toString() || undefined,
      primaryCtaLabel: formData.get('primaryCtaLabel')?.toString(),
      primaryCtaLink: formData.get('primaryCtaLink')?.toString(),
      secondaryCtaLabel: formData.get('secondaryCtaLabel')?.toString() || undefined,
      secondaryCtaLink: formData.get('secondaryCtaLink')?.toString() || undefined,
      backgroundImageUrl: formData.get('backgroundImageUrl')?.toString() || undefined,
      backgroundVideoUrl: formData.get('backgroundVideoUrl')?.toString() || undefined
    });

    await updateLandingHero(heroPayload, 'Admin');

    const highlights = [0, 1, 2]
      .map((index) => {
        const title = formData.get(`highlight-${index}-title`)?.toString();
        const description = formData.get(`highlight-${index}-description`)?.toString();
        const id = formData.get(`highlight-${index}-id`)?.toString() || `highlight-${index}`;
        if (!title || !description) return null;
        return landingHighlightSchema.parse({ id, title, description });
      })
      .filter(Boolean);

    if (highlights.length) {
      await replaceLandingHighlights(highlights, 'Admin');
    }

    revalidatePath('/hero');
    revalidatePath('/');
    return { status: 'success', message: 'Hero updated.' };
  } catch (error) {
    console.error('Hero update failed', error);
    return { status: 'error', message: 'Unable to update hero.' };
  }
}
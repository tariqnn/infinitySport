'use server';

import { revalidatePath } from 'next/cache';
import { createNews, updateNews, deleteNews } from '@infinity/mock-api';
import { newsItemSchema } from '@infinity/types';

export async function createNewsAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const title = formData.get('title')?.toString() ?? '';
    const body = formData.get('body')?.toString() ?? '';
    const author = formData.get('author')?.toString() ?? 'Staff User';
    const pinned = formData.get('pinned') === 'on';
    const tagsRaw = formData.get('tags')?.toString() ?? '';
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()) : undefined;

    newsItemSchema.parse({
      id: 'tmp',
      title,
      body,
      author,
      createdAt: new Date().toISOString(),
      pinned,
      tags
    });
    await createNews({ title, body, author, pinned, tags });
    revalidatePath('/news');
    return { error: undefined };
  } catch {
    return { error: 'Failed to publish news.' };
  }
}

export async function updateNewsAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const idValue = formData.get('id');
    if (!idValue) {
      return { error: 'Missing article id.' };
    }
    const id = idValue.toString();
    const title = formData.get('title')?.toString() ?? '';
    const body = formData.get('body')?.toString() ?? '';
    const author = formData.get('author')?.toString() ?? '';
    const pinned = formData.get('pinned') === 'on';
    const tagsRaw = formData.get('tags')?.toString() ?? '';
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()) : undefined;

    await updateNews(id, { title, body, author, pinned, tags });
    revalidatePath('/news');
    return { error: undefined };
  } catch {
    return { error: 'Failed to update news.' };
  }
}

export async function deleteNewsAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const idValue = formData.get('id');
    if (!idValue) {
      return { error: 'Missing article id.' };
    }
    await deleteNews(idValue.toString());
    revalidatePath('/news');
    return { error: undefined };
  } catch {
    return { error: 'Failed to delete news.' };
  }
}

export async function updatePinAction(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const idValue = formData.get('id');
    if (!idValue) {
      return { error: 'Missing article id.' };
    }
    const pinned = formData.get('pinned') === 'on';
    await updateNews(idValue.toString(), { pinned });
    revalidatePath('/news');
    return { error: undefined };
  } catch {
    return { error: 'Failed to update.' };
  }
}



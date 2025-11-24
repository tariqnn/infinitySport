'use server';

import { revalidatePath } from 'next/cache';
import { updatePettyCash } from '@infinity/mock-api';

export async function updatePettyCashStatus(_prev: { error?: string } | undefined, formData: FormData) {
  try {
    const idValue = formData.get('id');
    const statusValue = formData.get('status');

    if (!idValue || !statusValue) {
      return { error: 'Missing required fields' };
    }

    const status = statusValue.toString() as 'Requested' | 'Approved' | 'Rejected' | 'Reimbursed';
    await updatePettyCash(idValue.toString(), { status });
    revalidatePath('/finance/pettycash');
    return { error: undefined };
  } catch {
    return { error: 'Failed to update status' };
  }
}




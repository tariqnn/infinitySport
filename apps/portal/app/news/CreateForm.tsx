'use client';

import { Button, Input, Textarea } from '@infinity/ui';
import { createNewsAction } from './actions';
import { useFormState, useFormStatus } from 'react-dom';

export function CreateForm() {
  const [state, formAction] = useFormState(createNewsAction, { error: undefined });
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="title" label="Title" placeholder="Announcement title" required />
        <Input name="author" label="Author" placeholder="Your name" required />
      </div>
      <Textarea name="body" label="Body" placeholder="Write the announcement..." rows={6} required />
      <Input name="tags" label="Tags (comma separated)" placeholder="finance, operations" />
      <label className="flex items-center gap-2 text-sm text-white">
        <input type="checkbox" name="pinned" />
        Pin to top
      </label>
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
    </form>
  );
}



'use client';

import { Button, Input, Select, Textarea } from '@infinity/ui';
import { createEventAction } from './actions';
import { useFormState, useFormStatus } from 'react-dom';

export function CreateEventForm() {
  const [state, formAction] = useFormState(createEventAction, { error: undefined });
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="space-y-6">
      <Input name="title" label="Event title" placeholder="Event name" required />
      <Textarea name="description" label="Description" placeholder="Event details..." rows={4} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input name="date" type="datetime-local" label="Date & time" required />
        <Input name="location" label="Location" placeholder="Infinity Campus" defaultValue="Infinity Campus" />
      </div>
      <Select
        name="category"
        label="Category"
        defaultValue="general"
        options={[
          { value: 'general', label: 'General' },
          { value: 'training', label: 'Training' },
          { value: 'competition', label: 'Competition' },
          { value: 'meeting', label: 'Meeting' },
          { value: 'social', label: 'Social' }
        ]}
      />
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Creating...' : 'Create event'}
        </Button>
      </div>
    </form>
  );
}



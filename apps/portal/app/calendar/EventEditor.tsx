'use client';

import { useState } from 'react';
import { Button, Input, Modal, Select, Textarea } from '@infinity/ui';
import { EventItem } from '@infinity/types';
import { updateEventAction, deleteEventAction } from './actions';
import { useFormState, useFormStatus } from 'react-dom';

interface EventEditorProps {
  event: EventItem;
}

function EditForm({ event, onClose }: { event: EventItem; onClose: () => void }) {
  const [state, formAction] = useFormState(updateEventAction, { error: undefined });
  const { pending } = useFormStatus();

  if (state?.error === undefined && !pending) {
    setTimeout(() => onClose(), 100);
  }

  const eventDate = new Date(event.date);
  const dateStr = eventDate.toISOString().split('T')[0];
  const timeStr = eventDate.toTimeString().slice(0, 5);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={event.id} />
      <Input
        name="title"
        label="Event title"
        placeholder="Event name"
        defaultValue={event.title}
        required
      />
      <Textarea
        name="description"
        label="Description"
        placeholder="Event details..."
        defaultValue={event.description}
        rows={4}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="date"
          type="datetime-local"
          label="Date & time"
          defaultValue={`${dateStr}T${timeStr}`}
          required
        />
        <Input
          name="location"
          label="Location"
          placeholder="Infinity Campus"
          defaultValue={event.location ?? 'Infinity Campus'}
        />
      </div>
      <Select
        name="category"
        label="Category"
        defaultValue={event.category ?? 'general'}
        options={[
          { value: 'general', label: 'General' },
          { value: 'training', label: 'Training' },
          { value: 'competition', label: 'Competition' },
          { value: 'meeting', label: 'Meeting' },
          { value: 'social', label: 'Social' }
        ]}
      />
      {state?.error && <p className="text-sm text-rose-300">{state.error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : 'Save changes'}
        </Button>
      </div>
    </form>
  );
}

function DeleteButton({ eventId }: { eventId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useFormState(deleteEventAction, { error: undefined });
  const { pending } = useFormStatus();

  if (state?.error === undefined && !pending && confirming) {
    setTimeout(() => setConfirming(false), 100);
  }

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)}>
        Delete
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={eventId} />
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
        Cancel
      </Button>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? 'Deleting...' : 'Confirm delete'}
      </Button>
      {state?.error && <p className="text-xs text-rose-300">{state.error}</p>}
    </form>
  );
}

export function EventEditor({ event }: EventEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Edit
        </Button>
        <DeleteButton eventId={event.id} />
      </div>
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Edit event">
        <EditForm event={event} onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}



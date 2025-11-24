'use client';

import { useState } from 'react';
import { Modal, Button, Input, Textarea, Select } from '@infinity/ui';
import { createEventAction } from '../calendar/actions';
import { useRouter } from 'next/navigation';

export function CreateEventModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createEventAction(undefined, formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Event">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <Input name="title" label="Event title" placeholder="Event name" required className="text-gray-900 border-gray-300 bg-white" />
        <Textarea name="description" label="Description" placeholder="Event details..." rows={4} className="text-gray-900 border-gray-300 bg-white" />
        
        <div className="grid grid-cols-2 gap-4">
          <Input name="date" type="datetime-local" label="Date & time" required className="text-gray-900 border-gray-300 bg-white" />
          <Input name="location" label="Location" placeholder="Infinity Campus" defaultValue="Infinity Campus" className="text-gray-900 border-gray-300 bg-white" />
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
          className="text-gray-900 border-gray-300 bg-white"
        />
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
}


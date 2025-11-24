'use client';

import { useState } from 'react';
import { Modal, Button, Input, Textarea } from '@infinity/ui';
import { createNewsAction } from '../news/actions';
import { useRouter } from 'next/navigation';

export function CreateNewsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const result = await createNewsAction(undefined, formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create news');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Publish News">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <Input name="title" label="Title" placeholder="Announcement title" required className="text-gray-900 border-gray-300 bg-white" />
          <Input name="author" label="Author" placeholder="Your name" required className="text-gray-900 border-gray-300 bg-white" />
        </div>
        
        <Textarea name="body" label="Body" placeholder="Write the announcement..." rows={6} required className="text-gray-900 border-gray-300 bg-white" />
        <Input name="tags" label="Tags (comma separated)" placeholder="finance, operations" className="text-gray-900 border-gray-300 bg-white" />
        
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" name="pinned" className="rounded border-gray-300" />
          Pin to top
        </label>
        
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


'use client';

import { useState } from 'react';
import { Button, Input, Modal, Textarea } from '@infinity/ui';
import { NewsItem } from '@infinity/types';
import { updateNewsAction, deleteNewsAction } from './actions';
import { useFormState, useFormStatus } from 'react-dom';

interface NewsEditorProps {
  news: NewsItem;
}

function EditForm({ news, onClose }: { news: NewsItem; onClose: () => void }) {
  const [state, formAction] = useFormState(updateNewsAction, { error: undefined });
  const { pending } = useFormStatus();

  if (state?.error === undefined && !pending) {
    setTimeout(() => onClose(), 100);
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="id" value={news.id} />
      <div className="grid gap-4 md:grid-cols-2">
        <Input
          name="title"
          label="Title"
          placeholder="Announcement title"
          defaultValue={news.title}
          required
        />
        <Input
          name="author"
          label="Author"
          placeholder="Your name"
          defaultValue={news.author}
          required
        />
      </div>
      <Textarea
        name="body"
        label="Body"
        placeholder="Write the announcement..."
        defaultValue={news.body}
        rows={6}
        required
      />
      <Input
        name="tags"
        label="Tags (comma separated)"
        placeholder="finance, operations"
        defaultValue={news.tags?.join(', ')}
      />
      <label className="flex items-center gap-2 text-sm text-white">
        <input type="checkbox" name="pinned" defaultChecked={news.pinned} />
        Pin to top
      </label>
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

function DeleteButton({ newsId }: { newsId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useFormState(deleteNewsAction, { error: undefined });
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
      <input type="hidden" name="id" value={newsId} />
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

export function NewsEditor({ news }: NewsEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
          Edit
        </Button>
        <DeleteButton newsId={news.id} />
      </div>
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Edit news">
        <EditForm news={news} onClose={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}



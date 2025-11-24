'use client';

import { useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { tasksApi } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditTaskModal({ open, task, onClose }: { open: boolean; task: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await tasksApi.update(task.id, {
        title: String(formData.get('title')),
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        assignedTo: formData.get('assignedTo') ? String(formData.get('assignedTo')) : undefined,
        dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))).toISOString() : undefined,
        status: String(formData.get('status')),
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  }

  const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Task"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-task-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-task-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Task Title *" name="title" defaultValue={task.title} required />
        <Textarea label="Description" name="description" rows={4} defaultValue={task.description || ''} />
        <Input label="Assigned To" name="assignedTo" defaultValue={task.assignedTo || ''} />
        <Input label="Due Date" name="dueDate" type="date" defaultValue={dueDate} />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'OPEN', label: 'Open' },
            { value: 'IN_PROGRESS', label: 'In Progress' },
            { value: 'DONE', label: 'Done' },
          ]}
          defaultValue={task.status}
        />
      </form>
    </Modal>
  );
}


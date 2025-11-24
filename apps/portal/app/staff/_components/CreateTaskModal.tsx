'use client';

import { useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { tasksApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateTaskModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const company = await getFirstCompany();

    if (!company) {
      setError('No company found. Please create a company first.');
      setLoading(false);
      return;
    }

    try {
      await tasksApi.create({
        title: String(formData.get('title')),
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        assignedTo: formData.get('assignedTo') ? String(formData.get('assignedTo')) : undefined,
        dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))).toISOString() : undefined,
        status: 'OPEN',
        company: { connect: { id: company.id } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Task"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-task-form" isLoading={loading}>
            Create Task
          </Button>
        </>
      }
    >
      <form id="create-task-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Task Title *" name="title" required />
        <Textarea label="Description" name="description" rows={4} />
        <Input label="Assigned To" name="assignedTo" placeholder="Staff member name" />
        <Input label="Due Date" name="dueDate" type="date" />
      </form>
    </Modal>
  );
}


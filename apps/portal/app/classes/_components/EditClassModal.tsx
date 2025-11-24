'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { classesApi, coachesApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditClassModal({ open, classItem, onClose }: { open: boolean; classItem: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coaches, setCoaches] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadCoaches();
    }
  }, [open]);

  async function loadCoaches() {
    try {
      const company = await getFirstCompany();
      const data = await coachesApi.list(company?.id);
      setCoaches(data);
    } catch (error) {
      console.error('Failed to load coaches:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const startTime = new Date(`${formData.get('date')}T${formData.get('startTime')}`);
      const endTime = new Date(`${formData.get('date')}T${formData.get('endTime')}`);

      await classesApi.update(classItem.id, {
        name: String(formData.get('name')),
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        capacity: parseInt(String(formData.get('capacity'))),
        status: String(formData.get('status')),
        ...(formData.get('coachId') && { coach: { connect: { id: String(formData.get('coachId')) } } }),
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  }

  const startTime = new Date(classItem.startTime);
  const date = startTime.toISOString().split('T')[0];
  const startTimeStr = startTime.toTimeString().slice(0, 5);
  const endTime = new Date(classItem.endTime);
  const endTimeStr = endTime.toTimeString().slice(0, 5);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Class"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-class-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-class-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Class Name *" name="name" defaultValue={classItem.name} required />
        <Textarea label="Description" name="description" rows={3} defaultValue={classItem.description || ''} />
        <Select
          label="Coach (Optional)"
          name="coachId"
          options={[
            { value: '', label: 'None' },
            ...coaches.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })),
          ]}
          defaultValue={classItem.coachId || ''}
        />
        <Input label="Date *" name="date" type="date" required defaultValue={date} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Time *" name="startTime" type="time" required defaultValue={startTimeStr} />
          <Input label="End Time *" name="endTime" type="time" required defaultValue={endTimeStr} />
        </div>
        <Input label="Capacity *" name="capacity" type="number" required defaultValue={classItem.capacity} min="1" />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          defaultValue={classItem.status}
        />
      </form>
    </Modal>
  );
}


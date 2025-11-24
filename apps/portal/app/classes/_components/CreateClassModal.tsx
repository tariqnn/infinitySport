'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { classesApi, coachesApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateClassModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    const company = await getFirstCompany();

    if (!company) {
      setError('No company found. Please create a company first.');
      setLoading(false);
      return;
    }

    try {
      const startTime = new Date(`${formData.get('date')}T${formData.get('startTime')}`);
      const endTime = new Date(`${formData.get('date')}T${formData.get('endTime')}`);

      await classesApi.create({
        name: String(formData.get('name')),
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        capacity: parseInt(String(formData.get('capacity'))),
        status: 'SCHEDULED',
        company: { connect: { id: company.id } },
        ...(formData.get('coachId') && { coach: { connect: { id: String(formData.get('coachId')) } } }),
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Class"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-class-form" isLoading={loading}>
            Create Class
          </Button>
        </>
      }
    >
      <form id="create-class-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Class Name *" name="name" required />
        <Textarea label="Description" name="description" rows={3} />
        <Select
          label="Coach (Optional)"
          name="coachId"
          options={[
            { value: '', label: 'None' },
            ...coaches.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })),
          ]}
        />
        <Input label="Date *" name="date" type="date" required defaultValue={today} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Time *" name="startTime" type="time" required />
          <Input label="End Time *" name="endTime" type="time" required />
        </div>
        <Input label="Capacity *" name="capacity" type="number" required defaultValue="20" min="1" />
      </form>
    </Modal>
  );
}


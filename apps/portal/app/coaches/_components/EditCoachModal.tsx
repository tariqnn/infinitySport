'use client';

import { useState } from 'react';
import { Modal, Input, Textarea, Select, Button } from '../../_components/ui';
import { coachesApi } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditCoachModal({ open, coach, onClose }: { open: boolean; coach: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await coachesApi.update(coach.id, {
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
        email: formData.get('email') ? String(formData.get('email')) : undefined,
        phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
        specialty: formData.get('specialty') ? String(formData.get('specialty')) : undefined,
        bio: formData.get('bio') ? String(formData.get('bio')) : undefined,
        status: String(formData.get('status')),
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update coach');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Coach"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-coach-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-coach-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" name="firstName" defaultValue={coach.firstName} required />
          <Input label="Last Name *" name="lastName" defaultValue={coach.lastName} required />
        </div>

        <Input label="Email" name="email" type="email" defaultValue={coach.email || ''} />
        <Input label="Phone" name="phone" type="tel" defaultValue={coach.phone || ''} />
        <Input label="Specialty / Sport" name="specialty" defaultValue={coach.specialty || ''} />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
          ]}
          defaultValue={coach.status}
        />
        <Textarea label="Bio" name="bio" rows={3} defaultValue={coach.bio || ''} />
      </form>
    </Modal>
  );
}


'use client';

import { useState } from 'react';
import { Modal, Input, Textarea, Button } from '../../_components/ui';
import { coachesApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateCoachModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      await coachesApi.create({
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
        email: formData.get('email') ? String(formData.get('email')) : undefined,
        phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
        specialty: formData.get('specialty') ? String(formData.get('specialty')) : undefined,
        bio: formData.get('bio') ? String(formData.get('bio')) : undefined,
        status: 'ACTIVE',
        company: { connect: { id: company.id } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create coach');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Coach"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-coach-form" isLoading={loading}>
            Create Coach
          </Button>
        </>
      }
    >
      <form id="create-coach-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" name="firstName" required />
          <Input label="Last Name *" name="lastName" required />
        </div>

        <Input label="Email" name="email" type="email" />
        <Input label="Phone" name="phone" type="tel" />
        <Input label="Specialty / Sport" name="specialty" placeholder="e.g. Basketball, Padel" />
        <Textarea label="Bio" name="bio" rows={3} />
      </form>
    </Modal>
  );
}


'use client';

import { useState } from 'react';
import { Modal, Input, Textarea, Button } from '../../_components/ui';
import { membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateMemberModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      await membersApi.create({
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
        email: formData.get('email') ? String(formData.get('email')) : undefined,
        phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
        dateOfBirth: formData.get('dateOfBirth') ? new Date(String(formData.get('dateOfBirth'))).toISOString() : undefined,
        status: 'ACTIVE',
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        guardianName: formData.get('guardianName') ? String(formData.get('guardianName')) : undefined,
        guardianPhone: formData.get('guardianPhone') ? String(formData.get('guardianPhone')) : undefined,
        company: { connect: { id: company.id } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Member"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-member-form" isLoading={loading}>
            Create Member
          </Button>
        </>
      }
    >
      <form id="create-member-form" onSubmit={handleSubmit} className="space-y-4">
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
        <Input label="Date of Birth" name="dateOfBirth" type="date" />
        <Input label="Guardian Name" name="guardianName" />
        <Input label="Guardian Phone" name="guardianPhone" type="tel" />
        <Textarea label="Notes" name="notes" rows={3} />
      </form>
    </Modal>
  );
}


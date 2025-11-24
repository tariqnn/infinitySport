'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Textarea, Select, Button } from '../../_components/ui';
import { membersApi } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditMemberModal({ open, member, onClose }: { open: boolean; member: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await membersApi.update(member.id, {
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
        email: formData.get('email') ? String(formData.get('email')) : undefined,
        phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
        dateOfBirth: formData.get('dateOfBirth') ? new Date(String(formData.get('dateOfBirth'))).toISOString() : undefined,
        status: String(formData.get('status')),
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        guardianName: formData.get('guardianName') ? String(formData.get('guardianName')) : undefined,
        guardianPhone: formData.get('guardianPhone') ? String(formData.get('guardianPhone')) : undefined,
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  }

  const dateOfBirth = member.dateOfBirth ? new Date(member.dateOfBirth).toISOString().split('T')[0] : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Member"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-member-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-member-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="First Name *" name="firstName" defaultValue={member.firstName} required />
          <Input label="Last Name *" name="lastName" defaultValue={member.lastName} required />
        </div>

        <Input label="Email" name="email" type="email" defaultValue={member.email || ''} />
        <Input label="Phone" name="phone" type="tel" defaultValue={member.phone || ''} />
        <Input label="Date of Birth" name="dateOfBirth" type="date" defaultValue={dateOfBirth} />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'ACTIVE', label: 'Active' },
            { value: 'INACTIVE', label: 'Inactive' },
            { value: 'FROZEN', label: 'Frozen' },
            { value: 'EXPIRED', label: 'Expired' },
          ]}
          defaultValue={member.status}
        />
        <Input label="Guardian Name" name="guardianName" defaultValue={member.guardianName || ''} />
        <Input label="Guardian Phone" name="guardianPhone" type="tel" defaultValue={member.guardianPhone || ''} />
        <Textarea label="Notes" name="notes" rows={3} defaultValue={member.notes || ''} />
      </form>
    </Modal>
  );
}


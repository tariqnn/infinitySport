'use client';

import { useState } from 'react';
import { Modal } from '@infinity/ui';
import { Button, Input, Textarea } from './ui';
import { apiClient } from '../../lib/apiClient';
import { useRouter } from 'next/navigation';

export function CreateMemberModal({ open, onClose, companyId }: { open: boolean; onClose: () => void; companyId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const memberData: any = {
        firstName: String(formData.get('firstName')),
        lastName: String(formData.get('lastName')),
        email: formData.get('email') ? String(formData.get('email')) : undefined,
        phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
        dateOfBirth: formData.get('dateOfBirth') ? new Date(String(formData.get('dateOfBirth'))).toISOString() : undefined,
        status: 'ACTIVE',
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        guardianName: formData.get('guardianName') ? String(formData.get('guardianName')) : undefined,
        guardianPhone: formData.get('guardianPhone') ? String(formData.get('guardianPhone')) : undefined,
      };

      // Only include company if provided
      if (companyId) {
        memberData.company = { connect: { id: companyId } };
      } else {
        // Try to get first company if available (optional)
        try {
          const companies = await apiClient.getCompanies();
          if (companies.length > 0) {
            memberData.company = { connect: { id: companies[0].id } };
          }
        } catch {
          // Company is optional, continue without it
        }
      }

      await apiClient.createMember(memberData);

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
    <Modal open={open} onClose={onClose} title="Add Member">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            name="firstName"
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            required
          />
        </div>
        
        <Input
          label="Email"
          name="email"
          type="email"
        />
        
        <Input
          label="Phone"
          name="phone"
          type="tel"
        />
        
        <Input
          label="Date of Birth"
          name="dateOfBirth"
          type="date"
        />
        
        <Input
          label="Guardian Name"
          name="guardianName"
        />
        
        <Input
          label="Guardian Phone"
          name="guardianPhone"
          type="tel"
        />
        
        <Textarea
          label="Notes"
          name="notes"
          rows={3}
        />
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

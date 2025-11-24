'use client';

import { useState } from 'react';
import { Modal, Button } from '@infinity/ui';
import { apiClient } from '../../lib/apiClient';
import { useRouter } from 'next/navigation';

export function CreateCompanyModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess?: (companyId: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      const company = await apiClient.createCompany({
        name: String(formData.get('name')),
        contactName: String(formData.get('contactName')),
        contactEmail: String(formData.get('contactEmail')),
        phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
        status: 'ACTIVE',
      });

      router.refresh();
      onClose();
      if (onSuccess) {
        onSuccess(company.id);
      }
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Company">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
          <input name="name" required placeholder="e.g. Infinity Sports" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name *</label>
          <input name="contactName" required placeholder="e.g. John Doe" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email *</label>
          <input name="contactEmail" type="email" required placeholder="e.g. contact@example.com" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input name="phone" type="tel" placeholder="e.g. +962 7 9555 0073" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Submit
          </Button>
        </div>
      </form>
    </Modal>
  );
}


'use client';

import { useState } from 'react';
import { Modal } from '@infinity/ui';
import { Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreatePettyCashTransactionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      await financeApi.pettyCash.create({
        date: new Date(String(formData.get('date'))).toISOString(),
        item: String(formData.get('item')),
        staff: formData.get('staff') ? String(formData.get('staff')) : undefined,
        amount: parseInt(String(formData.get('amount'))),
        currency: String(formData.get('currency') || 'JOD'),
        type: String(formData.get('type')),
        reference: formData.get('reference') ? String(formData.get('reference')) : undefined,
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        company: { connect: { id: company.id } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create petty cash transaction');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Petty Cash Transaction">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Date *" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          <Select
            label="Type *"
            name="type"
            required
            options={[
              { value: '', label: 'Select type' },
              { value: 'ISSUE', label: 'Issue' },
              { value: 'REPLENISH', label: 'Replenish' },
            ]}
          />
        </div>

        <Input label="Item *" name="item" required placeholder="e.g. Office supplies" />
        <Input label="Staff" name="staff" placeholder="Staff member name" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount *" name="amount" type="number" required />
          <Select
            label="Currency"
            name="currency"
            options={[
              { value: 'JOD', label: 'JOD' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
          />
        </div>
        <Input label="Reference" name="reference" placeholder="Receipt #, note" />
        <Textarea label="Description" name="description" rows={3} />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Transaction
          </Button>
        </div>
      </form>
    </Modal>
  );
}


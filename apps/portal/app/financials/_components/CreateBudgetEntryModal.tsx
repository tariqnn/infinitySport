'use client';

import { useState } from 'react';
import { Modal } from '@infinity/ui';
import { Input, Textarea, Select, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateBudgetEntryModal({
  open,
  onClose,
  categoryId,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categoryId?: string;
  categories: any[];
}) {
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

    const selectedCategoryId = categoryId || String(formData.get('categoryId'));
    if (!selectedCategoryId) {
      setError('Please select a category');
      setLoading(false);
      return;
    }

    try {
      const periodStart = new Date(String(formData.get('periodStart')));
      const periodEnd = new Date(String(formData.get('periodEnd')));

      await financeApi.budgetEntries.create({
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        plannedAmount: parseInt(String(formData.get('plannedAmount'))),
        actualAmount: formData.get('actualAmount') ? parseInt(String(formData.get('actualAmount'))) : 0,
        currency: String(formData.get('currency') || 'JOD'),
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        company: { connect: { id: company.id } },
        category: { connect: { id: selectedCategoryId } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create budget entry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Budget Entry">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!categoryId && (
          <Select
            label="Category *"
            name="categoryId"
            required
            options={[
              { value: '', label: 'Select a category' },
              ...categories.map((cat) => ({ value: cat.id, label: cat.name })),
            ]}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input label="Period Start *" name="periodStart" type="date" required />
          <Input label="Period End *" name="periodEnd" type="date" required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Planned Amount *" name="plannedAmount" type="number" required />
          <Input label="Actual Amount" name="actualAmount" type="number" defaultValue="0" />
        </div>

        <Select
          label="Currency"
          name="currency"
          options={[
            { value: 'JOD', label: 'JOD' },
            { value: 'USD', label: 'USD' },
            { value: 'EUR', label: 'EUR' },
          ]}
        />

        <Textarea label="Notes" name="notes" rows={3} />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Entry
          </Button>
        </div>
      </form>
    </Modal>
  );
}


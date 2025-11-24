'use client';

import { useState } from 'react';
import { Modal } from '@infinity/ui';
import { Input, Textarea, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateBudgetCategoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      await financeApi.budgetCategories.create({
        name: String(formData.get('name')),
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        order: formData.get('order') ? parseInt(String(formData.get('order'))) : 0,
        company: { connect: { id: company.id } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create budget category');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Budget Category">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Category Name *" name="name" required />
        <Textarea label="Description" name="description" rows={3} />
        <Input label="Order" name="order" type="number" defaultValue="0" />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Create Category
          </Button>
        </div>
      </form>
    </Modal>
  );
}


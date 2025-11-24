'use client';

import { useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { inventoryApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateInventoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      await inventoryApi.create({
        name: String(formData.get('name')),
        category: formData.get('category') ? String(formData.get('category')) : undefined,
        location: formData.get('location') ? String(formData.get('location')) : undefined,
        quantity: parseInt(String(formData.get('quantity'))),
        status: String(formData.get('status') || 'AVAILABLE'),
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        company: { connect: { id: company.id } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create inventory item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Inventory Item"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-inventory-form" isLoading={loading}>
            Create Item
          </Button>
        </>
      }
    >
      <form id="create-inventory-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Item Name *" name="name" required />
        <Input label="Category" name="category" placeholder="e.g. Equipment, Supplies" />
        <Input label="Location" name="location" placeholder="e.g. Equipment room, Court 1" />
        <Input label="Quantity *" name="quantity" type="number" required defaultValue="0" min="0" />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'AVAILABLE', label: 'Available' },
            { value: 'LOW', label: 'Low' },
            { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
            { value: 'RETIRED', label: 'Retired' },
          ]}
          defaultValue="AVAILABLE"
        />
        <Textarea label="Notes" name="notes" rows={3} />
      </form>
    </Modal>
  );
}


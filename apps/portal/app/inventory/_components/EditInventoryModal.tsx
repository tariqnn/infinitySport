'use client';

import { useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { inventoryApi } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditInventoryModal({ open, item, onClose }: { open: boolean; item: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await inventoryApi.update(item.id, {
        name: String(formData.get('name')),
        category: formData.get('category') ? String(formData.get('category')) : undefined,
        location: formData.get('location') ? String(formData.get('location')) : undefined,
        quantity: parseInt(String(formData.get('quantity'))),
        status: String(formData.get('status')),
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory item');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Inventory Item"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-inventory-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-inventory-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Item Name *" name="name" defaultValue={item.name} required />
        <Input label="Category" name="category" defaultValue={item.category || ''} />
        <Input label="Location" name="location" defaultValue={item.location || ''} />
        <Input label="Quantity *" name="quantity" type="number" required defaultValue={item.quantity} min="0" />
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
          defaultValue={item.status}
        />
        <Textarea label="Notes" name="notes" rows={3} defaultValue={item.notes || ''} />
      </form>
    </Modal>
  );
}


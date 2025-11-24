'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditInvoiceModal({ open, invoice, onClose }: { open: boolean; invoice: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open]);

  async function loadMembers() {
    try {
      const company = await getFirstCompany();
      const data = await membersApi.list(company?.id);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      await financeApi.invoices.update(invoice.id, {
        amount: parseInt(String(formData.get('amount'))),
        currency: String(formData.get('currency')),
        status: String(formData.get('status')),
        dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))).toISOString() : undefined,
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        ...(formData.get('memberId') && { member: { connect: { id: String(formData.get('memberId')) } } }),
        ...(formData.get('status') === 'PAID' && !invoice.paidAt && { paidAt: new Date().toISOString() }),
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update invoice');
    } finally {
      setLoading(false);
    }
  }

  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Invoice"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-invoice-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-invoice-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Select
          label="Member (Optional)"
          name="memberId"
          options={[
            { value: '', label: 'None' },
            ...members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
          ]}
          defaultValue={invoice.memberId || ''}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount *" name="amount" type="number" required min="0" step="0.01" defaultValue={invoice.amount} />
          <Select
            label="Currency"
            name="currency"
            options={[
              { value: 'JOD', label: 'JOD' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            defaultValue={invoice.currency}
          />
        </div>
        <Input label="Due Date" name="dueDate" type="date" defaultValue={dueDate} />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SENT', label: 'Sent' },
            { value: 'PAID', label: 'Paid' },
            { value: 'OVERDUE', label: 'Overdue' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          defaultValue={invoice.status}
        />
        <Textarea label="Description" name="description" rows={3} defaultValue={invoice.description || ''} />
      </form>
    </Modal>
  );
}


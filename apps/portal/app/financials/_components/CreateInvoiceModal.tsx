'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
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
    const company = await getFirstCompany();

    if (!company) {
      setError('No company found. Please create a company first.');
      setLoading(false);
      return;
    }

    try {
      await financeApi.invoices.create({
        amount: parseInt(String(formData.get('amount'))),
        currency: String(formData.get('currency') || 'JOD'),
        status: String(formData.get('status') || 'DRAFT'),
        dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))).toISOString() : undefined,
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        company: { connect: { id: company.id } },
        ...(formData.get('memberId') && { member: { connect: { id: String(formData.get('memberId')) } } }),
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Invoice"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-invoice-form" isLoading={loading}>
            Create Invoice
          </Button>
        </>
      }
    >
      <form id="create-invoice-form" onSubmit={handleSubmit} className="space-y-4">
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
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Amount *" name="amount" type="number" required min="0" step="0.01" />
          <Select
            label="Currency"
            name="currency"
            options={[
              { value: 'JOD', label: 'JOD' },
              { value: 'USD', label: 'USD' },
              { value: 'EUR', label: 'EUR' },
            ]}
            defaultValue="JOD"
          />
        </div>
        <Input label="Due Date" name="dueDate" type="date" defaultValue={today} />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SENT', label: 'Sent' },
            { value: 'PAID', label: 'Paid' },
          ]}
          defaultValue="DRAFT"
        />
        <Textarea label="Description" name="description" rows={3} />
      </form>
    </Modal>
  );
}


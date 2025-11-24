'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@infinity/ui';
import { Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateCashFlowEntryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadInvoices();
    }
  }, [open]);

  async function loadInvoices() {
    try {
      const company = await getFirstCompany();
      const data = await financeApi.invoices.list(company?.id);
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices:', error);
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
      await financeApi.cashFlow.create({
        date: new Date(String(formData.get('date'))).toISOString(),
        type: String(formData.get('type')),
        category: formData.get('category') ? String(formData.get('category')) : undefined,
        amount: parseInt(String(formData.get('amount'))),
        currency: String(formData.get('currency') || 'JOD'),
        relatedInvoiceId: formData.get('relatedInvoiceId') ? String(formData.get('relatedInvoiceId')) : undefined,
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        company: { connect: { id: company.id } },
        ...(formData.get('relatedInvoiceId') && {
          relatedInvoice: { connect: { id: String(formData.get('relatedInvoiceId')) } },
        }),
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create cash flow entry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Cash Flow Entry">
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
              { value: 'INFLOW', label: 'Inflow' },
              { value: 'OUTFLOW', label: 'Outflow' },
            ]}
          />
        </div>

        <Input label="Category" name="category" placeholder="e.g. Memberships, Salaries" />
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
        <Select
          label="Related Invoice (Optional)"
          name="relatedInvoiceId"
          options={[
            { value: '', label: 'None' },
            ...invoices.map((inv) => ({ value: inv.id, label: `${inv.number} - ${inv.currency} ${inv.amount}` })),
          ]}
        />
        <Textarea label="Description" name="description" rows={3} />

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


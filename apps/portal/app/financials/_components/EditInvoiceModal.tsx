'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';
import { INVOICE_CONFIG } from '../../../lib/invoiceConfig';

export function EditInvoiceModal({ open, invoice, onClose }: { open: boolean; invoice: any; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  
  // Extract invoice meta data (for backward compatibility)
  const invoiceMeta = (() => {
    if (invoice?.meta && typeof invoice.meta === 'object') {
      return invoice.meta;
    }
    try {
      if (invoice.description && typeof invoice.description === 'string') {
        return JSON.parse(invoice.description);
      }
    } catch {}
    return {};
  })();
  
  const companyEmail = invoice.companyEmail || invoiceMeta.companyEmail || INVOICE_CONFIG.companyEmail;
  const companyPhone = invoice.companyPhone || invoiceMeta.companyPhone || INVOICE_CONFIG.companyPhone;
  const note = invoice.note || invoiceMeta.note || '';

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
      const amountPaid = formData.get('amountPaid') ? Math.round(Number(formData.get('amountPaid')) || 0) : undefined;
      const amount = parseInt(String(formData.get('amount')));
      const status = String(formData.get('status'));
      
      await financeApi.invoices.update(invoice.id, {
        amount,
        amountPaid,
        currency: String(formData.get('currency')),
        status,
        dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))).toISOString() : undefined,
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        companyEmail: formData.get('companyEmail') ? String(formData.get('companyEmail')) : undefined,
        companyPhone: formData.get('companyPhone') ? String(formData.get('companyPhone')) : undefined,
        note: formData.get('note') ? String(formData.get('note')) : undefined,
        ...(formData.get('memberId') && { member: { connect: { id: String(formData.get('memberId')) } } }),
        ...((status === 'PAID' || (amountPaid && amountPaid >= amount)) && !invoice.paidAt && { paidAt: new Date().toISOString() }),
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
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Amount Paid" 
            name="amountPaid" 
            type="number" 
            min="0" 
            step="0.01" 
            max={invoice.amount}
            defaultValue={invoice.amountPaid || 0}
            hint="Enter amount already paid. Status will auto-update based on this value."
          />
          <div className="space-y-1">
            <div className="text-sm font-medium text-textPrimary">
              Remaining: {invoice.currency} {((invoice.amount || 0) - (invoice.amountPaid || 0)).toFixed(2)}
            </div>
          </div>
        </div>
        <Input label="Due Date" name="dueDate" type="date" defaultValue={dueDate} />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'DRAFT', label: 'Draft' },
            { value: 'SENT', label: 'Sent' },
            { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
            { value: 'PAID', label: 'Paid' },
            { value: 'OVERDUE', label: 'Overdue' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          defaultValue={invoice.status}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Company Email *"
            type="email"
            name="companyEmail"
            defaultValue={companyEmail}
            required
          />
          <Input
            label="Company Phone *"
            type="tel"
            name="companyPhone"
            defaultValue={companyPhone}
            required
          />
        </div>
        <Textarea
          label="Note (optional)"
          name="note"
          rows={4}
          defaultValue={note}
          hint={`Additional note to appear on the invoice. Max ${INVOICE_CONFIG.noteMaxLength} characters.`}
          maxLength={INVOICE_CONFIG.noteMaxLength}
        />
        <Textarea label="Description" name="description" rows={3} defaultValue={invoice.description || ''} />
      </form>
    </Modal>
  );
}

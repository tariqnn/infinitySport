'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, getFirstCompany } from '../../../lib/portalApi';
import { INVOICE_CONFIG } from '../../../lib/invoiceConfig';

function getTodayDateInput(): string {
  return new Date().toISOString().split('T')[0];
}

function getDefaultDueDateInput(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

export function CreateCompanyInvoiceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (invoice: Record<string, unknown>) => void;
}) {
  const router = useRouter();
  const [companyName, setCompanyName] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [invoiceTitle, setInvoiceTitle] = useState('Company service invoice');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [issueDate, setIssueDate] = useState(getTodayDateInput());
  const [dueDate, setDueDate] = useState(getDefaultDueDateInput());
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCompanyName('');
    setCompanyEmail('');
    setCompanyAddress('');
    setInvoiceTitle('Company service invoice');
    setAmount('');
    setPaymentMethod('CARD');
    setIssueDate(getTodayDateInput());
    setDueDate(getDefaultDueDateInput());
    setNote('');
    setError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedCompanyName = companyName.trim();
    const trimmedInvoiceTitle = invoiceTitle.trim();
    const numericAmount = Number(amount);

    if (!trimmedCompanyName) {
      setError('Company name is required.');
      return;
    }
    if (!trimmedInvoiceTitle) {
      setError('Invoice title is required.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    if (!issueDate) {
      setError('Issue date is required.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }
    if (new Date(dueDate) < new Date(issueDate)) {
      setError('Due date must be on or after the issue date.');
      return;
    }

    setLoading(true);

    try {
      const company = await getFirstCompany();
      if (!company?.id) {
        throw new Error('Company record is missing. Please check financial settings and try again.');
      }

      const created = (await financeApi.invoices.create({
        amount: numericAmount,
        amountPaid: 0,
        currency: 'JOD',
        status: 'SENT',
        paymentMethod,
        invoiceSource: 'company',
        description: trimmedInvoiceTitle,
        issuedAt: new Date(issueDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        company: { connect: { id: company.id } },
        companyName: INVOICE_CONFIG.companyName,
        companyAddress: INVOICE_CONFIG.companyAddress,
        companyEmail: INVOICE_CONFIG.companyEmail,
        companyPhone: INVOICE_CONFIG.companyPhone,
        clientName: trimmedCompanyName,
        clientEmail: companyEmail.trim() || '',
        clientAddress: companyAddress.trim() || '',
        lineItems: [
          {
            description: trimmedInvoiceTitle,
            quantity: 1,
            unitPrice: numericAmount,
            lineTotal: numericAmount,
          },
        ],
        subtotal: numericAmount,
        note: note.trim() || undefined,
        generatePdf: true,
      })) as Record<string, unknown>;

      onCreated?.(created);
      router.refresh();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create company invoice.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Make Invoice for Company" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        ) : null}

        <Input
          label="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Enter company name"
          required
        />
        <Input
          label="Company email"
          type="email"
          value={companyEmail}
          onChange={(e) => setCompanyEmail(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Company address"
          value={companyAddress}
          onChange={(e) => setCompanyAddress(e.target.value)}
          placeholder="Optional"
        />
        <Input
          label="Invoice title"
          value={invoiceTitle}
          onChange={(e) => setInvoiceTitle(e.target.value)}
          placeholder="e.g. Sponsorship package"
          required
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Amount (JOD)"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <Select
            label="Payment method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as 'CARD' | 'CASH')}
            options={[
              { value: 'CARD', label: 'Card' },
              { value: 'CASH', label: 'Cash' },
            ]}
          />
          <Input
            label="Issue date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
          />
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>

        <Textarea
          label="Invoice note"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note printed on the invoice PDF"
          maxLength={INVOICE_CONFIG.noteMaxLength}
          hint={`Max ${INVOICE_CONFIG.noteMaxLength} characters.`}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Make Invoice
          </Button>
        </div>
      </form>
    </Modal>
  );
}

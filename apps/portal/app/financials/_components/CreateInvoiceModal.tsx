'use client';

import { useMemo, useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { financeApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';
import { getApiBaseUrl } from '../../../lib/getApiBaseUrl';
import { getBasketballPackages } from '@infinity/mock-api';
import { INVOICE_CONFIG } from '../../../lib/invoiceConfig';

type LineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

const API_BASE_URL = getApiBaseUrl();

export function CreateInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  // Form state
  const [companyAddress, setCompanyAddress] = useState(INVOICE_CONFIG.companyAddress);
  const [companyEmail, setCompanyEmail] = useState(INVOICE_CONFIG.companyEmail);
  const [companyPhone, setCompanyPhone] = useState(INVOICE_CONFIG.companyPhone);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('-');
  const [memberId, setMemberId] = useState<string>('');
  const [currency, setCurrency] = useState('JOD');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [tax, setTax] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState(''); // Payment terms/notes
  const [note, setNote] = useState(''); // Invoice note field
  const [items, setItems] = useState<LineItem[]>([
    { id: crypto?.randomUUID?.() ?? String(Date.now()), description: 'Service', quantity: 1, unitPrice: 0 },
  ]);
  const [quickAddPkg, setQuickAddPkg] = useState('');

  const basketballPackagesWithPrice = useMemo(
    () =>
      getBasketballPackages().filter((p) => {
        const n = parseFloat(String(p.price ?? ''));
        return !Number.isNaN(n) && n > 0;
      }),
    []
  );

  useEffect(() => {
    if (open) {
      loadMembers();
    }
  }, [open]);

  // Auto-fill client info when selecting a member (only fills empty fields)
  useEffect(() => {
    if (!memberId) return;
    const m = members.find((x) => x.id === memberId);
    if (!m) return;

    if (!clientName.trim()) setClientName(`${m.firstName || ''} ${m.lastName || ''}`.trim());
    if (!clientEmail.trim() && m.email) setClientEmail(String(m.email));
  }, [memberId, members, clientName, clientEmail]);

  async function loadMembers() {
    try {
      const company = await getFirstCompany();
      const data = await membersApi.list(company?.id);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  }

  const fieldErrors = useMemo(() => {
    const next: Record<string, string> = {};

    if (!companyAddress.trim()) next.companyAddress = 'Company address is required.';
    if (!companyEmail.trim()) next.companyEmail = 'Company email is required.';
    if (companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) next.companyEmail = 'Enter a valid email address.';
    if (!companyPhone.trim()) next.companyPhone = 'Company phone is required.';
    if (companyPhone.trim().length < 8) next.companyPhone = 'Phone number must be at least 8 characters.';
    if (!clientName.trim()) next.clientName = 'Client name is required.';
    // Client email is optional (some members don't have an email); validate only if provided
    if (clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) next.clientEmail = 'Enter a valid email address.';
    // Note validation (optional but has max length)
    if (note.length > INVOICE_CONFIG.noteMaxLength) next.note = `Note must be ${INVOICE_CONFIG.noteMaxLength} characters or less.`;
    // Client address is optional; keep it for PDF but don't block creation
    if (!issueDate) next.issueDate = 'Issue date is required.';
    if (!dueDate) next.dueDate = 'Due date is required.';
    if (issueDate && dueDate && new Date(dueDate) < new Date(issueDate)) next.dueDate = 'Due date must be on/after issue date.';
    if (!currency) next.currency = 'Currency is required.';
    if (!paymentMethod) next.paymentMethod = 'Payment method is required.';

    if (!items.length) {
      next.items = 'At least one line item is required.';
    } else {
      items.forEach((it, idx) => {
        if (!it.description.trim()) next[`item_${idx}_description`] = 'Description is required.';
        if (!Number.isFinite(it.quantity) || it.quantity <= 0) next[`item_${idx}_quantity`] = 'Quantity must be greater than 0.';
        if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) next[`item_${idx}_unitPrice`] = 'Unit price must be 0 or greater.';
      });
    }

    const taxVal = tax.trim() ? Number(tax) : 0;
    if (tax.trim() && (!Number.isFinite(taxVal) || taxVal < 0)) next.tax = 'Tax must be a valid number (0 or greater).';

    const discountVal = discount.trim() ? Number(discount) : 0;
    if (discount.trim() && (!Number.isFinite(discountVal) || discountVal < 0)) next.discount = 'Discount must be a valid number (0 or greater).';

    const amountPaidVal = amountPaid.trim() ? Number(amountPaid) : 0;
    if (amountPaid.trim() && (!Number.isFinite(amountPaidVal) || amountPaidVal < 0)) {
      next.amountPaid = 'Amount paid must be a valid number (0 or greater).';
    }

    return next;
  }, [companyAddress, clientName, clientEmail, clientAddress, issueDate, dueDate, currency, items, tax, discount, amountPaid]);

  const computed = useMemo(() => {
    const lineTotals = items.map((it) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.unitPrice) || 0;
      return qty * unit;
    });
    const subtotal = lineTotals.reduce((s, v) => s + v, 0);
    const taxAmount = tax.trim() ? Number(tax) || 0 : 0;
    const discountAmount = discount.trim() ? Number(discount) || 0 : 0;
    const total = subtotal + taxAmount - discountAmount;

    return {
      lineTotals,
      subtotal,
      taxAmount,
      discountAmount,
      total,
    };
  }, [items, tax, discount]);

  const canSubmit = Object.keys(fieldErrors).length === 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!canSubmit) {
      setError('Please fix the highlighted fields.');
      return;
    }

    setLoading(true);

    const company = await getFirstCompany();
    if (!company) {
      setError('Cannot connect to the API. Start it with: npm run dev:api (must run on http://localhost:4000).');
      setLoading(false);
      return;
    }

    try {
      const payloadItems = items.map((it, idx) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        lineTotal: computed.lineTotals[idx] || 0,
      }));

      const paidAmount = amountPaid.trim() ? Math.round(Number(amountPaid) || 0) : 0;
      const totalAmount = Math.round(computed.total);
      let invoiceStatus = 'DRAFT';
      if (paidAmount > 0 && paidAmount < totalAmount) {
        invoiceStatus = 'PARTIALLY_PAID';
      } else if (paidAmount >= totalAmount && totalAmount > 0) {
        invoiceStatus = 'PAID';
      }

      const created = await financeApi.invoices.create({
        // Existing required fields
        amount: totalAmount, // legacy int column (for dashboards/table); PDF uses lineItems for exact values
        amountPaid: paidAmount,
        currency,
        status: invoiceStatus,
        paymentMethod,
        issuedAt: new Date(issueDate).toISOString(),
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        description: undefined,

        // Company relation
        company: { connect: { id: company.id } },
        ...(memberId ? { member: { connect: { id: memberId } } } : {}),

        // Enterprise invoice fields (stored for client-ready PDF)
        companyName: INVOICE_CONFIG.companyName,
        companyAddress: companyAddress.trim(),
        companyEmail: companyEmail.trim(),
        companyPhone: companyPhone.trim(),
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientAddress: clientAddress.trim(),
        lineItems: payloadItems,
        subtotal: Math.round(computed.subtotal),
        tax: tax.trim() ? Math.round(Number(tax) || 0) : undefined,
        discount: discount.trim() ? Math.round(Number(discount) || 0) : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
        note: note.trim() ? note.trim() : undefined,
        generatePdf: true,
      });

      // Download PDF immediately if available
      let pdfPath: string | undefined = created?.pdfPath;
      if (!pdfPath && typeof created?.description === 'string') {
        try {
          const meta = JSON.parse(created.description);
          pdfPath = meta?.pdfPath;
        } catch {}
      }

      if (pdfPath) {
        const base = pdfPath.startsWith('/api/') ? (typeof window !== 'undefined' ? window.location.origin : '') : API_BASE_URL;
        const pdfUrl = base + pdfPath;
        const res = await fetch(pdfUrl, { cache: 'no-store' });
        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${created.number || 'invoice'}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          URL.revokeObjectURL(url);
        }
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Invoice"
      size="xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-invoice-form" isLoading={loading} disabled={!canSubmit}>
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

        {/* Company */}
        <div className="grid grid-cols-2 gap-4">
          <Input label="Company name" value={INVOICE_CONFIG.companyName} disabled />
          <Input
            label="Invoice number"
            value="Auto-generated on save"
            disabled
            hint="A unique invoice number will be generated automatically."
          />
        </div>
        <Input
          label="Company address"
          value={companyAddress}
          onChange={(e) => setCompanyAddress(e.target.value)}
          error={fieldErrors.companyAddress}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Company email *"
            type="email"
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            error={fieldErrors.companyEmail}
            required
            placeholder="info@company.com"
          />
          <Input
            label="Company phone *"
            type="tel"
            value={companyPhone}
            onChange={(e) => setCompanyPhone(e.target.value)}
            error={fieldErrors.companyPhone}
            required
            placeholder="+962 6 123 4567"
          />
        </div>

        {/* Client */}
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Client name"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            error={fieldErrors.clientName}
            required
          />
          <Input
            label="Client email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            error={fieldErrors.clientEmail}
            required
          />
        </div>
        <Input
          label="Client address"
          value={clientAddress}
          onChange={(e) => setClientAddress(e.target.value)}
          error={fieldErrors.clientAddress}
          required
        />

        <Select
          label="Member (Optional)"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          options={[
            { value: '', label: 'None' },
            ...members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
          ]}
        />

        {/* Dates & currency */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Issue date"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            error={fieldErrors.issueDate}
            required
          />
          <Input
            label="Due date"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={fieldErrors.dueDate}
            required
          />
          <div className="space-y-4">
            <Select
              label="Payment method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CARD' | 'CASH')}
              error={fieldErrors.paymentMethod}
              options={[
                { value: 'CARD', label: 'Visa / MasterCard' },
                { value: 'CASH', label: 'Cash' },
              ]}
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              error={fieldErrors.currency}
              options={[
                { value: 'JOD', label: 'JOD' },
                { value: 'USD', label: 'USD' },
                { value: 'EUR', label: 'EUR' },
              ]}
            />
          </div>
        </div>

        {/* Line items */}
        <div className="rounded-xl border border-borderColor p-4">
          <div className="mb-3 flex items-center justify-between gap-4 flex-wrap">
            <div className="text-sm font-semibold text-textPrimary">Line items</div>
            <div className="flex items-center gap-2">
              <div className="w-60">
                <Select
                  label=""
                  value={quickAddPkg}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) {
                      setQuickAddPkg('');
                      return;
                    }
                    const p = basketballPackagesWithPrice.find((x) => x.id === v);
                    if (p) {
                      setItems((prev) => [
                        ...prev,
                        {
                          id: crypto?.randomUUID?.() ?? String(Date.now()),
                          description: p.priceNote ? `${p.title} - ${p.priceNote}` : p.title,
                          quantity: 1,
                          unitPrice: parseFloat(String(p.price)),
                        },
                      ]);
                    }
                    setQuickAddPkg('');
                  }}
                  options={[
                    { value: '', label: '— Basketball package —' },
                    ...basketballPackagesWithPrice.map((p) => ({
                      value: p.id,
                      label: `${p.title} – ${p.price} JOD${p.priceNote ? ` (${p.priceNote})` : ''}`,
                    })),
                  ]}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    { id: crypto?.randomUUID?.() ?? String(Date.now() + prev.length), description: '', quantity: 1, unitPrice: 0 },
                  ])
                }
              >
                Add item
              </Button>
            </div>
          </div>

          {fieldErrors.items && <p className="mb-2 text-sm text-ui-danger">{fieldErrors.items}</p>}

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-[1fr_120px_140px_140px_auto] gap-3 items-end">
                <Input
                  id={`item-${it.id}-desc`}
                  label={idx === 0 ? 'Description' : undefined}
                  value={it.description}
                  onChange={(e) =>
                    setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, description: e.target.value } : p)))
                  }
                  error={fieldErrors[`item_${idx}_description`]}
                  required
                />
                <Input
                  id={`item-${it.id}-qty`}
                  label={idx === 0 ? 'Quantity' : undefined}
                  type="number"
                  value={String(it.quantity)}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) => (p.id === it.id ? { ...p, quantity: Number(e.target.value) } : p))
                    )
                  }
                  error={fieldErrors[`item_${idx}_quantity`]}
                  min={1}
                  step={1}
                  required
                />
                <Input
                  id={`item-${it.id}-unit`}
                  label={idx === 0 ? 'Unit price' : undefined}
                  type="number"
                  value={String(it.unitPrice)}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) => (p.id === it.id ? { ...p, unitPrice: Number(e.target.value) } : p))
                    )
                  }
                  error={fieldErrors[`item_${idx}_unitPrice`]}
                  min={0}
                  step="0.01"
                  required
                />
                <div className="w-full">
                  {idx === 0 && (
                    <div className="block text-sm font-medium text-ui-textPrimary mb-1.5">Line total</div>
                  )}
                  <div className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-textPrimary">
                    {computed.lineTotals[idx]?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={items.length === 1}
                  onClick={() => setItems((prev) => prev.filter((p) => p.id !== it.id))}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Tax (optional)"
            type="number"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
            error={fieldErrors.tax}
            min={0}
            step="0.01"
          />
          <Input
            label="Discount (optional)"
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            error={fieldErrors.discount}
            min={0}
            step="0.01"
          />
          <Input
            label="Amount Paid (optional)"
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            hint="Enter amount already paid. Status will be set to 'Partially Paid' if less than total."
            min={0}
            step="0.01"
            max={computed.total}
          />
          <Input
            label="Grand total"
            value={computed.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            disabled
          />
          {amountPaid.trim() && Number(amountPaid) > 0 && (
            <div className="space-y-1 pt-2">
              <div className="text-sm font-medium text-textPrimary">
                Remaining: {currency} {(computed.total - (Number(amountPaid) || 0)).toFixed(2)}
              </div>
              {Number(amountPaid) < computed.total && (
                <div className="text-xs text-amber-600">Status will be set to "Partially Paid"</div>
              )}
              {Number(amountPaid) >= computed.total && computed.total > 0 && (
                <div className="text-xs text-green-600">Status will be set to "Paid"</div>
              )}
            </div>
          )}
        </div>

        <Textarea
          label="Notes / Payment Terms (optional)"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Payment terms, special instructions, etc."
        />
        <Textarea
          label="Note (optional)"
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          error={fieldErrors.note}
          hint={`Additional note to appear on the invoice. Max ${INVOICE_CONFIG.noteMaxLength} characters.`}
          maxLength={INVOICE_CONFIG.noteMaxLength}
          hint="These will appear on the PDF invoice."
        />
      </form>
    </Modal>
  );
}


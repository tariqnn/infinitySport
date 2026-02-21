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

type Installment = {
  id: string;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  method: 'BANK' | 'CARD' | 'CASH';
  isPaid: boolean;
};

const NOTE_TEMPLATES: Array<{ id: string; label: string; text: string }> = [
  {
    id: 'non-refundable',
    label: 'Non-refundable clause',
    text: 'All fees are non-refundable once paid.'
  },
  {
    id: 'injury-liability',
    label: 'Injury liability clause',
    text: 'Infinity Sport is not liable for injuries sustained during training sessions. Participation is at the student’s own risk.'
  },
  {
    id: 'missed-sessions',
    label: 'Missed sessions policy',
    text: 'Missed sessions are non-transferable and cannot be refunded. Make-up sessions are subject to availability and prior approval.'
  },
  {
    id: 'late-payment',
    label: 'Late payment policy',
    text: 'Late payments may result in suspension from sessions until the outstanding balance is settled.'
  }
];

const ROUTE_BASE_URL = getApiBaseUrl();

export function CreateInvoiceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);

  // Form state
  const [companyAddress, setCompanyAddress] = useState(INVOICE_CONFIG.companyAddress);
  const [companyEmail, setCompanyEmail] = useState(INVOICE_CONFIG.companyEmail);
  const [companyPhone, setCompanyPhone] = useState(INVOICE_CONFIG.companyPhone);
  const [clientName, setClientName] = useState(''); // payer / guardian
  const [clientEmail, setClientEmail] = useState('');
  const [clientAddress, setClientAddress] = useState('-');
  const [memberId, setMemberId] = useState<string>('');
  const [currency, setCurrency] = useState('JOD');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'CASH'>('CARD');
  const [status, setStatus] = useState<'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE'>('DRAFT');
  const [issueDate, setIssueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [tax, setTax] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [notes, setNotes] = useState(''); // internal notes / payment terms (stored in meta)
  const [note, setNote] = useState(''); // customer-facing note (stored in DB + PDF)

  // 1) Student information
  const [studentFullName, setStudentFullName] = useState('');
  const [studentAge, setStudentAge] = useState<string>('');
  const [guardianName, setGuardianName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [membershipId, setMembershipId] = useState('');

  // 2) Program details
  const [programName, setProgramName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [branch, setBranch] = useState('');
  const [trainingStartDate, setTrainingStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [trainingEndDate, setTrainingEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [sessionsPerWeek, setSessionsPerWeek] = useState<string>('3');
  const [totalSessions, setTotalSessions] = useState<string>('12');

  // 7) Payment details (bank)
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [iban, setIban] = useState('');
  const [swift, setSwift] = useState('');
  const [cashAccepted, setCashAccepted] = useState(true);

  // 4) Installments
  const [useInstallments, setUseInstallments] = useState(false);
  const [installments, setInstallments] = useState<Installment[]>(() => [
    {
      id: crypto?.randomUUID?.() ?? String(Date.now()),
      dueDate: new Date().toISOString().split('T')[0],
      amount: 0,
      method: 'CASH',
      isPaid: false,
    }
  ]);

  const [items, setItems] = useState<LineItem[]>([
    { id: crypto?.randomUUID?.() ?? String(Date.now()), description: 'Registration fee', quantity: 1, unitPrice: 0 },
    { id: crypto?.randomUUID?.() ?? String(Date.now() + 1), description: 'Training fee', quantity: 1, unitPrice: 0 },
    { id: crypto?.randomUUID?.() ?? String(Date.now() + 2), description: 'Equipment fee', quantity: 1, unitPrice: 0 },
    { id: crypto?.randomUUID?.() ?? String(Date.now() + 3), description: 'Uniform fee', quantity: 1, unitPrice: 0 },
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

  // Keep payer/client name aligned with guardian name (academy billing)
  useEffect(() => {
    if (guardianName.trim()) {
      setClientName(guardianName.trim());
    }
  }, [guardianName]);

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
    // Client (payer) name is derived from Parent/Guardian name; validate guardianName instead.
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

    // Student / program (academy-specific)
    if (!studentFullName.trim()) next.studentFullName = 'Student full name is required.';
    if (studentAge.trim() && (!Number.isFinite(Number(studentAge)) || Number(studentAge) <= 0)) next.studentAge = 'Age must be a valid number.';
    if (!guardianName.trim()) next.guardianName = 'Parent/Guardian name is required.';
    if (!emergencyPhone.trim()) next.emergencyPhone = 'Emergency phone is required.';
    if (emergencyPhone.trim().length < 8) next.emergencyPhone = 'Emergency phone must be at least 8 characters.';
    if (!programName.trim()) next.programName = 'Program name is required.';
    if (!coachName.trim()) next.coachName = 'Coach name is required.';
    if (!branch.trim()) next.branch = 'Location/Branch is required.';
    if (!trainingStartDate) next.trainingStartDate = 'Training start date is required.';
    if (!trainingEndDate) next.trainingEndDate = 'Training end date is required.';
    if (trainingStartDate && trainingEndDate && new Date(trainingEndDate) < new Date(trainingStartDate)) {
      next.trainingEndDate = 'Training end date must be on/after start date.';
    }
    if (sessionsPerWeek.trim() && (!Number.isFinite(Number(sessionsPerWeek)) || Number(sessionsPerWeek) <= 0)) {
      next.sessionsPerWeek = 'Sessions per week must be a valid number.';
    }
    if (totalSessions.trim() && (!Number.isFinite(Number(totalSessions)) || Number(totalSessions) <= 0)) {
      next.totalSessions = 'Total sessions must be a valid number.';
    }

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

    if (useInstallments) {
      if (!installments.length) {
        next.installments = 'Add at least one installment or switch to single payment.';
      } else {
        installments.forEach((ins, idx) => {
          if (!ins.dueDate) next[`installment_${idx}_dueDate`] = 'Due date is required.';
          if (!Number.isFinite(ins.amount) || ins.amount < 0) next[`installment_${idx}_amount`] = 'Amount must be 0 or greater.';
        });
      }
    }

    return next;
  }, [
    companyAddress,
    companyEmail,
    companyPhone,
    clientName,
    clientEmail,
    clientAddress,
    issueDate,
    dueDate,
    currency,
    paymentMethod,
    studentFullName,
    studentAge,
    guardianName,
    emergencyPhone,
    programName,
    coachName,
    branch,
    trainingStartDate,
    trainingEndDate,
    sessionsPerWeek,
    totalSessions,
    items,
    tax,
    discount,
    amountPaid,
    useInstallments,
    installments,
    note,
  ]);

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

    const paidFromInstallments = useInstallments
      ? installments.reduce((sum, ins) => sum + (ins.isPaid ? Number(ins.amount) || 0 : 0), 0)
      : 0;
    const paidFromField = !useInstallments && amountPaid.trim() ? Number(amountPaid) || 0 : 0;
    const paidTotal = paidFromInstallments + paidFromField;
    const remaining = total - paidTotal;

    return {
      lineTotals,
      subtotal,
      taxAmount,
      discountAmount,
      total,
      paidTotal,
      remaining,
    };
  }, [items, tax, discount, amountPaid, useInstallments, installments]);

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
      setError('Cannot connect to the database-backed route handler. Make sure the portal app is running and DATABASE_URL is set.');
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

      const paidAmount = Math.round(computed.paidTotal || 0);
      const totalAmount = Math.round(computed.total);
      let invoiceStatus: string = status;
      if (paidAmount > 0 && paidAmount < totalAmount) invoiceStatus = 'PARTIALLY_PAID';
      else if (paidAmount >= totalAmount && totalAmount > 0) invoiceStatus = 'PAID';
      else if (status === 'SENT') invoiceStatus = 'SENT';
      else if (status === 'OVERDUE') invoiceStatus = 'OVERDUE';
      else invoiceStatus = 'DRAFT';

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

        // Academy billing fields (stored in invoice meta JSON)
        studentFullName: studentFullName.trim(),
        studentAge: studentAge.trim() ? Number(studentAge) : undefined,
        guardianName: guardianName.trim(),
        emergencyPhone: emergencyPhone.trim(),
        membershipId: membershipId.trim() ? membershipId.trim() : undefined,

        programName: programName.trim(),
        coachName: coachName.trim(),
        branch: branch.trim(),
        trainingPeriodStart: trainingStartDate ? new Date(trainingStartDate).toISOString() : undefined,
        trainingPeriodEnd: trainingEndDate ? new Date(trainingEndDate).toISOString() : undefined,
        sessionsPerWeek: sessionsPerWeek.trim() ? Number(sessionsPerWeek) : undefined,
        totalSessions: totalSessions.trim() ? Number(totalSessions) : undefined,

        bankName: bankName.trim() ? bankName.trim() : undefined,
        accountName: accountName.trim() ? accountName.trim() : undefined,
        iban: iban.trim() ? iban.trim() : undefined,
        swift: swift.trim() ? swift.trim() : undefined,
        cashAccepted,
        installments: useInstallments
          ? installments.map((ins) => ({
              dueDate: ins.dueDate ? new Date(ins.dueDate).toISOString() : undefined,
              amount: Math.round(Number(ins.amount) || 0),
              method: ins.method,
              isPaid: Boolean(ins.isPaid),
            }))
          : undefined,
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
        const base = pdfPath.startsWith('/api/') ? (typeof window !== 'undefined' ? window.location.origin : '')  : ROUTE_BASE_URL;
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

        {/* Student information */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Student</p>
            <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Student information</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Student full name"
              value={studentFullName}
              onChange={(e) => setStudentFullName(e.target.value)}
              error={fieldErrors.studentFullName}
              required
            />
            <Input
              label="Age"
              type="number"
              value={studentAge}
              onChange={(e) => setStudentAge(e.target.value)}
              error={fieldErrors.studentAge}
              min={1}
              step={1}
              placeholder="e.g. 10"
            />
            <Input
              label="Parent/Guardian name"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
              error={fieldErrors.guardianName}
              required
            />
            <Input
              label="Emergency phone"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              error={fieldErrors.emergencyPhone}
              required
              placeholder="+962 7x xxx xxxx"
            />
            <Input
              label="Membership ID"
              value={membershipId}
              onChange={(e) => setMembershipId(e.target.value)}
              hint="Optional internal identifier"
            />
            <Select
              label="Member (optional)"
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              options={[
                { value: '', label: 'None' },
                ...members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
              ]}
            />
          </div>
        </div>

        {/* Program details */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Program</p>
            <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Program details</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Program name"
              value={programName}
              onChange={(e) => setProgramName(e.target.value)}
              error={fieldErrors.programName}
              required
            />
            <Input
              label="Coach name"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              error={fieldErrors.coachName}
              required
            />
            <Input
              label="Location / Branch"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              error={fieldErrors.branch}
              required
              placeholder="e.g. Shemisani"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Training start"
                type="date"
                value={trainingStartDate}
                onChange={(e) => setTrainingStartDate(e.target.value)}
                error={fieldErrors.trainingStartDate}
                required
              />
              <Input
                label="Training end"
                type="date"
                value={trainingEndDate}
                onChange={(e) => setTrainingEndDate(e.target.value)}
                error={fieldErrors.trainingEndDate}
                required
              />
            </div>
            <Input
              label="Sessions per week"
              type="number"
              value={sessionsPerWeek}
              onChange={(e) => setSessionsPerWeek(e.target.value)}
              error={fieldErrors.sessionsPerWeek}
              min={1}
              step={1}
            />
            <Input
              label="Total sessions"
              type="number"
              value={totalSessions}
              onChange={(e) => setTotalSessions(e.target.value)}
              error={fieldErrors.totalSessions}
              min={1}
              step={1}
            />
          </div>
        </div>

        {/* Billing / invoice meta */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Invoice</p>
            <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Invoice settings</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Company name" value={INVOICE_CONFIG.companyName} disabled />
            <Input
              label="Invoice number"
              value="Auto-generated on save"
              disabled
              hint="A unique sequential number will be generated automatically."
            />
            <Input
              label="Company address"
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              error={fieldErrors.companyAddress}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Company email"
                type="email"
                value={companyEmail}
                onChange={(e) => setCompanyEmail(e.target.value)}
                error={fieldErrors.companyEmail}
                required
              />
              <Input
                label="Company phone"
                type="tel"
                value={companyPhone}
                onChange={(e) => setCompanyPhone(e.target.value)}
                error={fieldErrors.companyPhone}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <Select
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              options={[
                { value: 'DRAFT', label: 'Draft' },
                { value: 'SENT', label: 'Pending' },
                { value: 'PAID', label: 'Paid' },
                { value: 'OVERDUE', label: 'Overdue' },
              ]}
            />

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Payment method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as 'CARD' | 'CASH')}
                error={fieldErrors.paymentMethod}
                options={[
                  { value: 'CARD', label: 'Card' },
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
        </div>

        {/* Line items */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Fees</p>
              <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Line items</h3>
              <p className="mt-1 text-sm text-ui-textMuted">
                Add academy fees (registration/training/equipment/uniform/tournament) and custom items.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    {
                      id: crypto?.randomUUID?.() ?? String(Date.now() + prev.length),
                      description: 'Tournament fee',
                      quantity: 1,
                      unitPrice: 0,
                    },
                  ])
                }
              >
                Add tournament fee
              </Button>
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
                Add custom item
              </Button>
            </div>
          </div>

          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="w-full sm:w-80">
              <Select
                label="Quick add (Basketball packages)"
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
                  { value: '', label: 'Select a package…' },
                  ...basketballPackagesWithPrice.map((p) => ({
                    value: p.id,
                    label: `${p.title} – ${p.price} JOD${p.priceNote ? ` (${p.priceNote})` : ''}`,
                  })),
                ]}
              />
            </div>
            <div className="text-xs text-ui-textMuted">
              Subtotal: {currency} {computed.subtotal.toFixed(2)}
            </div>
          </div>

          {fieldErrors.items && <p className="mb-2 text-sm text-ui-danger">{fieldErrors.items}</p>}

          <div className="space-y-3">
            {items.map((it, idx) => (
              <div
                key={it.id}
                className="grid gap-3 items-end sm:grid-cols-[1fr_120px_140px_140px_auto]"
              >
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
                  <div className="rounded-xl border border-ui-border bg-white px-3 py-2.5 text-sm text-ui-textPrimary shadow-sm">
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

        {/* Totals + payment structure */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Payment</p>
            <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Totals & payment structure</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
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
          <div className="flex items-end justify-between gap-3 rounded-xl border border-ui-border bg-ui-softBg p-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Payment plan</p>
              <p className="text-sm font-semibold text-ui-textPrimary">Installments</p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-semibold text-ui-textPrimary">
              <input
                type="checkbox"
                checked={useInstallments}
                onChange={(e) => setUseInstallments(e.target.checked)}
                className="h-4 w-4 rounded border-ui-border accent-brand-primaryBlue"
              />
              Enable
            </label>
          </div>
          <Input
            label="Grand total"
            value={computed.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            disabled
          />
          <Input
            label={useInstallments ? 'Amount paid (auto)' : 'Amount paid'}
            type="number"
            value={useInstallments ? computed.paidTotal.toFixed(2) : amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            hint={useInstallments ? 'Calculated from paid installments below.' : 'Enter amount already paid.'}
            min={0}
            step="0.01"
            max={computed.total}
            disabled={useInstallments}
          />
          <div className="rounded-xl border border-ui-border bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Remaining</p>
            <p className="mt-1 text-sm font-semibold text-ui-textPrimary">
              {currency} {Math.max(0, computed.remaining).toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-ui-textMuted">
              Status auto-updates to Partially Paid / Paid based on paid amount.
            </p>
          </div>
          </div>

          {useInstallments ? (
            <div className="mt-4 rounded-2xl border border-ui-border bg-white p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ui-textPrimary">Installments</p>
                  {fieldErrors.installments ? (
                    <p className="text-sm text-ui-danger">{fieldErrors.installments}</p>
                  ) : (
                    <p className="text-xs text-ui-textMuted">Mark installments as paid to update amount paid.</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setInstallments((prev) => [
                      ...prev,
                      {
                        id: crypto?.randomUUID?.() ?? String(Date.now() + prev.length),
                        dueDate: dueDate,
                        amount: 0,
                        method: 'CASH',
                        isPaid: false,
                      },
                    ])
                  }
                >
                  Add installment
                </Button>
              </div>

              <div className="space-y-3">
                {installments.map((ins, idx) => (
                  <div key={ins.id} className="grid grid-cols-[150px_140px_140px_120px_auto] gap-3 items-end">
                    <Input
                      label={idx === 0 ? 'Due date' : undefined}
                      type="date"
                      value={ins.dueDate}
                      onChange={(e) =>
                        setInstallments((prev) => prev.map((p) => (p.id === ins.id ? { ...p, dueDate: e.target.value } : p)))
                      }
                      error={fieldErrors[`installment_${idx}_dueDate`]}
                      required
                    />
                    <Input
                      label={idx === 0 ? 'Amount' : undefined}
                      type="number"
                      value={String(ins.amount)}
                      onChange={(e) =>
                        setInstallments((prev) => prev.map((p) => (p.id === ins.id ? { ...p, amount: Number(e.target.value) } : p)))
                      }
                      error={fieldErrors[`installment_${idx}_amount`]}
                      min={0}
                      step="0.01"
                      required
                    />
                    <Select
                      label={idx === 0 ? 'Method' : undefined}
                      value={ins.method}
                      onChange={(e) =>
                        setInstallments((prev) => prev.map((p) => (p.id === ins.id ? { ...p, method: e.target.value as any } : p)))
                      }
                      options={[
                        { value: 'BANK', label: 'Bank' },
                        { value: 'CARD', label: 'Card' },
                        { value: 'CASH', label: 'Cash' },
                      ]}
                    />
                    <div className="pb-2">
                      {idx === 0 ? <div className="block text-sm font-medium text-ui-textPrimary mb-1.5">Paid</div> : null}
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-ui-textPrimary">
                        <input
                          type="checkbox"
                          checked={ins.isPaid}
                          onChange={(e) =>
                            setInstallments((prev) => prev.map((p) => (p.id === ins.id ? { ...p, isPaid: e.target.checked } : p)))
                          }
                          className="h-4 w-4 rounded border-ui-border accent-brand-primaryBlue"
                        />
                        Paid
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={installments.length === 1}
                      onClick={() => setInstallments((prev) => prev.filter((p) => p.id !== ins.id))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Payment details */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Payment details</p>
            <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Bank & cash options</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Bank name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
            <Input label="Account name" value={accountName} onChange={(e) => setAccountName(e.target.value)} />
            <Input label="IBAN" value={iban} onChange={(e) => setIban(e.target.value)} />
            <Input label="SWIFT" value={swift} onChange={(e) => setSwift(e.target.value)} />
            <div className="md:col-span-2 rounded-xl border border-ui-border bg-ui-softBg p-3">
              <label className="inline-flex items-center gap-2 text-sm font-semibold text-ui-textPrimary">
                <input
                  type="checkbox"
                  checked={cashAccepted}
                  onChange={(e) => setCashAccepted(e.target.checked)}
                  className="h-4 w-4 rounded border-ui-border accent-brand-primaryBlue"
                />
                Cash accepted
              </label>
              <p className="mt-1 text-xs text-ui-textMuted">These details will appear on the PDF.</p>
            </div>
          </div>
        </div>

        {/* Notes + templates */}
        <div className="rounded-2xl border border-ui-border bg-white p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ui-textMuted">Notes</p>
            <h3 className="mt-1 text-lg font-semibold text-ui-textPrimary">Policies & terms</h3>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {NOTE_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setNote((prev) => (prev ? `${prev}\n\n${tpl.text}` : tpl.text))}
                className="rounded-full border border-ui-border bg-white px-3 py-1.5 text-xs font-semibold text-ui-textPrimary transition hover:bg-ui-softBg"
              >
                + {tpl.label}
              </button>
            ))}
          </div>

          <Textarea
            label="Invoice note (printed on PDF)"
            rows={5}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            error={fieldErrors.note}
            maxLength={INVOICE_CONFIG.noteMaxLength}
            hint={`Max ${INVOICE_CONFIG.noteMaxLength} characters. Use templates above to insert policies.`}
          />
          <Textarea
            label="Internal notes / payment terms (optional)"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            hint="Internal notes, admin reminders, or additional terms."
          />
        </div>
      </form>
    </Modal>
  );
}


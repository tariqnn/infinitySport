'use client';

import { useEffect, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';
import { addDurationMonthsToDateInput } from './packageDefaults';

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'OTHER', label: 'Other' },
];

type OldMonthRow = {
  id: string;
  startDate: string;
  durationMonths: string;
  sessionsLeft: string;
  basePriceJod: string;
  amountPaid: string;
  paymentMethod: string;
  paymentPeriodKey: string;
  privateNote: string;
};

function makeId() {
  return `old-month-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function getDefaultStartDate(registration: PackageRegistrationRow | null): string {
  if (!registration) return new Date().toISOString().slice(0, 10);
  return (
    toDateInputValue(registration.periodEndsAt) ||
    toDateInputValue(registration.nextPaymentDate) ||
    new Date().toISOString().slice(0, 10)
  );
}

function monthFromDate(value: string): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function parseNonNegativeInt(value: string, fallback = 0): number {
  if (!value.trim()) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function createMonthRow(registration: PackageRegistrationRow | null, startDate: string): OldMonthRow {
  const durationMonths = Math.max(1, Math.round(Number(registration?.durationMonths ?? 1) || 1));
  const price = Math.max(0, Math.round(Number(registration?.finalPriceJod ?? registration?.basePriceJod ?? 0) || 0));

  return {
    id: makeId(),
    startDate,
    durationMonths: String(durationMonths),
    sessionsLeft: registration?.sessionsLeft != null ? String(registration.sessionsLeft) : '',
    basePriceJod: String(price),
    amountPaid: '',
    paymentMethod: 'CASH',
    paymentPeriodKey: monthFromDate(startDate),
    privateNote: 'Missing month registration',
  };
}

function getNextStartDate(row: OldMonthRow): string {
  const duration = Math.max(1, Math.round(Number(row.durationMonths) || 1));
  return addDurationMonthsToDateInput(row.startDate, duration);
}

function validateRow(row: OldMonthRow, index: number): string | null {
  const label = `Row ${index + 1}`;
  if (!row.startDate.trim()) return `${label}: start date is required.`;
  if (Number(row.durationMonths) < 1) return `${label}: duration must be at least 1 month.`;
  if (!row.basePriceJod.trim() || Number(row.basePriceJod) < 0) return `${label}: price is required.`;
  const amountPaid = parseNonNegativeInt(row.amountPaid, 0);
  if (amountPaid > 0 && !row.privateNote.trim()) return `${label}: private note is required when paid.`;
  if (row.paymentPeriodKey.trim() && !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.paymentPeriodKey)) {
    return `${label}: paid for month must be valid.`;
  }
  return null;
}

export function ReRegisterModal({
  open,
  onClose,
  onSuccess,
  registration,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  registration: PackageRegistrationRow | null;
}) {
  const [rows, setRows] = useState<OldMonthRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const startDate = getDefaultStartDate(registration);
    setRows([createMonthRow(registration, startDate)]);
    setError(null);
  }, [open, registration]);

  function updateRow(id: string, field: keyof OldMonthRow, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [field]: value };
        if (field === 'startDate') {
          next.paymentPeriodKey = monthFromDate(value);
        }
        return next;
      }),
    );
  }

  function addNextMonth() {
    setRows((prev) => {
      const last = prev[prev.length - 1] ?? createMonthRow(registration, getDefaultStartDate(registration));
      const nextStartDate = getNextStartDate(last) || getDefaultStartDate(registration);
      return [
        ...prev,
        {
          ...last,
          id: makeId(),
          startDate: nextStartDate,
          paymentPeriodKey: monthFromDate(nextStartDate),
        },
      ];
    });
  }

  function removeRow(id: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length ? next : [createMonthRow(registration, getDefaultStartDate(registration))];
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registration) return;
    setError(null);

    for (let i = 0; i < rows.length; i += 1) {
      const rowError = validateRow(rows[i], i);
      if (rowError) {
        setError(rowError);
        return;
      }
    }

    setLoading(true);
    try {
      for (const row of rows) {
        const parsedDuration = Math.max(1, Math.round(Number(row.durationMonths) || 1));
        const parsedAmountPaid = parseNonNegativeInt(row.amountPaid, 0);
        await packageRegistrationsApi.recordOldMonth(registration.id, {
          periodStartsAt: row.startDate.trim(),
          durationMonths: parsedDuration,
          sessionsLeft: row.sessionsLeft.trim() ? parseNonNegativeInt(row.sessionsLeft, 0) : null,
          basePriceJod: parseNonNegativeInt(row.basePriceJod, 0),
          amountPaid: parsedAmountPaid,
          paymentMethod: row.paymentMethod,
          paymentPeriodKey: row.paymentPeriodKey.trim() || monthFromDate(row.startDate.trim()),
          privateNote: parsedAmountPaid > 0 ? row.privateNote.trim() : null,
        });
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to record old month');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add missing month(s)"
      description="Add one or more old records without changing the player's active cycle."
      size="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-3 rounded-lg border border-ui-border bg-ui-softBg/50 px-3 py-3 text-sm text-ui-textPrimary sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase text-ui-textMuted">Player</div>
            <div className="font-semibold">{registration.customerName}</div>
            <div className="text-ui-textMuted">{registration.customerPhone}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-ui-textMuted">Package</div>
            <div className="font-semibold">{registration.packageName}</div>
            <div className="text-ui-textMuted">{registration.customerEmail || 'No email'}</div>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 sm:col-span-2">
            Current cycle stays at Cycle {registration.currentCycle ?? 1}. Added rows become old-month history records and optional historical receipts.
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-ui-border">
          <div className="max-h-[min(52vh,480px)] overflow-auto">
            <table className="min-w-[1280px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-ui-softBg">
                <tr className="border-b border-ui-border">
                  {['Missing month', 'Duration', 'Sessions', 'Price', 'Paid', 'Method', 'Paid month', 'Private note', ''].map((heading) => (
                    <th key={heading} className="px-3 py-2 text-left text-xs font-bold uppercase text-ui-textMuted">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-ui-border/60 hover:bg-ui-softBg/30">
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="date"
                        value={row.startDate}
                        onChange={(event) => updateRow(row.id, 'startDate', event.target.value)}
                        className="min-h-[40px] w-[150px] text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="number"
                        min={1}
                        value={row.durationMonths}
                        onChange={(event) => updateRow(row.id, 'durationMonths', event.target.value)}
                        className="min-h-[40px] w-[90px] text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="number"
                        min={0}
                        value={row.sessionsLeft}
                        onChange={(event) => updateRow(row.id, 'sessionsLeft', event.target.value)}
                        className="min-h-[40px] w-[96px] text-sm"
                        placeholder="Optional"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="number"
                        min={0}
                        value={row.basePriceJod}
                        onChange={(event) => updateRow(row.id, 'basePriceJod', event.target.value)}
                        className="min-h-[40px] w-[96px] text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="number"
                        min={0}
                        value={row.amountPaid}
                        onChange={(event) => updateRow(row.id, 'amountPaid', event.target.value)}
                        className="min-h-[40px] w-[96px] text-sm"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Select
                        value={row.paymentMethod}
                        onChange={(event) => updateRow(row.id, 'paymentMethod', event.target.value)}
                        options={PAYMENT_METHODS}
                        className="min-h-[40px] w-[120px] text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        type="month"
                        value={row.paymentPeriodKey}
                        onChange={(event) => updateRow(row.id, 'paymentPeriodKey', event.target.value)}
                        className="min-h-[40px] w-[130px] text-sm"
                      />
                    </td>
                    <td className="px-3 py-2 align-top">
                      <Input
                        value={row.privateNote}
                        onChange={(event) => updateRow(row.id, 'privateNote', event.target.value)}
                        className="min-h-[40px] w-[220px] text-sm"
                        placeholder="Required if paid"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <button
                        type="button"
                        onClick={() => removeRow(row.id)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ui-textMuted hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove old month row"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ui-textMuted">
            {rows.length} old month{rows.length === 1 ? '' : 's'} will be recorded.
          </div>
          <Button type="button" variant="secondary" onClick={addNextMonth}>
            Add next month
          </Button>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading}>
            Save old months
          </Button>
        </div>
      </form>
    </Modal>
  );
}

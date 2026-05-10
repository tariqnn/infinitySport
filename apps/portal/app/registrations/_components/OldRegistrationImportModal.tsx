'use client';

import { useCallback, useMemo, useState } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Modal, Button } from '../../_components/ui';
import {
  packageRegistrationsApi,
  type OldRegistrationImportResult,
  type OldRegistrationImportRow,
} from '../../../lib/portalApi';
import {
  addDurationMonthsToDateInput,
  getPackageDefaultDurationMonths,
  getPackageDefaultPrice,
  getPackageDefaultSessions,
} from './packageDefaults';

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

type Row = {
  id: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAge: string;
  periodStartsAt: string;
  durationMonths: string;
  sessionsLeft: string;
  basePriceJod: string;
  amountPaid: string;
  paymentMethod: string;
  paymentPeriodKey: string;
  privateNote: string;
};

function makeId() {
  return `old-row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function monthFromDate(value: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`;
}

function createEmptyRow(defaultDate = ''): Row {
  return {
    id: makeId(),
    packageName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAge: '',
    periodStartsAt: defaultDate,
    durationMonths: '1',
    sessionsLeft: '',
    basePriceJod: '',
    amountPaid: '',
    paymentMethod: 'CASH',
    paymentPeriodKey: monthFromDate(defaultDate),
    privateNote: '',
  };
}

function splitPasteLine(line: string) {
  const tabParts = line.split('\t').map((part) => part.trim());
  if (tabParts.length > 1) return tabParts;
  return line.split(/[,;]/).map((part) => part.trim());
}

function parsePaste(text: string, defaultDate: string): Row[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = splitPasteLine(line);
      const startDate = parts[5] || defaultDate;
      return {
        id: makeId(),
        packageName: parts[0] || '',
        customerName: parts[1] || '',
        customerPhone: parts[2] || '',
        customerEmail: parts[3] || '',
        customerAge: parts[4] || '',
        periodStartsAt: startDate,
        durationMonths: parts[6] || '1',
        sessionsLeft: parts[7] || '',
        basePriceJod: parts[8] || '',
        amountPaid: parts[9] || '',
        paymentMethod: (parts[10] || 'CASH').toUpperCase(),
        paymentPeriodKey: parts[11] || monthFromDate(startDate),
        privateNote: parts[12] || '',
      };
    });
}

function parsePositiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed));
}

function getRowErrors(row: Row) {
  const errors: string[] = [];
  if (!row.packageName.trim()) errors.push('Package');
  if (!row.customerName.trim()) errors.push('Name');
  if (!row.customerPhone.trim()) errors.push('Phone');
  if (!row.periodStartsAt.trim()) errors.push('Start date');
  if (!row.durationMonths.trim() || Number(row.durationMonths) < 1) errors.push('Duration');
  if (!row.basePriceJod.trim() || Number(row.basePriceJod) < 0) errors.push('Price');
  if (row.customerAge.trim()) {
    const age = Number(row.customerAge);
    if (!Number.isFinite(age) || age < 1 || age > 99) errors.push('Age');
  }
  if (row.amountPaid.trim() && Number(row.amountPaid) < 0) errors.push('Amount paid');
  if (Number(row.amountPaid || 0) > 0 && !row.privateNote.trim()) errors.push('Private note');
  if (row.paymentPeriodKey.trim() && !/^\d{4}-(0[1-9]|1[0-2])$/.test(row.paymentPeriodKey)) {
    errors.push('Paid month');
  }
  if (!PAYMENT_METHODS.includes(row.paymentMethod)) errors.push('Payment method');
  return errors;
}

function resultTone(status: OldRegistrationImportResult['status']) {
  if (status === 'created') return 'border-green-200 bg-green-50 text-green-800';
  if (status === 'renewed') return 'border-blue-200 bg-blue-50 text-blue-800';
  if (status === 'skipped') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

export function OldRegistrationImportModal({
  open,
  onClose,
  onSuccess,
  packageOptions,
  defaultPricesByPackage,
  defaultSessionsByPackage,
  defaultDurationMonthsByPackage,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageOptions: string[];
  defaultPricesByPackage: Record<string, number>;
  defaultSessionsByPackage: Record<string, number>;
  defaultDurationMonthsByPackage: Record<string, number>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab] = useState<'manual' | 'paste'>('manual');
  const [defaultStartDate, setDefaultStartDate] = useState(today);
  const [renewExisting, setRenewExisting] = useState(true);
  const [rows, setRows] = useState<Row[]>(() => [createEmptyRow(today)]);
  const [pasteText, setPasteText] = useState('');
  const [pastePreview, setPastePreview] = useState<Row[] | null>(null);
  const [results, setResults] = useState<OldRegistrationImportResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  const updateRow = useCallback((
    id: string,
    field: keyof Row,
    value: string,
  ) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [field]: value };
        if (field === 'packageName') {
          const price = getPackageDefaultPrice(value, defaultPricesByPackage);
          const sessions = getPackageDefaultSessions(value, defaultSessionsByPackage);
          const duration = getPackageDefaultDurationMonths(value, defaultDurationMonthsByPackage);
          if (!next.basePriceJod && price != null) next.basePriceJod = String(price);
          if (!next.sessionsLeft && sessions != null) next.sessionsLeft = String(sessions);
          if (duration) next.durationMonths = String(duration);
          if (next.periodStartsAt) {
            next.paymentPeriodKey = next.paymentPeriodKey || monthFromDate(next.periodStartsAt);
          }
        }
        if (field === 'periodStartsAt') {
          next.paymentPeriodKey = monthFromDate(value);
          const duration = Math.max(1, Math.round(Number(next.durationMonths) || 1));
          next.durationMonths = String(duration);
        }
        if (field === 'durationMonths' && next.periodStartsAt) {
          next.durationMonths = String(Math.max(1, Math.round(Number(value) || 1)));
        }
        return next;
      }),
    );
  }, [defaultDurationMonthsByPackage, defaultPricesByPackage, defaultSessionsByPackage]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow(defaultStartDate)]);
  }, [defaultStartDate]);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length ? next : [createEmptyRow(defaultStartDate)];
    });
  }, [defaultStartDate]);

  const applyDefaultStartDate = useCallback((value: string) => {
    setDefaultStartDate(value);
    setRows((prev) =>
      prev.map((row) => {
        if (row.periodStartsAt) return row;
        return {
          ...row,
          periodStartsAt: value,
          paymentPeriodKey: monthFromDate(value),
        };
      }),
    );
  }, []);

  const importPasteRows = useCallback(() => {
    const parsed = parsePaste(pasteText, defaultStartDate);
    setPastePreview(parsed);
    if (parsed.length > 0) {
      setRows(parsed);
      setTab('manual');
      setResults(null);
    }
  }, [defaultStartDate, pasteText]);

  const rowErrors = useMemo(() => rows.map(getRowErrors), [rows]);
  const invalidCount = rowErrors.filter((errors) => errors.length > 0).length;
  const canSubmit = rows.length > 0 && invalidCount === 0 && !loading;

  function buildPayload(): OldRegistrationImportRow[] {
    return rows.map((row, index) => {
      const durationMonths = parsePositiveInt(row.durationMonths) ?? 1;
      const startDate = row.periodStartsAt.trim();
      return {
        row: index + 1,
        packageName: row.packageName.trim(),
        customerName: row.customerName.trim(),
        customerPhone: row.customerPhone.trim(),
        customerEmail: row.customerEmail.trim() || null,
        customerAge: parsePositiveInt(row.customerAge),
        periodStartsAt: startDate,
        durationMonths,
        sessionsLeft: parsePositiveInt(row.sessionsLeft),
        nextPaymentDate: startDate ? addDurationMonthsToDateInput(startDate, durationMonths) : null,
        basePriceJod: parsePositiveInt(row.basePriceJod) ?? 0,
        amountPaid: parsePositiveInt(row.amountPaid) ?? 0,
        paymentMethod: row.paymentMethod,
        paymentPeriodKey: row.paymentPeriodKey.trim() || monthFromDate(startDate),
        privateNote: row.privateNote.trim() || null,
      };
    });
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setResults(null);
    try {
      const response = await packageRegistrationsApi.oldImport({
        renewExisting,
        registrations: buildPayload(),
      });
      setResults(response.results);
      if (response.results.some((result) => result.status === 'created' || result.status === 'renewed')) {
        onSuccess();
      }
    } catch (error: unknown) {
      setResults([
        {
          row: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Import failed',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk old records"
      description="Backfill previous registrations with payment and session state."
      size="2xl"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ui-textMuted">
            <span className="font-semibold text-ui-textPrimary">{rows.length} row{rows.length === 1 ? '' : 's'}</span>
            {invalidCount > 0 ? <span className="ml-2 text-red-600">{invalidCount} need attention</span> : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit} isLoading={loading}>
              Import old records
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 rounded-xl border border-ui-border bg-ui-softBg/40 p-4 md:grid-cols-[minmax(0,220px)_1fr]">
          <label className="block text-sm font-semibold text-ui-textPrimary">
            Default start date
            <input
              type="date"
              value={defaultStartDate}
              onChange={(event) => applyDefaultStartDate(event.target.value)}
              className="mt-2 min-h-[44px] w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="flex min-h-[44px] items-start gap-3 rounded-lg border border-ui-border bg-white px-3 py-3 text-sm text-ui-textPrimary">
            <input
              type="checkbox"
              checked={renewExisting}
              onChange={(event) => setRenewExisting(event.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block font-semibold">Renew existing phone + package matches</span>
              <span className="block text-ui-textMuted">Turn this off to skip duplicates instead of importing them as a new cycle.</span>
            </span>
          </label>
        </div>

        <div className="flex rounded-lg border border-ui-border bg-ui-softBg/50 p-1">
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`min-h-[44px] flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${tab === 'manual' ? 'bg-white text-ui-textPrimary shadow-sm' : 'text-ui-textMuted hover:text-ui-textPrimary'}`}
          >
            Manual grid
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            className={`min-h-[44px] flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${tab === 'paste' ? 'bg-white text-ui-textPrimary shadow-sm' : 'text-ui-textMuted hover:text-ui-textPrimary'}`}
          >
            Paste from sheet
          </button>
        </div>

        {tab === 'paste' ? (
          <div className="space-y-3">
            <textarea
              value={pasteText}
              onChange={(event) => {
                setPasteText(event.target.value);
                setPastePreview(null);
              }}
              rows={8}
              className="min-h-[180px] w-full resize-y rounded-xl border border-ui-border bg-white px-3 py-3 text-sm text-ui-textPrimary placeholder:text-ui-textMuted focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
              placeholder={'Package\tName\tPhone\tEmail\tAge\tStart date\tDuration\tSessions\tPrice\tAmount paid\tMethod\tPaid month\tPrivate note'}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setPastePreview(parsePaste(pasteText, defaultStartDate))}>
                Preview
              </Button>
              <Button type="button" size="sm" onClick={importPasteRows}>
                Use pasted rows
              </Button>
            </div>
            {pastePreview ? (
              <p className="text-sm text-ui-textMuted">
                Preview found {pastePreview.length} row{pastePreview.length === 1 ? '' : 's'}.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-ui-border">
              <div className="max-h-[min(56vh,520px)] overflow-auto">
                <table className="min-w-[1760px] w-full border-collapse text-sm">
                  <thead className="sticky top-0 z-10 bg-ui-softBg">
                    <tr className="border-b border-ui-border">
                      {['Package', 'Name', 'Phone', 'Email', 'Age', 'Starts', 'Months', 'Sessions', 'Price', 'Paid', 'Method', 'Paid month', 'Private note', ''].map((heading) => (
                        <th key={heading} className="px-3 py-2 text-left text-xs font-bold uppercase text-ui-textMuted">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => {
                      const errors = rowErrors[index] || [];
                      return (
                        <tr key={row.id} className="border-b border-ui-border/60 hover:bg-ui-softBg/30">
                          <td className="px-3 py-2 align-top">
                            <select value={row.packageName} onChange={(event) => updateRow(row.id, 'packageName', event.target.value)} className="min-h-[40px] w-[240px] rounded-lg border border-ui-border bg-white px-2 text-sm">
                              <option value="">Select package</option>
                              {packageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 align-top"><input value={row.customerName} onChange={(event) => updateRow(row.id, 'customerName', event.target.value)} className="min-h-[40px] w-[170px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input value={row.customerPhone} onChange={(event) => updateRow(row.id, 'customerPhone', event.target.value)} className="min-h-[40px] w-[150px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input value={row.customerEmail} onChange={(event) => updateRow(row.id, 'customerEmail', event.target.value)} className="min-h-[40px] w-[190px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input type="number" min={1} max={99} value={row.customerAge} onChange={(event) => updateRow(row.id, 'customerAge', event.target.value)} className="min-h-[40px] w-[72px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input type="date" value={row.periodStartsAt} onChange={(event) => updateRow(row.id, 'periodStartsAt', event.target.value)} className="min-h-[40px] w-[145px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input type="number" min={1} value={row.durationMonths} onChange={(event) => updateRow(row.id, 'durationMonths', event.target.value)} className="min-h-[40px] w-[84px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input type="number" min={0} value={row.sessionsLeft} onChange={(event) => updateRow(row.id, 'sessionsLeft', event.target.value)} className="min-h-[40px] w-[92px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input type="number" min={0} value={row.basePriceJod} onChange={(event) => updateRow(row.id, 'basePriceJod', event.target.value)} className="min-h-[40px] w-[92px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top"><input type="number" min={0} value={row.amountPaid} onChange={(event) => updateRow(row.id, 'amountPaid', event.target.value)} className="min-h-[40px] w-[92px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top">
                            <select value={row.paymentMethod} onChange={(event) => updateRow(row.id, 'paymentMethod', event.target.value)} className="min-h-[40px] w-[110px] rounded-lg border border-ui-border bg-white px-2 text-sm">
                              {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 align-top"><input type="month" value={row.paymentPeriodKey} onChange={(event) => updateRow(row.id, 'paymentPeriodKey', event.target.value)} className="min-h-[40px] w-[125px] rounded-lg border border-ui-border px-2 text-sm" /></td>
                          <td className="px-3 py-2 align-top">
                            <input value={row.privateNote} onChange={(event) => updateRow(row.id, 'privateNote', event.target.value)} className="min-h-[40px] w-[210px] rounded-lg border border-ui-border px-2 text-sm" placeholder={Number(row.amountPaid || 0) > 0 ? 'Required' : 'Optional'} />
                            {errors.length > 0 ? <p className="mt-1 text-xs text-red-600">Check: {errors.join(', ')}</p> : null}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <button type="button" onClick={() => removeRow(row.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ui-textMuted hover:bg-red-50 hover:text-red-600" aria-label="Remove import row">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={addRow}>Add row</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setRows([createEmptyRow(defaultStartDate)]); setResults(null); }}>Clear</Button>
            </div>
          </div>
        )}

        {results ? (
          <div className="space-y-2" aria-live="polite">
            {results.map((result, index) => (
              <div key={`${result.row}-${index}`} className={`rounded-lg border px-3 py-2 text-sm ${resultTone(result.status)}`}>
                <span className="font-semibold">Row {result.row || '-'}</span>
                <span className="ml-2 uppercase">{result.status}</span>
                <span className="ml-2">{result.error || result.message || result.id || result.existingId}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

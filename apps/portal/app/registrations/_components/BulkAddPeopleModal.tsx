'use client';

import { useState, useCallback, useEffect } from 'react';
import { Modal, Button } from '../../_components/ui';
import { packageRegistrationsApi, packagePricingApi } from '../../../lib/portalApi';
import { TrashIcon } from '@heroicons/react/24/outline';

const PACKAGE_OPTIONS = [
  'Basketball - Little Kobes U12-U10',
  'Basketball - Ballers & Hoopers U12–U14',
  'Basketball - Warriors',
  'Basketball - Private 1v1 Sessions',
  'Basketball - Small Groups',
  'Gymnastics Package A',
  'Gymnastics Package B',
  'Gymnastics Package C',
  'Gymnastics Package D',
  'Volleyball',
];

type Row = {
  id: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAge: string;
  periodStartsAt: string; // when they will start (YYYY-MM-DD)
};

function createEmptyRow(): Row {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    packageName: '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAge: '',
    periodStartsAt: '',
  };
}

function getRowErrors(row: Row): { name?: string; phone?: string; age?: string } {
  const err: { name?: string; phone?: string; age?: string } = {};
  if (!(row.customerName || '').trim()) err.name = 'Required';
  if (!(row.customerPhone || '').trim()) err.phone = 'Required';
  const ageStr = (row.customerAge || '').trim();
  if (ageStr) {
    const num = parseInt(ageStr, 10);
    if (isNaN(num) || num < 1 || num > 99) err.age = '1–99';
  }
  return err;
}

function parsePaste(text: string): Row[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    let parts = line.split(/\t/).map((p) => p.trim());
    if (parts.length < 2) parts = line.split(/[,;]/).map((p) => p.trim());
    const base = createEmptyRow();
    return {
      ...base,
      packageName: parts[0] || '',
      customerName: parts[1] || '',
      customerPhone: parts[2] || '',
      customerEmail: parts[3] || '',
      customerAge: parts[4] || '',
      periodStartsAt: parts[5] || '',
    };
  });
}

export function BulkAddPeopleModal({
  open,
  onClose,
  onSuccess,
  packageOptions,
  defaultPricesByPackage,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageOptions?: string[];
  defaultPricesByPackage?: Record<string, number>;
}) {
  const packageList = packageOptions?.length ? packageOptions : PACKAGE_OPTIONS;
  const [tab, setTab] = useState<'manual' | 'paste'>('manual');
  const [startDate, setStartDate] = useState('');
  const [rows, setRows] = useState<Row[]>(() => [createEmptyRow()]);
  const [pasteText, setPasteText] = useState('');
  const [pastePreview, setPastePreview] = useState<Row[] | null>(null);
  const [pricing, setPricing] = useState<Array<{ packageName: string; basePriceJod: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: Array<{ row: number; error: string }> } | null>(null);

  useEffect(() => {
    if (open) packagePricingApi.list().then(setPricing).catch(() => setPricing([]));
  }, [open]);

  function getPriceForPackage(packageName: string): number | null {
    const defaultPrice = defaultPricesByPackage?.[packageName];
    if (defaultPrice != null) return defaultPrice;
    const p = pricing.find((x) => x.packageName === packageName);
    return p?.basePriceJod ?? null;
  }

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length ? next : [createEmptyRow()];
    });
  }, []);

  const updateRow = useCallback((id: string, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const clearAll = useCallback(() => {
    setRows([createEmptyRow()]);
    setResult(null);
  }, []);

  const runPastePreview = useCallback(() => {
    const parsed = parsePaste(pasteText);
    setPastePreview(parsed);
  }, [pasteText]);

  const importPasteRows = useCallback(() => {
    const parsed = parsePaste(pasteText);
    if (parsed.length) {
      const normalized = parsed.map((r) => {
        const id = `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const pkg = (r.packageName || '').trim();
        const match = packageList.includes(pkg) ? pkg : '';
        return { ...r, id, packageName: match };
      });
      const unrecognized = parsed.filter((r) => (r.packageName || '').trim() && !packageList.includes((r.packageName || '').trim()));
      setRows(normalized);
      setTab('manual');
      setPasteText('');
      setPastePreview(null);
      if (unrecognized.length > 0) {
        setResult({ success: 0, failed: [{ row: 0, error: `${unrecognized.length} row(s) had unrecognized package names; please select package in Manual tab.` }] });
      } else {
        setResult(null);
      }
    }
  }, [pasteText, packageList]);

  const allErrors = rows.map((r) => getRowErrors(r));
  const totalErrors = allErrors.reduce((s, e) => s + (e.name ? 1 : 0) + (e.phone ? 1 : 0) + (e.age ? 1 : 0), 0);
  const validRows = rows.filter((r) => {
    const e = getRowErrors(r);
    return !e.name && !e.phone && !e.age && (r.customerName || '').trim() && (r.customerPhone || '').trim();
  });
  const canSave = validRows.length > 0 && totalErrors === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const registrations = validRows.map((r) => {
      const pkg = (r.packageName || packageList[0] || '').trim();
      const basePriceJod = getPriceForPackage(pkg);
      return {
        packageName: pkg,
        customerName: (r.customerName || '').trim(),
        customerPhone: (r.customerPhone || '').trim(),
        customerEmail: (r.customerEmail || '').trim() || undefined,
        customerAge: (r.customerAge || '').trim() ? parseInt(r.customerAge, 10) : undefined,
        basePriceJod: basePriceJod != null ? basePriceJod : undefined,
        periodStartsAt: (r.periodStartsAt || '').trim() || undefined,
      };
    });

    if (registrations.length === 0) {
      setResult({ success: 0, failed: [{ row: 1, error: 'Add at least one person with name and phone.' }] });
      return;
    }

    setLoading(true);
    try {
      const { results } = await packageRegistrationsApi.bulkCreate({
        startDate: startDate.trim() || undefined,
        registrations,
      });
      const failed = results.filter((r) => !r.success).map((r) => ({ row: r.row!, error: r.error! }));
      const success = results.filter((r) => r.success).length;
      setResult({ success, failed });
      if (success > 0) onSuccess();
    } catch (err: any) {
      setResult({ success: 0, failed: [{ row: 0, error: err?.message || 'Request failed' }] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Multiple People"
      description="Add people manually or paste from a spreadsheet."
      size="2xl"
      footer={
        <div className="flex w-full items-center justify-between gap-4">
          <div className="text-sm text-ui-textMuted">
            <span className="font-medium text-ui-textPrimary">{rows.length} people</span>
            {totalErrors > 0 && (
              <span className="ml-2 text-red-600">
                · {totalErrors} error{totalErrors !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSave || loading} isLoading={loading}>
              Save all
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 p-1">
        {/* Tabs */}
        <div className="flex rounded-lg border border-ui-border p-1 bg-ui-softBg/50">
          <button
            type="button"
            onClick={() => setTab('manual')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === 'manual'
                ? 'bg-white text-ui-textPrimary shadow-sm'
                : 'text-ui-textMuted hover:text-ui-textPrimary'
            }`}
          >
            Manual
          </button>
          <button
            type="button"
            onClick={() => setTab('paste')}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition ${
              tab === 'paste'
                ? 'bg-white text-ui-textPrimary shadow-sm'
                : 'text-ui-textMuted hover:text-ui-textPrimary'
            }`}
          >
            Paste
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-ui-textMuted">Start date (optional)</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-ui-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
          />
          <span className="text-xs text-ui-textMuted">When they start/started. Leave empty for today.</span>
        </div>

        {tab === 'manual' && (
          <>
            <div className="overflow-hidden rounded-xl border border-ui-border">
              <div className="max-h-[min(50vh,420px)] overflow-auto">
                <table className="min-w-[1120px] w-full border-collapse text-sm">
                  <colgroup>
                    <col style={{ width: 260 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 170 }} />
                    <col style={{ width: 170 }} />
                    <col style={{ width: 210 }} />
                    <col style={{ width: 90 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 44 }} />
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-ui-softBg border-b border-ui-border">
                    <tr>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[260px]">Package</th>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[90px]">Price</th>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[170px]">Name</th>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[170px]">Phone</th>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[210px]">Email</th>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[90px]">Age</th>
                      <th className="text-left font-semibold text-ui-textMuted px-3 py-2.5 w-[160px]">Starts</th>
                      <th className="w-10 px-2 py-2.5" aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const errors = getRowErrors(row);
                      return (
                        <tr key={row.id} className="border-b border-ui-border/60 hover:bg-ui-softBg/30">
                          <td className="align-top px-3 py-2">
                            <select
                              value={row.packageName}
                              onChange={(e) => updateRow(row.id, 'packageName', e.target.value)}
                              className="w-full min-h-[36px] rounded-lg border border-ui-border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
                            >
                              <option value="">Select package</option>
                              {packageList.map((p) => (
                                <option key={p} value={p}>{p}</option>
                              ))}
                            </select>
                          </td>
                          <td className="align-middle px-3 py-2 text-sm text-ui-textMuted whitespace-nowrap">
                            {row.packageName
                              ? (getPriceForPackage(row.packageName) != null
                                ? `${getPriceForPackage(row.packageName)} JOD`
                                : 'Manual')
                              : '—'}
                          </td>
                          <td className="align-top px-3 py-2">
                            <input
                              value={row.customerName}
                              onChange={(e) => updateRow(row.id, 'customerName', e.target.value)}
                              placeholder="Required"
                              className={`w-full min-h-[36px] rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 ${
                                errors.name ? 'border-red-500 bg-red-50' : 'border-ui-border bg-white'
                              }`}
                            />
                            {errors.name && <p className="text-xs text-red-600 mt-0.5">{errors.name}</p>}
                          </td>
                          <td className="align-top px-3 py-2">
                            <input
                              value={row.customerPhone}
                              onChange={(e) => updateRow(row.id, 'customerPhone', e.target.value)}
                              placeholder="Required"
                              className={`w-full min-h-[36px] rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 ${
                                errors.phone ? 'border-red-500 bg-red-50' : 'border-ui-border bg-white'
                              }`}
                            />
                            {errors.phone && <p className="text-xs text-red-600 mt-0.5">{errors.phone}</p>}
                          </td>
                          <td className="align-top px-3 py-2">
                            <input
                              value={row.customerEmail}
                              onChange={(e) => updateRow(row.id, 'customerEmail', e.target.value)}
                              placeholder="Optional"
                              className="w-full min-h-[36px] rounded-lg border border-ui-border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
                            />
                          </td>
                          <td className="align-top px-3 py-2">
                            <input
                              type="number"
                              min={1}
                              max={99}
                              value={row.customerAge}
                              onChange={(e) => updateRow(row.id, 'customerAge', e.target.value)}
                              placeholder="—"
                              className={`w-full min-w-0 min-h-[36px] rounded-lg border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 ${
                                errors.age ? 'border-red-500 bg-red-50' : 'border-ui-border bg-white'
                              }`}
                            />
                            {errors.age && <p className="text-xs text-red-600 mt-0.5">{errors.age}</p>}
                          </td>
                          <td className="align-top px-3 py-2">
                            <input
                              type="date"
                              value={row.periodStartsAt}
                              onChange={(e) => updateRow(row.id, 'periodStartsAt', e.target.value)}
                              className="w-full min-w-0 min-h-[36px] rounded-lg border border-ui-border bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
                            />
                          </td>
                          <td className="align-middle px-2 py-2">
                            <button
                              type="button"
                              onClick={() => removeRow(row.id)}
                              className="rounded-lg p-2 text-ui-textMuted hover:bg-red-50 hover:text-red-600 transition"
                              title="Remove row"
                            >
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
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={addRow}>
                Add row
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-ui-textMuted">
                Clear all
              </Button>
            </div>
          </>
        )}

        {tab === 'paste' && (
          <div className="space-y-4">
            <textarea
              value={pasteText}
              onChange={(e) => {
                setPasteText(e.target.value);
                setPastePreview(null);
              }}
              placeholder={`Paste rows from Excel/Sheets (tab or comma separated):\nPackage | Name | Phone | Email | Age | Start date`}
              rows={8}
              className="w-full rounded-xl border border-ui-border bg-white px-3 py-3 text-sm placeholder:text-ui-textMuted focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 resize-y min-h-[160px]"
            />
            <p className="text-xs text-ui-textMuted">
              Example:
            </p>
            <pre className="rounded-lg border border-ui-border bg-ui-softBg/50 p-3 text-xs text-ui-textMuted overflow-x-auto">
              {`Basketball - Little Kobes U12-U10\tAhmad Ali\t0791234567\tahmad@example.com\t10\nGymnastics Package A\tSara Mohammad\t0789876543\tsara@example.com\t8`}
            </pre>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={runPastePreview}>
                Preview
              </Button>
              {pastePreview && pastePreview.length > 0 && (
                <Button type="button" size="sm" onClick={importPasteRows}>
                  Import {pastePreview.length} row{pastePreview.length !== 1 ? 's' : ''}
                </Button>
              )}
            </div>
            {pastePreview !== null && pastePreview.length === 0 && (
              <p className="text-sm text-ui-textMuted">No valid rows to preview. Add lines with at least Package and Name.</p>
            )}
            {pastePreview && pastePreview.length > 0 && (
              <div className="rounded-xl border border-ui-border overflow-hidden">
                <div className="max-h-[220px] overflow-auto">
                  <table className="min-w-[980px] w-full border-collapse text-sm">
                    <colgroup>
                      <col style={{ width: 260 }} />
                      <col style={{ width: 90 }} />
                      <col style={{ width: 170 }} />
                      <col style={{ width: 170 }} />
                      <col style={{ width: 210 }} />
                      <col style={{ width: 90 }} />
                      <col style={{ width: 160 }} />
                    </colgroup>
                    <thead className="sticky top-0 bg-ui-softBg border-b border-ui-border">
                      <tr>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2">Package</th>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2 w-[90px]">Price</th>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2">Name</th>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2">Phone</th>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2">Email</th>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2">Age</th>
                        <th className="text-left font-semibold text-ui-textMuted px-3 py-2">Starts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.map((row, i) => (
                        <tr key={i} className="border-b border-ui-border/60">
                          <td className="px-3 py-2 text-ui-textPrimary">{row.packageName || '—'}</td>
                          <td className="px-3 py-2 text-ui-textMuted whitespace-nowrap">
                            {row.packageName
                              ? (getPriceForPackage(row.packageName) != null
                                ? `${getPriceForPackage(row.packageName)} JOD`
                                : 'Manual')
                              : '—'}
                          </td>
                          <td className="px-3 py-2 text-ui-textPrimary">{row.customerName || '—'}</td>
                          <td className="px-3 py-2 text-ui-textPrimary">{row.customerPhone || '—'}</td>
                          <td className="px-3 py-2 text-ui-textMuted">{row.customerEmail || '—'}</td>
                          <td className="px-3 py-2 text-ui-textMuted">{row.customerAge || '—'}</td>
                          <td className="px-3 py-2 text-ui-textMuted">{row.periodStartsAt || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-4 text-sm ${result.failed.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
            <p><strong>{result.success}</strong> added successfully.</p>
            {result.failed.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-amber-800">
                {result.failed.map((f, i) => (
                  <li key={i}>Row {f.row}: {f.error}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

'use client';

import { useState } from 'react';
import { Modal, Input, Button } from '../../_components/ui';
import { packageRegistrationsApi } from '../../../lib/portalApi';

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

type Row = { packageName: string; customerName: string; customerPhone: string; customerEmail: string; customerAge: string };

export function BulkAddModal({
  open,
  onClose,
  onSuccess,
  packageOptions,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageOptions?: string[];
}) {
  const packageList = packageOptions?.length ? packageOptions : PACKAGE_OPTIONS;
  const [rows, setRows] = useState<Row[]>([
    { packageName: '', customerName: '', customerPhone: '', customerEmail: '', customerAge: '' },
  ]);
  const [pasteText, setPasteText] = useState('');
  const [usePaste, setUsePaste] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: Array<{ row: number; error: string }> } | null>(null);

  function addRow() {
    setRows((prev) => [...prev, { packageName: '', customerName: '', customerPhone: '', customerEmail: '', customerAge: '' }]);
  }

  function removeRow(i: number) {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, idx) => idx !== i));
  }

  function parsePaste(): Row[] {
    const lines = pasteText.split(/\n/).map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const parts = line.split(/\t|,|;/).map((p) => p.trim());
      return {
        packageName: parts[0] || '',
        customerName: parts[1] || '',
        customerPhone: parts[2] || '',
        customerEmail: parts[3] || '',
        customerAge: parts[4] || '',
      };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);
    const registrations = usePaste
      ? parsePaste()
          .filter((r) => r.customerName && r.customerPhone)
          .map((r) => ({
            packageName: r.packageName || packageList[0],
            customerName: r.customerName.trim(),
            customerPhone: r.customerPhone.trim(),
            customerEmail: r.customerEmail.trim() || undefined,
            customerAge: r.customerAge.trim() ? parseInt(r.customerAge, 10) : undefined,
          }))
      : rows.filter((r) => r.customerName.trim() && r.customerPhone.trim()).map((r) => ({
          packageName: r.packageName || packageList[0],
          customerName: r.customerName.trim(),
          customerPhone: r.customerPhone.trim(),
          customerEmail: r.customerEmail.trim() || undefined,
          customerAge: r.customerAge.trim() ? parseInt(r.customerAge, 10) : undefined,
        }));

    if (registrations.length === 0) {
      setResult({ success: 0, failed: [{ row: 1, error: 'Add at least one person with name and phone.' }] });
      return;
    }

    setLoading(true);
    try {
      const { results } = await packageRegistrationsApi.bulkCreate({ registrations });
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
    <Modal open={open} onClose={onClose} title="Add Multiple People" size="xl">
      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={usePaste} onChange={(e) => setUsePaste(e.target.checked)} className="rounded border-ui-border" />
          Paste from spreadsheet (Tab or comma separated: Package, Name, Phone, Email, Age)
        </label>
        {usePaste ? (
          <textarea
            className="w-full rounded-xl border border-ui-border p-3 text-sm"
            rows={10}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Basketball - Little Kobes U12-U10	John Doe	0791234567	john@example.com	10"
          />
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-ui-textMuted">
              <div className="col-span-3">Package</div>
              <div className="col-span-2">Name</div>
              <div className="col-span-2">Phone</div>
              <div className="col-span-2">Email</div>
              <div className="col-span-1">Age</div>
              <div className="col-span-2" />
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2">
                <div className="col-span-3">
                  <select
                    className="w-full rounded-lg border border-ui-border px-2 py-1.5 text-sm"
                    value={row.packageName}
                    onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, packageName: e.target.value } : p)))}
                  >
                    {packageList.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <Input className="col-span-2" value={row.customerName} onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, customerName: e.target.value } : p)))} placeholder="Name" />
                <Input className="col-span-2" value={row.customerPhone} onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, customerPhone: e.target.value } : p)))} placeholder="Phone" />
                <Input className="col-span-2" value={row.customerEmail} onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, customerEmail: e.target.value } : p)))} placeholder="Email" />
                <Input className="col-span-1" type="number" value={row.customerAge} onChange={(e) => setRows((prev) => prev.map((p, j) => (j === i ? { ...p, customerAge: e.target.value } : p)))} placeholder="Age" />
                <div className="col-span-2 flex gap-1">
                  <Button type="button" variant="ghost" size="sm" onClick={addRow}>+ Row</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeRow(i)} disabled={rows.length <= 1}>Remove</Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={addRow}>+ Add row</Button>
          </div>
        )}

        {result && (
          <div className={`rounded-xl border p-3 text-sm ${result.failed.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-green-200 bg-green-50'}`}>
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

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} isLoading={loading}>Save all</Button>
        </div>
      </div>
    </Modal>
  );
}

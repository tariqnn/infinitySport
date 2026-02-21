'use client';

import { useState, useEffect, useMemo } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, packagePricingApi } from '../../../lib/portalApi';
import type { PackageRegistrationRow } from '../../../lib/portalApi';
import type { InitialPerson } from './AddRegistrationModal';

function getSessionsForPackage(packageName: string): number | null {
  const name = (packageName ?? '').trim();
  if (!name) return null;
  if (name.startsWith('Basketball - ') && !name.includes('Private') && !name.includes('Small Groups')) return 12;
  if (name === 'Gymnastics Package A') return 12;
  if (name === 'Gymnastics Package B') return 8;
  if (name === 'Gymnastics Package C') return 18;
  if (name === 'Gymnastics Package D') return 12;
  if (name === 'Volleyball') return 10;
  return null;
}

function computeFinalPrice(base: number, discountType: string, discountValue: number): number {
  const b = Math.max(0, base);
  if (!discountType || discountType === 'NONE') return b;
  if (discountType === 'PERCENT') return Math.max(0, b - Math.round((b * discountValue) / 100));
  return Math.max(0, b - discountValue);
}

function personKey(r: PackageRegistrationRow): string {
  return `${(r.customerPhone || '').trim().toLowerCase()}`;
}

function toUniquePersons(rows: PackageRegistrationRow[]): PackageRegistrationRow[] {
  const seen = new Set<string>();
  const out: PackageRegistrationRow[] = [];
  for (const r of rows) {
    const key = personKey(r);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

type Step = 1 | 2 | 3;

type PackageConfig = {
  packageName: string;
  basePriceJod: string;
  discountType: 'NONE' | 'PERCENT' | 'AMOUNT';
  discountValue: string;
  discountReason: string;
};

export function RegisterPersonMultiPackageModal({
  open,
  onClose,
  onSuccess,
  rows,
  packageOptions,
  defaultPricesByPackage,
  initialPerson,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (created: number) => void;
  rows: PackageRegistrationRow[];
  packageOptions: string[];
  defaultPricesByPackage?: Record<string, number>;
  initialPerson?: InitialPerson | null;
}) {
  const [step, setStep] = useState<Step>(1);
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<InitialPerson | null>(initialPerson ?? null);
  const [createNew, setCreateNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAge, setNewAge] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [packageConfigs, setPackageConfigs] = useState<Record<string, PackageConfig>>({});
  const [periodStartsAt, setPeriodStartsAt] = useState(''); // when they will start (optional)
  const [pricing, setPricing] = useState<Array<{ packageName: string; basePriceJod: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persons = useMemo(() => toUniquePersons(rows), [rows]);
  const filteredPersons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter(
      (r) =>
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.customerPhone || '').toLowerCase().includes(q) ||
        (r.customerEmail || '').toLowerCase().includes(q),
    );
  }, [persons, search]);

  useEffect(() => {
    if (open) {
      packagePricingApi.list().then(setPricing).catch(() => setPricing([]));
      setSelectedPerson(initialPerson ?? null);
      setCreateNew(false);
      setSearch('');
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAge('');
      setSelectedPackages(new Set());
      setPackageConfigs({});
      setError(null);
      setStep(initialPerson ? 2 : 1);
    }
  }, [open, initialPerson]);

  useEffect(() => {
    if (!open) return;
    const next: Record<string, PackageConfig> = {};
    selectedPackages.forEach((pkg) => {
      if (packageConfigs[pkg]) next[pkg] = packageConfigs[pkg];
      else {
        const defaultPrice = defaultPricesByPackage?.[pkg];
        const p = pricing.find((x) => x.packageName === pkg);
        const baseJod = defaultPrice ?? p?.basePriceJod;
        next[pkg] = {
          packageName: pkg,
          basePriceJod: baseJod != null ? String(baseJod) : '',
          discountType: 'NONE',
          discountValue: '',
          discountReason: '',
        };
      }
    });
    setPackageConfigs(next);
  }, [open, selectedPackages, pricing, defaultPricesByPackage]);

  const currentPerson = selectedPerson
    ? { customerName: selectedPerson.customerName, customerPhone: selectedPerson.customerPhone, customerEmail: selectedPerson.customerEmail ?? null, customerAge: selectedPerson.customerAge ?? null }
    : createNew
      ? { customerName: newName.trim(), customerPhone: newPhone.trim(), customerEmail: newEmail.trim() || null, customerAge: newAge.trim() ? parseInt(newAge, 10) : null }
      : null;

  function togglePackage(pkg: string) {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(pkg)) next.delete(pkg);
      else next.add(pkg);
      return next;
    });
  }

  function updateConfig(pkg: string, upd: Partial<PackageConfig>) {
    setPackageConfigs((prev) => ({ ...prev, [pkg]: { ...prev[pkg], ...upd } }));
  }

  const canGoStep2 = currentPerson && currentPerson.customerName && currentPerson.customerPhone;
  const canGoStep3 = selectedPackages.size >= 1;
  const configsValid = Array.from(selectedPackages).every((pkg) => {
    const c = packageConfigs[pkg];
    if (!c) return false;
    const base = c.basePriceJod.trim() === '' ? 0 : parseInt(c.basePriceJod, 10) || 0;
    const isManual = pricing.find((x) => x.packageName === pkg)?.basePriceJod == null;
    if (isManual && base === 0) return false;
    if (c.discountType !== 'NONE' && !c.discountReason.trim()) return false;
    return true;
  });

  async function handleSubmit() {
    if (!currentPerson || selectedPackages.size === 0) return;
    setError(null);
    setLoading(true);
    try {
      const registrations = Array.from(selectedPackages).map((pkg) => {
        const c = packageConfigs[pkg];
        const base = Math.max(0, c?.basePriceJod?.trim() === '' ? 0 : parseInt(c?.basePriceJod ?? '0', 10) || 0);
        const discountType = (c?.discountType ?? 'NONE').toUpperCase();
        const discountVal = discountType === 'NONE' ? 0 : parseFloat(c?.discountValue ?? '0') || 0;
        return {
          packageName: pkg,
          basePriceJod: base,
          discountType,
          discountValue: discountType === 'NONE' ? null : discountVal,
          discountReason: discountType === 'NONE' ? undefined : (c?.discountReason ?? '').trim(),
          periodStartsAt: periodStartsAt.trim() || undefined,
        };
      });
      const res = await packageRegistrationsApi.bulkCreateForPerson({
        person: currentPerson,
        periodStartsAt: startDate.trim() || undefined,
        registrations,
      });
      onSuccess(res.created);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to create registrations');
    } finally {
      setLoading(false);
    }
  }

  const packageList = packageOptions.length ? packageOptions : [
    'Basketball - Little Kobes U10', 'Basketball - Ballers & Hoopers U12–U14', 'Basketball - Warriors',
    'Basketball - Private 1v1 Sessions', 'Basketball - Small Groups',
    'Gymnastics Package A', 'Gymnastics Package B', 'Gymnastics Package C', 'Gymnastics Package D',
    'Volleyball',
  ];

  return (
    <Modal open={open} onClose={onClose} title="Register person in multiple packages" size="xl">
      {error && <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      {step === 1 && (
        <>
          <p className="mb-4 text-sm text-ui-textMuted">Select an existing person or create a new one.</p>
          <div className="mb-4">
            <Input label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or phone..." />
          </div>
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={createNew} onChange={(e) => setCreateNew(e.target.checked)} className="rounded border-ui-border" />
              <span className="text-sm font-medium text-ui-textPrimary">Create new person</span>
            </label>
          </div>
          {createNew ? (
            <div className="space-y-3">
              <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} required placeholder="Full name" />
              <Input label="Phone" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} required placeholder="Phone" />
              <Input label="Email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email (optional)" />
              <Input label="Age" type="number" value={newAge} onChange={(e) => setNewAge(e.target.value)} placeholder="Age (optional)" />
            </div>
          ) : (
            <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-ui-border">
              {filteredPersons.length === 0 ? (
                <div className="p-4 text-center text-ui-textMuted text-sm">No match. Use “Create new person” or adjust search.</div>
              ) : (
                <ul className="divide-y divide-ui-border">
                  {filteredPersons.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPerson({ customerName: r.customerName, customerPhone: r.customerPhone, customerEmail: r.customerEmail ?? undefined, customerAge: r.customerAge ?? undefined });
                          setCreateNew(false);
                        }}
                        className={`w-full px-4 py-3 text-left hover:bg-ui-softBg transition ${selectedPerson?.customerPhone === r.customerPhone ? 'bg-brand-blue-primary/10' : ''}`}
                      >
                        <span className="font-medium text-ui-textPrimary">{r.customerName}</span>
                        <span className="ml-2 text-ui-textMuted">{r.customerPhone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setStep(2)} disabled={!canGoStep2}>Next: Select packages</Button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mb-4 text-sm text-ui-textMuted">
            Person: <strong>{currentPerson?.customerName}</strong> ({currentPerson?.customerPhone}). Select one or more packages.
          </p>
          <div className="mb-4">
            <Input
              label="Start date (optional)"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <p className="mt-0.5 text-xs text-ui-textMuted">When they start/started. Leave empty for today.</p>
          </div>
          <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-ui-border p-3">
            {packageList.map((pkg) => (
              <label key={pkg} className="flex items-center gap-3 py-2 hover:bg-ui-softBg/50 rounded px-2">
                <input
                  type="checkbox"
                  checked={selectedPackages.has(pkg)}
                  onChange={() => togglePackage(pkg)}
                  className="rounded border-ui-border"
                />
                <span className="text-ui-textPrimary">{pkg}</span>
              </label>
            ))}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={!canGoStep3}>Next: Configure packages</Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="mb-4 text-sm text-ui-textMuted">Set price and optional discount for each package.</p>
          <div className="space-y-4 max-h-[45vh] overflow-y-auto">
            {Array.from(selectedPackages).map((pkg) => {
              const c = packageConfigs[pkg] ?? { packageName: pkg, basePriceJod: '', discountType: 'NONE' as const, discountValue: '', discountReason: '' };
              const isManual = pricing.find((x) => x.packageName === pkg)?.basePriceJod == null;
              const baseNum = c.basePriceJod.trim() === '' ? 0 : parseInt(c.basePriceJod, 10) || 0;
              const discountVal = c.discountType === 'NONE' ? 0 : parseFloat(c.discountValue) || 0;
              const finalPrice = computeFinalPrice(baseNum, c.discountType, discountVal);
              const sessions = getSessionsForPackage(pkg);
              return (
                <div key={pkg} className="rounded-lg border border-ui-border p-4 bg-ui-softBg/30">
                  <p className="font-semibold text-ui-textPrimary mb-3">{pkg}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs text-ui-textMuted mb-1">Base price (JOD)</label>
                      {isManual ? (
                        <Input type="number" min={0} value={c.basePriceJod} onChange={(e) => updateConfig(pkg, { basePriceJod: e.target.value })} placeholder="Enter price" />
                      ) : (
                        <Input type="number" min={0} value={c.basePriceJod} onChange={(e) => updateConfig(pkg, { basePriceJod: e.target.value })} placeholder="Auto" />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-ui-textMuted mb-1">Discount</label>
                      <Select value={c.discountType} onChange={(e) => updateConfig(pkg, { discountType: e.target.value as 'NONE' | 'PERCENT' | 'AMOUNT' })}>
                        <option value="NONE">None</option>
                        <option value="PERCENT">Percent (%)</option>
                        <option value="AMOUNT">Amount (JOD)</option>
                      </Select>
                    </div>
                  </div>
                  {c.discountType !== 'NONE' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <Input label={c.discountType === 'PERCENT' ? 'Value %' : 'Value (JOD)'} type="number" min={0} value={c.discountValue} onChange={(e) => updateConfig(pkg, { discountValue: e.target.value })} />
                      <Input label="Reason" value={c.discountReason} onChange={(e) => updateConfig(pkg, { discountReason: e.target.value })} placeholder="Required" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <span className="text-ui-textMuted">Final price: <strong className="text-ui-textPrimary">{finalPrice} JOD</strong></span>
                    {sessions != null && <span className="text-ui-textMuted">Sessions included: <strong>{sessions}</strong></span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Input
              label="When they will start"
              type="date"
              value={periodStartsAt}
              onChange={(e) => setPeriodStartsAt(e.target.value)}
              placeholder="Optional start date for all"
            />
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleSubmit} disabled={!configsValid || loading} isLoading={loading}>
              Create {selectedPackages.size} registration{selectedPackages.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

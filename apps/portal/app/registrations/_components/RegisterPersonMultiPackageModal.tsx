'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';
import type { InitialPerson } from './AddRegistrationModal';
import { getPackageDefaultPrice, getPackageDefaultSessions, hasPackageDefaultPrice } from './packageDefaults';

function computeFinalPrice(base: number, discountType: string, discountValue: number): number {
  const safeBase = Math.max(0, base);
  if (!discountType || discountType === 'NONE') return safeBase;
  if (discountType === 'PERCENT') return Math.max(0, safeBase - Math.round((safeBase * discountValue) / 100));
  return Math.max(0, safeBase - discountValue);
}

function personKey(registration: PackageRegistrationRow): string {
  return `${(registration.customerPhone || '').trim().toLowerCase()}`;
}

function toUniquePersons(rows: PackageRegistrationRow[]): PackageRegistrationRow[] {
  const seen = new Set<string>();
  const out: PackageRegistrationRow[] = [];
  for (const row of rows) {
    const key = personKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
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
  defaultSessionsByPackage,
  initialPerson,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (created: number) => void;
  rows: PackageRegistrationRow[];
  packageOptions: string[];
  defaultPricesByPackage?: Record<string, number>;
  defaultSessionsByPackage?: Record<string, number>;
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
  const [periodStartsAt, setPeriodStartsAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persons = useMemo(() => toUniquePersons(rows), [rows]);
  const filteredPersons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return persons;
    return persons.filter(
      (row) =>
        (row.customerName || '').toLowerCase().includes(query) ||
        (row.customerPhone || '').toLowerCase().includes(query) ||
        (row.customerEmail || '').toLowerCase().includes(query),
    );
  }, [persons, search]);

  useEffect(() => {
    if (!open) return;
    setSelectedPerson(initialPerson ?? null);
    setCreateNew(false);
    setSearch('');
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewAge('');
    setSelectedPackages(new Set());
    setPackageConfigs({});
    setPeriodStartsAt('');
    setError(null);
    setStep(initialPerson ? 2 : 1);
  }, [initialPerson, open]);

  useEffect(() => {
    if (!open) return;
    setPackageConfigs((prev) => {
      const nextConfigs: Record<string, PackageConfig> = {};
      selectedPackages.forEach((packageName) => {
        if (prev[packageName]) {
          nextConfigs[packageName] = prev[packageName];
          return;
        }
        const defaultPrice = getPackageDefaultPrice(packageName, defaultPricesByPackage);
        nextConfigs[packageName] = {
          packageName,
          basePriceJod: defaultPrice != null ? String(defaultPrice) : '',
          discountType: 'NONE',
          discountValue: '',
          discountReason: '',
        };
      });
      return nextConfigs;
    });
  }, [defaultPricesByPackage, open, selectedPackages]);

  const currentPerson = selectedPerson
    ? {
        customerName: selectedPerson.customerName,
        customerPhone: selectedPerson.customerPhone,
        customerEmail: selectedPerson.customerEmail ?? null,
        customerAge: selectedPerson.customerAge ?? null,
      }
    : createNew
      ? {
          customerName: newName.trim(),
          customerPhone: newPhone.trim(),
          customerEmail: newEmail.trim() || null,
          customerAge: newAge.trim() ? parseInt(newAge, 10) : null,
        }
      : null;

  function togglePackage(packageName: string) {
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(packageName)) next.delete(packageName);
      else next.add(packageName);
      return next;
    });
  }

  function updateConfig(packageName: string, patch: Partial<PackageConfig>) {
    setPackageConfigs((prev) => ({
      ...prev,
      [packageName]: { ...prev[packageName], ...patch },
    }));
  }

  const canGoStep2 = currentPerson && currentPerson.customerName && currentPerson.customerPhone;
  const canGoStep3 = selectedPackages.size >= 1;
  const configsValid = Array.from(selectedPackages).every((packageName) => {
    const config = packageConfigs[packageName];
    if (!config) return false;
    const base = config.basePriceJod.trim() === '' ? 0 : parseInt(config.basePriceJod, 10) || 0;
    const isManual = !hasPackageDefaultPrice(packageName, defaultPricesByPackage);
    if (isManual && base === 0) return false;
    if (config.discountType !== 'NONE' && !config.discountReason.trim()) return false;
    return true;
  });

  async function handleSubmit() {
    if (!currentPerson || selectedPackages.size === 0) return;
    setError(null);
    setLoading(true);
    try {
      const registrations = Array.from(selectedPackages).map((packageName) => {
        const config = packageConfigs[packageName];
        const base = Math.max(0, config?.basePriceJod?.trim() === '' ? 0 : parseInt(config?.basePriceJod ?? '0', 10) || 0);
        const hasDefault = hasPackageDefaultPrice(packageName, defaultPricesByPackage);
        const nextDiscountType = (config?.discountType ?? 'NONE').toUpperCase();
        const nextDiscountValue = nextDiscountType === 'NONE' ? 0 : parseFloat(config?.discountValue ?? '0') || 0;
        return {
          packageName,
          basePriceJod: hasDefault && base === 0 ? undefined : base,
          discountType: nextDiscountType,
          discountValue: nextDiscountType === 'NONE' ? null : nextDiscountValue,
          discountReason: nextDiscountType === 'NONE' ? undefined : (config?.discountReason ?? '').trim(),
          periodStartsAt: periodStartsAt.trim() || undefined,
        };
      });
      const response = await packageRegistrationsApi.bulkCreateForPerson({
        person: currentPerson,
        periodStartsAt: periodStartsAt.trim() || undefined,
        registrations,
      });
      onSuccess(response.created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create registrations');
    } finally {
      setLoading(false);
    }
  }

  const packageList = Array.from(new Set((packageOptions || []).filter(Boolean))).sort((left, right) => left.localeCompare(right));

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
                <div className="p-4 text-center text-sm text-ui-textMuted">No match. Use &quot;Create new person&quot; or adjust search.</div>
              ) : (
                <ul className="divide-y divide-ui-border">
                  {filteredPersons.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPerson({
                            customerName: row.customerName,
                            customerPhone: row.customerPhone,
                            customerEmail: row.customerEmail ?? undefined,
                            customerAge: row.customerAge ?? undefined,
                          });
                          setCreateNew(false);
                        }}
                        className={`w-full px-4 py-3 text-left transition hover:bg-ui-softBg ${
                          selectedPerson?.customerPhone === row.customerPhone ? 'bg-brand-blue-primary/10' : ''
                        }`}
                      >
                        <span className="font-medium text-ui-textPrimary">{row.customerName}</span>
                        <span className="ml-2 text-ui-textMuted">{row.customerPhone}</span>
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
              value={periodStartsAt}
              onChange={(e) => setPeriodStartsAt(e.target.value)}
              hint="When they start or started. Leave empty for today."
            />
          </div>
          <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-ui-border p-3">
            {packageList.map((packageName) => (
              <label key={packageName} className="flex items-center gap-3 rounded px-2 py-2 hover:bg-ui-softBg/50">
                <input
                  type="checkbox"
                  checked={selectedPackages.has(packageName)}
                  onChange={() => togglePackage(packageName)}
                  className="rounded border-ui-border"
                />
                <span className="text-ui-textPrimary">{packageName}</span>
              </label>
            ))}
            {packageList.length === 0 && <p className="text-sm text-ui-textMuted">No packages are available yet.</p>}
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
          <div className="max-h-[45vh] space-y-4 overflow-y-auto">
            {Array.from(selectedPackages).map((packageName) => {
              const config = packageConfigs[packageName] ?? {
                packageName,
                basePriceJod: '',
                discountType: 'NONE' as const,
                discountValue: '',
                discountReason: '',
              };
              const isManual = !hasPackageDefaultPrice(packageName, defaultPricesByPackage);
              const base = config.basePriceJod.trim() === '' ? 0 : parseInt(config.basePriceJod, 10) || 0;
              const discountNumber = config.discountType === 'NONE' ? 0 : parseFloat(config.discountValue) || 0;
              const finalPrice = computeFinalPrice(base, config.discountType, discountNumber);
              const sessions = getPackageDefaultSessions(packageName, defaultSessionsByPackage);

              return (
                <div key={packageName} className="rounded-lg border border-ui-border bg-ui-softBg/30 p-4">
                  <p className="mb-3 font-semibold text-ui-textPrimary">{packageName}</p>
                  <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs text-ui-textMuted">Base price (JOD)</label>
                      {isManual ? (
                        <Input
                          type="number"
                          min={0}
                          value={config.basePriceJod}
                          onChange={(e) => updateConfig(packageName, { basePriceJod: e.target.value })}
                          placeholder="Enter price"
                        />
                      ) : (
                        <div className="rounded-xl border border-ui-border bg-white px-3 py-2.5 text-sm text-ui-textPrimary">
                          {config.basePriceJod !== '' ? `${config.basePriceJod} JOD` : '-'}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-ui-textMuted">Discount</label>
                      <Select
                        value={config.discountType}
                        onChange={(e) => updateConfig(packageName, { discountType: e.target.value as 'NONE' | 'PERCENT' | 'AMOUNT' })}
                      >
                        <option value="NONE">None</option>
                        <option value="PERCENT">Percent (%)</option>
                        <option value="AMOUNT">Amount (JOD)</option>
                      </Select>
                    </div>
                  </div>
                  {config.discountType !== 'NONE' && (
                    <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Input
                        label={config.discountType === 'PERCENT' ? 'Value %' : 'Value (JOD)'}
                        type="number"
                        min={0}
                        value={config.discountValue}
                        onChange={(e) => updateConfig(packageName, { discountValue: e.target.value })}
                      />
                      <Input
                        label="Reason"
                        value={config.discountReason}
                        onChange={(e) => updateConfig(packageName, { discountReason: e.target.value })}
                        placeholder="Required"
                      />
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

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packagesApi, type PackageOption } from '../../../lib/portalApi';

type PackageFormState = {
  sourcePackageId: string;
  name: string;
  sportType: string;
  description: string;
  durationMonths: string;
  sessionsCount: string;
  trackingType: string;
  pricingType: string;
  currentPriceJod: string;
  isActive: boolean;
  showOnWebsite: boolean;
  sortOrder: string;
};

function emptyForm(): PackageFormState {
  return {
    sourcePackageId: '',
    name: '',
    sportType: '',
    description: '',
    durationMonths: '1',
    sessionsCount: '0',
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: '',
    isActive: true,
    showOnWebsite: true,
    sortOrder: '0',
  };
}

function normalizeDuration(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.round(parsed));
}

function packageToForm(pkg: PackageOption): PackageFormState {
  return {
    sourcePackageId: pkg.id,
    name: pkg.name,
    sportType: pkg.sportType,
    description: pkg.description ?? '',
    durationMonths: String(Math.max(1, Number(pkg.durationMonths ?? 1) || 1)),
    sessionsCount: String(Math.max(0, Number(pkg.sessionsCount ?? 0) || 0)),
    trackingType: pkg.trackingType || 'SESSIONS',
    pricingType: pkg.pricingType || 'FIXED',
    currentPriceJod: pkg.currentPriceJod == null ? '' : String(Math.max(0, Number(pkg.currentPriceJod) || 0)),
    isActive: pkg.isActive,
    showOnWebsite: pkg.showOnWebsite,
    sortOrder: String(Math.max(0, Number(pkg.sortOrder ?? 0) || 0)),
  };
}

function buildVariantForm(source: PackageOption, durationMonths: number): PackageFormState {
  const normalizedDuration = Math.max(1, Math.round(durationMonths || 1));
  const multipliedSessions = Math.max(0, Number(source.sessionsCount ?? 0) || 0) * normalizedDuration;
  const multipliedPrice =
    source.currentPriceJod == null
      ? ''
      : String(Math.max(0, Number(source.currentPriceJod ?? 0) || 0) * normalizedDuration);
  return {
    sourcePackageId: source.id,
    name: `${source.name} - ${normalizedDuration} Month${normalizedDuration === 1 ? '' : 's'}`,
    sportType: source.sportType,
    description: source.description ?? '',
    durationMonths: String(normalizedDuration),
    sessionsCount: String(multipliedSessions),
    trackingType: source.trackingType || 'SESSIONS',
    pricingType: source.pricingType || 'FIXED',
    currentPriceJod: multipliedPrice,
    isActive: true,
    showOnWebsite: normalizedDuration === 1 ? source.showOnWebsite : false,
    sortOrder: String(Math.max(0, Number(source.sortOrder ?? 0) || 0) + normalizedDuration),
  };
}

export function ManagePackageSessionsModal({
  open,
  onClose,
  packages,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  packages: PackageOption[];
  onSaved: () => void;
}) {
  const [packageRows, setPackageRows] = useState<PackageOption[]>(packages);
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  const [mode, setMode] = useState<'edit' | 'create'>('edit');
  const [form, setForm] = useState<PackageFormState>(emptyForm());
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPackage = useMemo(
    () => packageRows.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [packageRows, selectedPackageId],
  );

  async function loadPackages(preferredPackageId?: string | null, nextMode: 'edit' | 'create' = mode) {
    setLoadingPackages(true);
    try {
      const rows = await packagesApi.list({ includeInactive: true });
      setPackageRows(rows);

      const preferred = preferredPackageId
        ? rows.find((pkg) => pkg.id === preferredPackageId) ?? rows[0] ?? null
        : rows[0] ?? null;

      if (nextMode === 'edit') {
        setSelectedPackageId(preferred?.id ?? null);
        setForm(preferred ? packageToForm(preferred) : emptyForm());
      } else if (!form.sourcePackageId && preferred) {
        setForm(buildVariantForm(preferred, 3));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load packages');
    } finally {
      setLoadingPackages(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSaving(false);
    setDeleting(false);
    setMode('edit');
    const initialPackage = packages[0] ?? null;
    setPackageRows(packages);
    setSelectedPackageId(initialPackage?.id ?? null);
    setForm(initialPackage ? packageToForm(initialPackage) : emptyForm());
    loadPackages(initialPackage?.id ?? null, 'edit');
  }, [open, packages]);

  function startCreateVariant(source?: PackageOption | null) {
    const fallbackSource = source ?? selectedPackage ?? packageRows[0] ?? null;
    if (!fallbackSource) {
      setMode('create');
      setSelectedPackageId(null);
      setForm(emptyForm());
      return;
    }
    setMode('create');
    setSelectedPackageId(null);
    setForm(buildVariantForm(fallbackSource, 3));
  }

  function selectPackage(pkg: PackageOption) {
    setMode('edit');
    setSelectedPackageId(pkg.id);
    setForm(packageToForm(pkg));
    setError(null);
  }

  function updateForm<K extends keyof PackageFormState>(key: K, value: PackageFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const sourceOptions = packageRows.filter((pkg) => pkg.isActive);
  const sourcePackage =
    sourceOptions.find((pkg) => pkg.id === form.sourcePackageId) ??
    selectedPackage ??
    sourceOptions[0] ??
    null;

  function refreshVariantDefaults() {
    if (!sourcePackage) return;
    setForm(buildVariantForm(sourcePackage, normalizeDuration(form.durationMonths)));
  }

  const parsedDurationMonths = normalizeDuration(form.durationMonths);
  const parsedSessions = Math.max(0, Math.round(Number(form.sessionsCount) || 0));
  const parsedPrice =
    form.pricingType === 'MANUAL'
      ? null
      : form.currentPriceJod.trim() === ''
        ? 0
        : Math.max(0, Math.round(Number(form.currentPriceJod) || 0));
  const parsedSortOrder = Math.max(0, Math.round(Number(form.sortOrder) || 0));

  async function handleSave() {
    setError(null);

    const name = form.name.trim();
    if (!name) {
      setError('Package name is required.');
      return;
    }
    if (!form.sportType.trim()) {
      setError('Sport type is required.');
      return;
    }
    if (parsedDurationMonths < 1) {
      setError('Duration must be at least 1 month.');
      return;
    }
    if (parsedSessions < 0) {
      setError('Sessions must be 0 or greater.');
      return;
    }
    if (form.pricingType !== 'MANUAL' && parsedPrice == null) {
      setError('Price is required for fixed pricing.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        sportType: form.sportType.trim().toUpperCase(),
        description: form.description.trim() || null,
        durationMonths: parsedDurationMonths,
        sessionsCount: parsedSessions,
        trackingType: form.trackingType.trim().toUpperCase() || 'SESSIONS',
        pricingType: form.pricingType.trim().toUpperCase() || 'FIXED',
        currentPriceJod: form.pricingType === 'MANUAL' ? null : parsedPrice,
        isActive: form.isActive,
        showOnWebsite: form.showOnWebsite,
        sortOrder: parsedSortOrder,
      };

      if (mode === 'edit' && selectedPackageId) {
        await packagesApi.update(selectedPackageId, payload);
      } else {
        await packagesApi.create(payload);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedPackageId || !selectedPackage) return;
    const confirmed = window.confirm(
      `Delete "${selectedPackage.name}"?\n\nThis permanently removes the package if it has no registrations yet.`,
    );
    if (!confirmed) return;

    setError(null);
    setDeleting(true);
    try {
      await packagesApi.delete(selectedPackageId);
      await loadPackages(null, 'edit');
      onSaved();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete package');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage Packages"
      description="Create portal-only multi-month variants and edit package defaults in one place."
      size="xl"
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-ui-textMuted">
            {loadingPackages ? 'Loading packages...' : `${packageRows.length} package${packageRows.length === 1 ? '' : 's'} available`}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => loadPackages(selectedPackageId)}>
              Refresh packages
            </Button>
            <Button type="button" onClick={() => startCreateVariant()}>
              Create variant
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="rounded-xl border border-ui-border bg-ui-softBg/20">
            <div className="border-b border-ui-border px-4 py-3">
              <p className="text-sm font-semibold text-ui-textPrimary">Existing packages</p>
              <p className="text-xs text-ui-textMuted">Active and inactive packages.</p>
            </div>
            <div className="max-h-[55vh] overflow-y-auto">
              {packageRows.length === 0 ? (
                <p className="p-4 text-sm text-ui-textMuted">No packages found yet.</p>
              ) : (
                <div className="space-y-2 p-3">
                  {packageRows.map((pkg) => {
                    const active = mode === 'edit' && selectedPackageId === pkg.id;
                    return (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => selectPackage(pkg)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? 'border-brand-blue-primary bg-brand-blue-primary/5'
                            : 'border-ui-border bg-white hover:border-brand-blue-primary/40'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-ui-textPrimary">{pkg.name}</p>
                            <p className="mt-1 text-xs text-ui-textMuted">
                              {pkg.durationMonths} month{pkg.durationMonths === 1 ? '' : 's'} · {pkg.sessionsCount} sessions
                            </p>
                          </div>
                          <div className="text-right text-[11px] text-ui-textMuted">
                            <div>{pkg.isActive ? 'Active' : 'Inactive'}</div>
                            <div>{pkg.showOnWebsite ? 'Website' : 'Portal only'}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-ui-border bg-white p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-ui-textPrimary">
                  {mode === 'edit' ? 'Edit package' : 'Create package variant'}
                </p>
                <p className="text-xs text-ui-textMuted">
                  {mode === 'edit'
                    ? 'Changes affect future registrations. Existing registrations keep their snapped duration.'
                    : 'Use a source package to prefill name, sessions, price, and portal-only visibility.'}
                </p>
              </div>
              {mode === 'edit' && selectedPackage && (
                <Button type="button" variant="secondary" onClick={() => startCreateVariant(selectedPackage)}>
                  Create variant from this
                </Button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {mode === 'create' && (
                <>
                  <Select
                    label="Source package"
                    value={form.sourcePackageId}
                    onChange={(e) => {
                      const nextSource =
                        sourceOptions.find((pkg) => pkg.id === e.target.value) ?? null;
                      if (nextSource) {
                        setForm(buildVariantForm(nextSource, normalizeDuration(form.durationMonths)));
                        return;
                      }
                      updateForm('sourcePackageId', e.target.value);
                    }}
                  >
                    <option value="">Select source package</option>
                    {sourceOptions.map((pkg) => (
                      <option key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </option>
                    ))}
                  </Select>
                  <div className="flex items-end justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={refreshVariantDefaults} disabled={!sourcePackage}>
                      Prefill
                    </Button>
                  </div>
                </>
              )}

              <Input
                label="Package name"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                placeholder="e.g. Basketball - Warriors - 3 Months"
                required
              />
              <Input
                label="Sport type"
                value={form.sportType}
                onChange={(e) => updateForm('sportType', e.target.value)}
                placeholder="e.g. BASKETBALL"
                required
              />
              <Input
                label="Duration (months)"
                type="number"
                min={1}
                value={form.durationMonths}
                onChange={(e) => updateForm('durationMonths', e.target.value)}
                required
              />
              <Input
                label="Sessions count"
                type="number"
                min={0}
                value={form.sessionsCount}
                onChange={(e) => updateForm('sessionsCount', e.target.value)}
                required
              />
              <Select
                label="Tracking type"
                value={form.trackingType}
                onChange={(e) => updateForm('trackingType', e.target.value)}
              >
                <option value="SESSIONS">SESSIONS</option>
                <option value="DAYS">DAYS</option>
                <option value="BOTH">BOTH</option>
              </Select>
              <Select
                label="Pricing type"
                value={form.pricingType}
                onChange={(e) => updateForm('pricingType', e.target.value)}
              >
                <option value="FIXED">FIXED</option>
                <option value="MANUAL">MANUAL</option>
              </Select>
              <Input
                label="Current price (JOD)"
                type="number"
                min={0}
                value={form.pricingType === 'MANUAL' ? '' : form.currentPriceJod}
                onChange={(e) => updateForm('currentPriceJod', e.target.value)}
                placeholder={form.pricingType === 'MANUAL' ? 'Manual pricing' : '0'}
                disabled={form.pricingType === 'MANUAL'}
              />
              <Input
                label="Sort order"
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={(e) => updateForm('sortOrder', e.target.value)}
              />
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-ui-textMuted">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-ui-border bg-white px-3 py-2.5 text-sm text-ui-textPrimary focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
                placeholder="Optional package description"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm text-ui-textPrimary">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => updateForm('isActive', e.target.checked)}
                  className="rounded border-ui-border"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm text-ui-textPrimary">
                <input
                  type="checkbox"
                  checked={form.showOnWebsite}
                  onChange={(e) => updateForm('showOnWebsite', e.target.checked)}
                  className="rounded border-ui-border"
                />
                Show on website
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <div>
                {mode === 'edit' && selectedPackage ? (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                    isLoading={deleting}
                  >
                    Delete package
                  </Button>
                ) : null}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={saving || deleting}>
                  Cancel
                </Button>
                <Button type="button" onClick={handleSave} isLoading={saving} disabled={deleting}>
                  {mode === 'edit' ? 'Save package' : 'Create package'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

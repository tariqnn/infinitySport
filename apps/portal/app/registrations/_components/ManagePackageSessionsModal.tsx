'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Button } from '../../_components/ui';
import { packagesApi, type PackageOption } from '../../../lib/portalApi';

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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDrafts(
      Object.fromEntries(
        packages.map((pkg) => [pkg.id, String(Math.max(0, Number(pkg.sessionsCount) || 0))]),
      ),
    );
    setError(null);
    setSaving(false);
  }, [open, packages]);

  const changedPackages = useMemo(
    () =>
      packages.filter((pkg) => {
        const current = Math.max(0, Number(pkg.sessionsCount) || 0);
        const next = Math.max(0, parseInt(drafts[pkg.id] ?? String(current), 10) || 0);
        return next !== current;
      }),
    [drafts, packages],
  );

  async function handleSave() {
    setError(null);
    for (const pkg of packages) {
      const value = drafts[pkg.id] ?? String(pkg.sessionsCount ?? 0);
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError(`Sessions for "${pkg.name}" must be 0 or greater.`);
        return;
      }
    }

    if (changedPackages.length === 0) {
      onClose();
      return;
    }

    setSaving(true);
    try {
      for (const pkg of changedPackages) {
        const nextSessions = Math.max(0, parseInt(drafts[pkg.id] ?? '0', 10) || 0);
        await packagesApi.update(pkg.id, { sessionsCount: nextSessions });
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update package sessions');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Package Sessions"
      description="Update the default session count for each package. New registrations use these numbers, and registrations still using the old default will follow the update too."
      size="lg"
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
          {packages.map((pkg) => (
            <div key={pkg.id} className="rounded-xl border border-ui-border bg-ui-softBg/30 p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end">
                <div>
                  <p className="font-semibold text-ui-textPrimary">{pkg.name}</p>
                  <p className="mt-1 text-xs text-ui-textMuted">
                    {pkg.pricingType === 'MANUAL' ? 'Manual pricing' : `${pkg.currentPriceJod ?? 0} JOD`}
                    {' | '}
                    {pkg.trackingType}
                  </p>
                </div>
                <Input
                  label="Sessions"
                  type="number"
                  min={0}
                  value={drafts[pkg.id] ?? String(pkg.sessionsCount ?? 0)}
                  onChange={(e) => setDrafts((prev) => ({ ...prev, [pkg.id]: e.target.value }))}
                />
              </div>
            </div>
          ))}
          {packages.length === 0 && <p className="text-sm text-ui-textMuted">No packages found.</p>}
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={handleSave} isLoading={saving}>
            Save session defaults
          </Button>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, packagePricingApi } from '../../../lib/portalApi';
import type { PackageRegistrationRow } from '../../../lib/portalApi';

function computeFinalPrice(base: number, discountType: string, discountValue: number): number {
  const b = Math.max(0, base);
  if (!discountType || discountType === 'NONE') return b;
  if (discountType === 'PERCENT') return Math.max(0, b - Math.round((b * discountValue) / 100));
  return Math.max(0, b - discountValue);
}

export function RegisterInAnotherPackageModal({
  open,
  onClose,
  onSuccess,
  registration,
  packageOptions,
  defaultPricesByPackage,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  registration: PackageRegistrationRow | null;
  packageOptions: string[];
  defaultPricesByPackage?: Record<string, number>;
}) {
  const [packageName, setPackageName] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [basePriceJod, setBasePriceJod] = useState<string>('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState('');
  const [pricing, setPricing] = useState<Array<{ packageName: string; basePriceJod: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      packagePricingApi.list().then(setPricing).catch(() => setPricing([]));
      setStartDate(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const defaultPrice = defaultPricesByPackage?.[packageName];
    if (defaultPrice != null) setBasePriceJod(String(defaultPrice));
    else {
      const p = pricing.find((x) => x.packageName === packageName);
      if (p?.basePriceJod != null) setBasePriceJod(String(p.basePriceJod));
      else if (packageName) setBasePriceJod('');
    }
  }, [packageName, pricing, open, defaultPricesByPackage]);

  const baseNum = basePriceJod.trim() === '' ? 0 : parseInt(basePriceJod, 10) || 0;
  const discountVal = discountType === 'NONE' ? 0 : parseFloat(discountValue) || 0;
  const finalPrice = computeFinalPrice(baseNum, discountType, discountVal);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!registration) return;
    if (!packageName.trim()) {
      setError('Please select a package.');
      return;
    }
    const base = Math.max(0, baseNum);
    const hasDefaultPrice = (defaultPricesByPackage?.[packageName.trim()] ?? pricing.find((x) => x.packageName === packageName)?.basePriceJod) != null;
    if (base === 0 && !hasDefaultPrice) {
      setError('Enter base price (manual package).');
      return;
    }
    if (discountType !== 'NONE' && !discountReason.trim()) {
      setError('Discount reason is required when applying a discount.');
      return;
    }
    const basePricePayload = hasDefaultPrice && base === 0 ? undefined : base;

    setLoading(true);
    try {
      await packageRegistrationsApi.create({
        packageName: packageName.trim(),
        customerName: registration.customerName,
        customerPhone: registration.customerPhone,
        customerEmail: registration.customerEmail ?? undefined,
        customerAge: registration.customerAge ?? undefined,
        basePriceJod: basePricePayload,
        discountType,
        discountValue: discountType === 'NONE' ? null : discountVal,
        discountReason: discountType === 'NONE' ? undefined : discountReason.trim(),
        periodStartsAt: startDate.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create registration');
    } finally {
      setLoading(false);
    }
  }

  const isManualPricing = (defaultPricesByPackage?.[packageName] ?? pricing.find((x) => x.packageName === packageName)?.basePriceJod) == null && !!packageName;

  if (!registration) return null;

  return (
    <Modal open={open} onClose={onClose} title="Register in another package" size="md">
      <p className="mb-4 text-sm text-ui-textMuted">
        Creating a new registration for <strong>{registration.customerName}</strong> ({registration.customerPhone}).
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Select label="Package" value={packageName} onChange={(e) => setPackageName(e.target.value)} required>
          <option value="">Select package</option>
          {packageOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>

        <div>
          <label className="mb-1 block text-sm font-medium text-ui-textMuted">Start date</label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <p className="mt-0.5 text-xs text-ui-textMuted">For reference; registration is created with today’s date.</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-ui-textMuted">Base price (JOD)</label>
          {isManualPricing ? (
            <Input
              type="number"
              min={0}
              value={basePriceJod}
              onChange={(e) => setBasePriceJod(e.target.value)}
              placeholder="Enter price"
            />
          ) : (
            <div className="rounded-xl border border-ui-border bg-ui-softBg/50 px-3 py-2.5 text-sm text-ui-textPrimary">
              {packageName && basePriceJod !== '' ? `${basePriceJod} JOD` : '—'}
            </div>
          )}
        </div>

        <div className="rounded-lg border border-ui-border">
          <button
            type="button"
            onClick={() => setDiscountOpen((o) => !o)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-ui-textPrimary"
          >
            Discount {discountOpen ? '▼' : '▶'}
          </button>
          {discountOpen && (
            <div className="border-t border-ui-border p-3 space-y-2">
              <Select
                label="Type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'NONE' | 'PERCENT' | 'AMOUNT')}
              >
                <option value="NONE">None</option>
                <option value="PERCENT">Percent (%)</option>
                <option value="AMOUNT">Amount (JOD)</option>
              </Select>
              {discountType !== 'NONE' && (
                <>
                  <Input
                    label={discountType === 'PERCENT' ? 'Discount %' : 'Discount (JOD)'}
                    type="number"
                    min={0}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    required
                  />
                  <Input
                    label="Reason (required)"
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Sibling 10%"
                    required={discountType !== 'NONE'}
                  />
                </>
              )}
            </div>
          )}
        </div>

        <div className="rounded-lg bg-ui-bgMuted/50 p-3">
          <p className="text-xs text-ui-textMuted">Final price</p>
          <p className="text-xl font-bold text-ui-textPrimary">{finalPrice} JOD</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>Create registration</Button>
        </div>
      </form>
    </Modal>
  );
}

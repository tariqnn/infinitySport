'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, packagePricingApi } from '../../../lib/portalApi';

const PACKAGE_OPTIONS = [
  'Basketball - Little Kobes U10',
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

function computeFinalPrice(base: number, discountType: string, discountValue: number): number {
  const b = Math.max(0, base);
  if (!discountType || discountType === 'NONE') return b;
  if (discountType === 'PERCENT') return Math.max(0, b - Math.round((b * discountValue) / 100));
  return Math.max(0, b - discountValue);
}

export type InitialPerson = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAge?: number | null;
};

export function AddRegistrationModal({
  open,
  onClose,
  onSuccess,
  packageOptions,
  defaultPricesByPackage,
  initialPerson,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageOptions?: string[];
  defaultPricesByPackage?: Record<string, number>;
  initialPerson?: InitialPerson | null;
}) {
  const packageList = packageOptions?.length ? packageOptions : PACKAGE_OPTIONS;
  const [packageName, setPackageName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [basePriceJod, setBasePriceJod] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState('');
  const [periodStartsAt, setPeriodStartsAt] = useState(''); // when they will start (YYYY-MM-DD)
  const [pricing, setPricing] = useState<Array<{ packageName: string; basePriceJod: number | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) packagePricingApi.list().then(setPricing).catch(() => setPricing([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (initialPerson) {
      setCustomerName(initialPerson.customerName || '');
      setCustomerPhone(initialPerson.customerPhone || '');
      setCustomerEmail(initialPerson.customerEmail ?? '');
      setCustomerAge(initialPerson.customerAge != null ? String(initialPerson.customerAge) : '');
    } else {
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAge('');
    }
  }, [open, initialPerson]);

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
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Name and phone are required.');
      return;
    }
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
    setLoading(true);
    try {
      await packageRegistrationsApi.create({
        packageName: packageName.trim(),
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAge: customerAge.trim() ? parseInt(customerAge, 10) : undefined,
        basePriceJod: base,
        discountType,
        discountValue: discountType === 'NONE' ? null : discountVal,
        discountReason: discountType === 'NONE' ? undefined : discountReason.trim(),
        periodStartsAt: periodStartsAt.trim() || undefined,
      });
      onSuccess();
      onClose();
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setCustomerAge('');
      setBasePriceJod('');
      setDiscountType('NONE');
      setDiscountValue('');
      setDiscountReason('');
      setPeriodStartsAt('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add registration');
    } finally {
      setLoading(false);
    }
  }

  const isManualPricing = pricing.find((x) => x.packageName === packageName)?.basePriceJod == null && packageName;

  return (
    <Modal open={open} onClose={onClose} title="Add registration" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Select label="Package" value={packageName} onChange={(e) => setPackageName(e.target.value)} required>
          <option value="">Select package</option>
          {packageList.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>

        <Input label="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Full name" />
        <Input label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required placeholder="Phone" />
        <Input label="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Email (optional)" />
        <Input label="Age" type="number" value={customerAge} onChange={(e) => setCustomerAge(e.target.value)} placeholder="Age (optional)" />
        <Input
          label="When they will start"
          type="date"
          value={periodStartsAt}
          onChange={(e) => setPeriodStartsAt(e.target.value)}
          placeholder="Optional start date"
        />

        <Input
          label="Start date (optional)"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <p className="text-xs text-ui-textMuted -mt-2">When they start or started the package. Leave empty for today.</p>

        <div>
          <label className="mb-1 block text-sm font-medium text-ui-textMuted">Base price (JOD)</label>
          {isManualPricing ? (
            <Input
              type="number"
              min={0}
              value={basePriceJod}
              onChange={(e) => setBasePriceJod(e.target.value)}
              placeholder="Enter price (no fixed price for this package)"
            />
          ) : (
            <div className="rounded-xl border border-ui-border bg-ui-softBg/50 px-3 py-2.5 text-sm text-ui-textPrimary">
              {packageName && basePriceJod !== '' ? `${basePriceJod} JOD` : '—'}
            </div>
          )}
          {!isManualPricing && packageName && <p className="mt-0.5 text-xs text-ui-textMuted">Set automatically from package pricing.</p>}
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
                    placeholder="e.g. Sibling 10%, Group rate"
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
          <Button type="submit" isLoading={loading}>Add registration</Button>
        </div>
      </form>
    </Modal>
  );
}

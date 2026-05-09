'use client';

import { useEffect, useState } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../../lib/portalApi';
import {
  addDurationMonthsToDateInput,
  getPackageDefaultDurationMonths,
  getPackageDefaultPrice,
  getPackageDefaultSessions,
  hasPackageDefaultPrice,
} from './packageDefaults';

function computeFinalPrice(base: number, discountType: string, discountValue: number): number {
  const safeBase = Math.max(0, base);
  if (!discountType || discountType === 'NONE') return safeBase;
  if (discountType === 'PERCENT') return Math.max(0, safeBase - Math.round((safeBase * discountValue) / 100));
  return Math.max(0, safeBase - discountValue);
}

export function RegisterInAnotherPackageModal({
  open,
  onClose,
  onSuccess,
  registration,
  packageOptions,
  defaultPricesByPackage,
  defaultSessionsByPackage,
  defaultDurationMonthsByPackage,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  registration: PackageRegistrationRow | null;
  packageOptions: string[];
  defaultPricesByPackage?: Record<string, number>;
  defaultSessionsByPackage?: Record<string, number>;
  defaultDurationMonthsByPackage?: Record<string, number>;
}) {
  const [packageName, setPackageName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [durationMonths, setDurationMonths] = useState('1');
  const [sessionsLeft, setSessionsLeft] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [basePriceJod, setBasePriceJod] = useState('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().split('T')[0];
    setPackageName('');
    setStartDate(today);
    setDurationMonths('1');
    setSessionsLeft('');
    setNextPaymentDate(addDurationMonthsToDateInput(today, 1));
    setBasePriceJod('');
    setDiscountOpen(false);
    setDiscountType('NONE');
    setDiscountValue('');
    setDiscountReason('');
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const defaultPrice = getPackageDefaultPrice(packageName, defaultPricesByPackage);
    if (defaultPrice != null) {
      setBasePriceJod(String(defaultPrice));
      return;
    }
    if (packageName) setBasePriceJod('');
  }, [packageName, defaultPricesByPackage, open]);

  useEffect(() => {
    if (!open) return;
    const defaultSessions = getPackageDefaultSessions(packageName, defaultSessionsByPackage);
    if (defaultSessions != null) {
      setSessionsLeft(String(defaultSessions));
    }
  }, [defaultSessionsByPackage, open, packageName]);

  useEffect(() => {
    if (!open) return;
    const defaultDuration = getPackageDefaultDurationMonths(
      packageName,
      defaultDurationMonthsByPackage,
    );
    setDurationMonths(String(defaultDuration));
  }, [defaultDurationMonthsByPackage, open, packageName]);

  useEffect(() => {
    if (!open) return;
    if (startDate.trim()) {
      const parsedDuration = Math.max(1, Math.round(Number(durationMonths) || 1));
      setNextPaymentDate(addDurationMonthsToDateInput(startDate, parsedDuration));
    }
  }, [durationMonths, open, startDate]);

  const baseNumber = basePriceJod.trim() === '' ? 0 : parseInt(basePriceJod, 10) || 0;
  const discountNumber = discountType === 'NONE' ? 0 : parseFloat(discountValue) || 0;
  const finalPrice = computeFinalPrice(baseNumber, discountType, discountNumber);
  const isManualPricing = !hasPackageDefaultPrice(packageName, defaultPricesByPackage) && !!packageName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!registration) return;
    if (!packageName.trim()) {
      setError('Please select a package.');
      return;
    }
    if (!sessionsLeft.trim()) {
      setError('Sessions left is required.');
      return;
    }
    const parsedDurationMonths = Math.max(1, Math.round(Number(durationMonths) || 0));
    if (!Number.isFinite(parsedDurationMonths) || parsedDurationMonths < 1) {
      setError('Duration must be at least 1 month.');
      return;
    }
    if (!nextPaymentDate.trim()) {
      setError('Next payment date is required.');
      return;
    }

    const base = Math.max(0, baseNumber);
    const hasDefaultPrice = hasPackageDefaultPrice(packageName.trim(), defaultPricesByPackage);
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
        customerName: registration.customerName,
        customerPhone: registration.customerPhone,
        customerEmail: registration.customerEmail ?? undefined,
        customerAge: registration.customerAge ?? undefined,
        durationMonths: parsedDurationMonths,
        sessionsLeft: Math.max(0, parseInt(sessionsLeft, 10) || 0),
        nextPaymentDate: nextPaymentDate.trim(),
        basePriceJod: hasDefaultPrice && base === 0 ? undefined : base,
        discountType,
        discountValue: discountType === 'NONE' ? null : discountNumber,
        discountReason: discountType === 'NONE' ? undefined : discountReason.trim(),
        periodStartsAt: startDate.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create registration');
    } finally {
      setLoading(false);
    }
  }

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
          {packageOptions.map((pkg) => (
            <option key={pkg} value={pkg}>{pkg}</option>
          ))}
        </Select>

        <Input
          label="Start date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          hint="Registration will use this start date for the next payment default."
        />
        <Input
          label="Duration (months)"
          type="number"
          min={1}
          value={durationMonths}
          onChange={(e) => setDurationMonths(e.target.value)}
          hint="Example: use 3 for a 3-month registration."
          required
        />
        <Input
          label="Total sessions for this cycle"
          type="number"
          min={0}
          value={sessionsLeft}
          onChange={(e) => setSessionsLeft(e.target.value)}
          hint="Example: 43 sessions over 3 months."
          required
        />
        <Input
          label="Next payment date"
          type="date"
          value={nextPaymentDate}
          onChange={(e) => setNextPaymentDate(e.target.value)}
          required
        />

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
              {packageName && basePriceJod !== '' ? `${basePriceJod} JOD` : '-'}
            </div>
          )}
          {!isManualPricing && packageName && <p className="mt-0.5 text-xs text-ui-textMuted">Set automatically from the selected package.</p>}
        </div>

        <div className="rounded-lg border border-ui-border">
          <button
            type="button"
            onClick={() => setDiscountOpen((openState) => !openState)}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-ui-textPrimary"
          >
            Discount {discountOpen ? 'v' : '>'}
          </button>
          {discountOpen && (
            <div className="space-y-2 border-t border-ui-border p-3">
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
                    required
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

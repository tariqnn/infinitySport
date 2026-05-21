'use client';

import { useEffect, useState } from 'react';
import { Modal, Input, Select, Button } from '../../_components/ui';
import { packageRegistrationsApi } from '../../../lib/portalApi';
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
  defaultSessionsByPackage,
  defaultDurationMonthsByPackage,
  initialPerson,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  packageOptions?: string[];
  defaultPricesByPackage?: Record<string, number>;
  defaultSessionsByPackage?: Record<string, number>;
  defaultDurationMonthsByPackage?: Record<string, number>;
  initialPerson?: InitialPerson | null;
}) {
  const packageList = packageOptions ?? [];
  const [packageName, setPackageName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [durationMonths, setDurationMonths] = useState('1');
  const [sessionsLeft, setSessionsLeft] = useState('');
  const [sessionsPerWeek, setSessionsPerWeek] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [basePriceJod, setBasePriceJod] = useState('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [periodStartsAt, setPeriodStartsAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const today = new Date().toISOString().split('T')[0];

    setPackageName(packageList.length === 1 ? packageList[0] : '');
    setDurationMonths('1');
    setSessionsLeft('');
    setSessionsPerWeek('');
    setNextPaymentDate(addDurationMonthsToDateInput(today, 1));
    setBasePriceJod('');
    setDiscountOpen(false);
    setDiscountType('NONE');
    setDiscountValue('');
    setDiscountReason('');
    setPeriodStartsAt(today);
    setError(null);

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
    if (periodStartsAt.trim()) {
      const parsedDuration = Math.max(1, Math.round(Number(durationMonths) || 1));
      setNextPaymentDate(addDurationMonthsToDateInput(periodStartsAt, parsedDuration));
    }
  }, [durationMonths, open, periodStartsAt]);

  const baseNumber = basePriceJod.trim() === '' ? 0 : parseInt(basePriceJod, 10) || 0;
  const discountNumber = discountType === 'NONE' ? 0 : parseFloat(discountValue) || 0;
  const finalPrice = computeFinalPrice(baseNumber, discountType, discountNumber);
  const isManualPricing = !hasPackageDefaultPrice(packageName, defaultPricesByPackage) && !!packageName;

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
    const parsedSessionsPerWeek = sessionsPerWeek.trim() ? Number(sessionsPerWeek) : null;
    if (
      parsedSessionsPerWeek != null &&
      (!Number.isFinite(parsedSessionsPerWeek) || parsedSessionsPerWeek < 1)
    ) {
      setError('Sessions per week must be 1 or greater.');
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
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerAge: customerAge.trim() ? parseInt(customerAge, 10) : undefined,
        durationMonths: parsedDurationMonths,
        sessionsLeft: Math.max(0, parseInt(sessionsLeft, 10) || 0),
        sessionsPerWeek:
          parsedSessionsPerWeek == null ? null : Math.round(parsedSessionsPerWeek),
        nextPaymentDate: nextPaymentDate.trim(),
        basePriceJod: hasDefaultPrice && base === 0 ? undefined : base,
        discountType,
        discountValue: discountType === 'NONE' ? null : discountNumber,
        discountReason: discountType === 'NONE' ? undefined : discountReason.trim(),
        periodStartsAt: periodStartsAt.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to add registration');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add registration" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Select label="Package" value={packageName} onChange={(e) => setPackageName(e.target.value)} required>
          <option value="">Select package</option>
          {packageList.map((pkg) => (
            <option key={pkg} value={pkg}>{pkg}</option>
          ))}
        </Select>

        <Input label="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Full name" />
        <Input label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required placeholder="Phone" />
        <Input label="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Email (optional)" />
        <Input label="Age" type="number" value={customerAge} onChange={(e) => setCustomerAge(e.target.value)} placeholder="Age (optional)" />
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
          placeholder="e.g. 43"
          hint="Example: 43 sessions over 3 months."
          required
        />
        <Input
          label="Sessions per week"
          type="number"
          min={1}
          value={sessionsPerWeek}
          onChange={(e) => setSessionsPerWeek(e.target.value)}
          placeholder="Package default"
          hint="Optional per-player override. Example: 2 if this player attends twice a week."
        />
        <Input
          label="When they will start"
          type="date"
          value={periodStartsAt}
          onChange={(e) => setPeriodStartsAt(e.target.value)}
          placeholder="Optional start date"
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
              placeholder="Enter price (no fixed price for this package)"
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
                    placeholder="e.g. Sibling 10%, Group rate"
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
          <Button type="submit" isLoading={loading}>Add registration</Button>
        </div>
      </form>
    </Modal>
  );
}

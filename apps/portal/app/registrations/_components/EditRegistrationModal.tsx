'use client';

import { useEffect, useMemo, useState } from 'react';
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

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

export function EditRegistrationModal({
  open,
  onClose,
  onSuccess,
  registration,
  packageOptions,
  defaultPricesByPackage,
  defaultSessionsByPackage,
  defaultDurationMonthsByPackage,
  currentSessionSummary,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  registration: PackageRegistrationRow | null;
  packageOptions: string[];
  defaultPricesByPackage?: Record<string, number>;
  defaultSessionsByPackage?: Record<string, number>;
  defaultDurationMonthsByPackage?: Record<string, number>;
  currentSessionSummary?: { remaining: number; total: number; used: number } | null;
}) {
  const [packageName, setPackageName] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAge, setCustomerAge] = useState('');
  const [sessionsLeft, setSessionsLeft] = useState('');
  const [sessionsInputMode, setSessionsInputMode] = useState<'remaining' | 'base'>('base');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [periodStartsAt, setPeriodStartsAt] = useState('');
  const [basePriceJod, setBasePriceJod] = useState('');
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'NONE' | 'PERCENT' | 'AMOUNT'>('NONE');
  const [discountValue, setDiscountValue] = useState('');
  const [discountReason, setDiscountReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !registration) return;

    setPackageName(registration.packageName || '');
    setCustomerName(registration.customerName || '');
    setCustomerPhone(registration.customerPhone || '');
    setCustomerEmail(registration.customerEmail || '');
    setCustomerAge(registration.customerAge != null ? String(registration.customerAge) : '');
    const initialSessionsLeft =
      currentSessionSummary?.remaining ??
      registration.sessionsLeft ??
      getPackageDefaultSessions(registration.packageName, defaultSessionsByPackage) ??
      null;
    setSessionsLeft(initialSessionsLeft != null ? String(initialSessionsLeft) : '');
    setSessionsInputMode(currentSessionSummary ? 'remaining' : 'base');
    setNextPaymentDate(toDateInputValue(registration.nextPaymentDate));
    setPeriodStartsAt(toDateInputValue(registration.periodStartsAt));
    setBasePriceJod(String(Math.max(0, Number(registration.basePriceJod) || 0)));

    const nextDiscountType = (registration.discountType || 'NONE').toUpperCase();
    if (nextDiscountType === 'PERCENT' || nextDiscountType === 'AMOUNT') {
      setDiscountType(nextDiscountType);
      setDiscountValue(String(registration.discountValue ?? 0));
      setDiscountReason(registration.discountReason || '');
      setDiscountOpen(true);
    } else {
      setDiscountType('NONE');
      setDiscountValue('');
      setDiscountReason('');
      setDiscountOpen(false);
    }

    setError(null);
  }, [currentSessionSummary, defaultSessionsByPackage, open, registration]);

  useEffect(() => {
    if (!open || !registration) return;
    if (!packageName) return;

    const originalPackageName = registration.packageName || '';
    const originalPeriodStart = toDateInputValue(registration.periodStartsAt);
    const periodChanged = periodStartsAt.trim() !== originalPeriodStart;

    if (packageName === originalPackageName && !periodChanged) {
      const initialSessionsLeft =
        currentSessionSummary?.remaining ??
        registration.sessionsLeft ??
        getPackageDefaultSessions(registration.packageName, defaultSessionsByPackage) ??
        null;
      if (initialSessionsLeft != null) {
        setSessionsLeft(String(initialSessionsLeft));
      }
      setSessionsInputMode(currentSessionSummary ? 'remaining' : 'base');
      return;
    }

    const defaultPrice = getPackageDefaultPrice(packageName, defaultPricesByPackage);
    setBasePriceJod(defaultPrice != null ? String(defaultPrice) : '');

    const defaultSessions = getPackageDefaultSessions(packageName, defaultSessionsByPackage);
    if (defaultSessions != null) {
      setSessionsLeft(String(defaultSessions));
    }
    setSessionsInputMode('base');
  }, [
    currentSessionSummary,
    defaultPricesByPackage,
    defaultSessionsByPackage,
    open,
    packageName,
    periodStartsAt,
    registration,
  ]);

  useEffect(() => {
    if (!open || !registration) return;
    const originalStart = toDateInputValue(registration.periodStartsAt);
    const packageChanged = packageName !== registration.packageName;
    const startChanged = periodStartsAt.trim() && periodStartsAt !== originalStart;
    if (!periodStartsAt.trim() || (!startChanged && !packageChanged)) return;
    setSessionsInputMode('base');
    const durationMonths =
      !packageChanged
        ? Math.max(1, registration.durationMonths || 1)
        : getPackageDefaultDurationMonths(packageName, defaultDurationMonthsByPackage);
    setNextPaymentDate(addDurationMonthsToDateInput(periodStartsAt, durationMonths));
  }, [defaultDurationMonthsByPackage, open, packageName, periodStartsAt, registration]);

  const packageList = useMemo(() => {
    const names = new Set(packageOptions);
    if (registration?.packageName) names.add(registration.packageName);
    return Array.from(names).sort((left, right) => left.localeCompare(right));
  }, [packageOptions, registration?.packageName]);

  const baseNumber = useMemo(() => {
    if (!basePriceJod.trim()) return 0;
    return Math.max(0, Math.round(Number(basePriceJod) || 0));
  }, [basePriceJod]);
  const discountNumber = useMemo(() => {
    if (discountType === 'NONE') return 0;
    return Number(discountValue) || 0;
  }, [discountType, discountValue]);
  const finalPrice = useMemo(
    () => computeFinalPrice(baseNumber, discountType, discountNumber),
    [baseNumber, discountNumber, discountType],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!registration) return;
    setError(null);

    const nextPackageName = packageName.trim();
    const nextCustomerName = customerName.trim();
    const nextCustomerPhone = customerPhone.trim();
    const nextCustomerEmail = customerEmail.trim();

    if (!nextPackageName) return setError('Package is required.');
    if (!nextCustomerName) return setError('Name is required.');
    if (!nextCustomerPhone) return setError('Phone is required.');
    if (!Number.isFinite(baseNumber) || baseNumber < 0) return setError('Base price must be 0 or greater.');
    if (!sessionsLeft.trim()) return setError('Sessions left is required.');
    const parsedSessionsLeft = Number(sessionsLeft);
    if (!Number.isFinite(parsedSessionsLeft) || parsedSessionsLeft < 0) {
      return setError('Sessions left must be 0 or greater.');
    }
    const samePackage = nextPackageName === registration.packageName;
    const samePeriodStart = periodStartsAt.trim() === toDateInputValue(registration.periodStartsAt);
    const nextSessionsLeft =
      sessionsInputMode === 'remaining' && currentSessionSummary && samePackage && samePeriodStart
        ? Math.max(
            0,
            Math.round(parsedSessionsLeft + currentSessionSummary.used - (Number(registration.sessionsBonus) || 0)),
          )
        : Math.round(parsedSessionsLeft);

    if (discountType !== 'NONE') {
      if (discountType === 'PERCENT' && (discountNumber < 0 || discountNumber > 100)) {
        return setError('Percent discount must be between 0 and 100.');
      }
      if (discountType === 'AMOUNT' && discountNumber < 0) {
        return setError('Discount amount must be 0 or greater.');
      }
      if (!discountReason.trim()) {
        return setError('Discount reason is required when applying a discount.');
      }
    }

    let agePayload: number | null = null;
    if (customerAge.trim()) {
      const parsedAge = Number(customerAge);
      if (!Number.isFinite(parsedAge) || parsedAge < 0) {
        return setError('Age must be a positive number.');
      }
      agePayload = Math.round(parsedAge);
    }

    setLoading(true);
    try {
      await packageRegistrationsApi.update(registration.id, {
        packageName: nextPackageName,
        customerName: nextCustomerName,
        customerPhone: nextCustomerPhone,
        customerEmail: nextCustomerEmail || null,
        customerAge: agePayload,
        sessionsLeft: nextSessionsLeft,
        nextPaymentDate: nextPaymentDate.trim() || null,
        basePriceJod: baseNumber,
        discountType,
        discountValue: discountType === 'NONE' ? null : discountNumber,
        discountReason: discountType === 'NONE' ? null : discountReason.trim(),
        periodStartsAt: periodStartsAt.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update registration');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  const isManualPricing = !hasPackageDefaultPrice(packageName, defaultPricesByPackage) && !!packageName;

  return (
    <Modal open={open} onClose={onClose} title="Edit registration" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <Select label="Package" value={packageName} onChange={(e) => setPackageName(e.target.value)} required>
          <option value="">Select package</option>
          {packageList.map((pkg) => (
            <option key={pkg} value={pkg}>{pkg}</option>
          ))}
        </Select>

        <Input label="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
        <Input label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
        <Input label="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        <Input label="Age" type="number" min={0} value={customerAge} onChange={(e) => setCustomerAge(e.target.value)} />
        <Input
          label="Sessions left"
          type="number"
          min={0}
          value={sessionsLeft}
          onChange={(e) => setSessionsLeft(e.target.value)}
          required
        />
        <Input
          label="When they will start"
          type="date"
          value={periodStartsAt}
          onChange={(e) => setPeriodStartsAt(e.target.value)}
        />
        <Input
          label="Next payment date"
          type="date"
          value={nextPaymentDate}
          onChange={(e) => setNextPaymentDate(e.target.value)}
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-ui-textMuted">Base price (JOD)</label>
          {isManualPricing ? (
            <Input
              type="number"
              min={0}
              value={basePriceJod}
              onChange={(e) => setBasePriceJod(e.target.value)}
              required
            />
          ) : (
            <div className="rounded-xl border border-ui-border bg-ui-softBg/50 px-3 py-2.5 text-sm text-ui-textPrimary">
              {packageName && basePriceJod !== '' ? `${basePriceJod} JOD` : '-'}
            </div>
          )}
          {!isManualPricing && <p className="mt-0.5 text-xs text-ui-textMuted">This updates automatically if you switch the package.</p>}
        </div>

        <div className="rounded-lg border border-ui-border">
          <button
            type="button"
            onClick={() => setDiscountOpen((prev) => !prev)}
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
          <Button type="submit" isLoading={loading}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

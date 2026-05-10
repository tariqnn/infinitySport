'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
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

function getStartDateInputValue(registration: PackageRegistrationRow | null): string {
  if (!registration) return '';
  return toDateInputValue(registration.periodStartsAt || registration.createdAt);
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 border-t border-ui-border pt-4 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold text-ui-textPrimary">{title}</h3>
      {children}
    </section>
  );
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
  const [status, setStatus] = useState('ACTIVE');
  const [planLabel, setPlanLabel] = useState('');
  const [isFrozen, setIsFrozen] = useState(false);
  const [durationMonths, setDurationMonths] = useState('');
  const [sessionsLeft, setSessionsLeft] = useState('');
  const [sessionsUsed, setSessionsUsed] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [periodStartsAt, setPeriodStartsAt] = useState('');
  const [periodEndsAt, setPeriodEndsAt] = useState('');
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
    setStatus(String(registration.status || 'ACTIVE').trim().toUpperCase() || 'ACTIVE');
    setPlanLabel(registration.planLabel || '');
    setIsFrozen(Boolean(registration.isFrozen));
    setDurationMonths(String(Math.max(1, Number(registration.durationMonths ?? 1) || 1)));
    const initialSessionsLeft =
      registration.sessionsLeft ??
      (currentSessionSummary ? Math.max(0, currentSessionSummary.total - (Number(registration.sessionsBonus) || 0)) : null) ??
      getPackageDefaultSessions(registration.packageName, defaultSessionsByPackage) ??
      null;
    setSessionsLeft(initialSessionsLeft != null ? String(initialSessionsLeft) : '');
    setSessionsUsed(String(registration.sessionsUsedOverride ?? currentSessionSummary?.used ?? 0));
    setNextPaymentDate(toDateInputValue(registration.nextPaymentDate));
    setPeriodStartsAt(getStartDateInputValue(registration));
    setPeriodEndsAt(toDateInputValue(registration.periodEndsAt));
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
    const originalPeriodStart = getStartDateInputValue(registration);
    const periodChanged = periodStartsAt.trim() !== originalPeriodStart;

    if (packageName === originalPackageName && !periodChanged) {
      const initialSessionsLeft =
        registration.sessionsLeft ??
        (currentSessionSummary ? Math.max(0, currentSessionSummary.total - (Number(registration.sessionsBonus) || 0)) : null) ??
        getPackageDefaultSessions(registration.packageName, defaultSessionsByPackage) ??
        null;
      if (initialSessionsLeft != null) {
        setSessionsLeft(String(initialSessionsLeft));
      }
      setSessionsUsed(String(registration.sessionsUsedOverride ?? currentSessionSummary?.used ?? 0));
      return;
    }

    const defaultPrice = getPackageDefaultPrice(packageName, defaultPricesByPackage);
    setBasePriceJod(defaultPrice != null ? String(defaultPrice) : '');
    if (packageName !== originalPackageName) {
      setDurationMonths(
        String(getPackageDefaultDurationMonths(packageName, defaultDurationMonthsByPackage)),
      );
    }

    const defaultSessions = getPackageDefaultSessions(packageName, defaultSessionsByPackage);
    if (defaultSessions != null) {
      setSessionsLeft(String(defaultSessions));
    }
    setDurationMonths(String(getPackageDefaultDurationMonths(packageName, defaultDurationMonthsByPackage)));
    setSessionsUsed('0');
  }, [
    currentSessionSummary,
    defaultDurationMonthsByPackage,
    defaultPricesByPackage,
    defaultSessionsByPackage,
    open,
    packageName,
    periodStartsAt,
    registration,
  ]);

  useEffect(() => {
    if (!open || !registration) return;
    const originalStart = getStartDateInputValue(registration);
    const packageChanged = packageName !== registration.packageName;
    const startChanged = periodStartsAt.trim() && periodStartsAt !== originalStart;
    const durationChanged = durationMonths.trim() && Math.round(Number(durationMonths)) !== Math.max(1, registration.durationMonths || 1);
    if (!periodStartsAt.trim() || (!startChanged && !packageChanged && !durationChanged)) return;
    const nextDurationMonths =
      packageChanged
        ? getPackageDefaultDurationMonths(packageName, defaultDurationMonthsByPackage)
        : Math.max(1, Math.round(Number(durationMonths) || Number(registration.durationMonths) || 1));
    const nextEndDate = addDurationMonthsToDateInput(periodStartsAt, nextDurationMonths);
    setPeriodEndsAt(nextEndDate);
    setNextPaymentDate(nextEndDate);
  }, [defaultDurationMonthsByPackage, durationMonths, open, packageName, periodStartsAt, registration]);

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

  function handlePeriodEndsAtChange(value: string) {
    const previousEndDate = periodEndsAt;
    setPeriodEndsAt(value);
    if (!nextPaymentDate.trim() || nextPaymentDate === previousEndDate) {
      setNextPaymentDate(value);
    }
  }

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
    const nextStatus = String(status || 'ACTIVE').trim().toUpperCase();
    if (!['ACTIVE', 'EXPIRED', 'CANCELLED'].includes(nextStatus)) {
      return setError('Status must be Active, Expired, or Cancelled.');
    }
    const parsedDurationMonths = Math.max(1, Math.round(Number(durationMonths) || 0));
    if (!Number.isFinite(parsedDurationMonths) || parsedDurationMonths < 1) {
      return setError('Duration must be at least 1 month.');
    }
    if (!Number.isFinite(baseNumber) || baseNumber < 0) return setError('Base price must be 0 or greater.');
    if (periodStartsAt.trim() && periodEndsAt.trim()) {
      const start = new Date(periodStartsAt);
      const end = new Date(periodEndsAt);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end.getTime() < start.getTime()) {
        return setError('Membership end date must be after the start date.');
      }
    }
    if (!sessionsLeft.trim()) return setError('Total classes is required.');
    const parsedSessionsLeft = Number(sessionsLeft);
    if (!Number.isFinite(parsedSessionsLeft) || parsedSessionsLeft < 0) {
      return setError('Total classes must be 0 or greater.');
    }
    const parsedSessionsUsed = sessionsUsed.trim() ? Number(sessionsUsed) : 0;
    if (!Number.isFinite(parsedSessionsUsed) || parsedSessionsUsed < 0) {
      return setError('Classes finished must be 0 or greater.');
    }
    const nextSessionsLeft = Math.round(parsedSessionsLeft);
    const nextSessionsUsed = Math.round(parsedSessionsUsed);
    const totalWithBonus = nextSessionsLeft + (Number(registration.sessionsBonus) || 0);
    if (nextSessionsUsed > totalWithBonus) {
      return setError('Classes finished cannot be more than total classes.');
    }

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
        status: nextStatus,
        isFrozen,
        planLabel: planLabel.trim() || null,
        durationMonths: parsedDurationMonths,
        sessionsLeft: nextSessionsLeft,
        sessionsUsedOverride: nextSessionsUsed,
        nextPaymentDate: nextPaymentDate.trim() || null,
        basePriceJod: baseNumber,
        discountType,
        discountValue: discountType === 'NONE' ? null : discountNumber,
        discountReason: discountType === 'NONE' ? null : discountReason.trim(),
        periodStartsAt: periodStartsAt.trim() || null,
        periodEndsAt: periodEndsAt.trim() || null,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update registration');
    } finally {
      setLoading(false);
    }
  }

  if (!registration) return null;

  const hasDefaultPrice = hasPackageDefaultPrice(packageName, defaultPricesByPackage);
  const totalClassesPreview = Math.max(0, Math.round(Number(sessionsLeft) || 0));
  const finishedClassesPreview = Math.max(0, Math.round(Number(sessionsUsed) || 0));
  const remainingClassesPreview = Math.max(
    0,
    totalClassesPreview + (Number(registration.sessionsBonus) || 0) - finishedClassesPreview,
  );

  return (
    <Modal open={open} onClose={onClose} title="Edit registration" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <FormSection title="Player information">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            <Input label="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required />
            <Input label="Email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            <Input label="Age" type="number" min={0} value={customerAge} onChange={(e) => setCustomerAge(e.target.value)} />
            <Select label="Registration status" value={status} onChange={(e) => setStatus(e.target.value)} required>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
          <Textarea
            label="Notes / plan label"
            value={planLabel}
            onChange={(e) => setPlanLabel(e.target.value)}
            rows={3}
            placeholder="Optional internal notes, plan label, or registration details"
          />
          <label className="flex items-center gap-2 rounded-lg border border-ui-border bg-ui-softBg/30 px-3 py-2.5 text-sm text-ui-textPrimary">
            <input
              type="checkbox"
              checked={isFrozen}
              onChange={(e) => setIsFrozen(e.target.checked)}
              className="rounded border-ui-border"
            />
            Freeze this registration
          </label>
        </FormSection>

        <FormSection title="Package and dates">
          <Select label="Package" value={packageName} onChange={(e) => setPackageName(e.target.value)} required>
            <option value="">Select package</option>
            {packageList.map((pkg) => (
              <option key={pkg} value={pkg}>{pkg}</option>
            ))}
          </Select>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Duration months"
              type="number"
              min={1}
              value={durationMonths}
              onChange={(e) => setDurationMonths(e.target.value)}
              required
              hint="End date and next payment follow this duration."
            />
            <Input
              label="Next payment date"
              type="date"
              value={nextPaymentDate}
              onChange={(e) => setNextPaymentDate(e.target.value)}
            />
            <Input
              label="Start date"
              type="date"
              value={periodStartsAt}
              onChange={(e) => setPeriodStartsAt(e.target.value)}
              hint="The real start date for this current registration."
            />
            <Input
              label="Membership end date"
              type="date"
              value={periodEndsAt}
              onChange={(e) => handlePeriodEndsAtChange(e.target.value)}
              hint="Change this to extend or shorten this registration only."
            />
          </div>
        </FormSection>

        <FormSection title="Classes">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Total classes in this cycle"
              type="number"
              min={0}
              value={sessionsLeft}
              onChange={(e) => setSessionsLeft(e.target.value)}
              required
              hint="The total classes included in this registration."
            />
            <Input
              label="Classes finished"
              type="number"
              min={0}
              value={sessionsUsed}
              onChange={(e) => setSessionsUsed(e.target.value)}
              required
              hint="How many classes the player already used."
            />
          </div>
          <div className="rounded-lg bg-ui-softBg/60 px-3 py-2 text-sm text-ui-textPrimary">
            Remaining classes: <span className="font-semibold">{remainingClassesPreview}</span>
            {registration.sessionsBonus ? (
              <span className="text-ui-textMuted"> including {registration.sessionsBonus} bonus</span>
            ) : null}
          </div>
        </FormSection>

        <FormSection title="Price and discount">
          <Input
            label="Player price (JOD)"
            type="number"
            min={0}
            value={basePriceJod}
            onChange={(e) => setBasePriceJod(e.target.value)}
            required
            hint={
              hasDefaultPrice
                ? 'Package changes load the default price first, then you can override it for this player only.'
                : 'This price applies only to this player registration.'
            }
          />

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
        </FormSection>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={loading}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

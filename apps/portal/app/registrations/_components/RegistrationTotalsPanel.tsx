'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody } from '../../_components/ui';
import { packageRegistrationsApi, type RegistrationTotals } from '../../../lib/portalApi';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function RegistrationTotalsPanel({
  packageName,
  excludePackageName,
  startDate,
  endDate,
}: {
  packageName?: string | readonly string[];
  excludePackageName?: string | readonly string[];
  startDate?: string;
  endDate?: string;
}) {
  const [totals, setTotals] = useState<RegistrationTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [paymentMonth, setPaymentMonth] = useState(currentMonthKey);

  useEffect(() => {
    setLoading(true);
    packageRegistrationsApi
      .getTotals(
        packageName || undefined,
        startDate || undefined,
        endDate || undefined,
        excludePackageName || undefined,
        paymentMonth,
      )
      .then(setTotals)
      .catch(() => setTotals(null))
      .finally(() => setLoading(false));
  }, [packageName, excludePackageName, startDate, endDate, paymentMonth]);

  if (loading) return <Card><CardBody><p className="text-ui-textMuted">Loading totals…</p></CardBody></Card>;
  if (!totals) return null;

  const byMethod = totals.byMethod || {};
  const monthByMethod = totals.monthByMethod || {};
  const frozenMonthByMethod = totals.frozenMonthByMethod || {};
  const byPackage = totals.byPackage || {};
  const packageNames = Object.keys(byPackage).sort();
  const frozenRegistered = totals.frozenRegistered ?? 0;

  return (
    <Card>
      <CardBody className="p-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-ui-bgMuted/50 transition-colors rounded-t-lg"
          aria-expanded={open}
        >
          <h3 className="text-sm font-bold uppercase tracking-wide text-ui-textMuted">Registration summary</h3>
          {open ? (
            <ChevronUpIcon className="h-5 w-5 text-ui-textMuted shrink-0" aria-hidden />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-ui-textMuted shrink-0" aria-hidden />
          )}
        </button>
        {open && (
        <div className="px-4 pb-4 pt-0 border-t border-ui-border">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-3">
          <div>
            <p className="text-xs text-ui-textMuted">Active registered</p>
            <p className="text-xl font-bold text-ui-textPrimary">{totals.totalRegistered}</p>
          </div>
          <div>
            <p className="text-xs text-ui-textMuted">Paid / Partial / Unpaid</p>
            <p className="text-xl font-bold text-ui-textPrimary">
              {totals.paidCount} / {totals.partialCount ?? 0} / {totals.unpaidCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-ui-textMuted">Active expected total</p>
            <p className="text-xl font-bold text-ui-textPrimary">{totals.expectedTotal} JOD</p>
          </div>
          <div>
            <p className="text-xs text-ui-textMuted">Active collected / remaining</p>
            <p className="text-xl font-bold text-ui-textPrimary">
              {totals.collectedTotal} JOD / {totals.remainingTotal} JOD
            </p>
          </div>
          <div>
            <p className="text-xs text-ui-textMuted">Discounts total</p>
            <p className="text-xl font-bold text-ui-textPrimary">{totals.discountsTotal ?? 0} JOD</p>
          </div>
          <div>
            <p className="text-xs text-ui-textMuted">Frozen registered</p>
            <p className="text-xl font-bold text-ui-textPrimary">{frozenRegistered}</p>
          </div>
        </div>
        <div className="mt-3 border-t border-ui-border pt-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold text-ui-textMuted">Payments by month</p>
              <p className="mt-1 text-sm text-ui-textMuted">Receipt money paid for the selected month.</p>
            </div>
            <label className="text-sm font-medium text-ui-textMuted">
              Month
              <input
                type="month"
                value={paymentMonth}
                onChange={(event) => setPaymentMonth(event.target.value || currentMonthKey())}
                className="mt-1 block rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-textPrimary focus:border-brand-blue-primary focus:outline-none focus:ring-2 focus:ring-brand-blue-primary/20"
              />
            </label>
          </div>
          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-ui-textMuted">Active expected this month</p>
              <p className="text-xl font-bold text-ui-textPrimary">{totals.monthExpectedTotal ?? 0} JOD</p>
            </div>
            <div>
              <p className="text-xs text-ui-textMuted">Active collected this month</p>
              <p className="text-xl font-bold text-ui-textPrimary">{totals.monthCollectedTotal ?? 0} JOD</p>
            </div>
            <div>
              <p className="text-xs text-ui-textMuted">Active remaining this month</p>
              <p className="text-xl font-bold text-ui-textPrimary">{totals.monthRemainingTotal ?? 0} JOD</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-sm">
            <span>Cash: {monthByMethod.CASH ?? 0} JOD</span>
            <span>Card: {monthByMethod.CARD ?? 0} JOD</span>
            <span>Transfer: {monthByMethod.TRANSFER ?? 0} JOD</span>
            <span>Other: {monthByMethod.OTHER ?? 0} JOD</span>
          </div>
        </div>
        {frozenRegistered > 0 && (
          <div className="mt-3 border-t border-ui-border pt-3">
            <p className="text-xs font-semibold text-ui-textMuted">Frozen registrations</p>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ui-textMuted">Frozen expected</p>
                <p className="text-lg font-bold text-ui-textPrimary">{totals.frozenExpectedTotal ?? 0} JOD</p>
              </div>
              <div>
                <p className="text-xs text-ui-textMuted">Frozen collected</p>
                <p className="text-lg font-bold text-ui-textPrimary">{totals.frozenCollectedTotal ?? 0} JOD</p>
              </div>
              <div>
                <p className="text-xs text-ui-textMuted">Frozen remaining</p>
                <p className="text-lg font-bold text-ui-textPrimary">{totals.frozenRemainingTotal ?? 0} JOD</p>
              </div>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ui-textMuted">Frozen expected this month</p>
                <p className="text-lg font-bold text-ui-textPrimary">{totals.frozenMonthExpectedTotal ?? 0} JOD</p>
              </div>
              <div>
                <p className="text-xs text-ui-textMuted">Frozen collected this month</p>
                <p className="text-lg font-bold text-ui-textPrimary">{totals.frozenMonthCollectedTotal ?? 0} JOD</p>
              </div>
              <div>
                <p className="text-xs text-ui-textMuted">Frozen remaining this month</p>
                <p className="text-lg font-bold text-ui-textPrimary">{totals.frozenMonthRemainingTotal ?? 0} JOD</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <span>Cash: {frozenMonthByMethod.CASH ?? 0} JOD</span>
              <span>Card: {frozenMonthByMethod.CARD ?? 0} JOD</span>
              <span>Transfer: {frozenMonthByMethod.TRANSFER ?? 0} JOD</span>
              <span>Other: {frozenMonthByMethod.OTHER ?? 0} JOD</span>
            </div>
          </div>
        )}
        <div className="mt-3 border-t border-ui-border pt-3">
          <p className="text-xs font-semibold text-ui-textMuted">By payment method</p>
          <div className="mt-1 flex flex-wrap gap-4 text-sm">
            <span>Cash: {byMethod.CASH ?? 0} JOD</span>
            <span>Card: {byMethod.CARD ?? 0} JOD</span>
            <span>Transfer: {byMethod.TRANSFER ?? 0} JOD</span>
            <span>Other: {byMethod.OTHER ?? 0} JOD</span>
          </div>
        </div>
        {packageNames.length > 0 && (
          <div className="mt-3 border-t border-ui-border pt-3">
            <p className="text-xs font-semibold text-ui-textMuted">By package</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[400px] text-sm">
                <thead>
                  <tr className="border-b border-ui-border text-left text-ui-textMuted">
                    <th className="py-1.5 font-medium">Package</th>
                    <th className="py-1.5 font-medium text-right">Registered</th>
                    <th className="py-1.5 font-medium text-right">Expected</th>
                    <th className="py-1.5 font-medium text-right">Collected</th>
                    <th className="py-1.5 font-medium text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {packageNames.map((name) => {
                    const row = byPackage[name];
                    return (
                      <tr key={name} className="border-b border-ui-border/50">
                        <td className="py-1.5 text-ui-textPrimary">{name}</td>
                        <td className="py-1.5 text-right">{row.registered}</td>
                        <td className="py-1.5 text-right">{row.expected} JOD</td>
                        <td className="py-1.5 text-right">{row.collected} JOD</td>
                        <td className="py-1.5 text-right">{row.remaining} JOD</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        </div>
        )}
      </CardBody>
    </Card>
  );
}

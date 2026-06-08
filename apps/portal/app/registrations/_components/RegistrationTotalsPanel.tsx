'use client';

import { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { Badge, Card, CardBody } from '../../_components/ui';
import { packageRegistrationsApi, type RegistrationTotals } from '../../../lib/portalApi';

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function numberValue(value: number | null | undefined) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function money(value: number | null | undefined) {
  return `${Math.round(numberValue(value)).toLocaleString()} JOD`;
}

function dueAmount(expected: number | null | undefined, collected: number | null | undefined) {
  return Math.max(0, numberValue(expected) - numberValue(collected));
}

function creditAmount(expected: number | null | undefined, collected: number | null | undefined) {
  return Math.max(0, numberValue(collected) - numberValue(expected));
}

function metricToneClasses(tone: 'default' | 'success' | 'warning' | 'danger' | 'info') {
  if (tone === 'success') return 'border-emerald-200 bg-emerald-50/70 text-emerald-800';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/80 text-amber-900';
  if (tone === 'danger') return 'border-rose-200 bg-rose-50/80 text-rose-900';
  if (tone === 'info') return 'border-blue-200 bg-blue-50/70 text-blue-900';
  return 'border-ui-border bg-white text-ui-textPrimary';
}

function SummaryMetric({
  label,
  value,
  helper,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  helper?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${metricToneClasses(tone)}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {helper ? <p className="mt-1 text-xs opacity-75">{helper}</p> : null}
    </div>
  );
}

function MethodBreakdown({
  title,
  methods,
}: {
  title: string;
  methods: Record<string, number>;
}) {
  const entries = [
    ['Cash', methods.CASH ?? 0],
    ['Card', methods.CARD ?? 0],
    ['Transfer', methods.TRANSFER ?? 0],
    ['Other', methods.OTHER ?? 0],
  ] as const;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ui-textMuted">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {entries.map(([label, value]) => (
          <span
            key={label}
            className="rounded-full border border-ui-border bg-ui-softBg px-3 py-1 text-sm font-medium text-ui-textPrimary"
          >
            {label}: {money(value)}
          </span>
        ))}
      </div>
    </div>
  );
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

  if (loading) {
    return (
      <Card>
        <CardBody>
          <p className="text-ui-textMuted">Loading totals...</p>
        </CardBody>
      </Card>
    );
  }
  if (!totals) return null;

  const byMethod = totals.byMethod || {};
  const monthByMethod = totals.monthByMethod || {};
  const frozenMonthByMethod = totals.frozenMonthByMethod || {};
  const byPackage = totals.byPackage || {};
  const packageNames = Object.keys(byPackage).sort();
  const frozenRegistered = totals.frozenRegistered ?? 0;
  const activeDue = Math.max(0, numberValue(totals.remainingTotal));
  const activeCredit = Math.max(
    0,
    totals.overCollectedTotal ?? creditAmount(totals.expectedTotal, totals.collectedTotal),
  );
  const monthExpected = totals.monthExpectedTotal ?? 0;
  const monthCollected = totals.monthCollectedTotal ?? 0;
  const monthDue = Math.max(0, totals.monthRemainingTotal ?? dueAmount(monthExpected, monthCollected));
  const monthCredit = creditAmount(monthExpected, monthCollected);
  const frozenExpected = totals.frozenExpectedTotal ?? 0;
  const frozenCollected = totals.frozenCollectedTotal ?? 0;
  const frozenCredit = creditAmount(frozenExpected, frozenCollected);
  const frozenMonthExpected = totals.frozenMonthExpectedTotal ?? 0;
  const frozenMonthCollected = totals.frozenMonthCollectedTotal ?? 0;
  const frozenMonthCredit = creditAmount(frozenMonthExpected, frozenMonthCollected);

  return (
    <Card>
      <CardBody className="p-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-4 rounded-t-2xl px-4 py-3 text-left transition-colors hover:bg-ui-bgMuted/50"
          aria-expanded={open}
        >
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-ui-textMuted">Registration summary</h3>
            {!open ? (
              <p className="mt-1 text-sm text-ui-textMuted">
                {totals.totalRegistered} active, {money(activeDue)} still due
                {activeCredit > 0 ? `, ${money(activeCredit)} credit` : ''}
              </p>
            ) : null}
          </div>
          {open ? (
            <ChevronUpIcon className="h-5 w-5 shrink-0 text-ui-textMuted" aria-hidden />
          ) : (
            <ChevronDownIcon className="h-5 w-5 shrink-0 text-ui-textMuted" aria-hidden />
          )}
        </button>

        {open && (
          <div className="space-y-5 border-t border-ui-border px-4 pb-4 pt-4">
            <section>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ui-textPrimary">Active registrations</p>
                  <p className="text-sm text-ui-textMuted">Current, non-frozen students in this view.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="success">Paid {totals.paidCount}</Badge>
                  <Badge variant="warning">Partial {totals.partialCount ?? 0}</Badge>
                  <Badge variant="danger">Unpaid {totals.unpaidCount}</Badge>
                </div>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryMetric label="Active students" value={totals.totalRegistered} helper="Not frozen" />
                <SummaryMetric label="Expected" value={money(totals.expectedTotal)} helper="After discounts" />
                <SummaryMetric label="Collected" value={money(totals.collectedTotal)} tone="success" />
                <SummaryMetric
                  label="Still due"
                  value={money(activeDue)}
                  tone={activeDue > 0 ? 'warning' : 'success'}
                  helper={activeDue > 0 ? 'Needs payment' : 'Nothing due'}
                />
                <SummaryMetric
                  label="Credit / overpaid"
                  value={money(activeCredit)}
                  tone={activeCredit > 0 ? 'info' : 'default'}
                  helper={activeCredit > 0 ? 'Collected above expected' : 'No extra credit'}
                />
              </div>
              <p className="mt-2 text-xs text-ui-textMuted">
                Discounts: {money(totals.discountsTotal ?? 0)}. Credit is shown separately so "still due" never becomes negative.
              </p>
            </section>

            <section className="border-t border-ui-border pt-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ui-textPrimary">Selected payment month</p>
                  <p className="text-sm text-ui-textMuted">Expected from registrations in that month, plus receipts paid in that month.</p>
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
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryMetric label="Expected this month" value={money(monthExpected)} />
                <SummaryMetric label="Collected this month" value={money(monthCollected)} tone="success" />
                <SummaryMetric
                  label="Still due this month"
                  value={money(monthDue)}
                  tone={monthDue > 0 ? 'warning' : 'success'}
                />
                <SummaryMetric
                  label="Credit this month"
                  value={money(monthCredit)}
                  tone={monthCredit > 0 ? 'info' : 'default'}
                />
              </div>
              <div className="mt-3">
                <MethodBreakdown title="Payment methods this month" methods={monthByMethod} />
              </div>
            </section>

            {frozenRegistered > 0 && (
              <section className="border-t border-ui-border pt-4">
                <p className="text-sm font-semibold text-ui-textPrimary">Frozen registrations</p>
                <p className="text-sm text-ui-textMuted">Paused students are separated from active totals.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <SummaryMetric label="Frozen students" value={frozenRegistered} />
                  <SummaryMetric label="Frozen expected" value={money(frozenExpected)} />
                  <SummaryMetric label="Frozen collected" value={money(frozenCollected)} tone="success" />
                  <SummaryMetric
                    label="Frozen still due"
                    value={money(totals.frozenRemainingTotal ?? 0)}
                    tone={(totals.frozenRemainingTotal ?? 0) > 0 ? 'warning' : 'success'}
                  />
                  <SummaryMetric
                    label="Frozen credit"
                    value={money(frozenCredit)}
                    tone={frozenCredit > 0 ? 'info' : 'default'}
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryMetric label="Frozen expected month" value={money(frozenMonthExpected)} />
                  <SummaryMetric label="Frozen collected month" value={money(frozenMonthCollected)} tone="success" />
                  <SummaryMetric
                    label="Frozen due month"
                    value={money(totals.frozenMonthRemainingTotal ?? 0)}
                    tone={(totals.frozenMonthRemainingTotal ?? 0) > 0 ? 'warning' : 'success'}
                  />
                  <SummaryMetric
                    label="Frozen credit month"
                    value={money(frozenMonthCredit)}
                    tone={frozenMonthCredit > 0 ? 'info' : 'default'}
                  />
                </div>
                <div className="mt-3">
                  <MethodBreakdown title="Frozen payment methods this month" methods={frozenMonthByMethod} />
                </div>
              </section>
            )}

            <section className="border-t border-ui-border pt-4">
              <MethodBreakdown title="All active payment methods" methods={byMethod} />
            </section>

            {packageNames.length > 0 && (
              <section className="border-t border-ui-border pt-4">
                <p className="text-sm font-semibold text-ui-textPrimary">Packages</p>
                <p className="text-sm text-ui-textMuted">Active registrations only. Credits show collected above expected.</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead>
                      <tr className="border-b border-ui-border text-left text-ui-textMuted">
                        <th className="py-2 font-medium">Package</th>
                        <th className="py-2 text-right font-medium">Students</th>
                        <th className="py-2 text-right font-medium">Expected</th>
                        <th className="py-2 text-right font-medium">Collected</th>
                        <th className="py-2 text-right font-medium">Still due</th>
                        <th className="py-2 text-right font-medium">Credit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packageNames.map((name) => {
                        const row = byPackage[name];
                        const packageCredit = creditAmount(row.expected, row.collected);
                        const packageDue = Math.max(0, row.remaining ?? dueAmount(row.expected, row.collected));
                        return (
                          <tr key={name} className="border-b border-ui-border/50">
                            <td className="py-2 font-medium text-ui-textPrimary">{name}</td>
                            <td className="py-2 text-right">{row.registered}</td>
                            <td className="py-2 text-right">{money(row.expected)}</td>
                            <td className="py-2 text-right">{money(row.collected)}</td>
                            <td className="py-2 text-right font-semibold text-amber-800">{money(packageDue)}</td>
                            <td className="py-2 text-right text-blue-800">{money(packageCredit)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

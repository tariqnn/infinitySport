'use client';

import { useEffect, useState } from 'react';
import { Modal, Badge } from '../../_components/ui';
import {
  packageRegistrationsApi,
  type PackageRegistrationRow,
  type RegistrationRenewalHistoryRow,
} from '../../../lib/portalApi';

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString();
}

function readSnapshotNumber(snapshot: Record<string, unknown> | null, key: string) {
  const value = snapshot?.[key];
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function readSnapshotText(snapshot: Record<string, unknown> | null, key: string) {
  const value = snapshot?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function paymentBadgeVariant(status: string) {
  if (status === 'Paid') return 'success' as const;
  if (status === 'Partial') return 'warning' as const;
  return 'danger' as const;
}

export function RegistrationDetailsModal({
  open,
  onClose,
  registration,
  onViewReceipts,
}: {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
  onViewReceipts: (registration: PackageRegistrationRow) => void;
}) {
  const [history, setHistory] = useState<RegistrationRenewalHistoryRow[]>([]);
  const [profile, setProfile] = useState<{ playerCode: string | null; currentCycle: number } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !registration) {
      setHistory([]);
      setProfile(null);
      setHistoryError(null);
      setHistoryLoading(false);
      return;
    }

    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);

    packageRegistrationsApi
      .getHistory(registration.id)
      .then((response) => {
        if (cancelled) return;
        setProfile({
          playerCode: response.playerCode ?? registration.playerCode ?? null,
          currentCycle: response.currentCycle ?? registration.currentCycle ?? 1,
        });
        setHistory(response.history || []);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error('Failed to load registration history', error);
        setProfile({
          playerCode: registration.playerCode ?? null,
          currentCycle: registration.currentCycle ?? 1,
        });
        setHistory([]);
        setHistoryError('Could not load renewal history right now.');
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, registration]);

  if (!registration) return null;

  const collected = registration.collected ?? 0;
  const total = registration.finalPriceJod ?? 0;
  const remaining = Math.max(0, total - collected);
  const paymentStatus = registration.isPaid ? 'Paid' : collected > 0 ? 'Partial' : 'Unpaid';
  const playerCode = profile?.playerCode ?? registration.playerCode ?? null;
  const currentCycle = profile?.currentCycle ?? registration.currentCycle ?? 1;

  return (
    <Modal open={open} onClose={onClose} title="Registration details" size="lg">
      <div className="space-y-6 text-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-ui-textMuted">Player ID</p>
            <p className="font-medium text-ui-textPrimary">{playerCode || 'Pending'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Current cycle</p>
            <p className="font-medium text-ui-textPrimary">Cycle {currentCycle}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Package</p>
            <p className="font-medium text-ui-textPrimary">{registration.packageName}</p>
          </div>
          {registration.planLabel ? (
            <div className="sm:col-span-2">
              <p className="text-ui-textMuted">Registration notes</p>
              <p className="whitespace-pre-wrap text-ui-textPrimary">{registration.planLabel}</p>
            </div>
          ) : null}
          <div>
            <p className="text-ui-textMuted">Duration</p>
            <p className="text-ui-textPrimary">{registration.durationMonths} month{registration.durationMonths === 1 ? '' : 's'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Player name</p>
            <p className="text-ui-textPrimary">{registration.customerName}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Age</p>
            <p className="text-ui-textPrimary">{registration.customerAge ? `${registration.customerAge} years` : '-'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Phone</p>
            <p className="text-ui-textPrimary">{registration.customerPhone || '-'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Email</p>
            <p className="break-all text-ui-textPrimary">{registration.customerEmail || '-'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Cycle start</p>
            <p className="text-ui-textPrimary">
              {formatDate(registration.periodStartsAt || registration.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-ui-textMuted">Cycle end</p>
            <p className="text-ui-textPrimary">{formatDate(registration.periodEndsAt)}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Next payment date</p>
            <p className="text-ui-textPrimary">{formatDate(registration.nextPaymentDate)}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Record created</p>
            <p className="text-ui-textPrimary">{formatDateTime(registration.createdAt)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-ui-border bg-ui-softBg/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-textMuted">
                Current cycle payment
              </p>
              <p className="mt-1 text-base font-semibold text-ui-textPrimary">
                Total {total} JOD
              </p>
            </div>
            <Badge variant={paymentBadgeVariant(paymentStatus)}>{paymentStatus}</Badge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-ui-border bg-white p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Collected</p>
              <p className="mt-1 text-lg font-semibold text-ui-textPrimary">{collected} JOD</p>
            </div>
            <div className="rounded-lg border border-ui-border bg-white p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Remaining</p>
              <p className="mt-1 text-lg font-semibold text-ui-textPrimary">{remaining} JOD</p>
            </div>
            <div className="rounded-lg border border-ui-border bg-white p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Points balance</p>
              <p className="mt-1 text-lg font-semibold text-ui-textPrimary">{registration.pointsBalance ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-ui-border">
          <div className="flex items-center justify-between border-b border-ui-border px-4 py-3">
            <div>
              <h4 className="font-semibold text-ui-textPrimary">Renewal history</h4>
              <p className="text-xs text-ui-textMuted">
                Each re-register keeps the same record and saves the previous cycle here.
              </p>
            </div>
            <span className="rounded-full bg-ui-softBg px-2.5 py-1 text-xs font-medium text-ui-textMuted">
              {history.length} archived cycle{history.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="max-h-[280px] space-y-3 overflow-y-auto p-4">
            {historyLoading ? (
              <p className="text-ui-textMuted">Loading renewal history...</p>
            ) : historyError ? (
              <p className="text-sm text-amber-700">{historyError}</p>
            ) : history.length === 0 ? (
              <p className="text-ui-textMuted">No archived cycles yet.</p>
            ) : (
              history.map((entry) => {
                const snapshot = entry.snapshot;
                const archivedPaymentStatus = readSnapshotText(snapshot, 'paymentStatus') || 'UNPAID';
                const archivedCollected = readSnapshotNumber(snapshot, 'collectedJod');
                const archivedRemaining = readSnapshotNumber(snapshot, 'remainingJod');
                const archivedTotal = readSnapshotNumber(snapshot, 'finalPriceJod');
                const archivedSessions = readSnapshotNumber(snapshot, 'sessionsLeft');
                return (
                  <div key={entry.id} className="rounded-xl border border-ui-border bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ui-textPrimary">
                          Cycle {entry.cycleNumber}
                        </p>
                        <p className="text-xs text-ui-textMuted">
                          {entry.action} on {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                      <Badge variant={paymentBadgeVariant(archivedPaymentStatus === 'PAID' ? 'Paid' : archivedPaymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid')}>
                        {archivedPaymentStatus}
                      </Badge>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Archived total</p>
                        <p className="text-ui-textPrimary">{archivedTotal} JOD</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Collected</p>
                        <p className="text-ui-textPrimary">{archivedCollected} JOD</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Remaining</p>
                        <p className="text-ui-textPrimary">{archivedRemaining} JOD</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Sessions left</p>
                        <p className="text-ui-textPrimary">{archivedSessions}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Period start</p>
                        <p className="text-ui-textPrimary">{formatDate(readSnapshotText(snapshot, 'periodStartsAt'))}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Period end</p>
                        <p className="text-ui-textPrimary">{formatDate(readSnapshotText(snapshot, 'periodEndsAt'))}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Next payment</p>
                        <p className="text-ui-textPrimary">{formatDate(readSnapshotText(snapshot, 'nextPaymentDate'))}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Frozen</p>
                        <p className="text-ui-textPrimary">{snapshot?.isFrozen === true ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="border-t border-ui-border pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewReceipts(registration);
            }}
            className="font-medium text-brand-blue-primary hover:underline"
          >
            View Receipt(s)
          </button>
        </div>
      </div>
    </Modal>
  );
}

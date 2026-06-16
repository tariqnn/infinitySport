'use client';

import { useEffect, useState } from 'react';
import { Modal, Badge, Button, Input, Select } from '../../_components/ui';
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

type OldMonthEditForm = {
  periodStartsAt: string;
  durationMonths: string;
  sessionsLeft: string;
  basePriceJod: string;
  amountPaid: string;
  paymentMethod: string;
  paymentPeriodKey: string;
  privateNote: string;
};

const PAYMENT_METHODS = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];

function toDateInput(value: unknown) {
  if (!value) return '';
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function toMonthInput(value: unknown) {
  if (typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  const date = toDateInput(value);
  return date ? date.slice(0, 7) : '';
}

function buildOldMonthEditForm(entry: RegistrationRenewalHistoryRow): OldMonthEditForm {
  const snapshot = entry.snapshot ?? {};
  return {
    periodStartsAt: toDateInput(snapshot.periodStartsAt),
    durationMonths: String(snapshot.durationMonths ?? 1),
    sessionsLeft: snapshot.sessionsLeft == null ? '' : String(snapshot.sessionsLeft),
    basePriceJod: String(snapshot.finalPriceJod ?? 0),
    amountPaid: String(snapshot.amountPaid ?? 0),
    paymentMethod: typeof snapshot.paymentMethod === 'string' ? snapshot.paymentMethod : 'CASH',
    paymentPeriodKey: toMonthInput(snapshot.paymentPeriodKey || snapshot.periodStartsAt),
    privateNote: typeof snapshot.privateNote === 'string' ? snapshot.privateNote : '',
  };
}

function isSummerCampPackage(packageName: string) {
  const normalized = packageName.trim().toLowerCase();
  return normalized === 'basketball summer camp' || normalized === 'volleyball summer camp' || normalized.includes('summer camp');
}

function parseRegistrationNotes(planLabel: string | null | undefined) {
  if (!planLabel) return new Map<string, string>();

  const entries = planLabel
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const separator = part.indexOf(':');
      if (separator === -1) return null;
      const key = part.slice(0, separator).trim().toLowerCase();
      const value = part.slice(separator + 1).trim();
      return key && value ? ([key, value] as const) : null;
    })
    .filter((entry): entry is readonly [string, string] => Boolean(entry));

  return new Map(entries);
}

function DetailTile({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border border-ui-border bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-textMuted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-ui-textPrimary">{value?.trim() || '-'}</p>
    </div>
  );
}

function SummerCampNotes({ planLabel }: { planLabel: string }) {
  const notes = parseRegistrationNotes(planLabel);
  const emergencyParts = (notes.get('emergency') || '')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  const hasFullCampDetails = notes.has('allergies') || notes.has('uniform') || notes.has('transportation') || notes.has('media consent');

  return (
    <div className="sm:col-span-2">
      <div className="rounded-xl border border-ui-border bg-ui-softBg/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ui-textMuted">Summer camp details</p>
            <p className="mt-1 text-sm text-ui-textMuted">Captured from the website registration form.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ui-textMuted">
            Website form
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {notes.has('camp') ? <DetailTile label="Camp" value={notes.get('camp')} /> : null}
          <DetailTile label="Medical" value={notes.get('medical')} />
          {hasFullCampDetails ? (
            <>
              <DetailTile label="Allergies" value={notes.get('allergies')} />
              <DetailTile label="Media Consent" value={notes.get('media consent')} />
              <DetailTile label="Uniform" value={notes.get('uniform')} />
              <div className="sm:col-span-2">
                <DetailTile label="Transportation" value={notes.get('transportation')} />
              </div>
            </>
          ) : null}
        </div>

        {emergencyParts.length > 0 ? (
          <div className="mt-3 rounded-lg border border-ui-border bg-white p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-textMuted">Emergency contact</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ui-textMuted">Name</p>
                <p className="font-medium text-ui-textPrimary">{emergencyParts[0] || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-ui-textMuted">Relationship</p>
                <p className="font-medium text-ui-textPrimary">{emergencyParts[1] || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-ui-textMuted">Phone</p>
                <p className="break-all font-medium text-ui-textPrimary">{emergencyParts[2] || '-'}</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function RegistrationDetailsModal({
  open,
  onClose,
  registration,
  onViewReceipts,
  onEditRegistration,
}: {
  open: boolean;
  onClose: () => void;
  registration: PackageRegistrationRow | null;
  onViewReceipts: (registration: PackageRegistrationRow) => void;
  onEditRegistration: (registration: PackageRegistrationRow) => void;
}) {
  const [history, setHistory] = useState<RegistrationRenewalHistoryRow[]>([]);
  const [profile, setProfile] = useState<{ playerCode: string | null; currentCycle: number } | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OldMonthEditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);

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

  async function refreshHistory() {
    if (!registration) return;
    const response = await packageRegistrationsApi.getHistory(registration.id);
    setProfile({
      playerCode: response.playerCode ?? registration.playerCode ?? null,
      currentCycle: response.currentCycle ?? registration.currentCycle ?? 1,
    });
    setHistory(response.history || []);
  }

  function startEditingOldMonth(entry: RegistrationRenewalHistoryRow) {
    setEditingHistoryId(entry.id);
    setEditForm(buildOldMonthEditForm(entry));
    setHistoryError(null);
  }

  async function saveEditingOldMonth() {
    if (!editingHistoryId || !editForm) return;
    setEditLoading(true);
    setHistoryError(null);
    try {
      await packageRegistrationsApi.updateOldMonthHistory(editingHistoryId, {
        periodStartsAt: editForm.periodStartsAt,
        durationMonths: Math.max(1, Math.round(Number(editForm.durationMonths) || 1)),
        sessionsLeft: editForm.sessionsLeft.trim() ? Math.max(0, Math.round(Number(editForm.sessionsLeft) || 0)) : null,
        basePriceJod: Math.max(0, Math.round(Number(editForm.basePriceJod) || 0)),
        amountPaid: Math.max(0, Math.round(Number(editForm.amountPaid) || 0)),
        paymentMethod: editForm.paymentMethod,
        paymentPeriodKey: editForm.paymentPeriodKey,
        privateNote: editForm.privateNote.trim() || null,
      });
      setEditingHistoryId(null);
      setEditForm(null);
      await refreshHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not update old month.');
    } finally {
      setEditLoading(false);
    }
  }

  async function deleteOldMonth(entry: RegistrationRenewalHistoryRow) {
    if (!confirm('Delete this old month record? Any historical receipt linked to it will be voided.')) return;
    setHistoryError(null);
    try {
      await packageRegistrationsApi.deleteOldMonthHistory(entry.id);
      if (editingHistoryId === entry.id) {
        setEditingHistoryId(null);
        setEditForm(null);
      }
      await refreshHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not delete old month.');
    }
  }

  if (!registration) return null;

  const collected = registration.collected ?? 0;
  const total = registration.finalPriceJod ?? 0;
  const remaining = Math.max(0, total - collected);
  const paymentStatus = registration.isPaid ? 'Paid' : collected > 0 ? 'Partial' : 'Unpaid';
  const playerCode = profile?.playerCode ?? registration.playerCode ?? null;
  const currentCycle = profile?.currentCycle ?? registration.currentCycle ?? 1;
  const isSummerCamp = isSummerCampPackage(registration.packageName);

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
          {registration.planLabel && isSummerCamp ? (
            <SummerCampNotes planLabel={registration.planLabel} />
          ) : registration.planLabel ? (
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
            <p className="text-ui-textMuted">Total classes</p>
            <p className="text-ui-textPrimary">{registration.sessionsLeft ?? '-'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Sessions per week</p>
            <p className="text-ui-textPrimary">{registration.sessionsPerWeek ?? 'Package default'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Classes finished</p>
            <p className="text-ui-textPrimary">{registration.sessionsUsedOverride ?? '-'}</p>
          </div>
          <div>
            <p className="text-ui-textMuted">Registered on</p>
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
                const isOldMonth = entry.action === 'OLD_MONTH_RECORDED' || entry.action === 'IMPORTED_OLD_REGISTRATION';
                const archivedPaymentStatus = isOldMonth
                  ? readSnapshotNumber(snapshot, 'amountPaid') > 0
                    ? 'PAID'
                    : 'UNPAID'
                  : readSnapshotText(snapshot, 'paymentStatus') || 'UNPAID';
                const archivedCollected = isOldMonth
                  ? readSnapshotNumber(snapshot, 'amountPaid')
                  : readSnapshotNumber(snapshot, 'collectedJod');
                const archivedRemaining = isOldMonth
                  ? Math.max(0, readSnapshotNumber(snapshot, 'finalPriceJod') - readSnapshotNumber(snapshot, 'amountPaid'))
                  : readSnapshotNumber(snapshot, 'remainingJod');
                const archivedTotal = readSnapshotNumber(snapshot, 'finalPriceJod');
                const archivedSessions = readSnapshotNumber(snapshot, 'sessionsLeft');
                const archivedSessionsUsed = readSnapshotNumber(snapshot, 'sessionsUsedOverride');
                return (
                  <div key={entry.id} className="rounded-xl border border-ui-border bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ui-textPrimary">
                          {isOldMonth ? 'Old month record' : `Cycle ${entry.cycleNumber}`}
                        </p>
                        <p className="text-xs text-ui-textMuted">
                          {entry.action} on {formatDateTime(entry.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={paymentBadgeVariant(archivedPaymentStatus === 'PAID' ? 'Paid' : archivedPaymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid')}>
                          {archivedPaymentStatus}
                        </Badge>
                        {entry.action !== 'CURRENT' ? (
                          <>
                            <Button type="button" variant="secondary" size="sm" onClick={() => startEditingOldMonth(entry)}>
                              Edit
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => deleteOldMonth(entry)}>
                              Delete
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                    {editingHistoryId === entry.id && editForm ? (
                      <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <Input label="Start" type="date" value={editForm.periodStartsAt} onChange={(e) => setEditForm({ ...editForm, periodStartsAt: e.target.value, paymentPeriodKey: e.target.value.slice(0, 7) })} />
                          <Input label="Months" type="number" min={1} value={editForm.durationMonths} onChange={(e) => setEditForm({ ...editForm, durationMonths: e.target.value })} />
                          <Input label="Sessions" type="number" min={0} value={editForm.sessionsLeft} onChange={(e) => setEditForm({ ...editForm, sessionsLeft: e.target.value })} />
                          <Input label="Price" type="number" min={0} value={editForm.basePriceJod} onChange={(e) => setEditForm({ ...editForm, basePriceJod: e.target.value })} />
                          <Input label="Paid" type="number" min={0} value={editForm.amountPaid} onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })} />
                          <Select label="Method" value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
                            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                          </Select>
                          <Input label="Paid month" type="month" value={editForm.paymentPeriodKey} onChange={(e) => setEditForm({ ...editForm, paymentPeriodKey: e.target.value })} />
                          <Input label="Private note" value={editForm.privateNote} onChange={(e) => setEditForm({ ...editForm, privateNote: e.target.value })} />
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingHistoryId(null); setEditForm(null); }}>
                            Cancel
                          </Button>
                          <Button type="button" size="sm" isLoading={editLoading} onClick={saveEditingOldMonth}>
                            Save old month
                          </Button>
                        </div>
                      </div>
                    ) : null}
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
                        <p className="text-xs uppercase tracking-[0.16em] text-ui-textMuted">Classes finished</p>
                        <p className="text-ui-textPrimary">{archivedSessionsUsed}</p>
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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onClose();
                onEditRegistration(registration);
              }}
            >
              Edit registration
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                onClose();
                onViewReceipts(registration);
              }}
            >
              View Receipt(s)
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Modal, Badge, Button, Input, Select } from '../../_components/ui';
import {
  packageRegistrationsApi,
  type PackageRegistrationRow,
  type RegistrationRenewalHistoryRow,
} from '../../../lib/portalApi';
import type { InitialPerson } from './AddRegistrationModal';

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

function normalizeEmail(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function normalizePhoneDigits(value: string | null | undefined) {
  return (value ?? '').replace(/\D/g, '');
}

function phoneLooksSame(left: string | null | undefined, right: string | null | undefined) {
  const a = normalizePhoneDigits(left);
  const b = normalizePhoneDigits(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.endsWith(b) || b.endsWith(a);
}

function readSnapshotText(snapshot: Record<string, unknown> | null, key: string): string | null {
  const value = snapshot?.[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function readSnapshotNumber(snapshot: Record<string, unknown> | null, key: string): number | null {
  const value = snapshot?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function paymentStatusForRegistration(registration: PackageRegistrationRow): 'Paid' | 'Partial' | 'Unpaid' {
  const collected = registration.collected ?? 0;
  const total = registration.finalPriceJod ?? 0;
  if (registration.isPaid || (total > 0 && collected >= total)) return 'Paid';
  if (collected > 0) return 'Partial';
  return 'Unpaid';
}

function paymentBadgeVariant(status: string): 'success' | 'warning' | 'danger' {
  const normalized = status.toUpperCase();
  if (normalized === 'PAID') return 'success';
  if (normalized === 'PARTIAL') return 'warning';
  return 'danger';
}

type PlayerCycle = {
  id: string;
  registration: PackageRegistrationRow;
  history?: RegistrationRenewalHistoryRow;
  packageName: string;
  cycleNumber: number | null;
  isCurrent: boolean;
  isOldMonth: boolean;
  startDate: string | null;
  endDate: string | null;
  totalJod: number | null;
  collectedJod: number | null;
  remainingJod: number | null;
  paymentStatus: string;
  archivedAt: string | null;
};

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

function buildOldMonthEditForm(history: RegistrationRenewalHistoryRow): OldMonthEditForm {
  const snapshot = history.snapshot ?? {};
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

function buildCurrentCycle(registration: PackageRegistrationRow): PlayerCycle {
  const collected = registration.collected ?? 0;
  const total = registration.finalPriceJod ?? 0;
  return {
    id: `${registration.id}:current`,
    registration,
    packageName: registration.packageName,
    cycleNumber: registration.currentCycle ?? null,
    isCurrent: true,
    isOldMonth: false,
    startDate: registration.periodStartsAt || registration.createdAt,
    endDate: registration.periodEndsAt,
    totalJod: total,
    collectedJod: collected,
    remainingJod: Math.max(0, total - collected),
    paymentStatus: paymentStatusForRegistration(registration),
    archivedAt: null,
  };
}

function buildArchivedCycle(
  registration: PackageRegistrationRow,
  history: RegistrationRenewalHistoryRow,
): PlayerCycle {
  const snapshot = history.snapshot;
  const isOldMonth = history.action === 'OLD_MONTH_RECORDED' || history.action === 'IMPORTED_OLD_REGISTRATION';
  const total = readSnapshotNumber(snapshot, 'finalPriceJod');
  const paid = isOldMonth ? readSnapshotNumber(snapshot, 'amountPaid') ?? 0 : readSnapshotNumber(snapshot, 'collectedJod');
  return {
    id: history.id,
    registration,
    history,
    packageName: readSnapshotText(snapshot, 'packageName') || registration.packageName,
    cycleNumber: history.cycleNumber,
    isCurrent: false,
    isOldMonth,
    startDate: readSnapshotText(snapshot, 'periodStartsAt'),
    endDate: readSnapshotText(snapshot, 'periodEndsAt'),
    totalJod: total,
    collectedJod: paid,
    remainingJod: isOldMonth
      ? Math.max(0, (total ?? 0) - (paid ?? 0))
      : readSnapshotNumber(snapshot, 'remainingJod'),
    paymentStatus: isOldMonth ? ((paid ?? 0) > 0 ? 'PAID' : 'UNPAID') : readSnapshotText(snapshot, 'paymentStatus') || 'UNPAID',
    archivedAt: history.createdAt,
  };
}

export function PersonDetailsModal({
  open,
  onClose,
  registrations,
  onAddPackages,
  onViewReceipts,
  onMarkPaid,
}: {
  open: boolean;
  onClose: () => void;
  registrations: PackageRegistrationRow[];
  onAddPackages: (person: InitialPerson) => void;
  onViewReceipts: (row: PackageRegistrationRow) => void;
  onMarkPaid: (row: PackageRegistrationRow) => void;
}) {
  const [allRegistrations, setAllRegistrations] = useState<PackageRegistrationRow[]>(registrations);
  const [historyByRegistrationId, setHistoryByRegistrationId] = useState<Record<string, RegistrationRenewalHistoryRow[]>>({});
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OldMonthEditForm | null>(null);
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    if (!open || registrations.length === 0) return;

    let cancelled = false;
    const seed = registrations[0];

    async function loadPersonHistory() {
      setLoadingHistory(true);
      setHistoryError(null);
      setAllRegistrations(registrations);
      setHistoryByRegistrationId({});

      try {
        const searchTerm = seed.customerPhone || seed.customerEmail || seed.customerName;
        const fetched = searchTerm
          ? await packageRegistrationsApi.list(undefined, undefined, undefined, searchTerm)
          : registrations;
        if (cancelled) return;

        const targetEmail = normalizeEmail(seed.customerEmail);
        const matching = fetched.filter((row) => {
          const samePhone = phoneLooksSame(row.customerPhone, seed.customerPhone);
          const sameEmail = targetEmail && normalizeEmail(row.customerEmail) === targetEmail;
          const alreadyLoaded = registrations.some((existing) => existing.id === row.id);
          return Boolean(samePhone || sameEmail || alreadyLoaded);
        });
        const merged = [...registrations, ...matching].filter(
          (row, index, list) => list.findIndex((candidate) => candidate.id === row.id) === index,
        );
        setAllRegistrations(merged);

        const historyEntries = await Promise.all(
          merged.map(async (row) => {
            const response = await packageRegistrationsApi.getHistory(row.id);
            return [row.id, response.history || []] as const;
          }),
        );
        if (cancelled) return;
        setHistoryByRegistrationId(Object.fromEntries(historyEntries));
      } catch (error) {
        if (cancelled) return;
        console.error('Failed to load person history', error);
        setHistoryError('Could not load full player history right now.');
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    loadPersonHistory();

    return () => {
      cancelled = true;
    };
  }, [open, registrations]);

  async function refreshPersonHistory(rows = allRegistrations) {
    const historyEntries = await Promise.all(
      rows.map(async (row) => {
        const response = await packageRegistrationsApi.getHistory(row.id);
        return [row.id, response.history || []] as const;
      }),
    );
    setHistoryByRegistrationId(Object.fromEntries(historyEntries));
  }

  function startEditingOldMonth(history: RegistrationRenewalHistoryRow) {
    setEditingHistoryId(history.id);
    setEditForm(buildOldMonthEditForm(history));
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
      await refreshPersonHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not update old month.');
    } finally {
      setEditLoading(false);
    }
  }

  async function deleteOldMonth(history: RegistrationRenewalHistoryRow) {
    if (!confirm('Delete this old month record? Any historical receipt linked to it will be voided.')) return;
    setHistoryError(null);
    try {
      await packageRegistrationsApi.deleteOldMonthHistory(history.id);
      if (editingHistoryId === history.id) {
        setEditingHistoryId(null);
        setEditForm(null);
      }
      await refreshPersonHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not delete old month.');
    }
  }

  const timeline = useMemo(() => {
    const cycles = allRegistrations.flatMap((registration) => [
      buildCurrentCycle(registration),
      ...(historyByRegistrationId[registration.id] || []).map((history) =>
        buildArchivedCycle(registration, history),
      ),
    ]);

    return cycles.sort((left, right) => {
      const leftTime = left.startDate ? new Date(left.startDate).getTime() : 0;
      const rightTime = right.startDate ? new Date(right.startDate).getTime() : 0;
      return rightTime - leftTime;
    });
  }, [allRegistrations, historyByRegistrationId]);

  if (!open || registrations.length === 0) return null;

  const first = registrations[0];
  const person: InitialPerson = {
    customerName: first.customerName,
    customerPhone: first.customerPhone,
    customerEmail: first.customerEmail ?? undefined,
    customerAge: first.customerAge ?? undefined,
  };

  return (
    <Modal open={open} onClose={onClose} title="Person details" size="lg">
      <div className="mb-4">
        <p className="font-semibold text-ui-textPrimary">{first.customerName}</p>
        <p className="text-sm text-ui-textMuted">{first.customerPhone}</p>
        {first.customerEmail ? <p className="text-sm text-ui-textMuted">{first.customerEmail}</p> : null}
      </div>

      <p className="mb-3 text-sm text-ui-textMuted">Current registrations ({allRegistrations.length})</p>
      <ul className="max-h-[26vh] space-y-2 overflow-y-auto rounded-lg border border-ui-border divide-y divide-ui-border">
        {allRegistrations.map((registration) => {
          const collected = registration.collected ?? 0;
          const status = paymentStatusForRegistration(registration);
          return (
            <li key={registration.id} className="flex flex-wrap items-center justify-between gap-2 bg-ui-softBg/30 p-3">
              <div>
                <span className="font-medium text-ui-textPrimary">{registration.packageName}</span>
                <span className="ml-2 text-sm text-ui-textMuted">
                  {registration.finalPriceJod ?? 0} JOD - {status}
                  {registration.periodStartsAt ? (
                    <span className="ml-2">- Starts {new Date(registration.periodStartsAt).toLocaleDateString()}</span>
                  ) : null}
                </span>
                <span className="mt-1 block text-xs text-ui-textMuted">
                  Registered {formatDateTime(registration.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={paymentBadgeVariant(status)}>{status}</Badge>
                {status !== 'Paid' ? (
                  <Button size="sm" variant="primary" onClick={() => onMarkPaid(registration)}>Mark paid</Button>
                ) : null}
                {collected > 0 || status === 'Paid' ? (
                  <Button size="sm" variant="secondary" onClick={() => onViewReceipts(registration)}>Receipts</Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 rounded-lg border border-ui-border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ui-border px-3 py-2">
          <div>
            <p className="font-semibold text-ui-textPrimary">Player history</p>
            <p className="text-xs text-ui-textMuted">All current and archived registration cycles across packages.</p>
          </div>
          <Badge variant="neutral">{timeline.length} cycle{timeline.length === 1 ? '' : 's'}</Badge>
        </div>
        <div className="max-h-[36vh] space-y-2 overflow-y-auto p-3">
          {loadingHistory ? (
            <p className="text-sm text-ui-textMuted">Loading player history...</p>
          ) : historyError ? (
            <p className="text-sm text-amber-700">{historyError}</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-ui-textMuted">No player history found.</p>
          ) : (
            timeline.map((cycle) => (
              <div key={cycle.id} className="rounded-lg border border-ui-border bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-ui-textPrimary">{cycle.packageName}</p>
                    <p className="text-xs text-ui-textMuted">
                      {cycle.isCurrent ? 'Current cycle' : cycle.isOldMonth ? 'Old month record' : `Archived cycle ${cycle.cycleNumber ?? '-'}`}
                      {' - '}
                      {formatDate(cycle.startDate)} to {formatDate(cycle.endDate)}
                    </p>
                    {cycle.archivedAt ? (
                      <p className="text-xs text-ui-textMuted">Archived {formatDateTime(cycle.archivedAt)}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={paymentBadgeVariant(cycle.paymentStatus)}>{cycle.paymentStatus}</Badge>
                    {!cycle.isCurrent && cycle.history ? (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => startEditingOldMonth(cycle.history!)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => deleteOldMonth(cycle.history!)}>
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                {editingHistoryId === cycle.id && editForm ? (
                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
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
                      <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingHistoryId(null); setEditForm(null); }}>
                        Cancel
                      </Button>
                      <Button type="button" size="sm" isLoading={editLoading} onClick={saveEditingOldMonth}>
                        Save old month
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 grid gap-2 text-xs text-ui-textMuted sm:grid-cols-3">
                  <span>Total: <strong className="text-ui-textPrimary">{cycle.totalJod ?? '-'} JOD</strong></span>
                  <span>Collected: <strong className="text-ui-textPrimary">{cycle.collectedJod ?? '-'} JOD</strong></span>
                  <span>Remaining: <strong className="text-ui-textPrimary">{cycle.remainingJod ?? '-'} JOD</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={() => { onClose(); onAddPackages(person); }}>Add packages</Button>
      </div>
    </Modal>
  );
}

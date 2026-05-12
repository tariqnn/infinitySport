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

function formatExportDate(value: string | null | undefined) {
  return toDateInput(value) || '-';
}

function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'player';
}

function escapeCsvValue(value: unknown) {
  const text = String(value ?? '');
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsvFile(filename: string, rows: unknown[][]) {
  const csv = rows.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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

function normalizeName(value: string | null | undefined) {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function samePlayerIdentity(row: PackageRegistrationRow, seed: PackageRegistrationRow) {
  if (row.id === seed.id) return true;
  if (seed.playerCode && row.playerCode === seed.playerCode) return true;

  const sameName = normalizeName(row.customerName) === normalizeName(seed.customerName);
  const seedAge = seed.customerAge ?? null;
  const rowAge = row.customerAge ?? null;
  const sameAge = seedAge == null || rowAge == null || seedAge === rowAge;
  const targetEmail = normalizeEmail(seed.customerEmail);
  const sameEmail = targetEmail && normalizeEmail(row.customerEmail) === targetEmail;
  const samePhone = phoneLooksSame(row.customerPhone, seed.customerPhone);

  return sameName && sameAge && Boolean(sameEmail || samePhone);
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
  periodEndsAt: string;
  durationMonths: string;
  sessionsLeft: string;
  basePriceJod: string;
  amountPaid: string;
  paymentMethod: string;
  paymentPeriodKey: string;
  privateNote: string;
};

type EditMode = 'current' | 'history';

type PlayerHistoryExportRow = {
  playerCode: string;
  playerName: string;
  phone: string;
  age: string;
  packageName: string;
  cycle: string;
  type: string;
  startDate: string;
  endDate: string;
  totalJod: string;
  collectedJod: string;
  remainingJod: string;
  status: string;
  archivedAt: string;
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
    periodEndsAt: toDateInput(snapshot.periodEndsAt),
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

function buildCurrentCycleEditForm(cycle: PlayerCycle): OldMonthEditForm {
  return {
    periodStartsAt: toDateInput(cycle.startDate),
    periodEndsAt: toDateInput(cycle.endDate),
    durationMonths: String(cycle.registration.durationMonths ?? 1),
    sessionsLeft: cycle.registration.sessionsLeft == null ? '' : String(cycle.registration.sessionsLeft),
    basePriceJod: String(cycle.totalJod ?? 0),
    amountPaid: String(cycle.collectedJod ?? 0),
    paymentMethod: 'CASH',
    paymentPeriodKey: toMonthInput(cycle.startDate),
    privateNote: 'Manual financial edit',
  };
}

function buildExportRows(
  cycles: PlayerCycle[],
  fallbackRegistration: PackageRegistrationRow,
): PlayerHistoryExportRow[] {
  return cycles.map((cycle) => {
    const registration = cycle.registration || fallbackRegistration;
    return {
      playerCode: registration.playerCode || '-',
      playerName: registration.customerName || fallbackRegistration.customerName,
      phone: registration.customerPhone || fallbackRegistration.customerPhone || '-',
      age: registration.customerAge == null ? '-' : String(registration.customerAge),
      packageName: cycle.packageName,
      cycle: cycle.cycleNumber == null ? '-' : String(cycle.cycleNumber),
      type: cycle.isCurrent ? 'Current cycle' : cycle.isOldMonth ? 'Old month record' : 'Archived cycle',
      startDate: formatExportDate(cycle.startDate),
      endDate: formatExportDate(cycle.endDate),
      totalJod: cycle.totalJod == null ? '-' : String(cycle.totalJod),
      collectedJod: cycle.collectedJod == null ? '-' : String(cycle.collectedJod),
      remainingJod: cycle.remainingJod == null ? '-' : String(cycle.remainingJod),
      status: cycle.paymentStatus,
      archivedAt: cycle.archivedAt ? formatDateTime(cycle.archivedAt) : '-',
    };
  });
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
  const [editingMode, setEditingMode] = useState<EditMode | null>(null);
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

        const matching = fetched.filter((row) => {
          const alreadyLoaded = registrations.some((existing) => existing.id === row.id);
          return Boolean(alreadyLoaded || samePlayerIdentity(row, seed));
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

  function startEditingCycle(cycle: PlayerCycle) {
    setEditingHistoryId(cycle.id);
    setEditingMode(cycle.isCurrent ? 'current' : 'history');
    setEditForm(
      cycle.isCurrent
        ? buildCurrentCycleEditForm(cycle)
        : cycle.history
          ? buildOldMonthEditForm(cycle.history)
          : null,
    );
    setHistoryError(null);
  }

  async function saveEditingOldMonth() {
    if (!editingHistoryId || !editForm) return;
    setEditLoading(true);
    setHistoryError(null);
    try {
      await packageRegistrationsApi.updateOldMonthHistory(editingHistoryId, {
        periodStartsAt: editForm.periodStartsAt,
        periodEndsAt: editForm.periodEndsAt,
        durationMonths: Math.max(1, Math.round(Number(editForm.durationMonths) || 1)),
        sessionsLeft: editForm.sessionsLeft.trim() ? Math.max(0, Math.round(Number(editForm.sessionsLeft) || 0)) : null,
        basePriceJod: Math.max(0, Math.round(Number(editForm.basePriceJod) || 0)),
        amountPaid: Math.max(0, Math.round(Number(editForm.amountPaid) || 0)),
        paymentMethod: editForm.paymentMethod,
        paymentPeriodKey: editForm.paymentPeriodKey,
        privateNote: editForm.privateNote.trim() || null,
      });
      setEditingHistoryId(null);
      setEditingMode(null);
      setEditForm(null);
      await refreshPersonHistory();
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not update old month.');
    } finally {
      setEditLoading(false);
    }
  }

  async function saveEditingCurrent(registration: PackageRegistrationRow) {
    if (!editingHistoryId || !editForm) return;
    setEditLoading(true);
    setHistoryError(null);
    try {
      const nextCollected = Math.max(0, Math.round(Number(editForm.amountPaid) || 0));
      const payload: Parameters<typeof packageRegistrationsApi.updateManualFinancials>[1] = {
        finalPriceJod: Math.max(0, Math.round(Number(editForm.basePriceJod) || 0)),
      };
      if (nextCollected !== (registration.collected ?? 0)) {
        payload.collected = nextCollected;
        payload.paymentMethod = editForm.paymentMethod;
        payload.paymentPeriodKey = editForm.paymentPeriodKey;
        payload.privateNote = editForm.privateNote.trim() || 'Manual financial edit';
      }
      const updated = await packageRegistrationsApi.updateManualFinancials(registration.id, payload);
      setAllRegistrations((rows) =>
        rows.map((row) => (row.id === updated.id ? updated : row)),
      );
      setEditingHistoryId(null);
      setEditingMode(null);
      setEditForm(null);
      await refreshPersonHistory(
        allRegistrations.map((row) => (row.id === updated.id ? updated : row)),
      );
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Could not update current cycle.');
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
        setEditingMode(null);
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

  const exportRows = useMemo(() => {
    const fallback = allRegistrations[0] || registrations[0];
    return fallback ? buildExportRows(timeline, fallback) : [];
  }, [allRegistrations, registrations, timeline]);

  function exportPlayerHistoryCsv() {
    const fallback = allRegistrations[0] || registrations[0];
    if (!fallback || exportRows.length === 0) return;

    downloadCsvFile(`${sanitizeFilename(fallback.customerName)}-history.csv`, [
      [
        'Player ID',
        'Player name',
        'Phone',
        'Age',
        'Package',
        'Cycle',
        'Type',
        'Start date',
        'End date',
        'Total JOD',
        'Collected JOD',
        'Remaining JOD',
        'Status',
        'Archived at',
      ],
      ...exportRows.map((row) => [
        row.playerCode,
        row.playerName,
        row.phone,
        row.age,
        row.packageName,
        row.cycle,
        row.type,
        row.startDate,
        row.endDate,
        row.totalJod,
        row.collectedJod,
        row.remainingJod,
        row.status,
        row.archivedAt,
      ]),
    ]);
  }

  function exportPlayerHistoryPdf() {
    const fallback = allRegistrations[0] || registrations[0];
    if (!fallback || exportRows.length === 0) return;

    const totals = exportRows.reduce(
      (running, row) => ({
        total: running.total + (Number(row.totalJod) || 0),
        collected: running.collected + (Number(row.collectedJod) || 0),
        remaining: running.remaining + (Number(row.remainingJod) || 0),
      }),
      { total: 0, collected: 0, remaining: 0 },
    );
    const printedAt = new Date().toLocaleString();
    const doc = window.open('', '_blank');
    if (!doc) {
      alert('Please allow pop-ups to export the player history PDF.');
      return;
    }

    doc.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(fallback.customerName)} history</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { font-size: 22px; margin: 0 0 6px; }
            .muted { color: #6b7280; font-size: 12px; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 18px 0; }
            .summary div { border: 1px solid #d1d5db; padding: 8px; border-radius: 6px; }
            .summary span { display: block; color: #6b7280; font-size: 11px; margin-bottom: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #d1d5db; padding: 7px; text-align: left; vertical-align: top; }
            th { background: #f3f4f6; font-weight: 700; }
            @media print { body { margin: 18mm; } }
          </style>
        </head>
        <body>
          <h1>Player History</h1>
          <div class="muted">
            ${escapeHtml(fallback.customerName)}
            ${fallback.playerCode ? ` - ${escapeHtml(fallback.playerCode)}` : ''}
            ${fallback.customerAge == null ? '' : ` - Age ${escapeHtml(fallback.customerAge)}`}
            ${fallback.customerPhone ? ` - ${escapeHtml(fallback.customerPhone)}` : ''}
          </div>
          <div class="muted">Exported ${escapeHtml(printedAt)}</div>
          <div class="summary">
            <div><span>Cycles</span>${exportRows.length}</div>
            <div><span>Total</span>${totals.total} JOD</div>
            <div><span>Collected</span>${totals.collected} JOD</div>
            <div><span>Remaining</span>${totals.remaining} JOD</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Package</th>
                <th>Cycle</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Total</th>
                <th>Collected</th>
                <th>Remaining</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${exportRows
                .map((row) => `
                  <tr>
                    <td>${escapeHtml(row.packageName)}</td>
                    <td>${escapeHtml(row.cycle)}</td>
                    <td>${escapeHtml(row.type)}</td>
                    <td>${escapeHtml(row.startDate)}</td>
                    <td>${escapeHtml(row.endDate)}</td>
                    <td>${escapeHtml(row.totalJod)} JOD</td>
                    <td>${escapeHtml(row.collectedJod)} JOD</td>
                    <td>${escapeHtml(row.remainingJod)} JOD</td>
                    <td>${escapeHtml(row.status)}</td>
                  </tr>
                `)
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    doc.document.close();
    doc.focus();
    setTimeout(() => doc.print(), 250);
  }

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
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loadingHistory || timeline.length === 0}
              onClick={exportPlayerHistoryPdf}
            >
              PDF
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={loadingHistory || timeline.length === 0}
              onClick={exportPlayerHistoryCsv}
            >
              CSV
            </Button>
            <Badge variant="neutral">{timeline.length} cycle{timeline.length === 1 ? '' : 's'}</Badge>
          </div>
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
                    <Button size="sm" variant="secondary" onClick={() => startEditingCycle(cycle)}>
                      Edit
                    </Button>
                    {!cycle.isCurrent && cycle.history ? (
                      <>
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
                      {editingMode === 'history' ? (
                        <>
                          <Input label="Start" type="date" value={editForm.periodStartsAt} onChange={(e) => setEditForm({ ...editForm, periodStartsAt: e.target.value, paymentPeriodKey: e.target.value.slice(0, 7) })} />
                          <Input label="End" type="date" value={editForm.periodEndsAt} onChange={(e) => setEditForm({ ...editForm, periodEndsAt: e.target.value })} />
                          <Input label="Months" type="number" min={1} value={editForm.durationMonths} onChange={(e) => setEditForm({ ...editForm, durationMonths: e.target.value })} />
                          <Input label="Sessions" type="number" min={0} value={editForm.sessionsLeft} onChange={(e) => setEditForm({ ...editForm, sessionsLeft: e.target.value })} />
                        </>
                      ) : null}
                      <Input label={editingMode === 'current' ? 'Total price' : 'Price'} type="number" min={0} value={editForm.basePriceJod} onChange={(e) => setEditForm({ ...editForm, basePriceJod: e.target.value })} />
                      <Input label={editingMode === 'current' ? 'Collected' : 'Paid'} type="number" min={0} value={editForm.amountPaid} onChange={(e) => setEditForm({ ...editForm, amountPaid: e.target.value })} />
                      <Select label="Method" value={editForm.paymentMethod} onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}>
                        {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                      </Select>
                      <Input label="Paid month" type="month" value={editForm.paymentPeriodKey} onChange={(e) => setEditForm({ ...editForm, paymentPeriodKey: e.target.value })} />
                      <Input label="Private note" value={editForm.privateNote} onChange={(e) => setEditForm({ ...editForm, privateNote: e.target.value })} />
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <Button type="button" size="sm" variant="secondary" onClick={() => { setEditingHistoryId(null); setEditingMode(null); setEditForm(null); }}>
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        isLoading={editLoading}
                        onClick={() => {
                          if (editingMode === 'current') {
                            void saveEditingCurrent(cycle.registration);
                          } else {
                            void saveEditingOldMonth();
                          }
                        }}
                      >
                        {editingMode === 'current' ? 'Save payment' : 'Save old month'}
                      </Button>
                    </div>
                  </div>
                ) : null}
                <div className="mt-2 grid gap-2 text-xs text-ui-textMuted sm:grid-cols-3">
                  <span>Total: <strong className="text-ui-textPrimary">{cycle.totalJod ?? '-'} JOD</strong></span>
                  <span>Collected: <strong className="text-ui-textPrimary">{cycle.collectedJod ?? '-'} JOD</strong></span>
                  <span>Remaining: <strong className="text-ui-textPrimary">{cycle.remainingJod ?? '-'} JOD</strong></span>
                  {cycle.isCurrent ? (
                    <span>Weekly: <strong className="text-ui-textPrimary">{cycle.registration.sessionsPerWeek ?? 'Package default'}</strong></span>
                  ) : null}
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

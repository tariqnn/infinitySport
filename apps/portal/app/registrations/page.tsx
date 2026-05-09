'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader, Card, CardHeader, CardBody, Badge, Select, Input, Button } from '../_components/ui';
import { packageRegistrationsApi, packageSessionCanceledApi, packagesApi, type PackageOption, type PackageRegistrationRow } from '../../lib/portalApi';
import { ExportCsvButton } from '../_components/ActionButtons';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { PlusCircleIcon, EllipsisVerticalIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { MarkAsPaidModal } from './_components/MarkAsPaidModal';
import { ViewReceiptsModal } from './_components/ViewReceiptsModal';
import { BulkAddPeopleModal } from './_components/BulkAddPeopleModal';
import { IncreaseSessionModal } from './_components/IncreaseSessionModal';
import { AddPointsModal } from './_components/AddPointsModal';
import { RegistrationTotalsPanel } from './_components/RegistrationTotalsPanel';
import { CancelSessionDayModal } from './_components/CancelSessionDayModal';
import { AddRegistrationModal, type InitialPerson } from './_components/AddRegistrationModal';
import { RegistrationDetailsModal } from './_components/RegistrationDetailsModal';
import { RegisterInAnotherPackageModal } from './_components/RegisterInAnotherPackageModal';
import { RegisterExistingPersonModal } from './_components/RegisterExistingPersonModal';
import { RegisterPersonMultiPackageModal } from './_components/RegisterPersonMultiPackageModal';
import { PersonDetailsModal } from './_components/PersonDetailsModal';
import { EditRegistrationModal } from './_components/EditRegistrationModal';
import { ReRegisterModal } from './_components/ReRegisterModal';
import { CreateTrackerAccountModal } from './_components/CreateTrackerAccountModal';
import { CreatePlayerAccountModal } from './_components/CreatePlayerAccountModal';
import { ManagePackageSessionsModal } from './_components/ManagePackageSessionsModal';

type Registration = PackageRegistrationRow;

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageFilter, setPackageFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingUnpaidId, setMarkingUnpaidId] = useState<string | null>(null);
  const [canceledDatesByPackage, setCanceledDatesByPackage] = useState<Record<string, Set<string>>>({});

  const [markPaidRegistration, setMarkPaidRegistration] = useState<Registration | null>(null);
  const [viewReceiptsRegistration, setViewReceiptsRegistration] = useState<Registration | null>(null);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [increaseSessionRegistration, setIncreaseSessionRegistration] = useState<Registration | null>(null);
  const [addPointsRegistration, setAddPointsRegistration] = useState<Registration | null>(null);
  const [cancelSessionDayOpen, setCancelSessionDayOpen] = useState(false);
  const [addRegistrationOpen, setAddRegistrationOpen] = useState(false);
  const [managePackageSessionsOpen, setManagePackageSessionsOpen] = useState(false);
  const [detailsModalRow, setDetailsModalRow] = useState<Registration | null>(null);
  const [editRegistrationRow, setEditRegistrationRow] = useState<Registration | null>(null);
  const [reRegisterRow, setReRegisterRow] = useState<Registration | null>(null);
  const [registerInAnotherPackageRow, setRegisterInAnotherPackageRow] = useState<Registration | null>(null);
  const [registerExistingPersonOpen, setRegisterExistingPersonOpen] = useState(false);
  const [addRegistrationInitialPerson, setAddRegistrationInitialPerson] = useState<InitialPerson | null>(null);
  const [personDetailsPhone, setPersonDetailsPhone] = useState<string | null>(null);
  const [registerPersonMultiOpen, setRegisterPersonMultiOpen] = useState(false);
  const [registerPersonMultiInitialPerson, setRegisterPersonMultiInitialPerson] = useState<InitialPerson | null>(null);
  const [bulkCreatedCount, setBulkCreatedCount] = useState<number | null>(null);
  const [apiPackages, setApiPackages] = useState<PackageOption[]>([]);
  const [trackerAccountRegistrations, setTrackerAccountRegistrations] = useState<Registration[]>([]);
  const [trackerAccountInitialRole, setTrackerAccountInitialRole] = useState<'parent' | 'coach'>('parent');
  const [trackerCoachOnlyOpen, setTrackerCoachOnlyOpen] = useState(false);
  const [playerAccountRegistration, setPlayerAccountRegistration] = useState<Registration | null>(null);

  /**
   * Package schedule catalog.
   * Source-of-truth for days/sessions is the public landing page (apps/web sports cards).
   * We duplicate a minimal mapping here so "days remaining" decreases by each scheduled session day.
   */
  function getPackageSchedule(packageName: string): { daysOfWeek: number[] } | null {
    const name = (packageName ?? '').trim();
    if (!name) return null;
    const baseName = name.replace(/\s*-\s*\d+\s+Months?$/i, '').trim();

    // Basketball academy packages (12 sessions; scheduled on Sat/Mon/Wed/Fri)
    if (baseName.startsWith('Basketball - ')) {
      if (baseName.includes('Private') || baseName.includes('Small Groups')) return null; // flexible scheduling
      return { daysOfWeek: [6, 1, 3, 5] }; // Sat, Mon, Wed, Fri
    }

    // Gymnastics (sessions per month & days shown on landing)
    if (baseName === 'Gymnastics Package A') return { daysOfWeek: [0, 2, 4] }; // Sun, Tue, Thu
    // Package B is "2 Days / Week" (landing shows Sun • Tue • Thu time window); we count 2 weekly session-days.
    if (baseName === 'Gymnastics Package B') return { daysOfWeek: [0, 2] }; // Sun, Tue
    if (baseName === 'Gymnastics Package C') return { daysOfWeek: [0, 2, 4] };
    // Package D is "2 Days / Week" (landing shows Sun • Tue • Thu time window); we count 2 weekly session-days.
    if (baseName === 'Gymnastics Package D') return { daysOfWeek: [0, 2] }; // Sun, Tue

    // Volleyball (10 sessions; Sat, Tue, Sun)
    if (baseName.includes('Gymnastics')) {
      if (baseName.includes('Private')) return null;
      return { daysOfWeek: [0, 2, 4] };
    }

    if (baseName.startsWith('Volleyball')) return { daysOfWeek: [6, 2, 0] }; // Sat, Tue, Sun

    return null;
  }

  function normalizeDate(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }

  function addDays(d: Date, days: number) {
    const x = new Date(d);
    x.setDate(x.getDate() + days);
    return x;
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

  function getTrackerLinkedRegistrations(target: Registration): Registration[] {
    const targetEmail = normalizeEmail(target.customerEmail);
    const targetPhone = normalizePhoneDigits(target.customerPhone);

    const related = rows.filter((row) => {
      const sameEmail = targetEmail && normalizeEmail(row.customerEmail) === targetEmail;
      const samePhone = targetPhone && phoneLooksSame(row.customerPhone, target.customerPhone);
      return Boolean(sameEmail || samePhone);
    });

    return related.length > 0 ? related : [target];
  }

  /**
   * Count how many scheduled session-days occurred between start..end (inclusive),
   * using only day-of-week (time-of-day not tracked).
   */
  function countScheduledSessions(start: Date, end: Date, daysOfWeek: number[]) {
    const s = normalizeDate(start);
    const e = normalizeDate(end);
    if (e.getTime() < s.getTime()) return 0;
    const daySet = new Set(daysOfWeek);
    let count = 0;
    for (let d = new Date(s); d.getTime() <= e.getTime(); d = addDays(d, 1)) {
      if (daySet.has(d.getDay())) count += 1;
    }
    return count;
  }

  /** Effective period end: periodEndsAt if set, else cycle start + durationMonths. */
  function getPeriodEnd(r: Registration): Date | null {
    if (r.periodEndsAt) return new Date(r.periodEndsAt);
    const cycleStart = r.periodStartsAt || r.createdAt;
    if (cycleStart) {
      const d = new Date(cycleStart);
      d.setMonth(d.getMonth() + Math.max(1, Number(r.durationMonths ?? 1) || 1));
      return d;
    }
    return null;
  }

  function getCycleStart(r: Registration): Date | null {
    if (r.periodStartsAt) return new Date(r.periodStartsAt);
    if (r.createdAt) return new Date(r.createdAt);
    return null;
  }

  /** Days remaining (positive) or 0 if expired. Returns null if frozen (countdown paused). */
  function getDaysRemaining(r: Registration): number | null {
    if (r.isFrozen) return null;
    const end = getPeriodEnd(r);
    if (!end) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(0, diff);
  }

  /**
   * Sessions remaining (based on scheduled package days).
   * Canceled session days do NOT decrement. Manual +1 (sessionsBonus) is added to remaining.
   */
  function getSessionsRemaining(r: Registration): { remaining: number; total: number; used: number } | null {
    const schedule = getPackageSchedule(r.packageName);
    const baseSessions =
      r.sessionsLeft != null
        ? Math.max(0, Number(r.sessionsLeft) || 0)
        : Math.max(0, Number(defaultSessionsByPackage[r.packageName] ?? 0) || 0);
    if (!baseSessions) return null;
    const start = getCycleStart(r);
    const end = getPeriodEnd(r);
    if (!start || !end) return null;

    const effectiveNow =
      r.isFrozen && r.frozenAt ? new Date(r.frozenAt) : new Date();
    const cappedEnd =
      effectiveNow.getTime() < end.getTime() ? effectiveNow : end;

    const scheduledCount = schedule ? countScheduledSessions(start, cappedEnd, schedule.daysOfWeek) : 0;
    const canceledSet = canceledDatesByPackage[r.packageName];
    let canceledInRange = 0;
    if (canceledSet && schedule) {
      for (let d = new Date(start); d.getTime() <= cappedEnd.getTime(); d = addDays(d, 1)) {
        const key = d.toISOString().split('T')[0];
        if (canceledSet.has(key)) canceledInRange += 1;
      }
    }
    const bonus = Number(r.sessionsBonus) || 0;
    const total = Math.max(0, baseSessions + bonus);
    const manualUsed =
      r.sessionsUsedOverride == null
        ? null
        : Math.max(0, Math.round(Number(r.sessionsUsedOverride) || 0));
    const used = Math.min(
      total,
      manualUsed ?? (schedule ? Math.max(0, scheduledCount - canceledInRange) : 0),
    );
    const remaining = Math.max(0, total - used);
    return { remaining, total, used };
  }

  const dateFilters = useMemo(() => {
    let out: { startDate?: string; endDate?: string } = {};
    if (dateRange !== 'all') {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (dateRange === 'custom') {
        out = { startDate: customStartDate || undefined, endDate: customEndDate || undefined };
      } else {
        const start = new Date();
        if (dateRange === '1week') start.setDate(today.getDate() - 7);
        else if (dateRange === '1month') start.setMonth(today.getMonth() - 1);
        else if (dateRange === '3months') start.setMonth(today.getMonth() - 3);
        else if (dateRange === '6months') start.setMonth(today.getMonth() - 6);
        else if (dateRange === '1year') start.setFullYear(today.getFullYear() - 1);
        start.setHours(0, 0, 0, 0);
        out = {
          startDate: start.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0],
        };
      }
    }
    return out;
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await packageRegistrationsApi.list(
        packageFilter || undefined,
        dateFilters.startDate,
        dateFilters.endDate,
        searchTerm || undefined,
      );
      setRows(data);

      try {
        const canceledList = await packageSessionCanceledApi.list();
        const byPkg: Record<string, Set<string>> = {};
        for (const c of canceledList) {
          if (!byPkg[c.packageName]) byPkg[c.packageName] = new Set();
          byPkg[c.packageName].add(c.sessionDate);
        }
        setCanceledDatesByPackage(byPkg);
      } catch {
        setCanceledDatesByPackage({});
      }
    } catch (e) {
      console.error('Failed to load registrations', e);
    } finally {
      setLoading(false);
    }
  }, [packageFilter, dateFilters, searchTerm]);

  useEffect(() => {
    load();
  }, [load]);

  const loadPackages = useCallback(async () => {
    try {
      const packages = await packagesApi.list();
      setApiPackages(packages);
    } catch {
      setApiPackages([]);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    if (bulkCreatedCount == null) return;
    const t = setTimeout(() => setBulkCreatedCount(null), 4000);
    return () => clearTimeout(t);
  }, [bulkCreatedCount]);

  async function toggleFreeze(r: Registration) {
    if (freezingId) return;
    setFreezingId(r.id);
    try {
      const updated = await packageRegistrationsApi.update(r.id, { isFrozen: !r.isFrozen });
      setRows((prev) =>
        prev.map((x) =>
          x.id === r.id
            ? {
                ...x,
                isFrozen: updated.isFrozen,
                frozenAt: updated.frozenAt ?? null,
                periodEndsAt: updated.periodEndsAt ?? null,
              }
            : x
        )
      );
    } catch (e) {
      console.error('Failed to toggle freeze', e);
    } finally {
      setFreezingId(null);
    }
  }

  async function handleDelete(r: Registration) {
    if (!confirm(`Are you sure you want to delete the registration for ${r.customerName}?`)) {
      return;
    }
    if (deletingId) return;
    setDeletingId(r.id);
    try {
      await packageRegistrationsApi.delete(r.id);
      setRows((prev) => prev.filter((x) => x.id !== r.id));
    } catch (e) {
      console.error('Failed to delete registration', e);
      alert('Failed to delete registration. Please try again.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMarkUnpaid(r: Registration) {
    if (markingUnpaidId) return;
    if (!confirm(`Mark ${r.customerName} as unpaid? Only the active receipts for the current cycle will be voided. This cannot be undone.`)) return;
    setMarkingUnpaidId(r.id);
    try {
      await packageRegistrationsApi.markUnpaid(r.id);
      load();
    } catch (e) {
      console.error('Failed to mark as unpaid', e);
      alert('Failed to mark as unpaid. Please try again.');
    } finally {
      setMarkingUnpaidId(null);
    }
  }

  function getPaymentStatus(row: Registration): 'PAID' | 'PARTIAL' | 'UNPAID' {
    const collected = row.collected ?? 0;
    const finalPrice = row.finalPriceJod ?? 0;
    if (row.isPaid || (finalPrice <= 0 && collected > 0) || (finalPrice > 0 && collected >= finalPrice)) return 'PAID';
    if (collected > 0) return 'PARTIAL';
    return 'UNPAID';
  }

  function renderRemainingShort(row: Registration) {
    if (row.isFrozen) return <Badge variant="neutral">Frozen</Badge>;
    const end = getPeriodEnd(row);
    const sessions = getSessionsRemaining(row);
    if (sessions) {
      if (sessions.remaining <= 0) return <Badge variant="danger">No sessions</Badge>;
      return (
        <span className="text-sm text-ui-textPrimary">
          <strong>{sessions.remaining}</strong>/{sessions.total}
          {end && <span className="block text-xs text-ui-textMuted">Ends {new Date(end).toLocaleDateString()}</span>}
        </span>
      );
    }
    const days = getDaysRemaining(row);
    if (days === null) return <span className="text-ui-textMuted">—</span>;
    if (days === 0) return <Badge variant="danger">Expired</Badge>;
    return (
      <span className="text-sm text-ui-textPrimary">
        <strong>{days}</strong> day{days !== 1 ? 's' : ''}
        {end && <span className="block text-xs text-ui-textMuted">Ends {new Date(end).toLocaleDateString()}</span>}
      </span>
    );
  }

  // Package list: from API when available, else from rows (so filter dropdown and modals have full list)
  const packageOpts = Array.from(
    new Set([
      ...apiPackages.map((p) => p.name),
      ...rows.map((r) => r.packageName),
      packageFilter,
    ].filter(Boolean)),
  ).sort();
  // Default price per package (from Package.currentPriceJod) for modals
  const defaultPricesByPackage: Record<string, number> = Object.fromEntries(
    apiPackages.filter((p) => p.currentPriceJod != null).map((p) => [p.name, p.currentPriceJod as number]),
  );
  const defaultSessionsByPackage: Record<string, number> = Object.fromEntries(
    apiPackages
      .filter((p) => Number.isFinite(p.sessionsCount) && p.sessionsCount > 0)
      .map((p) => [p.name, p.sessionsCount]),
  );
  const defaultDurationMonthsByPackage: Record<string, number> = Object.fromEntries(
    apiPackages.map((p) => [p.name, Math.max(1, Number(p.durationMonths ?? 1) || 1)]),
  );
  const editRegistrationSessionSummary = useMemo(
    () => (editRegistrationRow ? getSessionsRemaining(editRegistrationRow) : null),
    [editRegistrationRow, canceledDatesByPackage, defaultSessionsByPackage],
  );

  if (loading && rows.length === 0) {
    return <div className="py-12 text-center text-ui-textMuted">Loading registrations...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Registrations"
        subtitle="Registrations from Basketball, Gymnastics, and Volleyball packages"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setManagePackageSessionsOpen(true)}
            >
              Manage packages
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTrackerCoachOnlyOpen(true)}
              className="text-indigo-700 border-indigo-200 hover:bg-indigo-50"
            >
              Create coach account for Infinity Tracker
            </Button>
            <Button
              variant="secondary"
              onClick={load}
              isLoading={loading}
              disabled={loading}
              leadingIcon={!loading ? <ArrowPathIcon className="h-4 w-4" /> : undefined}
            >
              Refresh
            </Button>
          </div>
        }
      />

      <RegistrationTotalsPanel
        packageName={packageFilter || undefined}
        startDate={dateFilters.startDate}
        endDate={dateFilters.endDate}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">
              Registrations
              <span className="ml-2 rounded-full bg-brand-blue-primary/10 px-2.5 py-0.5 text-sm font-semibold text-brand-blue-primary">
                {loading ? '…' : rows.length}
              </span>
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-textMuted">Package:</label>
                <Select
                  value={packageFilter}
                  onChange={(e) => setPackageFilter(e.target.value)}
                  className="min-w-[150px]"
                >
                  <option value="">All packages</option>
                  {packageOpts.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="min-w-[150px]"
                >
                  <option value="all">All Time</option>
                  <option value="1week">Last 7 Days</option>
                  <option value="1month">Last Month</option>
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="custom">Custom Range</option>
                </Select>
                {dateRange === 'custom' && (
                  <>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      placeholder="Start Date"
                      className="min-w-[140px]"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      placeholder="End Date"
                      className="min-w-[140px]"
                    />
                  </>
                )}
              </div>
              <div className="min-w-[280px] flex-1">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by player ID, name, phone, or email"
                  className="w-full"
                />
              </div>
              <Button variant="secondary" onClick={() => setCancelSessionDayOpen(true)} className="inline-flex items-center gap-1">
                Record canceled day
              </Button>
              <Button variant="secondary" onClick={() => setAddRegistrationOpen(true)} className="inline-flex items-center gap-1">
                Add person
              </Button>
              <Button variant="secondary" onClick={() => { setRegisterPersonMultiInitialPerson(null); setRegisterPersonMultiOpen(true); }} className="inline-flex items-center gap-1">
                Register existing person
              </Button>
              <Button variant="primary" onClick={() => setBulkAddOpen(true)} className="inline-flex items-center gap-1">
                <PlusCircleIcon className="h-4 w-4" />
                Add Multiple People
              </Button>
              <ExportCsvButton
                rows={rows.map(r => {
                  const createdAt = new Date(r.createdAt);
                  const updatedAt = new Date(r.updatedAt);
                  
                  // Format dates for Excel compatibility (MM/DD/YYYY format)
                  const formatDateForExcel = (date: Date) => {
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const year = date.getFullYear();
                    return `${month}/${day}/${year}`;
                  };
                  
                  // Format time for Excel (HH:MM:SS)
                  const formatTimeForExcel = (date: Date) => {
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = String(date.getSeconds()).padStart(2, '0');
                    return `${hours}:${minutes}:${seconds}`;
                  };
                  
                  // Format date-time for Excel (MM/DD/YYYY HH:MM:SS)
                  const formatDateTimeForExcel = (date: Date) => {
                    return `${formatDateForExcel(date)} ${formatTimeForExcel(date)}`;
                  };
                  
                  const periodStart = r.periodStartsAt ? new Date(r.periodStartsAt) : null;
                  const periodEnd = r.periodEndsAt ? new Date(r.periodEndsAt) : null;
                  const sessions = getSessionsRemaining(r as Registration);
                  const daysRemaining = getDaysRemaining(r as Registration);

                  const remainingType = r.isFrozen
                    ? 'FROZEN'
                    : sessions
                      ? 'SESSIONS'
                      : daysRemaining != null
                        ? 'DAYS'
                        : 'UNKNOWN';

                  const remainingDisplay = (() => {
                    if (r.isFrozen) return 'Frozen';
                    if (sessions) {
                      if (sessions.remaining <= 0) return 'No sessions left';
                      return `${sessions.remaining}/${sessions.total} sessions`;
                    }
                    if (daysRemaining != null) {
                      return daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`;
                    }
                    return '';
                  })();
                  const collected = r.collected ?? 0;
                  const finalPrice = r.finalPriceJod ?? 0;
                  const paymentStatus = getPaymentStatus(r);
                  return {
                    packageName: r.packageName || '',
                    customerName: r.customerName || '',
                    customerPhone: r.customerPhone || '',
                    customerEmail: r.customerEmail || '',
                    customerAge: r.customerAge ? String(r.customerAge) : '',
                    playerCode: r.playerCode || '',
                    currentCycle: String(r.currentCycle ?? 1),
                    durationMonths: String(r.durationMonths ?? 1),
                    basePriceJod: String(r.basePriceJod ?? 0),
                    finalPriceJod: String(finalPrice),
                    collectedJod: String(collected),
                    paymentStatus,
                    isPaid: r.isPaid ? 'Yes' : 'No',
                    periodStartsAt: periodStart ? formatDateForExcel(periodStart) : '',
                    periodEndsAt: periodEnd ? formatDateTimeForExcel(periodEnd) : '',
                    remainingType,
                    sessionsTotal: sessions ? String(sessions.total) : '',
                    sessionsUsed: sessions ? String(sessions.used) : '',
                    sessionsRemaining: sessions ? String(sessions.remaining) : '',
                    daysRemaining: daysRemaining != null ? String(daysRemaining) : '',
                    remainingDisplay,
                    isFrozen: r.isFrozen ? 'Yes' : 'No',
                    registeredDate: formatDateForExcel(createdAt),
                    registeredTime: formatTimeForExcel(createdAt),
                    registeredDateTime: formatDateTimeForExcel(createdAt),
                    lastUpdated: formatDateTimeForExcel(updatedAt),
                  };
                })}
                columns={[
                  'packageName',
                  'customerName',
                  'customerPhone',
                  'customerEmail',
                  'customerAge',
                  'playerCode',
                  'currentCycle',
                  'durationMonths',
                  'basePriceJod',
                  'finalPriceJod',
                  'collectedJod',
                  'paymentStatus',
                  'isPaid',
                  'periodStartsAt',
                  'periodEndsAt',
                  'remainingType',
                  'sessionsTotal',
                  'sessionsUsed',
                  'sessionsRemaining',
                  'daysRemaining',
                  'remainingDisplay',
                  'isFrozen',
                  'registeredDate',
                  'registeredTime',
                  'registeredDateTime',
                  'lastUpdated',
                ]}
                filename={(() => {
                  const today = new Date().toISOString().split('T')[0];
                  const packageSlug = packageFilter ? packageFilter.replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 40) : 'all-packages';
                  const rangeSlug = dateRange === 'custom' ? `${customStartDate || 'start'}-to-${customEndDate || 'end'}` : dateRange;
                  return `registrations-${packageSlug}-${rangeSlug}-${today}.csv`;
                })()}
                prefixLines={[
                  `Exported: ${new Date().toLocaleString()} (trace for records)`,
                  `Filter - Package: ${packageFilter || 'All packages'}`,
                  `Filter - Date range: ${dateRange === 'custom' ? `${customStartDate || '?'} to ${customEndDate || '?'}` : dateRange === 'all' ? 'All time' : dateRange}`,
                  `Filter - Search: ${searchTerm || 'None'}`,
                  `Total rows: ${rows.length}`,
                ]}
                label="Export to Excel"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <div className="max-h-[65vh] overflow-auto">
            <table className="min-w-[1120px] w-full border-collapse text-left table-fixed" style={{ tableLayout: 'fixed' }}>
              <thead className="sticky top-0 z-10 border-b border-ui-border bg-slate-50 shadow-sm">
                <tr>
                  <th className="w-[18%] min-w-0 px-5 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Package</th>
                  <th className="w-[15%] min-w-0 px-5 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Player</th>
                  <th className="w-[17%] min-w-0 px-5 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Contact</th>
                  <th className="w-[5%] min-w-0 px-4 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Age</th>
                  <th className="w-[8%] min-w-0 px-4 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Price</th>
                  <th className="w-[11%] min-w-0 px-4 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Payment</th>
                  <th className="w-[9%] min-w-0 px-4 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Registered</th>
                  <th className="w-[11%] min-w-0 px-4 py-3 text-sm font-semibold text-ui-textPrimary whitespace-nowrap">Remaining</th>
                  <th className="w-[72px] min-w-[72px] sticky right-0 z-30 border-l border-ui-border bg-slate-50 px-2 py-3 text-center text-sm font-semibold text-ui-textPrimary whitespace-nowrap shadow-[-6px_0_10px_rgba(15,23,42,0.06)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ui-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-ui-textMuted">
                      {loading
                        ? 'Loading registrations...'
                        : searchTerm
                          ? 'No registrations matched that search.'
                          : 'No registrations found for the selected filters.'}
                    </td>
                  </tr>
                ) : rows.map((row) => {
                  const collected = row.collected ?? 0;
                  const paymentStatus = getPaymentStatus(row);
                  return (
                    <tr key={row.id} className="group hover:bg-slate-50/70">
                      <td className="px-5 py-3 min-w-0">
                        <span className="block truncate font-semibold text-ui-textPrimary" title={row.packageName}>{row.packageName}</span>
                      </td>
                      <td className="px-5 py-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => setPersonDetailsPhone(row.customerPhone)}
                          className="block truncate text-left w-full text-ui-textPrimary hover:text-brand-blue-primary hover:underline font-medium"
                          title={`View all registrations for ${row.customerName}`}
                        >
                          {row.customerName}
                        </button>
                        <span className="block truncate text-xs text-ui-textMuted">
                          {row.playerCode ? `ID ${row.playerCode}` : 'ID pending'}
                          {` - Cycle ${row.currentCycle ?? 1}`}
                        </span>
                      </td>
                      <td className="px-5 py-3 min-w-0">
                        <span className="block truncate text-sm text-ui-textPrimary" title={row.customerEmail ? `${row.customerPhone} | ${row.customerEmail}` : row.customerPhone}>{row.customerPhone}</span>
                        {row.customerEmail && <span className="block truncate text-xs text-ui-textMuted" title={row.customerEmail}>{row.customerEmail}</span>}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-ui-textPrimary">{row.customerAge ? `${row.customerAge} y` : '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-ui-textPrimary">{row.finalPriceJod ?? 0} JOD</td>
                      <td className="px-4 py-3 min-w-0">
                        <div className="flex flex-col gap-0.5">
                          <Badge
                            variant={paymentStatus === 'PAID' ? 'success' : paymentStatus === 'PARTIAL' ? 'warning' : 'danger'}
                            className="w-fit px-2.5 py-1 text-xs"
                          >
                            {paymentStatus === 'PAID' ? 'Paid' : paymentStatus === 'PARTIAL' ? 'Partial' : 'Unpaid'}
                          </Badge>
                          {collected > 0 && <span className="text-xs text-ui-textMuted">{collected} JOD</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 min-w-0 whitespace-nowrap text-sm text-ui-textPrimary">
                        <span className="block">
                          {row.periodStartsAt ? new Date(row.periodStartsAt).toLocaleDateString() : new Date(row.createdAt).toLocaleDateString()}
                        </span>
                        {row.periodStartsAt && row.periodStartsAt.slice(0, 10) !== row.createdAt.slice(0, 10) ? (
                          <span className="block text-xs text-ui-textMuted">
                            Created {new Date(row.createdAt).toLocaleDateString()}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 min-w-0">{renderRemainingShort(row)}</td>
                      <td className="sticky right-0 z-20 w-[72px] min-w-[72px] border-l border-ui-border bg-white px-2 py-3 text-center shadow-[-6px_0_10px_rgba(15,23,42,0.04)] group-hover:bg-slate-50">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ui-textMuted outline-none transition hover:bg-white hover:text-ui-textPrimary focus-visible:ring-2 focus-visible:ring-brand-blue-primary/40" aria-label={`Actions for ${row.customerName}`}>
                              <EllipsisVerticalIcon className="h-5 w-5" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              align="end"
                              side="bottom"
                              sideOffset={8}
                              avoidCollisions
                              collisionPadding={12}
                              className="z-[60] min-w-[14rem] rounded-lg border border-ui-border bg-white py-1 shadow-lg focus:outline-none"
                            >
                              {paymentStatus !== 'PAID' && (
                                <DropdownMenu.Item
                                  className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                  onSelect={() => setMarkPaidRegistration(row)}
                                >
                                  {paymentStatus === 'PARTIAL' ? 'Add payment' : 'Mark as Paid'}
                                </DropdownMenu.Item>
                              )}
                              {(paymentStatus === 'PAID' || collected > 0) && (
                                <DropdownMenu.Item
                                  className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                  onSelect={() => setViewReceiptsRegistration(row)}
                                >
                                  View Receipt(s)
                                </DropdownMenu.Item>
                              )}
                              {(paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') && (
                                <DropdownMenu.Item
                                  className="cursor-pointer px-4 py-2 text-sm text-amber-700 outline-none hover:bg-amber-50 data-[highlighted]:bg-amber-50 disabled:opacity-50"
                                  onSelect={() => handleMarkUnpaid(row)}
                                  disabled={markingUnpaidId === row.id}
                                >
                                  {markingUnpaidId === row.id ? 'Marking unpaid…' : 'Mark as Unpaid'}
                                </DropdownMenu.Item>
                              )}
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg disabled:opacity-50"
                                onSelect={() => toggleFreeze(row)}
                                disabled={freezingId === row.id}
                              >
                                {row.isFrozen ? 'Unfreeze' : 'Freeze'}
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => setIncreaseSessionRegistration(row)}
                              >
                                +1 Session
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => setAddPointsRegistration(row)}
                              >
                                Add points
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => { setRegisterPersonMultiInitialPerson({ customerName: row.customerName, customerPhone: row.customerPhone, customerEmail: row.customerEmail ?? undefined, customerAge: row.customerAge ?? undefined }); setRegisterPersonMultiOpen(true); }}
                              >
                                Add another package
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => setRegisterInAnotherPackageRow(row)}
                              >
                                Register in one more package
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg disabled:opacity-50"
                                onSelect={() => setReRegisterRow(row)}
                                disabled={reRegisterRow?.id === row.id}
                              >
                                Re-register
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => setDetailsModalRow(row)}
                              >
                                View details
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-ui-textPrimary outline-none hover:bg-ui-softBg data-[highlighted]:bg-ui-softBg"
                                onSelect={() => setEditRegistrationRow(row)}
                              >
                                Edit registration
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-indigo-700 outline-none hover:bg-indigo-50 data-[highlighted]:bg-indigo-50"
                                onSelect={() => {
                                  setTrackerAccountInitialRole('parent');
                                  setTrackerAccountRegistrations(getTrackerLinkedRegistrations(row));
                                }}
                              >
                                Create account for Infinity Tracker
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-violet-700 outline-none hover:bg-violet-50 data-[highlighted]:bg-violet-50"
                                onSelect={() => setPlayerAccountRegistration(row)}
                              >
                                Create player account
                              </DropdownMenu.Item>
                              <DropdownMenu.Item
                                className="cursor-pointer px-4 py-2 text-sm text-red-600 outline-none hover:bg-red-50 data-[highlighted]:bg-red-50 disabled:opacity-50"
                                onSelect={() => handleDelete(row)}
                                disabled={deletingId === row.id}
                              >
                                Delete
                              </DropdownMenu.Item>
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <MarkAsPaidModal
        open={!!markPaidRegistration}
        onClose={() => setMarkPaidRegistration(null)}
        registration={markPaidRegistration}
        onSuccess={() => {
          setMarkPaidRegistration(null);
          load();
        }}
      />

      <ViewReceiptsModal
        open={!!viewReceiptsRegistration}
        onClose={() => setViewReceiptsRegistration(null)}
        registration={viewReceiptsRegistration}
        onViewReceipt={(id) => {
          window.open(`/receipts/${id}`, '_blank', 'noopener,noreferrer');
        }}
        onVoided={() => {
          load();
        }}
      />

      <BulkAddPeopleModal
        open={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        packageOptions={packageOpts}
        defaultPricesByPackage={defaultPricesByPackage}
        onSuccess={() => {
          setBulkAddOpen(false);
          load();
        }}
      />

      {increaseSessionRegistration && (
        <IncreaseSessionModal
          open={true}
          onClose={() => setIncreaseSessionRegistration(null)}
          registration={increaseSessionRegistration}
          onSuccess={() => {
            setIncreaseSessionRegistration(null);
            load();
          }}
        />
      )}

      {addPointsRegistration && (
        <AddPointsModal
          open={true}
          onClose={() => setAddPointsRegistration(null)}
          registration={addPointsRegistration}
          onSuccess={() => {
            setAddPointsRegistration(null);
            load();
          }}
        />
      )}

      <CancelSessionDayModal
        open={cancelSessionDayOpen}
        onClose={() => setCancelSessionDayOpen(false)}
        packageOptions={packageOpts}
        onSuccess={() => {
          setCancelSessionDayOpen(false);
          load();
        }}
      />

      <AddRegistrationModal
        open={addRegistrationOpen}
        onClose={() => {
          setAddRegistrationOpen(false);
          setAddRegistrationInitialPerson(null);
        }}
        onSuccess={() => {
          setAddRegistrationOpen(false);
          setAddRegistrationInitialPerson(null);
          load();
        }}
        packageOptions={packageOpts}
        defaultPricesByPackage={defaultPricesByPackage}
        defaultSessionsByPackage={defaultSessionsByPackage}
        defaultDurationMonthsByPackage={defaultDurationMonthsByPackage}
        initialPerson={addRegistrationInitialPerson}
      />

      <ManagePackageSessionsModal
        open={managePackageSessionsOpen}
        onClose={() => setManagePackageSessionsOpen(false)}
        packages={apiPackages}
        onSaved={() => {
          setManagePackageSessionsOpen(false);
          loadPackages();
          load();
        }}
      />

      <RegistrationDetailsModal
        open={!!detailsModalRow}
        onClose={() => setDetailsModalRow(null)}
        registration={detailsModalRow}
        onEditRegistration={(row) => {
          setDetailsModalRow(null);
          setEditRegistrationRow(row);
        }}
        onViewReceipts={(row) => {
          setDetailsModalRow(null);
          setViewReceiptsRegistration(row);
        }}
      />

      <EditRegistrationModal
        open={!!editRegistrationRow}
        onClose={() => setEditRegistrationRow(null)}
        registration={editRegistrationRow}
        packageOptions={packageOpts}
        defaultPricesByPackage={defaultPricesByPackage}
        defaultSessionsByPackage={defaultSessionsByPackage}
        defaultDurationMonthsByPackage={defaultDurationMonthsByPackage}
        currentSessionSummary={editRegistrationSessionSummary}
        onSuccess={() => {
          setEditRegistrationRow(null);
          load();
        }}
      />

      <ReRegisterModal
        open={!!reRegisterRow}
        onClose={() => setReRegisterRow(null)}
        registration={reRegisterRow}
        onSuccess={() => {
          setReRegisterRow(null);
          load();
        }}
      />

      <RegisterInAnotherPackageModal
        open={!!registerInAnotherPackageRow}
        onClose={() => setRegisterInAnotherPackageRow(null)}
        onSuccess={() => {
          setRegisterInAnotherPackageRow(null);
          load();
        }}
        registration={registerInAnotherPackageRow}
        packageOptions={packageOpts}
        defaultPricesByPackage={defaultPricesByPackage}
        defaultSessionsByPackage={defaultSessionsByPackage}
        defaultDurationMonthsByPackage={defaultDurationMonthsByPackage}
      />

      <RegisterExistingPersonModal
        open={registerExistingPersonOpen}
        onClose={() => setRegisterExistingPersonOpen(false)}
        rows={rows}
        onSelectPerson={(person) => {
          setRegisterExistingPersonOpen(false);
          setAddRegistrationInitialPerson(person);
          setAddRegistrationOpen(true);
        }}
      />

      <PersonDetailsModal
        open={!!personDetailsPhone}
        onClose={() => setPersonDetailsPhone(null)}
        registrations={personDetailsPhone ? rows.filter((r) => r.customerPhone === personDetailsPhone) : []}
        onAddPackages={(person) => {
          setPersonDetailsPhone(null);
          setRegisterPersonMultiInitialPerson(person);
          setRegisterPersonMultiOpen(true);
        }}
        onViewReceipts={(row) => setViewReceiptsRegistration(row)}
        onMarkPaid={(row) => setMarkPaidRegistration(row)}
      />

      <RegisterPersonMultiPackageModal
        open={registerPersonMultiOpen}
        onClose={() => { setRegisterPersonMultiOpen(false); setRegisterPersonMultiInitialPerson(null); }}
        onSuccess={(created) => {
          setBulkCreatedCount(created);
          load();
          setRegisterPersonMultiOpen(false);
          setRegisterPersonMultiInitialPerson(null);
        }}
        rows={rows}
        packageOptions={packageOpts}
        defaultPricesByPackage={defaultPricesByPackage}
        defaultSessionsByPackage={defaultSessionsByPackage}
        initialPerson={registerPersonMultiInitialPerson}
      />

      <CreateTrackerAccountModal
        open={trackerAccountRegistrations.length > 0 || trackerCoachOnlyOpen}
        onClose={() => { setTrackerAccountRegistrations([]); setTrackerCoachOnlyOpen(false); }}
        registrations={trackerCoachOnlyOpen ? [] : trackerAccountRegistrations}
        initialRole={trackerCoachOnlyOpen ? 'coach' : trackerAccountInitialRole}
      />

      <CreatePlayerAccountModal
        open={!!playerAccountRegistration}
        onClose={() => setPlayerAccountRegistration(null)}
        registration={playerAccountRegistration}
      />

      {bulkCreatedCount != null && bulkCreatedCount > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-lg">
          Created {bulkCreatedCount} registration{bulkCreatedCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

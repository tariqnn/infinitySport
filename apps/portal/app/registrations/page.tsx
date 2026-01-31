'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, CardHeader, CardBody, DataTable, Badge, Select, Input } from '../_components/ui';
import { packageRegistrationsApi, type PackageRegistrationRow } from '../../lib/portalApi';
import { ExportCsvButton } from '../_components/ActionButtons';
import { TrashIcon } from '@heroicons/react/24/outline';

type Registration = PackageRegistrationRow;

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageFilter, setPackageFilter] = useState<string>('');
  const [dateRange, setDateRange] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /** Effective period end: periodEndsAt if set, else createdAt + 30 days (for display only). */
  function getPeriodEnd(r: Registration): Date | null {
    if (r.periodEndsAt) return new Date(r.periodEndsAt);
    if (r.createdAt) {
      const d = new Date(r.createdAt);
      d.setDate(d.getDate() + 30);
      return d;
    }
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

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      let dateFilters: { startDate?: string; endDate?: string } = {};
      if (dateRange !== 'all') {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        
        if (dateRange === 'custom') {
          dateFilters = {
            startDate: customStartDate || undefined,
            endDate: customEndDate || undefined,
          };
        } else {
          const start = new Date();
          if (dateRange === '1week') {
            start.setDate(today.getDate() - 7);
          } else if (dateRange === '1month') {
            start.setMonth(today.getMonth() - 1);
          } else if (dateRange === '3months') {
            start.setMonth(today.getMonth() - 3);
          } else if (dateRange === '6months') {
            start.setMonth(today.getMonth() - 6);
          } else if (dateRange === '1year') {
            start.setFullYear(today.getFullYear() - 1);
          }
          start.setHours(0, 0, 0, 0);
          dateFilters = {
            startDate: start.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0],
          };
        }
      }
      
      const data = await packageRegistrationsApi.list(
        packageFilter || undefined,
        dateFilters.startDate,
        dateFilters.endDate
      );
      setRows(data);
    } catch (e) {
      console.error('Failed to load registrations', e);
    } finally {
      setLoading(false);
    }
  }, [packageFilter, dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function togglePaid(r: Registration) {
    if (togglingId) return;
    setTogglingId(r.id);
    try {
      await packageRegistrationsApi.update(r.id, { isPaid: !r.isPaid });
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, isPaid: !x.isPaid } : x)));
    } catch (e) {
      console.error('Failed to update paid status', e);
    } finally {
      setTogglingId(null);
    }
  }

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

  const columns = [
    {
      id: 'packageName',
      header: 'Package',
      render: (row: Registration) => (
        <span className="font-semibold text-ui-textPrimary">{row.packageName}</span>
      ),
    },
    {
      id: 'customerName',
      header: 'Name',
      render: (row: Registration) => <span className="text-ui-textPrimary">{row.customerName}</span>,
    },
    {
      id: 'customerPhone',
      header: 'Phone',
      render: (row: Registration) => <span className="text-ui-textPrimary">{row.customerPhone}</span>,
    },
    {
      id: 'customerEmail',
      header: 'Email',
      render: (row: Registration) => (
        <span className="text-ui-textMuted">{row.customerEmail || '—'}</span>
      ),
    },
    {
      id: 'customerAge',
      header: 'Age',
      render: (row: Registration) => (
        <span className="text-ui-textPrimary">{row.customerAge ? `${row.customerAge} years` : '—'}</span>
      ),
    },
    {
      id: 'isPaid',
      header: 'Paid',
      render: (row: Registration) => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={row.isPaid}
            onChange={() => togglePaid(row)}
            disabled={togglingId === row.id}
            className="h-4 w-4 rounded border-ui-border accent-green-600 focus:ring-brand-primaryBlue"
          />
          <Badge variant={row.isPaid ? 'success' : 'warning'}>
            {row.isPaid ? 'Paid' : 'Unpaid'}
          </Badge>
        </div>
      ),
    },
    {
      id: 'daysLeft',
      header: '30-day period',
      render: (row: Registration) => {
        if (row.isFrozen) {
          return (
            <Badge variant="neutral" className="whitespace-nowrap">
              Frozen
            </Badge>
          );
        }
        const days = getDaysRemaining(row);
        const end = getPeriodEnd(row);
        if (days === null && !end) return <span className="text-ui-textMuted">—</span>;
        if (days !== null) {
          if (days === 0) return <Badge variant="danger">Expired</Badge>;
          return (
            <span className="text-ui-textPrimary">
              <strong>{days}</strong> day{days !== 1 ? 's' : ''} left
            </span>
          );
        }
        return <span className="text-ui-textMuted">—</span>;
      },
    },
    {
      id: 'freeze',
      header: 'Freeze',
      render: (row: Registration) => (
        <button
          type="button"
          onClick={() => toggleFreeze(row)}
          disabled={freezingId === row.id}
          className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
            row.isFrozen
              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
              : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
          }`}
          title={row.isFrozen ? 'Unfreeze (resume countdown)' : 'Freeze (pause 30-day countdown)'}
        >
          {freezingId === row.id ? '…' : row.isFrozen ? 'Unfreeze' : 'Freeze'}
        </button>
      ),
    },
    {
      id: 'createdAt',
      header: 'Registered',
      render: (row: Registration) => (
        <span className="text-ui-textMuted">
          {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: Registration) => (
        <button
          onClick={() => handleDelete(row)}
          disabled={deletingId === row.id}
          className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Delete registration"
        >
          <TrashIcon className="h-4 w-4" />
          {deletingId === row.id ? 'Deleting...' : 'Delete'}
        </button>
      ),
    },
  ];

  // Unique package names for filter dropdown (include current filter so it stays when no rows)
  const packageOpts = Array.from(new Set([...rows.map((r) => r.packageName), packageFilter].filter(Boolean))).sort();

  if (loading && rows.length === 0) {
    return <div className="py-12 text-center text-ui-textMuted">Loading registrations...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Package Registrations"
        subtitle="Registrations from Basketball, Gymnastics, and Volleyball packages"
      />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-semibold text-textPrimary">Registrations</h3>
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
                  
                  const periodEnd = r.periodEndsAt ? new Date(r.periodEndsAt) : null;
                  const daysLeft = r.isFrozen ? 'Frozen' : periodEnd ? (() => {
                    const now = new Date();
                    now.setHours(0, 0, 0, 0);
                    periodEnd.setHours(0, 0, 0, 0);
                    const d = Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                    return d <= 0 ? 'Expired' : `${d} days`;
                  })() : '';
                  return {
                    packageName: r.packageName || '',
                    customerName: r.customerName || '',
                    customerPhone: r.customerPhone || '',
                    customerEmail: r.customerEmail || '',
                    customerAge: r.customerAge ? String(r.customerAge) : '',
                    isPaid: r.isPaid ? 'Yes' : 'No',
                    periodEndsAt: periodEnd ? formatDateTimeForExcel(periodEnd) : '',
                    daysLeft,
                    isFrozen: r.isFrozen ? 'Yes' : 'No',
                    registeredDate: formatDateForExcel(createdAt),
                    registeredTime: formatTimeForExcel(createdAt),
                    registeredDateTime: formatDateTimeForExcel(createdAt),
                    lastUpdated: formatDateTimeForExcel(updatedAt),
                  };
                })}
                columns={['packageName', 'customerName', 'customerPhone', 'customerEmail', 'customerAge', 'isPaid', 'periodEndsAt', 'daysLeft', 'isFrozen', 'registeredDate', 'registeredTime', 'registeredDateTime', 'lastUpdated']}
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
                  `Total rows: ${rows.length}`,
                ]}
                label="Export to Excel"
              />
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={rows} />
        </CardBody>
      </Card>
    </div>
  );
}

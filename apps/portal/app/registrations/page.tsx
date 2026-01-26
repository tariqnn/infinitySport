'use client';

import { useState, useEffect, useCallback } from 'react';
import { PageHeader, Card, CardBody, DataTable, Badge } from '../_components/ui';
import { packageRegistrationsApi } from '../../lib/portalApi';

type Registration = {
  id: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAge: number | null;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [packageFilter, setPackageFilter] = useState<string>('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await packageRegistrationsApi.list(packageFilter || undefined);
      setRows(data);
    } catch (e) {
      console.error('Failed to load registrations', e);
    } finally {
      setLoading(false);
    }
  }, [packageFilter]);

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
      id: 'createdAt',
      header: 'Registered',
      render: (row: Registration) => (
        <span className="text-ui-textMuted">
          {new Date(row.createdAt).toLocaleDateString()} {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
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
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="flex items-center gap-2 text-sm text-ui-textMuted">
              Filter by package:
              <select
                value={packageFilter}
                onChange={(e) => setPackageFilter(e.target.value)}
                className="rounded-lg border border-ui-border bg-white px-3 py-2 text-sm text-ui-textPrimary focus:border-brand-primaryBlue focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
              >
                <option value="">All packages</option>
                {packageOpts.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={rows} />
        </CardBody>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge } from '../_components/ui/Badge';
import { Card, CardBody } from '../_components/ui/Card';
import { DataTable } from '../_components/ui/DataTable';
import { Input } from '../_components/ui/Input';
import { PageHeader } from '../_components/ui/PageHeader';
import { landingCoachesApi } from '../../lib/portalApi';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

type LandingCoachRow = {
  id: string;
  name: string;
  sport: string;
  description: string;
  quote?: string | null;
  achievements: string[];
  order: number;
  isActive: boolean;
};

export default function CoachesPage() {
  const [rows, setRows] = useState<LandingCoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        const data = (await landingCoachesApi.list()) as LandingCoachRow[];
        if (!cancelled) {
          setRows(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to load landing coaches:', error);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !term ||
        row.name.toLowerCase().includes(term) ||
        row.sport.toLowerCase().includes(term) ||
        row.description.toLowerCase().includes(term) ||
        (row.quote || '').toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'visible' && row.isActive) ||
        (statusFilter === 'hidden' && !row.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  const columns = [
    {
      id: 'name',
      header: 'Coach',
      render: (row: LandingCoachRow) => (
        <div className="min-w-[220px]">
          <p className="font-semibold text-ui-textPrimary">{row.name}</p>
          <p className="text-xs text-ui-textMuted">{row.sport}</p>
        </div>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      render: (row: LandingCoachRow) => <span className="text-sm text-ui-textPrimary">{row.description}</span>,
    },
    {
      id: 'quote',
      header: 'Quote',
      render: (row: LandingCoachRow) => (
        <span className="text-sm text-ui-textMuted">{row.quote && row.quote.trim() ? row.quote : '-'}</span>
      ),
    },
    {
      id: 'achievements',
      header: 'Achievements',
      render: (row: LandingCoachRow) => <span className="text-sm text-ui-textPrimary">{row.achievements.length}</span>,
    },
    {
      id: 'order',
      header: 'Order',
      render: (row: LandingCoachRow) => <span className="text-sm text-ui-textPrimary">{row.order}</span>,
    },
    {
      id: 'visibility',
      header: 'Visibility',
      render: (row: LandingCoachRow) => (
        <Badge variant={row.isActive ? 'success' : 'neutral'}>{row.isActive ? 'Visible' : 'Hidden'}</Badge>
      ),
    },
  ];

  if (loading) {
    return <div className="py-12 text-center text-ui-textMuted">Loading coaches...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaches"
        subtitle="Synced from Admin landing coaches. No images are shown here, only coach details."
      />

      <Card>
        <CardBody>
          <div className="grid gap-3 md:grid-cols-[1fr,220px]">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-textMuted" />
              <Input
                placeholder="Search by name, sport, description, or quote"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | 'visible' | 'hidden')}
              className="h-10 rounded-lg border border-ui-border bg-white px-3 text-sm text-ui-textPrimary focus:border-brand-primaryBlue/30 focus:outline-none"
            >
              <option value="all">All visibility</option>
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredRows} />
        </CardBody>
      </Card>
    </div>
  );
}

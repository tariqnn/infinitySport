'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, DataTable, Badge, Button, Input } from '../_components/ui';
import { coachesApi, classesApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CreateCoachModal } from './_components/CreateCoachModal';
import { EditCoachModal } from './_components/EditCoachModal';

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCoach, setEditingCoach] = useState<any | null>(null);
  const [coachClasses, setCoachClasses] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCoaches();
  }, [coaches, searchTerm, statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const [coachesData, classesData] = await Promise.all([
        coachesApi.list(company?.id),
        classesApi.list(company?.id),
      ]);
      setCoaches(coachesData);

      // Count classes per coach
      const counts: Record<string, number> = {};
      classesData.forEach((c: any) => {
        if (c.coachId) {
          counts[c.coachId] = (counts[c.coachId] || 0) + 1;
        }
      });
      setCoachClasses(counts);
    } catch (error) {
      console.error('Failed to load coaches:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterCoaches() {
    let filtered = [...coaches];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName?.toLowerCase().includes(term) ||
          c.lastName?.toLowerCase().includes(term) ||
          c.email?.toLowerCase().includes(term) ||
          c.specialty?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    setFilteredCoaches(filtered);
  }

  const columns = [
    {
      id: 'name',
      header: 'Name',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">
          {row.firstName} {row.lastName}
        </span>
      ),
    },
    {
      id: 'specialty',
      header: 'Specialty',
      render: (row: any) => (
        <span className="text-textPrimary">{row.specialty || '—'}</span>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      render: (row: any) => (
        <span className="text-textPrimary">{row.email || '—'}</span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: any) => (
        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {row.status}
        </Badge>
      ),
    },
    {
      id: 'classes',
      header: 'Classes',
      render: (row: any) => (
        <span className="text-textMuted">{coachClasses[row.id] || 0}</span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingCoach(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading coaches...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coaches"
        subtitle="Manage facility coaches and trainers"
        actions={
          <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
            Add Coach
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-textMuted" />
              <Input
                placeholder="Search by name, email, or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-borderColor bg-cardBackground px-4 py-2 text-sm text-textPrimary focus:border-primaryBlue focus:outline-none focus:ring-2 focus:ring-primaryBlue/20"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Coaches Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredCoaches} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateCoachModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {editingCoach && (
        <EditCoachModal
          open={!!editingCoach}
          coach={editingCoach}
          onClose={() => {
            setEditingCoach(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

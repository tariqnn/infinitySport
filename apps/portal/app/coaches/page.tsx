'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, DataTable, Badge, Button, Input } from '../_components/ui';
import { coachesApi, classesApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { CreateCoachModal } from './_components/CreateCoachModal';
import { EditCoachModal } from './_components/EditCoachModal';

function truncate(s: string, len: number) {
  if (!s || s.length <= len) return s;
  return s.slice(0, len) + '...';
}

export default function CoachesPage() {
  const [coaches, setCoaches] = useState<any[]>([]);
  const [filteredCoaches, setFilteredCoaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ui-textMuted" />
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
              className="rounded-lg border border-ui-border bg-ui-cardBg px-4 py-2 text-sm text-ui-textPrimary focus:border-brand-primaryBlue focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <div className="flex gap-1 rounded-lg border border-ui-border p-1 bg-ui-softBg">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${viewMode === 'table' ? 'bg-white text-brand-primaryBlue shadow-sm' : 'text-ui-textMuted hover:text-ui-textPrimary'}`}
                title="Table view"
              >
                <ListBulletIcon className="h-4 w-4" /> Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium ${viewMode === 'cards' ? 'bg-white text-brand-primaryBlue shadow-sm' : 'text-ui-textMuted hover:text-ui-textPrimary'}`}
                title="Card view (like landing page)"
              >
                <Squares2X2Icon className="h-4 w-4" /> Cards
              </button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Coaches: Table or Card view (landing-style) */}
      {viewMode === 'table' ? (
        <Card>
          <CardBody className="p-0">
            <DataTable columns={columns} rows={filteredCoaches} />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCoaches.map((c) => {
            const isExp = expandedId === c.id;
            const desc = c.bio || c.specialty || '—';
            const short = truncate(desc, 150);
            const showMore = (c.bio || '').length > 150;
            return (
              <div
                key={c.id}
                className="rounded-2xl border-2 border-ui-border bg-white p-5 shadow-portal-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primaryBlue/30 hover:shadow-portal-card-hover"
              >
                <div className="flex gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-full bg-brand-gradient flex items-center justify-center text-lg font-bold text-white">
                    {(c.firstName?.[0] || '') + (c.lastName?.[0] || '')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-primaryGreen">{c.specialty || 'Coach'}</p>
                    <h3 className="mt-0.5 text-lg font-bold text-ui-textPrimary">{c.firstName} {c.lastName}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{c.status}</Badge>
                      {coachClasses[c.id] != null && <span className="text-xs text-ui-textMuted">{coachClasses[c.id]} class(es)</span>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 text-sm text-ui-textMuted leading-relaxed">
                  {isExp ? desc : short}
                  {showMore && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExp ? null : c.id); }}
                      className="ml-1 text-sm font-semibold text-brand-primaryBlue hover:underline"
                    >
                      {isExp ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingCoach(c)}
                    className="text-sm font-semibold text-brand-primaryBlue hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
          {filteredCoaches.length === 0 && (
            <div className="col-span-full py-12 text-center text-ui-textMuted">No coaches match your filters.</div>
          )}
        </div>
      )}

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

'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, DataTable, Badge, Button, Input } from '../_components/ui';
import { membersApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline';
import { CreateMemberModal } from './_components/CreateMemberModal';
import { EditMemberModal } from './_components/EditMemberModal';

function truncate(s: string, len: number) {
  if (!s || s.length <= len) return s;
  return s.slice(0, len) + '...';
}

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  useEffect(() => {
    filterMembers();
  }, [members, searchTerm, statusFilter]);

  async function loadMembers() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const data = await membersApi.list(company?.id);
      setMembers(data);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterMembers() {
    let filtered = [...members];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.firstName?.toLowerCase().includes(term) ||
          m.lastName?.toLowerCase().includes(term) ||
          m.email?.toLowerCase().includes(term) ||
          m.phone?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((m) => m.status === statusFilter);
    }

    setFilteredMembers(filtered);
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
      id: 'email',
      header: 'Email',
      render: (row: any) => (
        <span className="text-textPrimary">{row.email || '—'}</span>
      ),
    },
    {
      id: 'phone',
      header: 'Phone',
      render: (row: any) => (
        <span className="text-textPrimary">{row.phone || '—'}</span>
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
      id: 'joined',
      header: 'Joined',
      render: (row: any) => (
        <span className="text-textMuted">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingMember(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Members"
        subtitle="Manage facility members and their information"
        actions={
          <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
            Add Member
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
                placeholder="Search by name, email, or phone..."
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
              <option value="FROZEN">Frozen</option>
              <option value="EXPIRED">Expired</option>
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

      {/* Members: Table or Card view (landing-style) */}
      {viewMode === 'table' ? (
        <Card>
          <CardBody className="p-0">
            <DataTable columns={columns} rows={filteredMembers} />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((m) => {
            const isExp = expandedId === m.id;
            const notes = m.notes || '—';
            const shortNotes = truncate(notes, 120);
            const showMore = (m.notes || '').length > 120;
            return (
              <div
                key={m.id}
                className="rounded-2xl border-2 border-ui-border bg-white p-5 shadow-portal-card transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-primaryBlue/30 hover:shadow-portal-card-hover"
              >
                <div className="flex gap-4">
                  <div className="h-16 w-16 flex-shrink-0 rounded-full bg-brand-gradient flex items-center justify-center text-lg font-bold text-white">
                    {(m.firstName?.[0] || '') + (m.lastName?.[0] || '')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-ui-textPrimary">{m.firstName} {m.lastName}</h3>
                    <p className="mt-0.5 text-sm text-ui-textMuted">{m.email || '—'}</p>
                    <div className="mt-2">
                      <Badge variant={m.status === 'ACTIVE' ? 'success' : m.status === 'FROZEN' || m.status === 'EXPIRED' ? 'warning' : 'neutral'}>{m.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-ui-textMuted">Member since {new Date(m.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-4 text-sm text-ui-textMuted leading-relaxed">
                  {isExp ? notes : shortNotes}
                  {showMore && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExp ? null : m.id); }}
                      className="ml-1 text-sm font-semibold text-brand-primaryBlue hover:underline"
                    >
                      {isExp ? 'Read less' : 'Read more'}
                    </button>
                  )}
                </div>
                {isExp && (m.phone || m.guardianName || m.guardianPhone) && (
                  <div className="mt-3 space-y-1 border-t border-ui-border pt-3 text-xs text-ui-textMuted">
                    {m.phone && <p>Phone: {m.phone}</p>}
                    {m.guardianName && <p>Guardian: {m.guardianName}</p>}
                    {m.guardianPhone && <p>Guardian phone: {m.guardianPhone}</p>}
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingMember(m)}
                    className="text-sm font-semibold text-brand-primaryBlue hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
          {filteredMembers.length === 0 && (
            <div className="col-span-full py-12 text-center text-ui-textMuted">No members match your filters.</div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateMemberModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadMembers();
          }}
        />
      )}

      {editingMember && (
        <EditMemberModal
          open={!!editingMember}
          member={editingMember}
          onClose={() => {
            setEditingMember(null);
            loadMembers();
          }}
        />
      )}
    </div>
  );
}

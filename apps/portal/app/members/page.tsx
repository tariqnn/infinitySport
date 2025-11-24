'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, DataTable, Badge, Button, Input } from '../_components/ui';
import { membersApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CreateMemberModal } from './_components/CreateMemberModal';
import { EditMemberModal } from './_components/EditMemberModal';

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-textMuted" />
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
              className="rounded-lg border border-borderColor bg-cardBackground px-4 py-2 text-sm text-textPrimary focus:border-primaryBlue focus:outline-none focus:ring-2 focus:ring-primaryBlue/20"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="FROZEN">Frozen</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Members Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredMembers} />
        </CardBody>
      </Card>

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

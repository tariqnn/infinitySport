'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, DataTable, Badge, Button, Input } from '../_components/ui';
import { classesApi, coachesApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CreateClassModal } from './_components/CreateClassModal';
import { EditClassModal } from './_components/EditClassModal';
import { ClassDetailModal } from './_components/ClassDetailModal';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [coachFilter, setCoachFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [viewingClass, setViewingClass] = useState<any | null>(null);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterClasses();
  }, [classes, searchTerm, statusFilter, coachFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const [classesData, coachesData, enrollmentsData] = await Promise.all([
        classesApi.list(company?.id),
        coachesApi.list(company?.id),
        classesApi.enrollments.list(company?.id ? undefined : undefined),
      ]);
      setClasses(classesData);
      setCoaches(coachesData);

      // Count enrollments per class
      const counts: Record<string, number> = {};
      enrollmentsData.forEach((e: any) => {
        counts[e.classId] = (counts[e.classId] || 0) + 1;
      });
      setEnrollments(counts);
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterClasses() {
    let filtered = [...classes];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(term) ||
          c.description?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }

    if (coachFilter !== 'all') {
      filtered = filtered.filter((c) => c.coachId === coachFilter);
    }

    setFilteredClasses(filtered);
  }

  const columns = [
    {
      id: 'name',
      header: 'Name',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">{row.name}</span>
      ),
    },
    {
      id: 'coach',
      header: 'Coach',
      render: (row: any) => (
        <span className="text-textPrimary">
          {row.coach ? `${row.coach.firstName} ${row.coach.lastName}` : '—'}
        </span>
      ),
    },
    {
      id: 'datetime',
      header: 'Date & Time',
      render: (row: any) => {
        const start = new Date(row.startTime);
        return (
          <span className="text-textPrimary">
            {start.toLocaleDateString()} at {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      id: 'capacity',
      header: 'Capacity',
      render: (row: any) => (
        <span className="text-textPrimary">
          {enrollments[row.id] || 0} / {row.capacity}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: any) => {
        const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
          SCHEDULED: 'info',
          COMPLETED: 'success',
          CANCELLED: 'danger',
        };
        return <Badge variant={statusMap[row.status] || 'neutral'}>{row.status}</Badge>;
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <button
            onClick={() => setViewingClass(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            View
          </button>
          <button
            onClick={() => setEditingClass(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading classes...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        subtitle="Manage training classes and enrollments"
        actions={
          <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
            Create Class
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
                placeholder="Search by name or description..."
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
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <select
              value={coachFilter}
              onChange={(e) => setCoachFilter(e.target.value)}
              className="rounded-lg border border-borderColor bg-cardBackground px-4 py-2 text-sm text-textPrimary focus:border-primaryBlue focus:outline-none focus:ring-2 focus:ring-primaryBlue/20"
            >
              <option value="all">All Coaches</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Classes Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredClasses} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateClassModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {editingClass && (
        <EditClassModal
          open={!!editingClass}
          classItem={editingClass}
          onClose={() => {
            setEditingClass(null);
            loadData();
          }}
        />
      )}

      {viewingClass && (
        <ClassDetailModal
          open={!!viewingClass}
          classItem={viewingClass}
          onClose={() => {
            setViewingClass(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

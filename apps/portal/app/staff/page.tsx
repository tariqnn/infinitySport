'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, DataTable, Badge, Button, Input } from '../_components/ui';
import { tasksApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CreateTaskModal } from './_components/CreateTaskModal';
import { EditTaskModal } from './_components/EditTaskModal';

export default function StaffToolsPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTask, setEditingTask] = useState<any | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchTerm, statusFilter]);

  async function loadTasks() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const data = await tasksApi.list(company?.id);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterTasks() {
    let filtered = [...tasks];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(term) ||
          t.description?.toLowerCase().includes(term) ||
          t.assignedTo?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    setFilteredTasks(filtered);
  }

  const columns = [
    {
      id: 'title',
      header: 'Task',
      render: (row: any) => (
        <div>
          <p className="font-semibold text-textPrimary">{row.title}</p>
          {row.description && (
            <p className="text-sm text-textMuted line-clamp-1">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      id: 'assignedTo',
      header: 'Assigned To',
      render: (row: any) => (
        <span className="text-textPrimary">{row.assignedTo || '—'}</span>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      render: (row: any) => (
        <span className="text-textPrimary">
          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: any) => {
        const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
          DONE: 'success',
          IN_PROGRESS: 'info',
          OPEN: 'neutral',
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
            onClick={() => setEditingTask(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Tools"
        subtitle="Manage staff tasks and assignments"
        actions={
          <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
            Add Task
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
                placeholder="Search by title, description, or assigned to..."
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
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="DONE">Done</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredTasks} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateTaskModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadTasks();
          }}
        />
      )}

      {editingTask && (
        <EditTaskModal
          open={!!editingTask}
          task={editingTask}
          onClose={() => {
            setEditingTask(null);
            loadTasks();
          }}
        />
      )}
    </div>
  );
}

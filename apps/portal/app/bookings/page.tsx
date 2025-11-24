'use client';

import { useState, useEffect } from 'react';
import { PageHeader, Card, CardBody, CardHeader, DataTable, Badge, Button, Input } from '../_components/ui';
import { bookingsApi, getFirstCompany } from '../../lib/portalApi';
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { CreateBookingModal } from './_components/CreateBookingModal';
import { EditBookingModal } from './_components/EditBookingModal';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  async function loadBookings() {
    try {
      setLoading(true);
      const company = await getFirstCompany();
      const data = await bookingsApi.list(company?.id);
      setBookings(data);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterBookings() {
    let filtered = [...bookings];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.facilityArea?.toLowerCase().includes(term) ||
          b.class?.name?.toLowerCase().includes(term) ||
          b.coach?.firstName?.toLowerCase().includes(term) ||
          b.member?.firstName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((b) => b.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }

  const columns = [
    {
      id: 'date',
      header: 'Date',
      render: (row: any) => {
        const date = new Date(row.startTime);
        return <span className="text-textPrimary">{date.toLocaleDateString()}</span>;
      },
    },
    {
      id: 'time',
      header: 'Time',
      render: (row: any) => {
        const start = new Date(row.startTime);
        const end = new Date(row.endTime);
        return (
          <span className="text-textPrimary">
            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        );
      },
    },
    {
      id: 'facility',
      header: 'Facility Area',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">{row.facilityArea || '—'}</span>
      ),
    },
    {
      id: 'member',
      header: 'Member / Class',
      render: (row: any) => (
        <span className="text-textPrimary">
          {row.member ? `${row.member.firstName} ${row.member.lastName}` : row.class?.name || row.coach ? `${row.coach?.firstName} ${row.coach?.lastName}` : '—'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      render: (row: any) => {
        const statusMap: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'info'> = {
          CONFIRMED: 'success',
          PENDING: 'warning',
          CANCELLED: 'danger',
          COMPLETED: 'info',
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
            onClick={() => setEditingBooking(row)}
            className="text-sm font-semibold text-primaryBlue hover:underline"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="text-center py-12 text-textMuted">Loading bookings...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        subtitle="Manage facility bookings and scheduling"
        actions={
          <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
            New Booking
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
                placeholder="Search by facility, class, coach, or member..."
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
              <option value="PENDING">Pending</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </CardBody>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable columns={columns} rows={filteredBookings} />
        </CardBody>
      </Card>

      {/* Modals */}
      {showCreateModal && (
        <CreateBookingModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            loadBookings();
          }}
        />
      )}

      {editingBooking && (
        <EditBookingModal
          open={!!editingBooking}
          booking={editingBooking}
          onClose={() => {
            setEditingBooking(null);
            loadBookings();
          }}
        />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Modal, Button, DataTable, Badge } from '../../_components/ui';
import { classesApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { PlusIcon } from '@heroicons/react/24/outline';
import { EnrollMemberModal } from './EnrollMemberModal';

export function ClassDetailModal({ open, classItem, onClose }: { open: boolean; classItem: any; onClose: () => void }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  useEffect(() => {
    if (open && classItem) {
      loadEnrollments();
    }
  }, [open, classItem]);

  async function loadEnrollments() {
    try {
      setLoading(true);
      const data = await classesApi.enrollments.list(classItem.id);
      setEnrollments(data);
    } catch (error) {
      console.error('Failed to load enrollments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnenroll(enrollmentId: string) {
    if (!confirm('Remove this member from the class?')) return;
    try {
      await classesApi.enrollments.delete(enrollmentId);
      loadEnrollments();
    } catch (error) {
      console.error('Failed to unenroll member:', error);
    }
  }

  const columns = [
    {
      id: 'name',
      header: 'Member',
      render: (row: any) => (
        <span className="font-semibold text-textPrimary">
          {row.member?.firstName} {row.member?.lastName}
        </span>
      ),
    },
    {
      id: 'email',
      header: 'Email',
      render: (row: any) => (
        <span className="text-textPrimary">{row.member?.email || '—'}</span>
      ),
    },
    {
      id: 'enrolled',
      header: 'Enrolled',
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
        <button
          onClick={() => handleUnenroll(row.id)}
          className="text-sm font-semibold text-danger hover:underline"
        >
          Remove
        </button>
      ),
    },
  ];

  const startTime = new Date(classItem.startTime);
  const endTime = new Date(classItem.endTime);

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={classItem.name}
        size="xl"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={onClose}>
              Close
            </Button>
            <Button onClick={() => setShowEnrollModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
              Add Member
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {/* Class Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-textMuted">Date & Time</p>
              <p className="mt-1 text-textPrimary">
                {startTime.toLocaleDateString()} {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-textMuted">Coach</p>
              <p className="mt-1 text-textPrimary">
                {classItem.coach ? `${classItem.coach.firstName} ${classItem.coach.lastName}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-textMuted">Capacity</p>
              <p className="mt-1 text-textPrimary">
                {enrollments.length} / {classItem.capacity}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-textMuted">Status</p>
              <Badge variant={classItem.status === 'SCHEDULED' ? 'info' : classItem.status === 'COMPLETED' ? 'success' : 'danger'}>
                {classItem.status}
              </Badge>
            </div>
          </div>

          {classItem.description && (
            <div>
              <p className="text-sm font-medium text-textMuted">Description</p>
              <p className="mt-1 text-textPrimary">{classItem.description}</p>
            </div>
          )}

          {/* Enrolled Members */}
          <div>
            <h3 className="mb-4 text-lg font-semibold text-textPrimary">Enrolled Members</h3>
            {loading ? (
              <p className="text-center py-8 text-textMuted">Loading...</p>
            ) : enrollments.length > 0 ? (
              <DataTable columns={columns} rows={enrollments} />
            ) : (
              <p className="text-center py-8 text-textMuted">No members enrolled</p>
            )}
          </div>
        </div>
      </Modal>

      {showEnrollModal && (
        <EnrollMemberModal
          open={showEnrollModal}
          classId={classItem.id}
          onClose={() => {
            setShowEnrollModal(false);
            loadEnrollments();
          }}
        />
      )}
    </>
  );
}


'use client';

import { useState, useEffect } from 'react';
import { Modal, Select, Button } from '../../_components/ui';
import { classesApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EnrollMemberModal({ open, classId, onClose }: { open: boolean; classId: string; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [enrolledMemberIds, setEnrolledMemberIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, classId]);

  async function loadData() {
    try {
      const company = await getFirstCompany();
      const [membersData, enrollmentsData] = await Promise.all([
        membersApi.list(company?.id),
        classesApi.enrollments.list(classId),
      ]);
      setMembers(membersData);
      setEnrolledMemberIds(new Set(enrollmentsData.map((e: any) => e.memberId)));
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const memberId = String(formData.get('memberId'));

    if (!memberId) {
      setError('Please select a member');
      setLoading(false);
      return;
    }

    try {
      await classesApi.enrollments.create({
        class: { connect: { id: classId } },
        member: { connect: { id: memberId } },
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to enroll member');
    } finally {
      setLoading(false);
    }
  }

  // Filter out already enrolled members
  const availableMembers = members.filter((m) => !enrolledMemberIds.has(m.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Enroll Member"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="enroll-member-form" isLoading={loading}>
            Enroll Member
          </Button>
        </>
      }
    >
      <form id="enroll-member-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {availableMembers.length === 0 ? (
          <p className="text-center py-4 text-textMuted">All members are already enrolled in this class</p>
        ) : (
          <Select
            label="Member *"
            name="memberId"
            required
            options={[
              { value: '', label: 'Select a member' },
              ...availableMembers.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
            ]}
          />
        )}
      </form>
    </Modal>
  );
}


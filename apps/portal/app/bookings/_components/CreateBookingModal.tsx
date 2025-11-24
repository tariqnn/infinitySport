'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { bookingsApi, classesApi, coachesApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function CreateBookingModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      loadOptions();
    }
  }, [open]);

  async function loadOptions() {
    try {
      const company = await getFirstCompany();
      const [classesData, coachesData, membersData] = await Promise.all([
        classesApi.list(company?.id),
        coachesApi.list(company?.id),
        membersApi.list(company?.id),
      ]);
      setClasses(classesData);
      setCoaches(coachesData);
      setMembers(membersData);
    } catch (error) {
      console.error('Failed to load options:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const company = await getFirstCompany();

    if (!company) {
      setError('No company found. Please create a company first.');
      setLoading(false);
      return;
    }

    try {
      const startTime = new Date(`${formData.get('date')}T${formData.get('startTime')}`);
      const endTime = new Date(`${formData.get('date')}T${formData.get('endTime')}`);

      await bookingsApi.create({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        facilityArea: formData.get('facilityArea') ? String(formData.get('facilityArea')) : undefined,
        status: String(formData.get('status') || 'PENDING'),
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        company: { connect: { id: company.id } },
        ...(formData.get('classId') && { class: { connect: { id: String(formData.get('classId')) } } }),
        ...(formData.get('coachId') && { coach: { connect: { id: String(formData.get('coachId')) } } }),
        ...(formData.get('memberId') && { member: { connect: { id: String(formData.get('memberId')) } } }),
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Booking"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="create-booking-form" isLoading={loading}>
            Create Booking
          </Button>
        </>
      }
    >
      <form id="create-booking-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Date *" name="date" type="date" required defaultValue={today} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Time *" name="startTime" type="time" required />
          <Input label="End Time *" name="endTime" type="time" required />
        </div>
        <Input label="Facility Area" name="facilityArea" placeholder="e.g. Court 1, Padel Court B" />
        <Select
          label="Class (Optional)"
          name="classId"
          options={[
            { value: '', label: 'None' },
            ...classes.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <Select
          label="Coach (Optional)"
          name="coachId"
          options={[
            { value: '', label: 'None' },
            ...coaches.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })),
          ]}
        />
        <Select
          label="Member (Optional)"
          name="memberId"
          options={[
            { value: '', label: 'None' },
            ...members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
          ]}
        />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
          defaultValue="PENDING"
        />
        <Textarea label="Notes" name="notes" rows={3} />
      </form>
    </Modal>
  );
}


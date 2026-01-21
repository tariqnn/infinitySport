'use client';

import { useState, useEffect } from 'react';
import { Modal, Input, Select, Textarea, Button } from '../../_components/ui';
import { bookingsApi, classesApi, coachesApi, membersApi, getFirstCompany } from '../../../lib/portalApi';
import { useRouter } from 'next/navigation';

export function EditBookingModal({ open, booking, onClose }: { open: boolean; booking: any; onClose: () => void }) {
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

    try {
      const startTime = new Date(`${formData.get('date')}T${formData.get('startTime')}`);
      const endTime = new Date(`${formData.get('date')}T${formData.get('endTime')}`);

      await bookingsApi.update(booking.id, {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        facilityArea: formData.get('facilityArea') ? String(formData.get('facilityArea')) : undefined,
        status: String(formData.get('status')),
        isPaid: formData.get('isPaid') === 'on',
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        ...(formData.get('classId') && { class: { connect: { id: String(formData.get('classId')) } } }),
        ...(formData.get('coachId') && { coach: { connect: { id: String(formData.get('coachId')) } } }),
        ...(formData.get('memberId') && { member: { connect: { id: String(formData.get('memberId')) } } }),
      });

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  }

  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);
  const date = startTime.toISOString().split('T')[0];
  const startTimeStr = startTime.toTimeString().slice(0, 5);
  const endTimeStr = endTime.toTimeString().slice(0, 5);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Booking"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-booking-form" isLoading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-booking-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <Input label="Date *" name="date" type="date" required defaultValue={date} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Start Time *" name="startTime" type="time" required defaultValue={startTimeStr} />
          <Input label="End Time *" name="endTime" type="time" required defaultValue={endTimeStr} />
        </div>
        <Input label="Facility Area" name="facilityArea" defaultValue={booking.facilityArea || ''} />
        <Select
          label="Class (Optional)"
          name="classId"
          options={[
            { value: '', label: 'None' },
            ...classes.map((c) => ({ value: c.id, label: c.name })),
          ]}
          defaultValue={booking.classId || ''}
        />
        <Select
          label="Coach (Optional)"
          name="coachId"
          options={[
            { value: '', label: 'None' },
            ...coaches.map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` })),
          ]}
          defaultValue={booking.coachId || ''}
        />
        <Select
          label="Member (Optional)"
          name="memberId"
          options={[
            { value: '', label: 'None' },
            ...members.map((m) => ({ value: m.id, label: `${m.firstName} ${m.lastName}` })),
          ]}
          defaultValue={booking.memberId || ''}
        />
        <Select
          label="Status *"
          name="status"
          required
          options={[
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
            { value: 'COMPLETED', label: 'Completed' },
          ]}
          defaultValue={booking.status}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            name="isPaid"
            id="isPaid"
            defaultChecked={booking.isPaid || false}
            className="h-4 w-4 rounded border-borderColor text-primaryBlue focus:ring-primaryBlue"
          />
          <label htmlFor="isPaid" className="text-sm font-medium text-textPrimary">
            Payment Received
          </label>
        </div>
        <Textarea label="Notes" name="notes" rows={3} defaultValue={booking.notes || ''} />
      </form>
    </Modal>
  );
}


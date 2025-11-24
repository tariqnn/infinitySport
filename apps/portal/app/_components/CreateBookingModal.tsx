'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@infinity/ui';
import { apiClient } from '../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { CreateCompanyModal } from './CreateCompanyModal';

export function CreateBookingModal({ open, onClose, companyId }: { open: boolean; onClose: () => void; companyId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [coaches, setCoaches] = useState<any[]>([]);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | undefined>(companyId);

  useEffect(() => {
    if (open) {
      if (!currentCompanyId) {
        apiClient.getCompanies().then(companies => {
          if (companies.length > 0) {
            setCurrentCompanyId(companies[0].id);
          }
        });
      }
      if (currentCompanyId) {
        Promise.all([
          apiClient.getMembers(currentCompanyId),
          apiClient.getClasses(currentCompanyId),
          apiClient.getCoaches(currentCompanyId),
        ]).then(([m, c, co]) => {
          setMembers(m);
          setClasses(c);
          setCoaches(co);
        });
      }
    }
  }, [open, currentCompanyId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    
    try {
      let finalCompanyId = currentCompanyId;
      if (!finalCompanyId) {
        const companies = await apiClient.getCompanies();
        if (companies.length === 0) {
          setShowCompanyModal(true);
          setLoading(false);
          return;
        }
        finalCompanyId = companies[0].id;
        setCurrentCompanyId(finalCompanyId);
      }

      const startTime = new Date(`${formData.get('date')}T${formData.get('startTime')}`);
      const endTime = new Date(`${formData.get('date')}T${formData.get('endTime')}`);

      await apiClient.createBooking({
        company: { connect: { id: finalCompanyId } },
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'PENDING',
        facilityArea: formData.get('facilityArea') ? String(formData.get('facilityArea')) : undefined,
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
        ...(formData.get('memberId') ? { member: { connect: { id: String(formData.get('memberId')) } } } : {}),
        ...(formData.get('classId') ? { class: { connect: { id: String(formData.get('classId')) } } } : {}),
        ...(formData.get('coachId') ? { coach: { connect: { id: String(formData.get('coachId')) } } } : {}),
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

  function handleCompanyCreated(newCompanyId: string) {
    setCurrentCompanyId(newCompanyId);
    setShowCompanyModal(false);
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="Create Booking">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!currentCompanyId && (
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-800 mb-3">No company found. Please create a company first to create bookings.</p>
            <Button type="button" onClick={() => setShowCompanyModal(true)} className="w-full">
              Create Company
            </Button>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
            <input name="startTime" type="time" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
            <input name="endTime" type="time" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facility Area</label>
          <input name="facilityArea" placeholder="e.g. Court 1, Padel Court B" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Member (Optional)</label>
          <select name="memberId" className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select member</option>
            {members.map(m => (
              <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Class (Optional)</label>
          <select name="classId" className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select class</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Coach (Optional)</label>
          <select name="coachId" className="w-full rounded-lg border border-gray-300 px-3 py-2">
            <option value="">Select coach</option>
            {coaches.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea name="notes" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={loading} disabled={!currentCompanyId}>
            Submit
          </Button>
        </div>
      </form>
      </Modal>
      <CreateCompanyModal 
        open={showCompanyModal} 
        onClose={() => setShowCompanyModal(false)} 
        onSuccess={handleCompanyCreated}
      />
    </>
  );
}


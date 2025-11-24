'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@infinity/ui';
import { apiClient } from '../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { CreateCompanyModal } from './CreateCompanyModal';

export function CreateInvoiceModal({ open, onClose, companyId }: { open: boolean; onClose: () => void; companyId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
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
        apiClient.getMembers(currentCompanyId).then(setMembers);
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

      await apiClient.createInvoice({
        company: { connect: { id: finalCompanyId } },
        amount: parseInt(String(formData.get('amount'))),
        currency: String(formData.get('currency')) || 'JOD',
        status: 'DRAFT',
        description: formData.get('description') ? String(formData.get('description')) : undefined,
        dueDate: formData.get('dueDate') ? new Date(String(formData.get('dueDate'))).toISOString() : undefined,
        ...(formData.get('memberId') ? { member: { connect: { id: String(formData.get('memberId')) } } } : {}),
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
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
      <Modal open={open} onClose={onClose} title="New Invoice">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!currentCompanyId && (
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-800 mb-3">No company found. Please create a company first to create invoices.</p>
            <Button type="button" onClick={() => setShowCompanyModal(true)} className="w-full">
              Create Company
            </Button>
          </div>
        )}
        
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
          <input name="amount" type="number" required min="0" step="0.01" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
          <input name="currency" defaultValue="JOD" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input name="dueDate" type="date" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
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


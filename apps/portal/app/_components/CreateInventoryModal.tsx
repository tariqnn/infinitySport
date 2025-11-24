'use client';

import { useState, useEffect } from 'react';
import { Modal, Button } from '@infinity/ui';
import { apiClient } from '../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { CreateCompanyModal } from './CreateCompanyModal';

export function CreateInventoryModal({ open, onClose, companyId }: { open: boolean; onClose: () => void; companyId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [currentCompanyId, setCurrentCompanyId] = useState<string | undefined>(companyId);

  useEffect(() => {
    if (open && !currentCompanyId) {
      apiClient.getCompanies().then(companies => {
        if (companies.length > 0) {
          setCurrentCompanyId(companies[0].id);
        }
      });
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

      await apiClient.createInventoryItem({
        company: { connect: { id: finalCompanyId } },
        name: String(formData.get('name')),
        category: formData.get('category') ? String(formData.get('category')) : undefined,
        quantity: parseInt(String(formData.get('quantity'))),
        location: formData.get('location') ? String(formData.get('location')) : undefined,
        status: 'AVAILABLE',
        notes: formData.get('notes') ? String(formData.get('notes')) : undefined,
      });

      router.refresh();
      onClose();
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      setError(err.message || 'Failed to create inventory item');
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
      <Modal open={open} onClose={onClose} title="New Purchase Order / Inventory Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!currentCompanyId && (
          <div className="rounded-lg bg-blue-50 p-4 border border-blue-200">
            <p className="text-sm text-blue-800 mb-3">No company found. Please create a company first to add inventory items.</p>
            <Button type="button" onClick={() => setShowCompanyModal(true)} className="w-full">
              Create Company
            </Button>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
          <input name="name" required placeholder="e.g. Match basketballs" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <input name="category" placeholder="e.g. Equipment, Supplies" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
          <input name="quantity" type="number" required min="0" defaultValue="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input name="location" placeholder="e.g. Equipment room, Court 1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900" />
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


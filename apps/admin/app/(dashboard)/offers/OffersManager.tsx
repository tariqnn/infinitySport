'use client';

import { useState, useEffect } from 'react';
import type { LandingOffer } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';

interface OfferState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: OfferState = { status: 'idle' };

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button 
      type="submit" 
      className="glow-button inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-70" 
      disabled={pending}
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

const serializeFeatures = (features: string[]) => features.join('\n');

function parsePrice(priceStr: string): number {
  // Extract number from strings like "JD 220/mo" or "220" or "Custom"
  if (priceStr.toLowerCase().includes('custom')) return 0;
  const match = priceStr.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function formatPrice(pricePerMonth: number): string {
  if (pricePerMonth === 0) return 'Custom';
  return `JD ${pricePerMonth}/mo`;
}

export function OffersManager() {
  const [offers, setOffers] = useState<LandingOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingOffer | null>(null);
  const [createState, setCreateState] = useState<OfferState>(initialState);
  const [editState, setEditState] = useState<OfferState>(initialState);
  const [deleteState, setDeleteState] = useState<OfferState>(initialState);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function loadOffers() {
      try {
        const apiOffers = await apiClient.getOffers();
        // Transform API offers to LandingOffer format
        const transformed: LandingOffer[] = apiOffers.map((o: any) => ({
          id: o.id,
          name: o.name,
          price: formatPrice(o.pricePerMonth),
          badge: o.badge || undefined,
          description: o.description,
          features: o.features || [],
          link: '/offers',
          isFeatured: false,
          isActive: true,
        }));
        setOffers(transformed);
      } catch (error) {
        console.error('Failed to load offers:', error);
        setCreateState({ 
          status: 'error', 
          message: 'Failed to load offers. Make sure API server is running.' 
        });
      } finally {
        setLoading(false);
      }
    }
    loadOffers();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    try {
      const formData = new FormData(form);
      const priceStr = formData.get('price')?.toString() || '0';
      const pricePerMonth = parsePrice(priceStr);
      const features = formData.get('features')?.toString() || '';
      const featuresArray = features
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: formData.get('name')?.toString() || '',
        pricePerMonth,
        badge: formData.get('badge')?.toString() || undefined,
        description: formData.get('description')?.toString() || '',
        features: featuresArray,
        order: 0,
      };

      if (isEdit && editing) {
        await apiClient.updateOffer(editing.id, payload);
        stateSetter({ status: 'success', message: 'Offer updated successfully!' });
      } else {
        await apiClient.createOffer(payload);
        stateSetter({ status: 'success', message: 'Offer created successfully!' });
      }

      // Reload offers
      const apiOffers = await apiClient.getOffers();
      const transformed: LandingOffer[] = apiOffers.map((o: any) => ({
        id: o.id,
        name: o.name,
        price: formatPrice(o.pricePerMonth),
        badge: o.badge || undefined,
        description: o.description,
        features: o.features || [],
        link: '/offers',
        isFeatured: false,
        isActive: true,
      }));
      setOffers(transformed);
      setEditing(null);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error('Failed to save offer:', error);
      stateSetter({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save offer' 
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this offer?')) return;

    setPending(true);
    setDeleteState({ status: 'idle' });

    try {
      await apiClient.deleteOffer(id);
      setDeleteState({ status: 'success', message: 'Offer deleted successfully!' });
      
      // Reload offers
      const apiOffers = await apiClient.getOffers();
      const transformed: LandingOffer[] = apiOffers.map((o: any) => ({
        id: o.id,
        name: o.name,
        price: formatPrice(o.pricePerMonth),
        badge: o.badge || undefined,
        description: o.description,
        features: o.features || [],
        link: '/offers',
        isFeatured: false,
        isActive: true,
      }));
      setOffers(transformed);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete offer:', error);
      setDeleteState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete offer' 
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading offers...</p>
        </div>
      </div>
    );
  }

  const workingOffer = editing ?? undefined;

  return (
    <div className="space-y-8">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'} plan</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">{editing ? `Editing ${editing.name}` : 'Add offer plan'}</h3>
          </div>
          {editing ? (
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={(e) => handleSubmit(e, !!editing)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Name
              <input name="name" defaultValue={workingOffer?.name} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Price label
              <input name="price" defaultValue={workingOffer?.price ?? ''} placeholder="JD 199/mo" className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Badge
              <input name="badge" defaultValue={workingOffer?.badge ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Link
              <input name="link" defaultValue={workingOffer?.link ?? '/offers'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="text-sm font-semibold text-slate-600">
            Description
            <textarea name="description" defaultValue={workingOffer?.description} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Features (one per line)
            <textarea name="features" defaultValue={workingOffer ? serializeFeatures(workingOffer.features) : ''} rows={4} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          {(editing ? editState : createState).message ? (
            <p className={`text-sm ${(editing ? editState : createState).status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
              {(editing ? editState : createState).message}
            </p>
          ) : null}
          <SubmitButton label={editing ? 'Save offer' : 'Create offer'} pending={pending} />
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {offers.map((offer) => (
          <div key={offer.id} className="glass-card space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-slate-900">{offer.name}</p>
                <p className="text-sm text-slate-500">{offer.price}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {offer.isActive === false ? 'Hidden' : offer.isFeatured ? 'Hero card' : 'Standard'}
              </span>
            </div>
            <p className="text-sm text-slate-600">{offer.description}</p>
            <ul className="space-y-1 text-sm text-slate-500">
              {offer.features.map((feature) => (
                <li key={feature}>• {feature}</li>
              ))}
            </ul>
            <div className="flex gap-3">
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setEditing(offer)}
              >
                Edit
              </button>
              <button 
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500" 
                onClick={() => handleDelete(offer.id)}
                disabled={pending}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {deleteState.message ? (
        <p className={`text-sm ${deleteState.status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>{deleteState.message}</p>
      ) : null}
    </div>
  );
}

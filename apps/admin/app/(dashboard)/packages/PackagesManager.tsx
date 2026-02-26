'use client';

import { useState, useEffect } from 'react';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';

export type PackageRow = {
  id: string;
  sportType: string;
  name: string;
  description: string | null;
  descriptionBullets: string[] | null;
  sessionsCount: number;
  trackingType: string;
  pricingType: string;
  currentPriceJod: number | null;
  timeSlots: unknown;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

interface PackageState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: PackageState = { status: 'idle' };

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      className="glow-button inline-flex w-full items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-70 md:w-auto"
      disabled={pending}
    >
      {pending ? 'Saving...' : label}
    </button>
  );
}

const TRACKING_OPTIONS = ['SESSIONS', 'DAYS', 'BOTH'];
const PRICING_OPTIONS = ['FIXED', 'MANUAL'];

export function PackagesManager() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PackageRow | null>(null);
  const [createState, setCreateState] = useState<PackageState>(initialState);
  const [editState, setEditState] = useState<PackageState>(initialState);
  const [deleteState, setDeleteState] = useState<PackageState>(initialState);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function load() {
      try {
        const list = await apiClient.getPackages();
        setPackages(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error('Failed to load programs', e);
        setCreateState({ status: 'error', message: 'Failed to load programs. Is the API running?' });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    e.preventDefault();
    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    const form = e.currentTarget;
    const formData = new FormData(form);
    const pricingType = formData.get('pricingType') as string;
    const payload = {
      sportType: formData.get('sportType')?.toString()?.trim() || 'Other',
      name: formData.get('name')?.toString()?.trim() || '',
      description: formData.get('description')?.toString()?.trim() || null,
      sessionsCount: parseInt(formData.get('sessionsCount')?.toString() || '0', 10) || 0,
      trackingType: formData.get('trackingType')?.toString() || 'SESSIONS',
      pricingType: pricingType || 'FIXED',
      currentPriceJod: pricingType === 'MANUAL' ? null : (parseInt(formData.get('currentPriceJod')?.toString() || '0', 10) || 0),
      isActive: formData.get('isActive') === 'on',
      sortOrder: parseInt(formData.get('sortOrder')?.toString() || '0', 10) || 0,
    };

    try {
      if (isEdit && editing) {
        await apiClient.updatePackage(editing.id, payload);
        stateSetter({ status: 'success', message: 'Program updated.' });
      } else {
        await apiClient.createPackage(payload);
        stateSetter({ status: 'success', message: 'Program created.' });
      }
      const list = await apiClient.getPackages();
      setPackages(Array.isArray(list) ? list : []);
      setEditing(null);
      form.reset();
      router.refresh();
    } catch (err) {
      stateSetter({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to save program',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this program? Registrations using this program name may be affected.')) return;
    setPending(true);
    setDeleteState({ status: 'idle' });
    try {
      await apiClient.deletePackage(id);
      setDeleteState({ status: 'success', message: 'Program deleted.' });
      const list = await apiClient.getPackages();
      setPackages(Array.isArray(list) ? list : []);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setDeleteState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to delete',
      });
    } finally {
      setPending(false);
    }
  }

  async function moveOrder(pkg: PackageRow, direction: 'up' | 'down') {
    const idx = packages.findIndex((p) => p.id === pkg.id);
    if (idx < 0) return;
    const newOrder = direction === 'up' ? idx - 1 : idx + 1;
    if (newOrder < 0 || newOrder >= packages.length) return;
    const swapped = packages[newOrder];
    setPending(true);
    try {
      await apiClient.updatePackage(pkg.id, { sortOrder: newOrder });
      await apiClient.updatePackage(swapped.id, { sortOrder: idx });
      const list = await apiClient.getPackages();
      setPackages(Array.isArray(list) ? list : []);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-lg font-semibold text-slate-600">Loading programs...</p>
      </div>
    );
  }

  const current = editing ?? undefined;

  return (
    <div className="space-y-8">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'} program</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {editing ? editing.name : 'Add program'}
            </h3>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel edit
            </button>
          )}
        </div>
        <form onSubmit={(e) => handleSubmit(e, !!editing)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Sport type
              <input name="sportType" defaultValue={current?.sportType} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="e.g. Basketball, Gymnastics" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Name (unique)
              <input name="name" defaultValue={current?.name} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required placeholder="e.g. Gymnastics Package A" />
            </label>
          </div>
          <label className="text-sm font-semibold text-slate-600">
            Description
            <textarea name="description" defaultValue={current?.description ?? ''} rows={2} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Sessions count
              <input name="sessionsCount" type="number" min={0} defaultValue={current?.sessionsCount ?? 0} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Tracking type
              <select name="trackingType" defaultValue={current?.trackingType ?? 'SESSIONS'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
                {TRACKING_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Pricing type
              <select name="pricingType" defaultValue={current?.pricingType ?? 'FIXED'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
                {PRICING_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o === 'MANUAL' ? 'MANUAL (Contact for pricing)' : o}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Current price (JOD) — for FIXED only
              <input name="currentPriceJod" type="number" min={0} defaultValue={current?.currentPriceJod ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" placeholder="Leave 0 or empty if MANUAL" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
              <input name="isActive" type="checkbox" defaultChecked={current?.isActive !== false} className="rounded border-slate-200" />
              Active (show on landing & portal)
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Sort order
              <input name="sortOrder" type="number" min={0} defaultValue={current?.sortOrder ?? 0} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
          </div>
          {(editing ? editState : createState).message && (
            <p className={`text-sm ${(editing ? editState : createState).status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {(editing ? editState : createState).message}
            </p>
          )}
          <SubmitButton label={editing ? 'Save program' : 'Create program'} pending={pending} />
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="font-display text-xl font-semibold text-slate-900">Programs ({packages.length})</h3>
        <div className="space-y-2">
          {packages.map((pkg, idx) => (
            <div key={pkg.id} className="glass-card flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-0.5">
                  <button type="button" onClick={() => moveOrder(pkg, 'up')} disabled={idx === 0 || pending} className="rounded border border-slate-200 px-2 py-0.5 text-xs disabled:opacity-40">↑</button>
                  <button type="button" onClick={() => moveOrder(pkg, 'down')} disabled={idx === packages.length - 1 || pending} className="rounded border border-slate-200 px-2 py-0.5 text-xs disabled:opacity-40">↓</button>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{pkg.name}</p>
                  <p className="text-xs text-slate-500">{pkg.sportType} · {pkg.trackingType} · {pkg.pricingType === 'MANUAL' ? 'Contact for pricing' : `${pkg.currentPriceJod ?? 0} JOD`}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(pkg)} className="rounded-full border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600">Edit</button>
                <button type="button" onClick={() => handleDelete(pkg.id)} disabled={pending} className="rounded-full border border-red-200 px-3 py-1 text-sm font-semibold text-red-500">Delete</button>
              </div>
            </div>
          ))}
        </div>
        {deleteState.message && <p className={`text-sm ${deleteState.status === 'success' ? 'text-green-600' : 'text-red-500'}`}>{deleteState.message}</p>}
      </div>
    </div>
  );
}

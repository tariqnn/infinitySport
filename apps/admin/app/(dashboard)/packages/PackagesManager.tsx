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
      className="glow-button inline-flex w-full items-center justify-center rounded-xl px-6 py-3.5 text-base font-bold disabled:opacity-60 md:w-auto"
      disabled={pending}
    >
      {pending ? 'Saving...' : label}
    </button>
  );
}

function FormHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{children}</p>;
}

const TRACKING_OPTIONS = [
  { value: 'SESSIONS', label: 'Sessions (count sessions used)' },
  { value: 'DAYS', label: 'Days (track by calendar days)' },
  { value: 'BOTH', label: 'Both (sessions + days)' },
];
const PRICING_OPTIONS = [
  { value: 'FIXED', label: 'Fixed price (show price on website)' },
  { value: 'MANUAL', label: 'Contact for pricing (no price shown)' },
];

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

    const bulletsRaw = formData.get('descriptionBullets')?.toString()?.trim() || '';
    const descriptionBullets = bulletsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const timeSlotsRaw = formData.get('timeSlots')?.toString()?.trim() || '';
    const timeSlots = timeSlotsRaw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ label }));

    const payload = {
      sportType: formData.get('sportType')?.toString()?.trim() || 'Other',
      name: formData.get('name')?.toString()?.trim() || '',
      description: formData.get('description')?.toString()?.trim() || null,
      descriptionBullets: descriptionBullets.length > 0 ? descriptionBullets : null,
      timeSlots: timeSlots.length > 0 ? timeSlots : null,
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
        stateSetter({ status: 'success', message: 'Program updated! Changes will appear on the website shortly.' });
      } else {
        await apiClient.createPackage(payload);
        stateSetter({ status: 'success', message: 'Program created! It will appear on the website shortly.' });
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
    if (!confirm('Are you sure you want to delete this program? It will be removed from the website.')) return;
    setPending(true);
    setDeleteState({ status: 'idle' });
    try {
      await apiClient.deletePackage(id);
      setDeleteState({ status: 'success', message: 'Program deleted and removed from the website.' });
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
      <div className="p-8 text-center">
        <p className="text-lg font-semibold text-slate-600">Loading programs...</p>
      </div>
    );
  }

  const current = editing ?? undefined;

  return (
    <div className="space-y-8">
      {/* Info banner */}
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-6 py-5">
        <p className="text-base font-bold text-blue-900">How programs work</p>
        <p className="mt-1 text-base leading-relaxed text-blue-800">
          Programs you create here appear on the website automatically. Each program shows its name, sport type, schedule, and price.
          To update a program, click <strong>Edit</strong> next to it below, make your changes, then click <strong>Save</strong>.
        </p>
      </div>

      {/* Form */}
      <div className="glass-card space-y-5 p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-2xl font-bold text-slate-900">
              {editing ? `Editing: ${editing.name}` : 'Add a New Program'}
            </h3>
            <p className="mt-1 text-base text-[var(--text-muted)]">
              {editing ? 'Change the fields below and click Save.' : 'Fill in the details below to create a new program on the website.'}
            </p>
          </div>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl border-2 border-slate-300 px-5 py-2.5 text-base font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={(e) => handleSubmit(e, !!editing)} className="space-y-5">
          {/* Basic info */}
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="text-base font-bold text-slate-800">
                Sport Type
                <input
                  name="sportType"
                  defaultValue={current?.sportType}
                  className="mt-2 w-full"
                  placeholder="e.g. Basketball, Gymnastics, Boxing, Volleyball"
                />
              </label>
              <FormHint>The category this program belongs to (e.g. Basketball, Volleyball).</FormHint>
            </div>
            <div>
              <label className="text-base font-bold text-slate-800">
                Program Name
                <input
                  name="name"
                  defaultValue={current?.name}
                  className="mt-2 w-full"
                  required
                  placeholder="e.g. Basketball Academy (Age 8-11)"
                />
              </label>
              <FormHint>This name appears on the website. Make it clear and descriptive.</FormHint>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-base font-bold text-slate-800">
              Short Description
              <textarea
                name="description"
                defaultValue={current?.description ?? ''}
                rows={2}
                className="mt-2 w-full"
                placeholder="A brief description of this program"
              />
            </label>
            <FormHint>A one or two sentence description shown below the program name.</FormHint>
          </div>

          {/* Bullets */}
          <div>
            <label className="text-base font-bold text-slate-800">
              Key Details (one per line)
              <textarea
                name="descriptionBullets"
                defaultValue={current?.descriptionBullets?.join('\n') ?? ''}
                rows={3}
                className="mt-2 w-full"
                placeholder={"Age group: 8–11 years.\nMonday, Wednesday, Saturday 5–6 PM.\n10% discount for siblings."}
              />
            </label>
            <FormHint>
              Each line becomes a bullet point on the website. Write important details like age group, schedule days, and any special notes.
            </FormHint>
          </div>

          {/* Schedule */}
          <div>
            <label className="text-base font-bold text-slate-800">
              Schedule / Time Slots (one per line)
              <textarea
                name="timeSlots"
                defaultValue={
                  Array.isArray(current?.timeSlots)
                    ? (current.timeSlots as { label?: string }[])
                        .map((s) => (typeof s === 'string' ? s : s?.label ?? ''))
                        .filter(Boolean)
                        .join('\n')
                    : ''
                }
                rows={2}
                className="mt-2 w-full"
                placeholder={"Monday, Wednesday 7–8 PM\nFriday 11 AM–12 PM"}
              />
            </label>
            <FormHint>
              The schedule shown on the website for this program. Write each time slot on its own line.
            </FormHint>
          </div>

          {/* Pricing */}
          <div className="rounded-2xl border-2 border-[var(--border-muted)] bg-[var(--bg-card-muted)] p-5 space-y-5">
            <p className="text-lg font-bold text-slate-800">Pricing</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-base font-bold text-slate-800">
                  Price Type
                  <select name="pricingType" defaultValue={current?.pricingType ?? 'FIXED'} className="mt-2 w-full">
                    {PRICING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <FormHint>Choose "Fixed price" to show a price, or "Contact for pricing" if the price depends on the student.</FormHint>
              </div>
              <div>
                <label className="text-base font-bold text-slate-800">
                  Price (JOD)
                  <input
                    name="currentPriceJod"
                    type="number"
                    min={0}
                    defaultValue={current?.currentPriceJod ?? ''}
                    className="mt-2 w-full"
                    placeholder="e.g. 120"
                  />
                </label>
                <FormHint>Only needed if price type is "Fixed price". Leave empty otherwise.</FormHint>
              </div>
            </div>
          </div>

          {/* Advanced settings */}
          <details className="rounded-2xl border-2 border-[var(--border-muted)] bg-[var(--bg-card-muted)] p-5">
            <summary className="cursor-pointer text-lg font-bold text-slate-800">
              Advanced Settings
            </summary>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-base font-bold text-slate-800">
                  Sessions Count
                  <input name="sessionsCount" type="number" min={0} defaultValue={current?.sessionsCount ?? 0} className="mt-2 w-full" />
                </label>
                <FormHint>Number of sessions included. Set to 0 if not session-based.</FormHint>
              </div>
              <div>
                <label className="text-base font-bold text-slate-800">
                  Tracking Type
                  <select name="trackingType" defaultValue={current?.trackingType ?? 'SESSIONS'} className="mt-2 w-full">
                    {TRACKING_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <FormHint>How attendance is tracked for registrations in the portal.</FormHint>
              </div>
              <div>
                <label className="text-base font-bold text-slate-800">
                  Sort Order
                  <input name="sortOrder" type="number" min={0} defaultValue={current?.sortOrder ?? 0} className="mt-2 w-full" />
                </label>
                <FormHint>Lower numbers appear first on the website. You can also use the arrows in the list below.</FormHint>
              </div>
            </div>
          </details>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={current?.isActive !== false}
              className="h-5 w-5 rounded border-2 border-slate-300"
              id="isActive"
            />
            <label htmlFor="isActive" className="text-base font-bold text-slate-800 cursor-pointer">
              Show on the website
            </label>
            <span className="text-sm text-[var(--text-muted)]">(Uncheck to hide this program without deleting it)</span>
          </div>

          {/* Status message */}
          {(editing ? editState : createState).message && (
            <p className={`rounded-xl px-4 py-3 text-base font-semibold ${(editing ? editState : createState).status === 'success' ? 'bg-green-50 text-green-800 border-2 border-green-200' : 'bg-red-50 text-red-800 border-2 border-red-200'}`}>
              {(editing ? editState : createState).message}
            </p>
          )}

          <SubmitButton label={editing ? 'Save Changes' : 'Create Program'} pending={pending} />
        </form>
      </div>

      {/* Program list */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-slate-900">
          Your Programs ({packages.length})
        </h3>
        <p className="text-base text-[var(--text-muted)]">
          These are the programs currently on your website. Click <strong>Edit</strong> to make changes, or use the arrows to change the order.
        </p>

        <div className="space-y-3">
          {packages.map((pkg, idx) => (
            <div key={pkg.id} className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-4">
                {/* Reorder */}
                <div className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => moveOrder(pkg, 'up')}
                    disabled={idx === 0 || pending}
                    className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-base font-bold disabled:opacity-30 hover:bg-slate-50"
                    title="Move up"
                  >
                    &#9650;
                  </button>
                  <button
                    type="button"
                    onClick={() => moveOrder(pkg, 'down')}
                    disabled={idx === packages.length - 1 || pending}
                    className="rounded-lg border-2 border-slate-200 px-3 py-1.5 text-base font-bold disabled:opacity-30 hover:bg-slate-50"
                    title="Move down"
                  >
                    &#9660;
                  </button>
                </div>

                {/* Info */}
                <div>
                  <p className="text-lg font-bold text-slate-900">{pkg.name}</p>
                  <p className="text-base text-slate-600">
                    {pkg.sportType}
                    {' · '}
                    {pkg.pricingType === 'MANUAL' ? 'Contact for pricing' : `${pkg.currentPriceJod ?? 0} JOD`}
                    {!pkg.isActive && (
                      <span className="ml-2 rounded-full bg-amber-100 px-3 py-0.5 text-sm font-bold text-amber-800">Hidden</span>
                    )}
                  </p>
                  {Array.isArray(pkg.timeSlots) && pkg.timeSlots.length > 0 && (
                    <p className="mt-1 text-base font-medium text-blue-700">
                      {(pkg.timeSlots as { label?: string }[]).map((s) => (typeof s === 'string' ? s : s?.label ?? '')).filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(pkg);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="rounded-xl border-2 border-[var(--primary)] px-5 py-2.5 text-base font-bold text-[var(--primary)] hover:bg-blue-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(pkg.id)}
                  disabled={pending}
                  className="rounded-xl border-2 border-red-300 px-5 py-2.5 text-base font-bold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {packages.length === 0 && (
            <div className="glass-card p-8 text-center">
              <p className="text-lg text-[var(--text-muted)]">No programs yet. Use the form above to create your first one.</p>
            </div>
          )}
        </div>

        {deleteState.message && (
          <p className={`rounded-xl px-4 py-3 text-base font-semibold ${deleteState.status === 'success' ? 'bg-green-50 text-green-800 border-2 border-green-200' : 'bg-red-50 text-red-800 border-2 border-red-200'}`}>
            {deleteState.message}
          </p>
        )}
      </div>
    </div>
  );
}

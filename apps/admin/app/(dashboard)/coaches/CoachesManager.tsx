'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/apiClient';
import { FileUpload } from '../../_components/FileUpload';
import { useActionToast } from '../../_components/useActionToast';

type CoachItem = {
  id: string;
  name: string;
  sport: string;
  description: string;
  quote?: string | null;
  achievements: string[];
  imageUrl: string;
  order: number;
  isActive: boolean;
};

type CoachState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

const initialState: CoachState = { status: 'idle' };
const appBaseUrl = (process.env.NEXT_PUBLIC_APP_BASE_URL || '').replace(/\/$/, '');

function resolveMediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return appBaseUrl ? `${appBaseUrl}${url}` : url;
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button
      type="submit"
      className="glow-button inline-flex items-center rounded-2xl px-4 py-2 text-sm font-semibold disabled:opacity-70"
      disabled={pending}
    >
      {pending ? 'Saving...' : label}
    </button>
  );
}

function normalizeCoach(input: any): CoachItem {
  return {
    id: input.id,
    name: input.name || '',
    sport: input.sport || '',
    description: input.description || '',
    quote: input.quote || null,
    achievements: Array.isArray(input.achievements)
      ? input.achievements.filter((entry: unknown) => typeof entry === 'string' && entry.trim().length > 0)
      : [],
    imageUrl: input.imageUrl || '',
    order: typeof input.order === 'number' ? input.order : 0,
    isActive: input.isActive !== false,
  };
}

export function CoachesManager() {
  const router = useRouter();
  const [coaches, setCoaches] = useState<CoachItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<CoachItem | null>(null);
  const [createState, setCreateState] = useState<CoachState>(initialState);
  const [editState, setEditState] = useState<CoachState>(initialState);
  const [deleteState, setDeleteState] = useState<CoachState>(initialState);
  const [imageUrl, setImageUrl] = useState('');
  const [formKey, setFormKey] = useState(0);

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  async function refreshCoaches() {
    const rows = await apiClient.getCoaches();
    setCoaches((rows || []).map(normalizeCoach));
  }

  useEffect(() => {
    async function load() {
      try {
        await refreshCoaches();
      } catch (error) {
        console.error('Failed to load coaches:', error);
        setCreateState({
          status: 'error',
          message: 'Failed to load coaches. Make sure API server is running.',
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (editing) {
      setImageUrl(editing.imageUrl || '');
    } else {
      setImageUrl('');
      setFormKey((value) => value + 1);
    }
  }, [editing]);

  const current = editing ?? undefined;
  const currentState = editing ? editState : createState;

  const achievementsDefault = useMemo(() => {
    return current?.achievements?.join('\n') || '';
  }, [current]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    event.preventDefault();
    if (!imageUrl) {
      const message = isEdit ? 'Coach image is required to update.' : 'Coach image is required.';
      (isEdit ? setEditState : setCreateState)({ status: 'error', message });
      return;
    }

    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    try {
      const formData = new FormData(event.currentTarget);
      const achievements = (formData.get('achievements')?.toString() || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);

      const payload = {
        name: formData.get('name')?.toString().trim() || '',
        sport: formData.get('sport')?.toString().trim() || '',
        description: formData.get('description')?.toString().trim() || '',
        quote: formData.get('quote')?.toString().trim() || undefined,
        achievements,
        imageUrl,
        order: Number(formData.get('order') || 0),
        isActive: formData.get('isActive')?.toString() !== 'hidden',
      };

      if (isEdit && editing) {
        await apiClient.updateCoach(editing.id, payload);
        stateSetter({ status: 'success', message: 'Coach updated successfully.' });
      } else {
        await apiClient.createCoach(payload);
        stateSetter({ status: 'success', message: 'Coach created successfully.' });
      }

      await refreshCoaches();
      setEditing(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to save coach:', error);
      stateSetter({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to save coach',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this coach?')) return;
    setPending(true);
    setDeleteState({ status: 'idle' });

    try {
      await apiClient.deleteCoach(id);
      await refreshCoaches();
      setDeleteState({ status: 'success', message: 'Coach deleted successfully.' });
      if (editing?.id === id) {
        setEditing(null);
      }
      router.refresh();
    } catch (error) {
      console.error('Failed to delete coach:', error);
      setDeleteState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete coach',
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-lg font-semibold">Loading coaches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'} coach</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {editing ? `Editing ${editing.name}` : 'Add coach profile'}
            </h3>
          </div>
          {editing ? (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel edit
            </button>
          ) : null}
        </div>

        <form
          key={editing ? editing.id : `create-${formKey}`}
          onSubmit={(event) => handleSubmit(event, Boolean(editing))}
          className="space-y-4"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-slate-600">
              Name
              <input
                name="name"
                defaultValue={current?.name}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Sport
              <input
                name="sport"
                defaultValue={current?.sport}
                placeholder="Basketball"
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
                required
              />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Sort order
              <input
                type="number"
                name="order"
                defaultValue={current?.order ?? 0}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>

          <label className="text-sm font-semibold text-slate-600">
            Description
            <textarea
              name="description"
              defaultValue={current?.description}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
              required
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Quote (optional)
            <input
              name="quote"
              defaultValue={current?.quote ?? ''}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>

          <label className="text-sm font-semibold text-slate-600">
            Achievements (one per line)
            <textarea
              name="achievements"
              defaultValue={achievementsDefault}
              rows={4}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>

          <FileUpload
            label="Coach image"
            type="image"
            currentUrl={resolveMediaUrl(imageUrl)}
            onUploadComplete={(url) => setImageUrl(url)}
          />

          <label className="text-sm font-semibold text-slate-600">
            Visibility
            <select
              name="isActive"
              defaultValue={current?.isActive === false ? 'hidden' : 'visible'}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            >
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>

          {currentState.message ? (
            <p className={`text-sm ${currentState.status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
              {currentState.message}
            </p>
          ) : null}

          <SubmitButton label={editing ? 'Save coach' : 'Create coach'} pending={pending} />
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Coaches</p>
            <p className="font-display text-xl font-semibold text-slate-900">{coaches.length} total</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {coaches.map((coach) => (
            <div key={coach.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveMediaUrl(coach.imageUrl)} alt={coach.name} className="h-full w-full object-cover" />
              </div>

              <div className="flex-1">
                <p className="font-semibold text-slate-900">{coach.name}</p>
                <p className="text-xs text-slate-500">
                  {coach.sport} - {coach.achievements.length} achievement{coach.achievements.length === 1 ? '' : 's'}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {coach.isActive ? 'Visible' : 'Hidden'}
              </span>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setEditing(coach)}
              >
                Edit
              </button>
              <button
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500"
                onClick={() => handleDelete(coach.id)}
                disabled={pending}
              >
                Delete
              </button>
            </div>
          ))}
        </div>

        {deleteState.message ? (
          <p className={`px-6 py-3 text-sm ${deleteState.status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
            {deleteState.message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

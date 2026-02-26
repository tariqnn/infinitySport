'use client';

import { useState, useEffect } from 'react';
import type { LandingProgram } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { FileUpload } from '../../_components/FileUpload';

interface ProgramState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: ProgramState = { status: 'idle' };

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

export function ProgramsManager() {
  const [programs, setPrograms] = useState<LandingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingProgram | null>(null);
  const [createState, setCreateState] = useState<ProgramState>(initialState);
  const [editState, setEditState] = useState<ProgramState>(initialState);
  const [deleteState, setDeleteState] = useState<ProgramState>(initialState);
  const [pending, setPending] = useState(false);
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function loadPrograms() {
      try {
        const apiPrograms = await apiClient.getPrograms();
        // Transform API programs to LandingProgram format
        const transformed: LandingProgram[] = apiPrograms.map((p: any) => ({
          id: p.id,
          title: p.name,
          description: p.description,
          sportType: p.level || 'multi',
          badge: p.level || undefined,
          link: `/sports#${p.slug}`,
          mediaUrl: undefined, // Programs don't have mediaUrl in current schema
          isFeatured: p.highlight || false,
          isActive: true,
        }));
        setPrograms(transformed);
      } catch (error) {
        console.error('Failed to load programs:', error);
        setCreateState({ 
          status: 'error', 
          message: 'Failed to load programs. Make sure API server is running.' 
        });
      } finally {
        setLoading(false);
      }
    }
    loadPrograms();
  }, []);

  useEffect(() => {
    if (editing) {
      setMediaUrl(editing.mediaUrl || '');
    } else {
      setMediaUrl('');
    }
  }, [editing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    try {
      const formData = new FormData(form);
      const title = formData.get('title')?.toString() || '';
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

      const payload = {
        name: title,
        description: formData.get('description')?.toString() || '',
        level: formData.get('sportType')?.toString() || undefined,
        slug: slug,
        highlight: formData.get('isFeatured')?.toString() === 'featured',
        order: 0,
      };

      if (isEdit && editing) {
        await apiClient.updateProgram(editing.id, payload);
        stateSetter({ status: 'success', message: 'Program updated successfully!' });
      } else {
        await apiClient.createProgram(payload);
        stateSetter({ status: 'success', message: 'Program created successfully!' });
      }

      // Reload programs
      const apiPrograms = await apiClient.getPrograms();
      const transformed: LandingProgram[] = apiPrograms.map((p: any) => ({
        id: p.id,
        title: p.name,
        description: p.description,
        sportType: p.level || 'multi',
        badge: p.level || undefined,
        link: `/sports#${p.slug}`,
        mediaUrl: undefined,
        isFeatured: p.highlight || false,
        isActive: true,
      }));
      setPrograms(transformed);
      setEditing(null);
      setMediaUrl('');
      form.reset();
      router.refresh();
    } catch (error) {
      console.error('Failed to save program:', error);
      stateSetter({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save program' 
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this program?')) return;

    setPending(true);
    setDeleteState({ status: 'idle' });

    try {
      await apiClient.deleteProgram(id);
      setDeleteState({ status: 'success', message: 'Program deleted successfully!' });
      
      // Reload programs
      const apiPrograms = await apiClient.getPrograms();
      const transformed: LandingProgram[] = apiPrograms.map((p: any) => ({
        id: p.id,
        title: p.name,
        description: p.description,
        sportType: p.level || 'multi',
        badge: p.level || undefined,
        link: `/sports#${p.slug}`,
        mediaUrl: undefined,
        isFeatured: p.highlight || false,
        isActive: true,
      }));
      setPrograms(transformed);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete program:', error);
      setDeleteState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete program' 
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading programs...</p>
        </div>
      </div>
    );
  }

  const targetProgram = editing ?? undefined;

  return (
    <div className="space-y-8">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'}</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {editing ? `Editing ${editing.title}` : 'Add new program'}
            </h3>
          </div>
          {editing ? (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setMediaUrl('');
              }}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={(e) => handleSubmit(e, !!editing)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Title
              <input name="title" defaultValue={targetProgram?.title} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Sport type
              <input name="sportType" defaultValue={targetProgram?.sportType ?? 'basketball'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Badge
              <input name="badge" defaultValue={targetProgram?.badge ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Link
              <input name="link" defaultValue={targetProgram?.link ?? '/programs'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="text-sm font-semibold text-slate-600">
            Description
            <textarea
              name="description"
              defaultValue={targetProgram?.description}
              rows={3}
              className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            />
          </label>
          
          <div>
            <FileUpload
              label="Program Image/Video"
              type="media"
              currentUrl={mediaUrl}
              onUploadComplete={(url) => {
                setMediaUrl(url);
                // Store in a hidden input for form submission
                const hiddenInput = document.querySelector('input[name="mediaUrl"]') as HTMLInputElement;
                if (hiddenInput) {
                  hiddenInput.value = url;
                }
              }}
            />
            <input type="hidden" name="mediaUrl" value={mediaUrl} />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-semibold text-slate-600">
              Feature level
              <select name="isFeatured" defaultValue={targetProgram?.isFeatured ? 'featured' : 'standard'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
                <option value="featured">Featured card</option>
                <option value="standard">Standard</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Visibility
              <select name="isActive" defaultValue={targetProgram?.isActive === false ? 'hidden' : 'visible'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </select>
            </label>
          </div>
          {(editing ? editState : createState).message ? (
            <p className={`text-sm ${(editing ? editState : createState).status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
              {(editing ? editState : createState).message}
            </p>
          ) : null}
          <SubmitButton label={editing ? 'Save changes' : 'Create program'} pending={pending} />
        </form>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Programs</p>
            <p className="font-display text-xl font-semibold text-slate-900">{programs.length} total</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {programs.map((program) => (
            <div key={program.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{program.title}</p>
                <p className="text-xs text-slate-500">
                  {program.sportType} - {program.link}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {program.isActive === false ? 'Hidden' : program.isFeatured ? 'Featured' : 'Standard'}
              </span>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setEditing(program)}
              >
                Edit
              </button>
              <button 
                className="rounded-full border border-red-100 px-3 py-1 text-xs font-semibold text-red-500" 
                onClick={() => handleDelete(program.id)}
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

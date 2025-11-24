'use client';

import { useState, useEffect } from 'react';
import type { LandingFacilityHighlight } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { FileUpload } from '../../_components/FileUpload';

interface FacilityState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: FacilityState = { status: 'idle' };

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

export function FacilitiesManager() {
  const [facilities, setFacilities] = useState<LandingFacilityHighlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingFacilityHighlight | null>(null);
  const [createState, setCreateState] = useState<FacilityState>(initialState);
  const [editState, setEditState] = useState<FacilityState>(initialState);
  const [deleteState, setDeleteState] = useState<FacilityState>(initialState);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function loadFacilities() {
      try {
        const apiFacilities = await apiClient.getFacilities();
        // Transform API facilities to LandingFacilityHighlight format
        const transformed: LandingFacilityHighlight[] = apiFacilities.map((f: any) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          mediaUrl: f.imageUrl || undefined,
          badge: undefined,
        }));
        setFacilities(transformed);
      } catch (error) {
        console.error('Failed to load facilities:', error);
        setCreateState({ 
          status: 'error', 
          message: 'Failed to load facilities. Make sure API server is running.' 
        });
      } finally {
        setLoading(false);
      }
    }
    loadFacilities();
  }, []);

  useEffect(() => {
    if (editing) {
      setImageUrl(editing.mediaUrl || '');
    } else {
      setImageUrl('');
    }
  }, [editing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    e.preventDefault();
    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    try {
      const formData = new FormData(e.currentTarget);

      const payload = {
        name: formData.get('name')?.toString() || '',
        description: formData.get('description')?.toString() || '',
        imageUrl: imageUrl || undefined,
      };

      if (isEdit && editing) {
        await apiClient.updateFacility(editing.id, payload);
        stateSetter({ status: 'success', message: 'Facility updated successfully!' });
      } else {
        await apiClient.createFacility(payload);
        stateSetter({ status: 'success', message: 'Facility created successfully!' });
      }

      // Reload facilities
      const apiFacilities = await apiClient.getFacilities();
      const transformed: LandingFacilityHighlight[] = apiFacilities.map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        mediaUrl: f.imageUrl || undefined,
        badge: undefined,
      }));
      setFacilities(transformed);
      setEditing(null);
      setImageUrl('');
      e.currentTarget.reset();
      router.refresh();
    } catch (error) {
      console.error('Failed to save facility:', error);
      stateSetter({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save facility' 
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this facility?')) return;

    setPending(true);
    setDeleteState({ status: 'idle' });

    try {
      await apiClient.deleteFacility(id);
      setDeleteState({ status: 'success', message: 'Facility deleted successfully!' });
      
      // Reload facilities
      const apiFacilities = await apiClient.getFacilities();
      const transformed: LandingFacilityHighlight[] = apiFacilities.map((f: any) => ({
        id: f.id,
        name: f.name,
        description: f.description,
        mediaUrl: f.imageUrl || undefined,
        badge: undefined,
      }));
      setFacilities(transformed);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete facility:', error);
      setDeleteState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete facility' 
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading facilities...</p>
        </div>
      </div>
    );
  }

  const current = editing ?? undefined;

  return (
    <div className="space-y-8">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'} highlight</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {editing ? `Editing ${editing.name}` : 'Add facility highlight'}
            </h3>
          </div>
          {editing ? (
            <button type="button" onClick={() => {
              setEditing(null);
              setImageUrl('');
            }} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
              Cancel edit
            </button>
          ) : null}
        </div>
        <form onSubmit={(e) => handleSubmit(e, !!editing)} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Name
              <input name="name" defaultValue={current?.name} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Badge
              <input name="badge" defaultValue={current?.badge ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <label className="text-sm font-semibold text-slate-600">
            Description
            <textarea name="description" defaultValue={current?.description} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          
          <div>
            <FileUpload
              label="Facility Image/Video"
              type="media"
              currentUrl={imageUrl}
              onUploadComplete={(url) => {
                setImageUrl(url);
                const hiddenInput = document.querySelector('input[name="imageUrl"]') as HTMLInputElement;
                if (hiddenInput) {
                  hiddenInput.value = url;
                }
              }}
            />
            <input type="hidden" name="imageUrl" value={imageUrl} />
          </div>
          {(editing ? editState : createState).message ? (
            <p className={`text-sm ${(editing ? editState : createState).status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
              {(editing ? editState : createState).message}
            </p>
          ) : null}
          <SubmitButton label={editing ? 'Save highlight' : 'Create highlight'} pending={pending} />
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {facilities.map((facility) => (
          <div key={facility.id} className="glass-card space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-slate-900">{facility.name}</p>
                <p className="text-xs text-slate-500">{facility.badge}</p>
              </div>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setEditing(facility)}
              >
                Edit
              </button>
            </div>
            <p className="text-sm text-slate-600">{facility.description}</p>
            <div className="flex gap-3">
              <a href={facility.mediaUrl ?? '#'} target="_blank" rel="noreferrer" className="text-xs font-semibold text-brand-blue">
                Preview media
              </a>
              <button 
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500" 
                onClick={() => handleDelete(facility.id)}
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

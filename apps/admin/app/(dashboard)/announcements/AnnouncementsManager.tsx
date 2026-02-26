'use client';

import { useState, useEffect } from 'react';
import type { LandingAnnouncement } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { FileUpload } from '../../_components/FileUpload';

interface AnnouncementState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: AnnouncementState = { status: 'idle' };

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

export function AnnouncementsManager() {
  const [announcements, setAnnouncements] = useState<LandingAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingAnnouncement | null>(null);
  const [createState, setCreateState] = useState<AnnouncementState>(initialState);
  const [editState, setEditState] = useState<AnnouncementState>(initialState);
  const [deleteState, setDeleteState] = useState<AnnouncementState>(initialState);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function loadAnnouncements() {
      try {
        const apiAnnouncements = (await apiClient.getAnnouncements()) as any[];
        // Transform API announcements to LandingAnnouncement format
        const transformed: LandingAnnouncement[] = apiAnnouncements.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.body,
          isPinned: a.isPinned || false,
          isActive: true,
          startDate: a.publishedAt ? new Date(a.publishedAt).toISOString().split('T')[0] : undefined,
          endDate: undefined,
          link: '/contact',
          imageUrl: a.imageUrl || undefined,
        }));
        setAnnouncements(transformed);
      } catch (error) {
        console.error('Failed to load announcements:', error);
        setCreateState({ 
          status: 'error', 
          message: 'Failed to load announcements. Make sure API server is running.' 
        });
      } finally {
        setLoading(false);
      }
    }
    loadAnnouncements();
  }, []);

  useEffect(() => {
    if (editing) {
      setImageUrl(editing.imageUrl || '');
    } else {
      setImageUrl('');
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
      const startDate = formData.get('startDate')?.toString();
      const publishedAt = startDate ? new Date(startDate) : new Date();

      const payload = {
        title: formData.get('title')?.toString() || '',
        body: formData.get('message')?.toString() || '',
        imageUrl: imageUrl || undefined,
        publishedAt: publishedAt,
        isPinned: formData.get('isPinned')?.toString() === 'pinned',
      };

      if (isEdit && editing) {
        await apiClient.updateAnnouncement(editing.id, payload);
        stateSetter({ status: 'success', message: 'Announcement updated successfully!' });
      } else {
        await apiClient.createAnnouncement(payload);
        stateSetter({ status: 'success', message: 'Announcement created successfully!' });
      }

      // Reload announcements
      const apiAnnouncements = (await apiClient.getAnnouncements()) as any[];
        const transformed: LandingAnnouncement[] = apiAnnouncements.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.body,
          isPinned: a.isPinned || false,
          isActive: true,
          startDate: a.publishedAt ? new Date(a.publishedAt).toISOString().split('T')[0] : undefined,
          endDate: undefined,
          link: '/contact',
          imageUrl: a.imageUrl || undefined,
        }));
        setAnnouncements(transformed);
        setEditing(null);
        setImageUrl('');
        form.reset();
        router.refresh();
    } catch (error) {
      console.error('Failed to save announcement:', error);
      stateSetter({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save announcement' 
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    setPending(true);
    setDeleteState({ status: 'idle' });

    try {
      await apiClient.deleteAnnouncement(id);
      setDeleteState({ status: 'success', message: 'Announcement deleted successfully!' });
      
      // Reload announcements
      const apiAnnouncements = (await apiClient.getAnnouncements()) as any[];
        const transformed: LandingAnnouncement[] = apiAnnouncements.map((a: any) => ({
          id: a.id,
          title: a.title,
          message: a.body,
          isPinned: a.isPinned || false,
          isActive: true,
          startDate: a.publishedAt ? new Date(a.publishedAt).toISOString().split('T')[0] : undefined,
          endDate: undefined,
          link: '/contact',
          imageUrl: a.imageUrl || undefined,
        }));
        setAnnouncements(transformed);
        router.refresh();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      setDeleteState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete announcement' 
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading announcements...</p>
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
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'} banner</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {editing ? `Editing ${editing.title}` : 'Add hero announcement'}
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
          <label className="text-sm font-semibold text-slate-600">
            Title
            <input name="title" defaultValue={current?.title} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
          </label>
          <label className="text-sm font-semibold text-slate-600">
            Message
            <textarea name="message" defaultValue={current?.message} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
          </label>
          
          <div>
            <FileUpload
              label="Announcement Image/Video (optional)"
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

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Start date
              <input type="date" name="startDate" defaultValue={current?.startDate ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              End date
              <input type="date" name="endDate" defaultValue={current?.endDate ?? ''} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-600">
              Link
              <input name="link" defaultValue={current?.link ?? '/contact'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
            </label>
            <label className="text-sm font-semibold text-slate-600">
              Pinned state
              <select name="isPinned" defaultValue={current?.isPinned ? 'pinned' : 'standard'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
                <option value="pinned">Pinned to hero</option>
                <option value="standard">Standard</option>
              </select>
            </label>
          </div>
          <label className="text-sm font-semibold text-slate-600">
            Visibility
            <select name="isActive" defaultValue={current?.isActive === false ? 'hidden' : 'visible'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
              <option value="visible">Visible</option>
              <option value="hidden">Hidden</option>
            </select>
          </label>
          {(editing ? editState : createState).message ? (
            <p className={`text-sm ${(editing ? editState : createState).status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
              {(editing ? editState : createState).message}
            </p>
          ) : null}
          <SubmitButton label={editing ? 'Save announcement' : 'Publish announcement'} pending={pending} />
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="glass-card space-y-3 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-xl font-semibold text-slate-900">{announcement.title}</p>
                <p className="text-xs text-slate-500">
                  {announcement.startDate || 'Now'} - {announcement.endDate || 'Open'}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {announcement.isActive === false ? 'Hidden' : announcement.isPinned ? 'Pinned' : 'Active'}
              </span>
            </div>
            <p className="text-sm text-slate-600">{announcement.message}</p>
            <div className="flex gap-3">
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setEditing(announcement)}
              >
                Edit
              </button>
              <button 
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500" 
                onClick={() => handleDelete(announcement.id)}
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

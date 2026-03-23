'use client';

import { useState, useEffect } from 'react';
import type { LandingEvent } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';
import { FileUpload } from '../../_components/FileUpload';

interface EventState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

/** Admin API row (Prisma + Firestore academyEvents); `endAt` optional for mobile app. */
type AdminEventRow = LandingEvent & { endAt?: string | Date | null };

const initialState: EventState = { status: 'idle' };
const appBaseUrl = (process.env.NEXT_PUBLIC_APP_BASE_URL || '').replace(/\/$/, '');

function resolveMediaUrl(url?: string): string {
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
      {pending ? 'Saving…' : label}
    </button>
  );
}

function toDatetimeLocalValue(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 16);
}

export function EventsManager() {
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminEventRow | null>(null);
  const [createState, setCreateState] = useState<EventState>(initialState);
  const [editState, setEditState] = useState<EventState>(initialState);
  const [deleteState, setDeleteState] = useState<EventState>(initialState);
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [formKey, setFormKey] = useState(0);
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function loadEvents() {
      try {
        const apiEvents = await apiClient.getEvents();
        // Transform API events to LandingEvent format
        const transformed: AdminEventRow[] = apiEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          endAt: e.endAt ?? undefined,
          location: e.location,
          description: e.description || undefined,
          imageUrl: e.imageUrl || undefined,
          link: '/events',
          isActive: e.highlight !== false,
        }));
        setEvents(transformed);
      } catch (error) {
        console.error('Failed to load events:', error);
        setCreateState({ 
          status: 'error', 
          message: 'Failed to load events. Make sure API server is running.' 
        });
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, []);

  useEffect(() => {
    if (editing) {
      setImageUrl(editing.imageUrl || '');
    } else {
      setImageUrl('');
      setFormKey((value) => value + 1);
    }
  }, [editing]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    e.preventDefault();
    if (!imageUrl) {
      const stateSetter = isEdit ? setEditState : setCreateState;
      stateSetter({ status: 'error', message: 'Event image is required.' });
      return;
    }

    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    try {
      const formData = new FormData(e.currentTarget);
      const dateStr = formData.get('date')?.toString() || '';
      const date = new Date(dateStr);

      const endAtStr = formData.get('endAt')?.toString() || '';
      const endAt = endAtStr ? new Date(endAtStr) : null;

      const payload = {
        title: formData.get('title')?.toString() || '',
        description: formData.get('description')?.toString() || undefined,
        date: date,
        endAt,
        location: formData.get('location')?.toString() || 'Infinity Campus',
        imageUrl,
        highlight: formData.get('isActive')?.toString() !== 'hidden',
      };

      if (isEdit && editing) {
        await apiClient.updateEvent(editing.id, payload);
        stateSetter({ status: 'success', message: 'Event updated successfully!' });
      } else {
        await apiClient.createEvent(payload);
        stateSetter({ status: 'success', message: 'Event created successfully!' });
      }

      // Reload events
      const apiEvents = await apiClient.getEvents();
      const transformed: AdminEventRow[] = apiEvents.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        endAt: e.endAt ?? undefined,
        location: e.location,
        description: e.description || undefined,
        imageUrl: e.imageUrl || undefined,
        link: '/events',
        isActive: e.highlight !== false,
      }));
      setEvents(transformed);
      setEditing(null);
      if (!isEdit) {
        setFormKey((value) => value + 1);
      }
      router.refresh();
    } catch (error) {
      console.error('Failed to save event:', error);
      stateSetter({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to save event' 
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    setPending(true);
    setDeleteState({ status: 'idle' });

    try {
      await apiClient.deleteEvent(id);
      setDeleteState({ status: 'success', message: 'Event deleted successfully!' });
      
      // Reload events
      const apiEvents = await apiClient.getEvents();
      const transformed: AdminEventRow[] = apiEvents.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        endAt: e.endAt ?? undefined,
        location: e.location,
        description: e.description || undefined,
        imageUrl: e.imageUrl || undefined,
        link: '/events',
        isActive: e.highlight !== false,
      }));
      setEvents(transformed);
      router.refresh();
    } catch (error) {
      console.error('Failed to delete event:', error);
      setDeleteState({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Failed to delete event' 
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading events...</p>
        </div>
      </div>
    );
  }

  const current = editing ?? undefined;

  const renderForm = (isEditing: boolean) => (
        <form
          key={isEditing && editing ? editing.id : `create-${formKey}`}
          onSubmit={(e) => handleSubmit(e, isEditing)}
          className="space-y-4"
        >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-600">
          Title
          <input name="title" defaultValue={current?.title} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Start (date & time)
          <input
            type="datetime-local"
            name="date"
            defaultValue={current ? new Date(current.date).toISOString().slice(0, 16) : ''}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            required
          />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          End (optional)
          <input
            type="datetime-local"
            name="endAt"
            defaultValue={current?.endAt ? toDatetimeLocalValue(current.endAt) : ''}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Location
          <input name="location" defaultValue={current?.location ?? 'Infinity Campus'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Link
          <input name="link" defaultValue={current?.link ?? '/events'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
        </label>
      </div>
      <label className="text-sm font-semibold text-slate-600">
        Description
        <textarea name="description" defaultValue={current?.description} rows={3} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" />
      </label>
      <FileUpload
        label="Event image"
        type="image"
        currentUrl={resolveMediaUrl(imageUrl)}
        onUploadComplete={(url) => setImageUrl(url)}
      />
      <label className="text-sm font-semibold text-slate-600">
        Published (Infinity Track app)
        <select name="isActive" defaultValue={current?.isActive === false ? 'hidden' : 'visible'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          <option value="visible">Published — show in app & notifications</option>
          <option value="hidden">Draft — not listed in app</option>
        </select>
      </label>
      {(isEditing ? editState : createState).message ? (
        <p className={`text-sm ${(isEditing ? editState : createState).status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>
          {(isEditing ? editState : createState).message}
        </p>
      ) : null}
      <SubmitButton label={isEditing ? 'Save event' : 'Publish event'} pending={pending} />
    </form>
  );

  return (
    <div className="space-y-8">
      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{editing ? 'Update' : 'Create'} event</p>
            <h3 className="font-display text-2xl font-semibold text-slate-900">
              {editing ? `Editing ${editing.title}` : 'Add upcoming event'}
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
        {renderForm(Boolean(editing))}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Live calendar</p>
            <p className="font-display text-xl font-semibold text-slate-900">{events.length} events</p>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {events.map((event) => (
            <div key={event.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
              {event.imageUrl ? (
                <div className="h-14 w-14 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={resolveMediaUrl(event.imageUrl)} alt={event.title} className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(event.date).toLocaleString()} - {event.location}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {event.isActive === false ? 'Draft' : 'Published'}
              </span>
              <button
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                onClick={() => setEditing(event)}
              >
                Edit
              </button>
              <button 
                className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-500" 
                onClick={() => handleDelete(event.id)}
                disabled={pending}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        {deleteState.message ? (
          <p className={`px-6 py-3 text-sm ${deleteState.status === 'success' ? 'text-brand-green-dark' : 'text-red-500'}`}>{deleteState.message}</p>
        ) : null}
      </div>
    </div>
  );
}

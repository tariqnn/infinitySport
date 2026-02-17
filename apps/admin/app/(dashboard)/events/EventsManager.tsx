'use client';

import { useState, useEffect } from 'react';
import type { LandingEvent } from '@infinity/types';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';
import { useRouter } from 'next/navigation';

interface EventState {
  status: 'idle' | 'success' | 'error';
  message?: string;
}

const initialState: EventState = { status: 'idle' };

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

export function EventsManager() {
  const [events, setEvents] = useState<LandingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingEvent | null>(null);
  const [createState, setCreateState] = useState<EventState>(initialState);
  const [editState, setEditState] = useState<EventState>(initialState);
  const [deleteState, setDeleteState] = useState<EventState>(initialState);
  const [pending, setPending] = useState(false);
  const router = useRouter();

  useActionToast(createState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    async function loadEvents() {
      try {
        const apiEvents = await apiClient.getEvents();
        // Transform API events to LandingEvent format
        const transformed: LandingEvent[] = apiEvents.map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          location: e.location,
          description: e.description || undefined,
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>, isEdit: boolean) {
    e.preventDefault();
    setPending(true);
    const stateSetter = isEdit ? setEditState : setCreateState;
    stateSetter({ status: 'idle' });

    try {
      const formData = new FormData(e.currentTarget);
      const dateStr = formData.get('date')?.toString() || '';
      const date = new Date(dateStr);

      const payload = {
        title: formData.get('title')?.toString() || '',
        description: formData.get('description')?.toString() || undefined,
        date: date,
        location: formData.get('location')?.toString() || 'Infinity Campus',
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
      const transformed: LandingEvent[] = apiEvents.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description || undefined,
        link: '/events',
        isActive: e.highlight !== false,
      }));
      setEvents(transformed);
      setEditing(null);
      e.currentTarget.reset();
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
      const transformed: LandingEvent[] = apiEvents.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description || undefined,
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
    <form onSubmit={(e) => handleSubmit(e, isEditing)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold text-slate-600">
          Title
          <input name="title" defaultValue={current?.title} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2" required />
        </label>
        <label className="text-sm font-semibold text-slate-600">
          Date & time
          <input
            type="datetime-local"
            name="date"
            defaultValue={current ? new Date(current.date).toISOString().slice(0, 16) : ''}
            className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2"
            required
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
      <label className="text-sm font-semibold text-slate-600">
        Visibility
        <select name="isActive" defaultValue={current?.isActive === false ? 'hidden' : 'visible'} className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2">
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
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
            <button type="button" onClick={() => setEditing(null)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
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
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(event.date).toLocaleString()} - {event.location}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {event.isActive === false ? 'Hidden' : 'Visible'}
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

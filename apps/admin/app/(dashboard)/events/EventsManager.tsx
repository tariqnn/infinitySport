'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Clock3,
  Eye,
  Film,
  ImageIcon,
  Link2,
  MapPin,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { FileUpload } from '../../_components/FileUpload';
import { useActionToast } from '../../_components/useActionToast';
import { apiClient } from '../../../lib/apiClient';

type EventState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
};

type ContentType = 'GALLERY' | 'VIDEO';

type AdminApiEvent = {
  id: string;
  title: string;
  slug?: string | null;
  date: string;
  endAt?: string | Date | null;
  location?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  galleryUrls?: string[];
  contentType?: ContentType;
  registrationUrl?: string | null;
  highlight?: boolean;
};

type EventForm = {
  title: string;
  slug: string;
  description: string;
  date: string;
  endAt: string;
  location: string;
  imageUrl: string;
  videoUrl: string;
  galleryUrls: string[];
  contentType: ContentType;
  registrationUrl: string;
  published: boolean;
};

const initialState: EventState = { status: 'idle' };
const appBaseUrl = (process.env.NEXT_PUBLIC_APP_BASE_URL || '').replace(/\/$/, '');
const websiteBaseUrl = (process.env.NEXT_PUBLIC_WEBSITE_URL || 'http://localhost:3000').replace(/\/$/, '');

function resolveMediaUrl(url?: string | null): string {
  if (!url) return '';
  if (/^https?:\/\//.test(url)) return url;
  return appBaseUrl ? `${appBaseUrl}${url}` : url;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toDatetimeLocalValue(value?: string | Date | null): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function emptyForm(): EventForm {
  return {
    title: '',
    slug: '',
    description: '',
    date: '',
    endAt: '',
    location: 'Infinity Sports',
    imageUrl: '',
    videoUrl: '',
    galleryUrls: [],
    contentType: 'GALLERY',
    registrationUrl: '',
    published: false,
  };
}

function eventToForm(event: AdminApiEvent): EventForm {
  return {
    title: event.title,
    slug: event.slug || slugify(event.title),
    description: event.description || '',
    date: toDatetimeLocalValue(event.date),
    endAt: toDatetimeLocalValue(event.endAt),
    location: event.location || 'Infinity Sports',
    imageUrl: event.imageUrl || '',
    videoUrl: event.videoUrl || '',
    galleryUrls: Array.isArray(event.galleryUrls) ? event.galleryUrls : [],
    contentType: event.contentType === 'VIDEO' ? 'VIDEO' : 'GALLERY',
    registrationUrl: event.registrationUrl || '',
    published: event.highlight !== false,
  };
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/15';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-sm font-semibold text-slate-700">{children}</span>;
}

function ProductionPreview({ form }: { form: EventForm }) {
  const previewDate = form.date ? new Date(form.date) : null;
  const image = resolveMediaUrl(form.imageUrl);
  const video = resolveMediaUrl(form.videoUrl);
  const gallery = form.galleryUrls.map(resolveMediaUrl);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
      <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-3 min-w-0 flex-1 truncate rounded-md bg-white px-3 py-1 text-[10px] text-slate-400">
          infinitysports.jo/events/{form.slug || 'your-event'}
        </div>
      </div>
      <div className="bg-slate-950">
        <div className="relative aspect-[16/10] overflow-hidden">
          {form.contentType === 'VIDEO' && video ? (
            <video src={video} poster={image || undefined} controls className="h-full w-full object-cover" />
          ) : image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-900 to-[#003DA5] text-white/60">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#003DA5]">
            Admin preview
          </div>
        </div>
        <div className="space-y-4 p-5 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#60D394]">
              {previewDate && !Number.isNaN(previewDate.getTime())
                ? previewDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
                : 'Event date'}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold leading-tight">
              {form.title || 'Your event title'}
            </h3>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 text-[#60D394]" />
              {previewDate && !Number.isNaN(previewDate.getTime())
                ? previewDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                : 'Time'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#60D394]" />
              {form.location || 'Location'}
            </span>
          </div>
          <p className="line-clamp-3 text-sm leading-6 text-slate-300">
            {form.description || 'Add a description so visitors know what to expect from this event.'}
          </p>
          {form.contentType === 'GALLERY' && gallery.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {gallery.slice(0, 3).map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={url} src={url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              ))}
            </div>
          ) : null}
          <div className="flex gap-2">
            <span className="rounded-lg bg-[#60D394] px-3 py-2 text-xs font-bold text-slate-950">Event details</span>
            {form.registrationUrl ? (
              <span className="rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold">Register</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventsManager() {
  const [events, setEvents] = useState<AdminApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'UPCOMING' | 'PAST' | 'DRAFT'>('ALL');
  const [pending, setPending] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [galleryUploadKey, setGalleryUploadKey] = useState(0);
  const [actionState, setActionState] = useState<EventState>(initialState);
  const router = useRouter();

  useActionToast(actionState);

  const loadEvents = useCallback(async () => {
    const rows = (await apiClient.getEvents()) as AdminApiEvent[];
    setEvents(rows);
    return rows;
  }, []);

  useEffect(() => {
    loadEvents()
      .catch((error) => {
        console.error('Failed to load events:', error);
        setActionState({ status: 'error', message: 'Could not load events. Please try again.' });
      })
      .finally(() => setLoading(false));
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const query = search.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        !query ||
        event.title.toLowerCase().includes(query) ||
        (event.location || '').toLowerCase().includes(query);
      const eventTime = new Date(event.date).getTime();
      const matchesFilter =
        filter === 'ALL' ||
        (filter === 'DRAFT' && event.highlight === false) ||
        (filter === 'UPCOMING' && event.highlight !== false && eventTime >= now) ||
        (filter === 'PAST' && eventTime < now);
      return matchesSearch && matchesFilter;
    });
  }, [events, filter, search]);

  const stats = useMemo(() => {
    const now = Date.now();
    return {
      total: events.length,
      upcoming: events.filter((event) => event.highlight !== false && new Date(event.date).getTime() >= now).length,
      drafts: events.filter((event) => event.highlight === false).length,
    };
  }, [events]);

  function startNewEvent() {
    setEditingId(null);
    setForm(emptyForm());
    setSlugTouched(false);
    setActionState(initialState);
    setGalleryUploadKey((value) => value + 1);
  }

  function selectEvent(event: AdminApiEvent) {
    setEditingId(event.id);
    setForm(eventToForm(event));
    setSlugTouched(true);
    setActionState(initialState);
    setGalleryUploadKey((value) => value + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateForm<K extends keyof EventForm>(key: K, value: EventForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(title: string) {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugify(title),
    }));
  }

  function moveGalleryImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.galleryUrls.length) return;
    const next = [...form.galleryUrls];
    [next[index], next[target]] = [next[target], next[index]];
    updateForm('galleryUrls', next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.slug.trim() || !form.date || !form.imageUrl) {
      setActionState({ status: 'error', message: 'Title, page URL, start date, and cover image are required.' });
      return;
    }
    if (form.endAt && new Date(form.endAt) < new Date(form.date)) {
      setActionState({ status: 'error', message: 'The end time must be after the start time.' });
      return;
    }
    if (form.contentType === 'VIDEO' && !form.videoUrl) {
      setActionState({ status: 'error', message: 'Upload a featured video or switch to Gallery.' });
      return;
    }

    setPending(true);
    setActionState(initialState);
    const payload = {
      title: form.title.trim(),
      slug: slugify(form.slug),
      description: form.description.trim() || null,
      date: new Date(form.date).toISOString(),
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      location: form.location.trim() || 'Infinity Sports',
      imageUrl: form.imageUrl,
      videoUrl: form.videoUrl || null,
      galleryUrls: form.galleryUrls,
      contentType: form.contentType,
      registrationUrl: form.registrationUrl.trim() || null,
      highlight: form.published,
    };

    try {
      const saved = editingId
        ? ((await apiClient.updateEvent(editingId, payload)) as AdminApiEvent)
        : ((await apiClient.createEvent(payload)) as AdminApiEvent);
      const rows = await loadEvents();
      const selected = rows.find((row) => row.id === saved.id);
      if (selected) {
        setEditingId(selected.id);
        setForm(eventToForm(selected));
        setSlugTouched(true);
      }
      setActionState({
        status: 'success',
        message: form.published ? 'Event saved and published.' : 'Event saved as a draft.',
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to save event:', error);
      setActionState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to save event.',
      });
    } finally {
      setPending(false);
    }
  }

  async function handleDelete(id: string) {
    const event = events.find((row) => row.id === id);
    if (!window.confirm(`Delete “${event?.title || 'this event'}”? This cannot be undone.`)) return;
    setPending(true);
    try {
      await apiClient.deleteEvent(id);
      await loadEvents();
      if (editingId === id) startNewEvent();
      setActionState({ status: 'success', message: 'Event deleted.' });
      router.refresh();
    } catch (error) {
      setActionState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete event.',
      });
    } finally {
      setPending(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-slate-200 bg-white">
        <div className="text-center">
          <CalendarDays className="mx-auto h-8 w-8 animate-pulse text-[#003DA5]" />
          <p className="mt-3 text-sm font-semibold text-slate-600">Loading events…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#003DA5]">Website content</p>
          <h2 className="mt-1 font-display text-3xl font-bold text-slate-950">Events</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Create the public event page, choose its media, and check the production layout before publishing.
          </p>
        </div>
        <button
          type="button"
          onClick={startNewEvent}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#002d7a] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30"
        >
          <Plus className="h-4 w-4" />
          New event
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['All events', stats.total],
          ['Upcoming & live', stats.upcoming],
          ['Drafts', stats.drafts],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="overflow-hidden rounded-2xl border border-slate-200 bg-white xl:sticky xl:top-6">
          <div className="border-b border-slate-200 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search events"
                aria-label="Search events"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#003DA5] focus:ring-2 focus:ring-[#003DA5]/15"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(['ALL', 'UPCOMING', 'PAST', 'DRAFT'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-2.5 py-1.5 text-[11px] font-bold transition ${
                    filter === value ? 'bg-[#003DA5] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
            {filteredEvents.map((event) => {
              const active = editingId === event.id;
              return (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => selectEvent(event)}
                  className={`flex w-full gap-3 p-4 text-left transition ${
                    active ? 'bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                    {event.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={resolveMediaUrl(event.imageUrl)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="m-4 h-6 w-6 text-slate-400" />
                    )}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-slate-900">{event.title}</span>
                      {event.contentType === 'VIDEO' ? <Film className="h-3.5 w-3.5 shrink-0 text-[#003DA5]" /> : null}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {new Date(event.date).toLocaleDateString()} · {event.location || 'Infinity Sports'}
                    </span>
                    <span
                      className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        event.highlight === false
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {event.highlight === false ? 'Draft' : 'Published'}
                    </span>
                  </span>
                </button>
              );
            })}
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">No events match this view.</div>
            ) : null}
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="grid min-w-0 items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#003DA5]">1 · Basics</p>
                  <h3 className="mt-1 font-display text-xl font-bold text-slate-950">
                    {editingId ? 'Edit event details' : 'Create an event'}
                  </h3>
                </div>
                {editingId ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingId)}
                    disabled={pending}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="sm:col-span-2">
                  <FieldLabel>Event title *</FieldLabel>
                  <input
                    value={form.title}
                    onChange={(event) => updateTitle(event.target.value)}
                    placeholder="e.g. Infinity Basketball Open Day"
                    className={inputClass}
                    required
                  />
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Public page URL *</FieldLabel>
                  <div className="mt-1.5 flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-[#003DA5] focus-within:ring-2 focus-within:ring-[#003DA5]/15">
                    <span className="hidden items-center border-r border-slate-200 bg-slate-50 px-3 text-xs text-slate-500 sm:flex">
                      /events/
                    </span>
                    <input
                      value={form.slug}
                      onChange={(event) => {
                        setSlugTouched(true);
                        updateForm('slug', slugify(event.target.value));
                      }}
                      className="min-w-0 flex-1 px-3.5 py-2.5 text-sm outline-none"
                      placeholder="event-page-url"
                      required
                    />
                  </div>
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Description</FieldLabel>
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm('description', event.target.value)}
                    rows={6}
                    placeholder="Tell visitors what the event includes, who it is for, and what they should bring."
                    className={inputClass}
                  />
                  <span className="mt-1 block text-xs text-slate-400">{form.description.length} characters</span>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#003DA5]">2 · Schedule</p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-950">When and where</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label>
                  <FieldLabel>Starts *</FieldLabel>
                  <input
                    type="datetime-local"
                    value={form.date}
                    onChange={(event) => updateForm('date', event.target.value)}
                    className={inputClass}
                    required
                  />
                </label>
                <label>
                  <FieldLabel>Ends</FieldLabel>
                  <input
                    type="datetime-local"
                    value={form.endAt}
                    min={form.date || undefined}
                    onChange={(event) => updateForm('endAt', event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="sm:col-span-2">
                  <FieldLabel>Location</FieldLabel>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={form.location}
                      onChange={(event) => updateForm('location', event.target.value)}
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#003DA5]">3 · Media</p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-950">Choose the event experience</h3>
              <p className="mt-1 text-sm text-slate-500">The cover image is used on event cards and as the page poster.</p>
              <div className="mt-5">
                <FileUpload
                  label="Cover image *"
                  type="image"
                  currentUrl={resolveMediaUrl(form.imageUrl)}
                  onUploadComplete={(url) => updateForm('imageUrl', url)}
                />
              </div>
              <fieldset className="mt-6">
                <legend className="text-sm font-semibold text-slate-700">Main event content</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {([
                    ['GALLERY', ImageIcon, 'Photo gallery'],
                    ['VIDEO', Film, 'Featured video'],
                  ] as const).map(([value, Icon, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm('contentType', value)}
                      className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition ${
                        form.contentType === value
                          ? 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </fieldset>

              {form.contentType === 'VIDEO' ? (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                  <FileUpload
                    label="Featured video *"
                    type="video"
                    currentUrl={resolveMediaUrl(form.videoUrl)}
                    onUploadComplete={(url) => updateForm('videoUrl', url)}
                  />
                  <p className="mt-2 text-xs text-slate-500">MP4 or WebM recommended. Maximum upload size: 150 MB.</p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                    <FileUpload
                      key={galleryUploadKey}
                      label="Add gallery photo"
                      type="image"
                      onUploadComplete={(url) => {
                        if (!url) return;
                        setForm((current) => ({
                          ...current,
                          galleryUrls: current.galleryUrls.includes(url)
                            ? current.galleryUrls
                            : [...current.galleryUrls, url],
                        }));
                        setGalleryUploadKey((value) => value + 1);
                      }}
                    />
                  </div>
                  {form.galleryUrls.length > 0 ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {form.galleryUrls.map((url, index) => (
                        <div key={`${url}-${index}`} className="group relative overflow-hidden rounded-xl border border-slate-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolveMediaUrl(url)} alt={`Gallery image ${index + 1}`} className="aspect-video w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-2 pb-2 pt-8">
                            <span className="text-xs font-bold text-white">{index + 1}</span>
                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => moveGalleryImage(index, -1)}
                                disabled={index === 0}
                                aria-label="Move image earlier"
                                className="rounded-md bg-white/90 p-1.5 text-slate-800 disabled:opacity-40"
                              >
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveGalleryImage(index, 1)}
                                disabled={index === form.galleryUrls.length - 1}
                                aria-label="Move image later"
                                className="rounded-md bg-white/90 p-1.5 text-slate-800 disabled:opacity-40"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateForm(
                                    'galleryUrls',
                                    form.galleryUrls.filter((_, imageIndex) => imageIndex !== index),
                                  )
                                }
                                aria-label="Remove image"
                                className="rounded-md bg-red-500 p-1.5 text-white"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No gallery photos yet. The cover image will still appear at the top.</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[#003DA5]">4 · Publishing</p>
              <h3 className="mt-1 font-display text-xl font-bold text-slate-950">Registration and visibility</h3>
              <label className="mt-5 block">
                <FieldLabel>Registration link</FieldLabel>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.registrationUrl}
                    onChange={(event) => updateForm('registrationUrl', event.target.value)}
                    placeholder="https://… or /events/your-event/register"
                    className={`${inputClass} pl-9`}
                  />
                </div>
              </label>
              <label className="mt-5 flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 p-4">
                <span>
                  <span className="block text-sm font-bold text-slate-900">Publish event</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                    Published events appear on the website and Infinity Track. Drafts stay in admin only.
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(event) => updateForm('published', event.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-[#003DA5] focus:ring-[#003DA5]"
                />
              </label>
            </section>
          </div>

          <aside className="space-y-4 2xl:sticky 2xl:top-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#003DA5]">Live preview</p>
                <p className="text-sm text-slate-500">Updates while you type</p>
              </div>
              {editingId && form.slug && form.published ? (
                <a
                  href={`${websiteBaseUrl}/events/${form.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Eye className="h-4 w-4" />
                  Open page
                </a>
              ) : null}
            </div>
            <ProductionPreview form={form} />
            {actionState.message ? (
              <p
                role="status"
                className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                  actionState.status === 'success'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {actionState.message}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-4 text-sm font-bold text-white transition hover:bg-[#002d7a] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {pending ? 'Saving…' : editingId ? 'Save changes' : form.published ? 'Create and publish' : 'Save draft'}
            </button>
            <p className="text-center text-xs text-slate-400">
              {form.published ? 'This event will be public after saving.' : 'This event is currently a private draft.'}
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}

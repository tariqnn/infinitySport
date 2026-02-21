'use client';

import React, { useState, useEffect, useActionState } from 'react';
import { useActionToast } from '../../_components/useActionToast';
import {
  listBlockedSlotsAction,
  updateBlockedSlotAction,
  createClubBookingAction,
  updateClubBookingAction,
  createSingleSlotAction,
  deleteBlockedSlotAction,
  deleteClubBookingByLabelAction,
} from './actions';

interface BlockedSlot {
  id: string;
  dayOfWeek: string;
  courtType: string;
  time: string;
  isBlocked: boolean;
  label: string | null;
  startDate: string | null;
  endDate: string | null;
}

const COURT_TYPES = ['Basketball AC', 'Basketball 3x3', 'Padel', 'Volleyball'] as const;
const DAYS_OF_WEEK = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const;
const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let h = 0; h <= 23; h++) out.push(`${String(h).padStart(2, '0')}:00`);
  out.push('00:00');
  return [...new Set(out)].sort((a, b) => {
    if (a === '00:00') return 1;
    if (b === '00:00') return -1;
    return a.localeCompare(b);
  });
})();

const initialState = { status: 'idle' as const };

type EditClub = { label: string; courtType: string; time: string; daysOfWeek: string[]; startDate: string; endDate: string } | null;

export function BookingAvailabilityManager() {
  const [slots, setSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddClub, setShowAddClub] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingClub, setEditingClub] = useState<EditClub>(null);

  const [state, action] = useActionState(updateBlockedSlotAction, initialState);
  const [createClubState, createClubAction] = useActionState(createClubBookingAction, initialState);
  const [updateClubState, updateClubAction] = useActionState(updateClubBookingAction, initialState);
  const [createSlotState, createSlotAction] = useActionState(createSingleSlotAction, initialState);
  const [deleteSlotState, deleteSlotAction] = useActionState(deleteBlockedSlotAction, initialState);
  const [deleteClubState, deleteClubAction] = useActionState(deleteClubBookingByLabelAction, initialState);

  useActionToast(state);
  useActionToast(createClubState);
  useActionToast(updateClubState);
  useActionToast(createSlotState);
  useActionToast(deleteSlotState);
  useActionToast(deleteClubState);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (state.status === 'success') load();
  }, [state.status]);
  useEffect(() => {
    if (createClubState.status === 'success') {
      load();
      setShowAddClub(false);
      setEditingClub(null);
    }
  }, [createClubState.status]);
  useEffect(() => {
    if (updateClubState.status === 'success') {
      load();
      setShowAddClub(false);
      setEditingClub(null);
    }
  }, [updateClubState.status]);
  useEffect(() => {
    if (createSlotState.status === 'success') {
      load();
      setShowAddSlot(false);
    }
  }, [createSlotState.status]);
  useEffect(() => {
    if (deleteSlotState.status === 'success' || deleteClubState.status === 'success') {
      load();
      setEditingClub(null);
    }
  }, [deleteSlotState.status, deleteClubState.status]);

  async function load() {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await listBlockedSlotsAction();
      const list = Array.isArray(data) ? data : [];
      setSlots(
        list.map((s: Record<string, unknown>) => ({
          id: String(s.id ?? ''),
          dayOfWeek: String(s.dayOfWeek ?? ''),
          courtType: String(s.courtType ?? ''),
          time: String(s.time ?? ''),
          isBlocked: Boolean(s.isBlocked !== false),
          label: s.label != null ? String(s.label) : null,
          startDate: s.startDate != null ? String(s.startDate) : null,
          endDate: s.endDate != null ? String(s.endDate) : null,
        })),
      );
    } catch {
      setSlots([]);
      setLoadError('Could not load blocked slots from the database.');
    } finally {
      setLoading(false);
    }
  }

  const formatTime = (t: string) => {
    if (!t) return t;
    const [h, m] = t.split(':');
    const hh = parseInt(h ?? '0', 10);
    const isPm = hh >= 12;
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}:00 ${isPm ? 'PM' : 'AM'}`;
  };

  const formatDateRange = (start: string | null, end: string | null) => {
    if (!start && !end) return '—';
    const s = start ? new Date(start).toLocaleDateString() : '…';
    const e = end ? new Date(end).toLocaleDateString() : '…';
    if (start && end && start.slice(0, 10) === end.slice(0, 10)) return s;
    return `${s} – ${e}`;
  };

  // Group slots by label (empty string for no label)
  const grouped = slots.reduce<Record<string, BlockedSlot[]>>((acc, slot) => {
    const key = slot.label ?? '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(slot);
    return acc;
  }, {});

  const isEditingThisLabel = editingClub?.label != null;

  if (loading) {
    return <div className="glass-card py-8 text-center text-[var(--text-muted)]">Loading…</div>;
  }

  if (loadError && slots.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-[var(--text-muted)]">{loadError}</p>
        <button type="button" onClick={load} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  const clubFormDefault = editingClub
    ? {
        label: editingClub.label,
        courtType: editingClub.courtType,
        time: editingClub.time,
        daysOfWeek: editingClub.daysOfWeek,
        startDate: editingClub.startDate || '',
        endDate: editingClub.endDate || '',
      }
    : { label: '', courtType: COURT_TYPES[0], time: TIME_OPTIONS[0], daysOfWeek: [] as string[], startDate: '', endDate: '' };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => { setShowAddClub(true); setShowAddSlot(false); setEditingClub(null); }}
          className="btn-primary"
        >
          Add Club Booking
        </button>
        <button
          type="button"
          onClick={() => { setShowAddSlot(true); setShowAddClub(false); setEditingClub(null); }}
          className="rounded-xl border border-[var(--border-muted)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card-muted)]"
        >
          Add Single Slot
        </button>
      </div>

      {(showAddClub || isEditingThisLabel) && (
        <div className="glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
            {editingClub ? 'Edit Club Booking' : 'Add Club Booking'}
          </h3>
          {editingClub && (
            <p className="mb-4 text-sm text-[var(--text-muted)]">
              Editing will replace all slots for this club. Submit to save changes.
            </p>
          )}
          <form
            action={editingClub ? updateClubAction : createClubAction}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {editingClub && (
              <input type="hidden" name="editPreviousLabel" value={editingClub.label} />
            )}
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Club name (label)</label>
              <input
                type="text"
                name="label"
                required
                defaultValue={clubFormDefault.label}
                placeholder="e.g. Warriors Training"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Court type</label>
              <select
                name="courtType"
                defaultValue={clubFormDefault.courtType}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              >
                {COURT_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <select
                name="time"
                defaultValue={clubFormDefault.time}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Days of week</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_OF_WEEK.map((d) => (
                  <label key={d} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <input
                      type="checkbox"
                      name="daysOfWeek"
                      value={d}
                      defaultChecked={clubFormDefault.daysOfWeek.includes(d)}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-700">{d}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start date (optional)</label>
              <input
                type="date"
                name="startDate"
                defaultValue={clubFormDefault.startDate}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End date (optional)</label>
              <input
                type="date"
                name="endDate"
                defaultValue={clubFormDefault.endDate}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="btn-primary"
              >
                {editingClub ? 'Save changes' : 'Create club booking'}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddClub(false); setEditingClub(null); }}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {showAddSlot && !isEditingThisLabel && (
        <div className="glass-card p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Add Single Blocked Slot (by date)</h3>
          <form action={createSlotAction} className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                name="slotDate"
                required
                min={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Court type</label>
              <select name="courtType" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800">
                {COURT_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Time</label>
              <select name="time" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800">
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <button type="submit" className="btn-primary">
                Add slot
              </button>
              <button
                type="button"
                onClick={() => setShowAddSlot(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-card overflow-hidden">
        <p className="border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-6 py-4 text-sm text-[var(--text-muted)]">
          Recurring blocked slots (e.g. club bookings, team training). Toggle to <strong>Free</strong> to allow public booking. Use <strong>Edit</strong> / <strong>Delete</strong> for club bookings grouped by label.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)]">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Label</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Day</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Court</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date range</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {slots.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">
                    No blocked slots yet. Use <strong>Add Club Booking</strong> or <strong>Add Single Slot</strong> above to add slots. You can also run <code className="rounded bg-[var(--bg-card-muted)] px-1.5 py-0.5 text-sm text-[var(--text-primary)]">npm run prisma:seed-blocked-slots</code> to seed default slots.
                  </td>
                </tr>
              ) : (
              Object.entries(grouped).map(([labelKey, groupSlots]) => {
                const labelDisplay = labelKey || '—';
                const hasLabel = !!labelKey;
                return (
                  <React.Fragment key={labelKey || 'no-label'}>
                    {groupSlots.map((slot, idx) => (
                      <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        {idx === 0 ? (
                          <td
                            rowSpan={groupSlots.length}
                            className="border-r border-slate-100 px-6 py-3 align-top text-sm font-medium text-slate-800"
                          >
                            {labelDisplay}
                            {hasLabel && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingClub({
                                      label: slot.label!,
                                      courtType: slot.courtType,
                                      time: slot.time,
                                      daysOfWeek: groupSlots.map((s) => s.dayOfWeek),
                                      startDate: slot.startDate ?? '',
                                      endDate: slot.endDate ?? '',
                                    })
                                  }
                                  className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
                                >
                                  Edit club
                                </button>
                                <form action={deleteClubAction} className="inline">
                                  <input type="hidden" name="label" value={slot.label!} />
                                  <button
                                    type="submit"
                                    className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                                  >
                                    Delete club
                                  </button>
                                </form>
                              </div>
                            )}
                          </td>
                        ) : null}
                        <td className="px-6 py-3 text-sm font-medium text-slate-800">{slot.dayOfWeek}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{slot.courtType}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{formatTime(slot.time)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">
                          {formatDateRange(slot.startDate, slot.endDate)}
                        </td>
                        <td className="px-6 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              slot.isBlocked ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {slot.isBlocked ? 'Blocked' : 'Free'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <form action={action} className="inline">
                              <input type="hidden" name="id" value={slot.id} />
                              <input type="hidden" name="isBlocked" value={slot.isBlocked ? 'false' : 'true'} />
                              <button
                                type="submit"
                                className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                                  slot.isBlocked ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-amber-600 text-white hover:bg-amber-700'
                                }`}
                              >
                                {slot.isBlocked ? 'Set free' : 'Set blocked'}
                              </button>
                            </form>
                            <form action={deleteSlotAction} className="inline">
                              <input type="hidden" name="id" value={slot.id} />
                              <button
                                type="submit"
                                className="rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-300"
                              >
                                Delete slot
                              </button>
                            </form>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
              ) }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

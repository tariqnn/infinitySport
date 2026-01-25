'use client';

import { useState, useEffect, useActionState } from 'react';
import { useActionToast } from '../../_components/useActionToast';
import { updateBlockedSlotAction } from './actions';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NODE_ENV === 'development') return 'http://localhost:4000';
  return 'https://infinitysport.onrender.com';
};

interface BlockedSlot {
  id: string;
  dayOfWeek: string;
  courtType: string;
  time: string;
  isBlocked: boolean;
}

const initialState = { status: 'idle' as const };

export function BookingAvailabilityManager() {
  const [slots, setSlots] = useState<BlockedSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [state, action] = useActionState(updateBlockedSlotAction, initialState);

  useActionToast(state);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (state.status === 'success') load();
  }, [state.status]);

  async function load() {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(`${getApiBaseUrl()}/api/portal/blocked-slots`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setSlots(Array.isArray(data) ? data : []);
      } else {
        setSlots([]);
        setLoadError(`API returned ${res.status}`);
      }
    } catch {
      setSlots([]);
      setLoadError('Could not reach the API. Ensure it is running.');
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

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading…</div>;
  }

  if (slots.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        {loadError ? (
          <>
            <p className="text-slate-600">{loadError}</p>
            <p className="mt-2 text-sm text-slate-500">Start the API with: <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run dev:api</code></p>
          </>
        ) : (
          <p className="text-slate-600">No blocked slots defined. Run the database seed to create the default recurring blocks:</p>
        )}
        {!loadError && (
          <p className="mt-2 text-sm font-mono text-slate-600">npm run prisma:seed-blocked-slots</p>
        )}
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-panel">
      <p className="border-b border-slate-100 px-6 py-4 text-sm text-slate-600">
        These are recurring time slots that are normally blocked (e.g. team training). Toggle to <strong>Free</strong> to allow public booking when the slot becomes available.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Day</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Court</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Time</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={slot.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-6 py-3 text-sm font-medium text-slate-800">{slot.dayOfWeek}</td>
                <td className="px-6 py-3 text-sm text-slate-700">{slot.courtType}</td>
                <td className="px-6 py-3 text-sm text-slate-700">{formatTime(slot.time)}</td>
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
                  <form action={action}>
                    <input type="hidden" name="id" value={slot.id} />
                    <input type="hidden" name="isBlocked" value={slot.isBlocked ? 'false' : 'true'} />
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                        slot.isBlocked
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                    >
                      {slot.isBlocked ? 'Set free' : 'Set blocked'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

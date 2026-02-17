'use client';

import { useState, useEffect, useActionState } from 'react';
import { useActionToast } from '../../_components/useActionToast';
import { deleteBookingAction, updateBookingAction, updateBookingPaymentAction, updateBookingStatusAction } from './actions';

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return 'https://infinitysport.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

interface Booking {
  id: string;
  facilityArea: string | null;
  startTime: string;
  endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  isPaid: boolean;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  member: { firstName: string; lastName: string } | null;
  notes: string | null;
  createdAt: string;
}

const initialState = { status: 'idle' as const };

type EditForm = { bookingId: string; status: Booking['status']; isPaid: boolean; notes: string; facilityArea: string };

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

type RangePreset = 'day' | 'week' | 'month' | 'year' | 'custom';

function getRangeBounds(
  preset: RangePreset,
  selectedDate: string,
  customStart: string,
  customEnd: string
): { start: string; end: string } {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (preset === 'custom') {
    const start = customStart || todayISO();
    const end = customEnd || todayISO();
    const [s, e] = start <= end ? [start, end] : [end, start];
    return {
      start: `${s}T00:00:00.000Z`,
      end: `${e}T23:59:59.999Z`,
    };
  }
  const [y, m, d] = selectedDate.split('-').map(Number);
  const month0 = (m ?? 1) - 1;
  if (preset === 'day') {
    return {
      start: `${selectedDate}T00:00:00.000Z`,
      end: `${selectedDate}T23:59:59.999Z`,
    };
  }
  if (preset === 'week') {
    const start = new Date(Date.UTC(y, month0, d));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const endStr = `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}`;
    return {
      start: `${selectedDate}T00:00:00.000Z`,
      end: `${endStr}T23:59:59.999Z`,
    };
  }
  if (preset === 'month') {
    const lastDay = new Date(Date.UTC(y, month0 + 1, 0)).getUTCDate();
    return {
      start: `${y}-${pad(m)}-01T00:00:00.000Z`,
      end: `${y}-${pad(m)}-${pad(lastDay)}T23:59:59.999Z`,
    };
  }
  if (preset === 'year') {
    return {
      start: `${y}-01-01T00:00:00.000Z`,
      end: `${y}-12-31T23:59:59.999Z`,
    };
  }
  return { start: `${selectedDate}T00:00:00.000Z`, end: `${selectedDate}T23:59:59.999Z` };
}

export function BookingsManager() {
  const [rangePreset, setRangePreset] = useState<RangePreset>('day');
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [customStartDate, setCustomStartDate] = useState(todayISO);
  const [customEndDate, setCustomEndDate] = useState(todayISO);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [paymentState, paymentAction] = useActionState(updateBookingPaymentAction, initialState);
  const [statusState, statusAction] = useActionState(updateBookingStatusAction, initialState);
  const [editState, editAction] = useActionState(updateBookingAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteBookingAction, initialState);

  useActionToast(paymentState);
  useActionToast(statusState);
  useActionToast(editState);
  useActionToast(deleteState);

  useEffect(() => {
    loadBookings();
  }, [selectedDate, rangePreset, customStartDate, customEndDate]);

  useEffect(() => {
    if (paymentState.status === 'success' || statusState.status === 'success') {
      loadBookings();
    }
  }, [paymentState.status, statusState.status]);

  useEffect(() => {
    if (editState.status === 'success') {
      loadBookings();
      setEditing(null);
    }
  }, [editState.status]);

  useEffect(() => {
    if (deleteState.status === 'success') {
      loadBookings();
    }
  }, [deleteState.status]);

  async function loadBookings() {
    try {
      setLoading(true);
      setLoadError(null);
      const { start, end } = getRangeBounds(rangePreset, selectedDate, customStartDate, customEndDate);
      const url = `${API_BASE_URL}/api/portal/bookings?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setBookings(Array.isArray(data) ? data : []);
      } else {
        setBookings([]);
        setLoadError(`API returned ${res.status}`);
      }
    } catch {
      setBookings([]);
      setLoadError('Could not reach the API. Ensure it is running.');
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const mins = Math.round((end - start) / (60 * 1000));
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const presetButtons: { value: RangePreset; label: string }[] = [
    { value: 'day', label: 'Day' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'custom', label: 'Custom' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl border border-[var(--border-muted)] bg-[var(--bg-card-muted)] p-1">
            {presetButtons.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRangePreset(value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  rangePreset === value
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {rangePreset !== 'custom' && (
            <>
              <label htmlFor="booking-date" className="sr-only">
                {rangePreset === 'day' ? 'Date' : rangePreset === 'week' ? 'Start date (week)' : rangePreset === 'month' ? 'Month' : 'Year'}
              </label>
              <input
                id="booking-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <button
                type="button"
                onClick={() => { setSelectedDate(todayISO()); setCustomStartDate(todayISO()); setCustomEndDate(todayISO()); }}
                className="rounded-xl border border-[var(--border-muted)] bg-[var(--bg-card)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-card-muted)]"
              >
                Today
              </button>
            </>
          )}
          {rangePreset === 'custom' && (
            <>
              <label htmlFor="custom-start" className="text-sm font-medium text-[var(--text-muted)]">From</label>
              <input
                id="custom-start"
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
              <label htmlFor="custom-end" className="text-sm font-medium text-[var(--text-muted)]">To</label>
              <input
                id="custom-end"
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={loadBookings}
          disabled={loading}
          className="btn-primary disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="glass-card py-12 text-center text-[var(--text-muted)]">Loading…</div>
      ) : loadError ? (
        <div className="glass-card p-8 text-center">
          <p className="text-[var(--text-muted)]">{loadError}</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Start the API with: <code className="rounded bg-[var(--bg-card-muted)] px-1.5 py-0.5 text-[var(--text-primary)]">npm run dev:api</code></p>
          <button type="button" onClick={loadBookings} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      ) : (
        <>
      <div className="glass-card overflow-hidden">
        <p className="border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-6 py-4 text-sm text-[var(--text-muted)]">
          Manage bookings from the landing page. Toggle <strong>Paid</strong> or use <strong>Edit</strong> to change status, payment, notes, and court.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)]">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Court/Facility</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Source</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-[var(--text-muted)]">
                    No bookings for this {rangePreset === 'day' ? 'day' : 'period'}. Change the range or refresh.
                  </td>
                </tr>
              ) : (
              bookings.map((booking) => {
                const customerName =
                  booking.customerName ||
                  (booking.member
                    ? `${booking.member.firstName} ${booking.member.lastName}`
                    : 'N/A');
                const customerPhone = booking.customerPhone || 'N/A';
                const customerEmail = booking.customerEmail || 'N/A';

                return (
                  <tr key={booking.id} className="border-b border-[var(--border-muted)] hover:bg-[var(--bg-card-muted)]/50">
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{formatDate(booking.startTime)}</div>
                      <div className="text-sm text-[var(--text-muted)]">{formatTime(booking.startTime)} – {formatTime(booking.endTime)} <span className="text-[var(--text-muted)]/80">({formatDuration(booking.startTime, booking.endTime)})</span></div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--text-primary)]">{booking.facilityArea || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-[var(--text-primary)]">{customerName}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--text-muted)]">
                      <div>{customerPhone}</div>
                      {customerEmail !== 'N/A' && <div className="text-xs text-[var(--text-muted)]">{customerEmail}</div>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className={`mr-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${booking.isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {booking.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                      <form action={paymentAction} key={`payment-${booking.id}-${booking.isPaid}`} className="inline">
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={booking.status} />
                        <label className="inline-flex cursor-pointer items-center" title="Toggle paid">
                          <input
                            type="checkbox"
                            name="isPaid"
                            value="true"
                            defaultChecked={booking.isPaid}
                            onChange={(e) => {
                              const form = e.currentTarget.form;
                              if (form) {
                                setBookings(prev => prev.map(b => (b.id === booking.id ? { ...b, isPaid: e.target.checked } : b)));
                                form.requestSubmit();
                              }
                            }}
                            className="h-3.5 w-3.5 rounded border-[var(--border-input)] text-[var(--primary)] focus:ring-[var(--primary)]"
                          />
                        </label>
                      </form>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-[var(--text-muted)]">
                      {booking.notes?.toLowerCase().includes('mobile app') ? (
                        <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-800">Mobile app</span>
                      ) : booking.notes ? (
                        <span className="max-w-[120px] truncate" title={booking.notes}>{booking.notes}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <form action={statusAction} className="mr-2 inline" key={`status-${booking.id}-${booking.status}`}>
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <select
                          name="status"
                          defaultValue={booking.status}
                          onChange={(e) => {
                            const form = e.currentTarget.form;
                            if (form) {
                              setBookings(prev => prev.map(b => (b.id === booking.id ? { ...b, status: e.target.value as Booking['status'] } : b)));
                              form.requestSubmit();
                            }
                          }}
                          className="rounded-lg border border-[var(--border-input)] bg-[var(--bg-card)] px-2 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </form>
                      <form action={deleteAction} key={`delete-${booking.id}`} className="ml-2 inline">
                        <input type="hidden" name="bookingId" value={String(booking.id)} />
                        <button
                          type="submit"
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </form>
                      <button
                        type="button"
                        onClick={() => setEditing({ bookingId: booking.id, status: booking.status, isPaid: booking.isPaid, notes: booking.notes ?? '', facilityArea: booking.facilityArea ?? '' })}
                        className="ml-2 rounded-lg bg-[var(--bg-card-muted)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--border-muted)]"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditing(null)} role="presentation">
          <div className="glass-card w-full max-w-md p-6 shadow-lg" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-booking-title">
            <h3 id="edit-booking-title" className="text-lg font-bold text-[var(--text-primary)]">Edit booking</h3>
            <form action={editAction} className="mt-4 space-y-4">
              <input type="hidden" name="bookingId" value={editing.bookingId} />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">Status</label>
                <select
                  name="status"
                  value={editing.status}
                  onChange={(e) => setEditing((f) => (f ? { ...f, status: e.target.value as Booking['status'] } : null))}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-[var(--text-muted)]">
                  <input
                    type="checkbox"
                    checked={editing.isPaid}
                    onChange={() => setEditing((f) => (f ? { ...f, isPaid: !f.isPaid } : null))}
                    className="h-4 w-4 rounded border-[var(--border-input)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Paid
                </label>
                <input type="hidden" name="isPaid" value={editing.isPaid ? 'true' : 'false'} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">Court / Facility</label>
                <input
                  type="text"
                  name="facilityArea"
                  value={editing.facilityArea}
                  onChange={(e) => setEditing((f) => (f ? { ...f, facilityArea: e.target.value } : null))}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="e.g. Court 1"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">Notes</label>
                <textarea
                  name="notes"
                  value={editing.notes}
                  onChange={(e) => setEditing((f) => (f ? { ...f, notes: e.target.value } : null))}
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary">
                  Save
                </button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-[var(--border-muted)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-card-muted)]">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}

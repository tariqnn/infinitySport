'use client';

import { useState, useEffect, useActionState } from 'react';
import { useActionToast } from '../../_components/useActionToast';
import { updateBookingAction, updateBookingPaymentAction, updateBookingStatusAction } from './actions';

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

export function BookingsManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [paymentState, paymentAction] = useActionState(updateBookingPaymentAction, initialState);
  const [statusState, statusAction] = useActionState(updateBookingStatusAction, initialState);
  const [editState, editAction] = useActionState(updateBookingAction, initialState);

  useActionToast(paymentState);
  useActionToast(statusState);
  useActionToast(editState);

  useEffect(() => {
    loadBookings();
  }, []);

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

  async function loadBookings() {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(`${API_BASE_URL}/api/portal/bookings`, { cache: 'no-store' });
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

  if (loading) {
    return <div className="py-8 text-center text-slate-500">Loading…</div>;
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        {loadError ? (
          <>
            <p className="text-slate-600">{loadError}</p>
            <p className="mt-2 text-sm text-slate-500">Start the API with: <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run dev:api</code></p>
          </>
        ) : (
          <p className="text-slate-600">No bookings found.</p>
        )}
        <button
          type="button"
          onClick={loadBookings}
          className="mt-4 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={loadBookings}
          disabled={loading}
          className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-panel">
        <p className="border-b border-slate-100 px-6 py-4 text-sm text-slate-600">
          Manage bookings from the landing page. Toggle <strong>Paid</strong> or use <strong>Edit</strong> to change status, payment, notes, and court.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Court/Facility</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Paid</th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => {
                const customerName =
                  booking.customerName ||
                  (booking.member
                    ? `${booking.member.firstName} ${booking.member.lastName}`
                    : 'N/A');
                const customerPhone = booking.customerPhone || 'N/A';
                const customerEmail = booking.customerEmail || 'N/A';

                return (
                  <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-6 py-3">
                      <div className="text-sm font-medium text-slate-800">{formatDate(booking.startTime)}</div>
                      <div className="text-sm text-slate-500">{formatTime(booking.startTime)} – {formatTime(booking.endTime)}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-700">{booking.facilityArea || '—'}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm font-medium text-slate-800">{customerName}</td>
                    <td className="whitespace-nowrap px-6 py-3 text-sm text-slate-600">
                      <div>{customerPhone}</div>
                      {customerEmail !== 'N/A' && <div className="text-xs text-slate-500">{customerEmail}</div>}
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
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                          />
                        </label>
                      </form>
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
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </form>
                      <button
                        type="button"
                        onClick={() => setEditing({ bookingId: booking.id, status: booking.status, isPaid: booking.isPaid, notes: booking.notes ?? '', facilityArea: booking.facilityArea ?? '' })}
                        className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setEditing(null)} role="presentation">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-booking-title">
            <h3 id="edit-booking-title" className="text-lg font-bold text-slate-800">Edit booking</h3>
            <form action={editAction} className="mt-4 space-y-4">
              <input type="hidden" name="bookingId" value={editing.bookingId} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Status</label>
                <select
                  name="status"
                  value={editing.status}
                  onChange={(e) => setEditing((f) => (f ? { ...f, status: e.target.value as Booking['status'] } : null))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                >
                  <option value="PENDING">Pending</option>
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-600">
                  <input
                    type="checkbox"
                    checked={editing.isPaid}
                    onChange={() => setEditing((f) => (f ? { ...f, isPaid: !f.isPaid } : null))}
                    className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                  />
                  Paid
                </label>
                <input type="hidden" name="isPaid" value={editing.isPaid ? 'true' : 'false'} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Court / Facility</label>
                <input
                  type="text"
                  name="facilityArea"
                  value={editing.facilityArea}
                  onChange={(e) => setEditing((f) => (f ? { ...f, facilityArea: e.target.value } : null))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="e.g. Court 1"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-600">Notes</label>
                <textarea
                  name="notes"
                  value={editing.notes}
                  onChange={(e) => setEditing((f) => (f ? { ...f, notes: e.target.value } : null))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90">
                  Save
                </button>
                <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

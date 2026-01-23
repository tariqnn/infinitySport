'use client';

import { useState, useEffect, useActionState } from 'react';
import { useActionToast } from '../../_components/useActionToast';
import { updateBookingPaymentAction, updateBookingStatusAction } from './actions';

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

export function BookingsManager() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentState, paymentAction] = useActionState(updateBookingPaymentAction, initialState);
  const [statusState, statusAction] = useActionState(updateBookingStatusAction, initialState);

  useActionToast(paymentState);
  useActionToast(statusState);

  useEffect(() => {
    loadBookings();
  }, []);

  // Reload bookings after successful payment or status update
  useEffect(() => {
    if (paymentState.status === 'success' || statusState.status === 'success') {
      loadBookings();
    }
  }, [paymentState.status, statusState.status]);

  async function loadBookings() {
    try {
      setLoading(true);
      // Get first company
      const companiesRes = await fetch(`${API_BASE_URL}/api/portal/companies`, {
        cache: 'no-store',
      });
      let companyId: string | undefined;
      if (companiesRes.ok) {
        const companies = await companiesRes.json();
        if (companies && companies.length > 0) {
          companyId = companies[0].id;
        }
      }

      const bookingsRes = await fetch(
        `${API_BASE_URL}/api/portal/bookings${companyId ? `?companyId=${companyId}` : ''}`,
        { cache: 'no-store' }
      );

      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        setBookings(data);
      } else {
        // Failed to load bookings - set empty array
        setBookings([]);
      }
    } catch (error) {
      // Error loading bookings - set empty array and log in development
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Error loading bookings:', error);
      }
      setBookings([]);
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
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">Loading bookings...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage bookings from the landing page. Mark payments and update status.
          </p>
        </div>
        <button
          onClick={loadBookings}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No bookings found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Court/Facility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {bookings.map((booking) => {
                const customerName =
                  booking.customerName ||
                  (booking.member
                    ? `${booking.member.firstName} ${booking.member.lastName}`
                    : 'N/A');
                const customerPhone = booking.customerPhone || 'N/A';
                const customerEmail = booking.customerEmail || 'N/A';

                return (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(booking.startTime)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {booking.facilityArea || 'N/A'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {customerName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      <div>{customerPhone}</div>
                      {customerEmail !== 'N/A' && <div className="text-xs">{customerEmail}</div>}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <form 
                        action={paymentAction}
                        key={`payment-${booking.id}-${booking.isPaid}`}
                      >
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <input type="hidden" name="status" value={booking.status} />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            name="isPaid"
                            value="true"
                            defaultChecked={booking.isPaid}
                            onChange={async (e) => {
                              const form = e.currentTarget.form;
                              if (form) {
                                // Optimistically update UI
                                setBookings(prev => prev.map(b => 
                                  b.id === booking.id 
                                    ? { ...b, isPaid: e.target.checked }
                                    : b
                                ));
                                form.requestSubmit();
                              }
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className={`text-sm ${booking.isPaid ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                            {booking.isPaid ? 'Paid' : 'Unpaid'}
                          </span>
                        </label>
                      </form>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <form 
                        action={statusAction} 
                        className="inline"
                        key={`status-${booking.id}-${booking.status}`}
                      >
                        <input type="hidden" name="bookingId" value={booking.id} />
                        <select
                          name="status"
                          defaultValue={booking.status}
                          onChange={async (e) => {
                            const form = e.currentTarget.form;
                            if (form) {
                              // Optimistically update UI
                              setBookings(prev => prev.map(b => 
                                b.id === booking.id 
                                  ? { ...b, status: e.target.value as Booking['status'] }
                                  : b
                              ));
                              form.requestSubmit();
                            }
                          }}
                          className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="CONFIRMED">Confirmed</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

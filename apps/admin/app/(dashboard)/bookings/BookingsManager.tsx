'use client';

import { useState, useEffect, useActionState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useActionToast } from '../../_components/useActionToast';
import {
  deleteBookingAction,
  listBookingsAction,
  updateBookingPaymentAction,
  updateBookingAction,
  updateBookingStatusAction,
} from './actions';

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
  hourlyRate?: number;
  totalAmount?: number;
  totalHours?: number;
}

const initialState = { status: 'idle' as const };
const RECEIPT_COMPANY = {
  name: 'Infinity Sporty',
  address: 'Shemisani, Princess Alia College',
  email: 'infinitysportsacademyjo@gmail.com',
  phone: '07 9624 4059',
};

type EditForm = {
  bookingId: string;
  status: Booking['status'];
  isPaid: boolean;
  notes: string;
  facilityArea: string;
  startTime: string;
  endTime: string;
};

type ActionMenuPosition = {
  top: number;
  left: number;
  openUp: boolean;
  maxHeight: number;
};

function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

type RangePreset = 'day' | '3d' | '4d' | '5d' | '6d' | '7d' | 'week' | 'month' | 'year' | 'custom';

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
  // Last N days ending on selected date
  if (preset === '3d' || preset === '4d' || preset === '5d' || preset === '6d' || preset === '7d') {
    const n = parseInt(preset, 10) as 3 | 4 | 5 | 6 | 7;
    const end = new Date(Date.UTC(y, month0, d));
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (n - 1));
    const startStr = `${start.getUTCFullYear()}-${pad(start.getUTCMonth() + 1)}-${pad(start.getUTCDate())}`;
    return {
      start: `${startStr}T00:00:00.000Z`,
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

function bookingHours(booking: Booking): number {
  if (booking.status === 'CANCELLED') return 0;
  const start = new Date(booking.startTime).getTime();
  const end = new Date(booking.endTime).getTime();
  return (end - start) / (60 * 60 * 1000);
}

function toDateTimeInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bookingDisplayName(booking: Booking): string {
  return (
    booking.customerName ||
    (booking.member ? `${booking.member.firstName} ${booking.member.lastName}` : 'Another booking')
  );
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
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<ActionMenuPosition | null>(null);
  const [statusState, statusAction] = useActionState(updateBookingStatusAction, initialState);
  const [paymentState, paymentAction] = useActionState(updateBookingPaymentAction, initialState);
  const [editState, editAction] = useActionState(updateBookingAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteBookingAction, initialState);

  useActionToast(statusState);
  useActionToast(paymentState);
  useActionToast(editState);
  useActionToast(deleteState);

  const loadBookings = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { start, end } = getRangeBounds(rangePreset, selectedDate, customStartDate, customEndDate);
      const data = await listBookingsAction({ startDate: start, endDate: end });
      setBookings(Array.isArray(data) ? data : []);
    } catch {
      setBookings([]);
      setLoadError('Could not load bookings from the database.');
    } finally {
      setLoading(false);
    }
  }, [rangePreset, selectedDate, customStartDate, customEndDate]);

  const closeActionMenu = useCallback(() => {
    setOpenMenuId(null);
    setMenuPosition(null);
  }, []);

  const openActionMenu = useCallback(
    (bookingId: string, trigger: HTMLButtonElement) => {
      if (openMenuId === bookingId) {
        closeActionMenu();
        return;
      }
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 224;
      const estimatedMenuHeight = 360;
      const viewportPadding = 10;
      const gap = 8;
      const left = Math.min(
        Math.max(viewportPadding, rect.right - menuWidth),
        Math.max(viewportPadding, window.innerWidth - menuWidth - viewportPadding),
      );
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const spaceAbove = rect.top - viewportPadding;
      const openUp = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow;
      const top = openUp ? rect.top - gap : rect.bottom + gap;
      const available = openUp ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(220, Math.floor(available));

      setMenuPosition({ top, left, openUp, maxHeight });
      setOpenMenuId(bookingId);
    },
    [closeActionMenu, openMenuId],
  );

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (statusState.status === 'success') {
      loadBookings();
    }
  }, [statusState.status, loadBookings]);

  useEffect(() => {
    if (paymentState.status === 'success') {
      loadBookings();
    }
  }, [paymentState.status, loadBookings]);

  useEffect(() => {
    if (editState.status === 'success') {
      loadBookings();
      setEditing(null);
    }
  }, [editState.status, loadBookings]);

  useEffect(() => {
    if (deleteState.status === 'success') {
      loadBookings();
    }
  }, [deleteState.status, loadBookings]);

  useEffect(() => {
    if (!openMenuId) return;
    const handleViewportChange = () => closeActionMenu();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [openMenuId, closeActionMenu]);

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

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} JOD`;
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
    { value: '3d', label: '3 days' },
    { value: '4d', label: '4 days' },
    { value: '5d', label: '5 days' },
    { value: '6d', label: '6 days' },
    { value: '7d', label: '7 days' },
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
    { value: 'custom', label: 'Custom' },
  ];

  const bookingsForSummary = bookings.filter((b) => b.status !== 'CANCELLED');
  const totalHours = bookingsForSummary.reduce((sum, b) => sum + bookingHours(b), 0);
  const paidBookingsCount = bookingsForSummary.filter((b) => b.isPaid).length;
  const unpaidBookingsCount = bookingsForSummary.length - paidBookingsCount;

  const editAvailability = (() => {
    if (!editing) return null;
    const start = new Date(editing.startTime);
    const end = new Date(editing.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, tone: 'danger' as const, message: 'Enter a valid start and end time.', conflicts: [] as Booking[] };
    }
    if (end.getTime() <= start.getTime()) {
      return { ok: false, tone: 'danger' as const, message: 'End time must be later than start time.', conflicts: [] as Booking[] };
    }
    const court = editing.facilityArea.trim();
    if (!court) {
      return {
        ok: true,
        tone: 'warning' as const,
        message: 'Set court/facility to run live overlap check.',
        conflicts: [] as Booking[],
      };
    }
    const overlapping = bookings.filter((b) => {
      if (b.id === editing.bookingId) return false;
      if (b.status === 'CANCELLED') return false;
      if ((b.facilityArea || '').trim() !== court) return false;
      const bStart = new Date(b.startTime).getTime();
      const bEnd = new Date(b.endTime).getTime();
      return bStart < end.getTime() && bEnd > start.getTime();
    }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    if (overlapping.length > 0) {
      return {
        ok: false,
        tone: 'danger' as const,
        message: `Not free: ${overlapping.length} overlapping booking${overlapping.length > 1 ? 's' : ''} found.`,
        conflicts: overlapping,
      };
    }
    return {
      ok: true,
      tone: 'success' as const,
      message: 'Free slot: no overlap in currently loaded bookings.',
      conflicts: [] as Booking[],
    };
  })();

  const availabilityToneClass =
    editAvailability?.tone === 'danger'
      ? 'border-rose-300 bg-rose-50 text-rose-700'
      : editAvailability?.tone === 'success'
        ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
        : 'border-amber-300 bg-amber-50 text-amber-700';

  const availabilityInputToneClass =
    editAvailability?.tone === 'danger'
      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20'
      : editAvailability?.tone === 'success'
        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500/20'
        : 'border-[var(--border-input)] focus:border-[var(--primary)] focus:ring-[var(--primary)]/20';

  function printBookingReceipt(booking: Booking) {
    setPrintingId(booking.id);
    const customerName =
      booking.customerName ||
      (booking.member ? `${booking.member.firstName} ${booking.member.lastName}` : 'Guest');
    const ratePerHour = Number(booking.hourlyRate || 30);
    const totalHoursForReceipt = Number(booking.totalHours || 0);
    const totalAmountForReceipt = Number.isFinite(booking.totalAmount)
      ? Number(booking.totalAmount)
      : Math.max(0, Math.round(totalHoursForReceipt * ratePerHour));
    const issuedAt = `${formatDate(booking.createdAt)} ${formatTime(booking.createdAt)}`;
    const paidToDate = booking.isPaid ? totalAmountForReceipt : 0;
    const remaining = Math.max(0, totalAmountForReceipt - paidToDate);
    const receiptNo = `BKR-${booking.id.slice(-8).toUpperCase()}`;
    const signedAmount = booking.isPaid ? totalAmountForReceipt : 0;

    const html = `<!doctype html>
  <html>
    <head>
      <title>${escapeHtml(receiptNo)}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #fff; }
        .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 16mm; box-sizing: border-box; }
        .top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
        .logo { display:flex; align-items:center; gap:10px; }
        .logo-badge { width:44px; height:44px; border-radius:10px; background:#003DA5; color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; }
        .muted { color:#475569; }
        .line { height:1px; background:#cbd5e1; margin:18px 0; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap: 14px; }
        .card { border:1px solid #dbe3ef; border-radius:12px; padding:12px; }
        .amount { text-align:right; font-size:28px; font-weight:800; }
        table { width:100%; border-collapse:collapse; margin-top:16px; font-size:13px; }
        th, td { border:1px solid #dbe3ef; padding:10px; text-align:left; }
        th { background:#003DA5; color:#fff; font-weight:700; }
        .totals { margin-top:18px; margin-left:auto; max-width:330px; }
        .totals-row { display:flex; justify-content:space-between; margin:6px 0; }
      </style>
    </head>
    <body>
      <div class="sheet">
        <div class="top">
          <div class="logo">
            <div class="logo-badge">IS</div>
            <div>
              <div style="font-size:15px; font-weight:800">${escapeHtml(RECEIPT_COMPANY.name)}</div>
              <div class="muted" style="font-size:12px">${escapeHtml(RECEIPT_COMPANY.address)}</div>
              <div class="muted" style="font-size:12px">${escapeHtml(RECEIPT_COMPANY.phone)} | ${escapeHtml(RECEIPT_COMPANY.email)}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:30px; font-weight:900">RECEIPT</div>
            <div class="muted" style="font-size:12px">${escapeHtml(receiptNo)}</div>
          </div>
        </div>
        <div class="line"></div>
        <div class="grid">
          <div class="card">
            <div style="font-weight:700; margin-bottom:6px">Customer</div>
            <div>${escapeHtml(customerName)}</div>
            <div class="muted">${escapeHtml(booking.customerPhone || booking.customerEmail || '-')}</div>
            <div style="margin-top:8px" class="muted">Court: ${escapeHtml(booking.facilityArea || '-')}</div>
            <div class="muted">Booking ID: ${escapeHtml(booking.id)}</div>
            <div class="muted">Date: ${escapeHtml(formatDate(booking.startTime))} ${escapeHtml(formatTime(booking.startTime))} - ${escapeHtml(formatTime(booking.endTime))}</div>
            <div class="muted">Duration: ${escapeHtml(formatDuration(booking.startTime, booking.endTime))}</div>
            <div class="muted">Rate: ${ratePerHour.toFixed(2)} JOD/hr</div>
          </div>
          <div class="card">
            <div style="font-weight:700; margin-bottom:6px">Payment</div>
            <div class="muted">Issued: ${escapeHtml(issuedAt)}</div>
            <div class="muted">Method: ${booking.isPaid ? 'PAID (RECEPTION)' : 'UNPAID'}</div>
            <div class="muted">Status: ${escapeHtml(booking.isPaid ? 'PAID' : 'UNPAID')}</div>
            <div class="muted">Transaction Ref: -</div>
            <div class="amount">${signedAmount.toFixed(2)} JOD</div>
          </div>
        </div>

        <table>
          <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>Booking total - ${escapeHtml(booking.id)}</td>
              <td style="text-align:right; font-weight:700">${totalAmountForReceipt.toFixed(2)} JOD</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row"><span class="muted">Booking Total</span><strong>${totalAmountForReceipt.toFixed(2)} JOD</strong></div>
          <div class="totals-row"><span class="muted">Paid to Date</span><strong>${paidToDate.toFixed(2)} JOD</strong></div>
          <div class="totals-row"><span class="muted">Remaining</span><strong>${remaining.toFixed(2)} JOD</strong></div>
        </div>
      </div>
    </body>
  </html>`;
    const win = window.open('', '_blank', 'width=900,height=650');
    if (!win) {
      setPrintingId(null);
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.focus();
      win.print();
      setPrintingId(null);
    }, 180);
  }

  function openEditModal(booking: Booking) {
    setEditing({
      bookingId: booking.id,
      status: booking.status,
      isPaid: booking.isPaid,
      notes: booking.notes ?? '',
      facilityArea: booking.facilityArea ?? '',
      startTime: toDateTimeInputValue(booking.startTime),
      endTime: toDateTimeInputValue(booking.endTime),
    });
  }

  function quickChangeStatus(booking: Booking, status: Booking['status']) {
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, status } : b)));
    const fd = new FormData();
    fd.set('bookingId', booking.id);
    fd.set('status', status);
    statusAction(fd);
    closeActionMenu();
  }

  function quickTogglePaid(booking: Booking, nextIsPaid: boolean) {
    setBookings((prev) => prev.map((b) => (b.id === booking.id ? { ...b, isPaid: nextIsPaid } : b)));
    const fd = new FormData();
    fd.set('bookingId', booking.id);
    fd.set('status', booking.status);
    fd.set('isPaid', nextIsPaid ? 'true' : 'false');
    paymentAction(fd);
    closeActionMenu();
  }

  function quickDeleteBooking(bookingId: string) {
    const fd = new FormData();
    fd.set('bookingId', bookingId);
    deleteAction(fd);
    closeActionMenu();
  }

  return (
    <div className="space-y-6" onClick={closeActionMenu}>
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
                {rangePreset === 'day' ? 'Date' : rangePreset === 'week' ? 'Start date (week)' : rangePreset === 'month' ? 'Month' : rangePreset === 'year' ? 'Year' : 'End date'}
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
        <div className="glass-card py-12 text-center text-[var(--text-muted)]">Loading...</div>
      ) : loadError ? (
        <div className="glass-card p-8 text-center">
          <p className="text-[var(--text-muted)]">{loadError}</p>
          <button type="button" onClick={loadBookings} className="btn-primary mt-4">
            Retry
          </button>
        </div>
      ) : (
        <>
      <div className="glass-card overflow-visible">
        <div className="border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-6 py-4">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">Booking summary</h3>
          <p className="mb-4 text-sm text-[var(--text-muted)]">
            Reception-safe view. Pricing and payment calculations are managed only from Portal.
          </p>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs text-[var(--text-muted)]">Bookings (excl. cancelled)</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{bookingsForSummary.length}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Total hours booked</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{totalHours.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Paid bookings</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{paidBookingsCount}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)]">Unpaid bookings</p>
              <p className="text-xl font-bold text-[var(--text-primary)]">{unpaidBookingsCount}</p>
            </div>
          </div>
        </div>
        <p className="border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-6 py-3 text-sm text-[var(--text-muted)]">
          Use <strong>Edit</strong> to update time, court, paid flag, status, and notes. Use <strong>Print receipt</strong> for a customer copy.
        </p>
        <div className="overflow-visible">
          <table className="w-full table-fixed">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-[var(--border-muted)] bg-[var(--bg-card-muted)]">
                <th className="w-[220px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Customer</th>
                <th className="w-[190px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Contact</th>
                <th className="w-[120px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="w-[100px] px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Paid</th>
                <th className="w-[110px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total</th>
                <th className="w-[130px] px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">
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
                  const source = booking.notes?.toLowerCase().includes('mobile app')
                    ? 'Mobile app'
                    : booking.notes
                      ? booking.notes
                      : 'N/A';
                  const hourlyRate = Number(booking.hourlyRate || 30);
                  const totalAmount = Number.isFinite(booking.totalAmount)
                    ? Number(booking.totalAmount)
                    : Math.max(0, Math.round((booking.totalHours || 0) * hourlyRate));

                  return (
                    <tr
                      key={booking.id}
                      className="cursor-pointer border-b border-[var(--border-muted)] even:bg-[var(--bg-card-muted)]/20 hover:bg-[var(--bg-card-muted)]/50"
                      onClick={() => openEditModal(booking)}
                    >
                      <td className="px-4 py-3">
                        <div className="min-w-0 truncate text-sm font-medium text-[var(--text-primary)]" title={customerName}>
                          {customerName}
                        </div>
                        <div className="min-w-0 truncate text-xs text-[var(--text-muted)]" title={booking.facilityArea || '-'}>
                          {booking.facilityArea || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0 truncate text-sm text-[var(--text-primary)]" title={customerPhone}>
                          {customerPhone}
                        </div>
                        <div
                          className="min-w-0 truncate text-xs text-[var(--text-muted)]"
                          title={`${formatDate(booking.startTime)} | ${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`}
                        >
                          {formatDate(booking.startTime)} | {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusColor(booking.status)}`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${booking.isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {booking.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                          {formatCurrency(totalAmount)}
                        </span>
                        <div className="whitespace-nowrap text-[11px] text-[var(--text-muted)]">
                          {hourlyRate.toFixed(0)} JOD/h
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => openActionMenu(booking.id, e.currentTarget)}
                            className="rounded-lg border border-[var(--border-muted)] bg-[var(--bg-card)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                          >
                            Actions
                          </button>
                          {openMenuId === booking.id && menuPosition && typeof document !== 'undefined' &&
                            createPortal(
                              <>
                                <button
                                  type="button"
                                  aria-label="Close menu"
                                  onClick={closeActionMenu}
                                  className="fixed inset-0 z-[90] cursor-default bg-transparent"
                                />
                                <div
                                  className="fixed z-[100] w-56 overflow-y-auto rounded-lg border border-[var(--border-muted)] bg-white py-2 shadow-lg"
                                  style={{
                                    top: menuPosition.top,
                                    left: menuPosition.left,
                                    transform: menuPosition.openUp ? 'translateY(-100%)' : undefined,
                                    maxHeight: menuPosition.maxHeight,
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEditModal(booking);
                                      closeActionMenu();
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                                  >
                                    View details
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openEditModal(booking);
                                      closeActionMenu();
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                                  >
                                    Edit
                                  </button>
                                  <div className="my-1 border-t border-[var(--border-muted)]" />
                                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Change status</p>
                                  <div className="grid grid-cols-2 gap-1 px-2 pb-1">
                                    {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as Booking['status'][]).map((statusOption) => (
                                      <button
                                        key={statusOption}
                                        type="button"
                                        onClick={() => quickChangeStatus(booking, statusOption)}
                                        className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                                      >
                                        {statusOption}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="my-1 border-t border-[var(--border-muted)]" />
                                  <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">Payment</p>
                                  <div className="grid grid-cols-2 gap-1 px-2 pb-1">
                                    <button
                                      type="button"
                                      onClick={() => quickTogglePaid(booking, true)}
                                      className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                                    >
                                      Mark Paid
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => quickTogglePaid(booking, false)}
                                      className="rounded-md px-2 py-1.5 text-left text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)]"
                                    >
                                      Mark Unpaid
                                    </button>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      printBookingReceipt(booking);
                                      closeActionMenu();
                                    }}
                                    disabled={printingId === booking.id}
                                    className="mt-1 w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-card-muted)] disabled:opacity-60"
                                  >
                                    {printingId === booking.id ? 'Printing...' : 'Print receipt'}
                                  </button>
                                  <div className="my-1 border-t border-[var(--border-muted)]" />
                                  <button
                                    type="button"
                                    onClick={() => quickDeleteBooking(booking.id)}
                                    className="w-full px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                  <p className="px-3 pt-2 text-[11px] text-[var(--text-muted)]">
                                    Source: <span className="font-medium">{source}</span>
                                  </p>
                                </div>
                              </>,
                              document.body,
                            )}
                        </div>
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">Start time</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={editing.startTime}
                    onChange={(e) => setEditing((f) => (f ? { ...f, startTime: e.target.value } : null))}
                    className={`w-full rounded-xl border bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${availabilityInputToneClass}`}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[var(--text-muted)]">End time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={editing.endTime}
                    onChange={(e) => setEditing((f) => (f ? { ...f, endTime: e.target.value } : null))}
                    className={`w-full rounded-xl border bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${availabilityInputToneClass}`}
                  />
                </div>
              </div>
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
                  className={`w-full rounded-xl border bg-[var(--bg-card)] px-3 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 ${availabilityInputToneClass}`}
                  placeholder="e.g. Court 1"
                />
              </div>
              <div className={`rounded-xl border px-3 py-2 text-sm ${availabilityToneClass}`}>
                <p className="font-semibold">Live overlap check</p>
                <p>{editAvailability?.message}</p>
                {editAvailability?.conflicts?.length ? (
                  <div className="mt-2 space-y-1.5">
                    {editAvailability.conflicts.slice(0, 3).map((row) => (
                      <div key={row.id} className="rounded-lg border border-current/20 bg-white/60 px-2.5 py-1.5 text-xs">
                        <p className="font-semibold">{bookingDisplayName(row)}</p>
                        <p>{formatDate(row.startTime)} | {formatTime(row.startTime)} - {formatTime(row.endTime)}</p>
                      </div>
                    ))}
                    {editAvailability.conflicts.length > 3 ? (
                      <p className="text-xs">+{editAvailability.conflicts.length - 3} more conflicts</p>
                    ) : null}
                  </div>
                ) : null}
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
                <button type="submit" className="btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!editAvailability?.ok}>
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



'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Badge,
  Button,
  Input,
  Modal,
} from '../_components/ui';
import {
  bookingsApi,
  getFirstCompany,
  type BookingCalendarEvent,
  type BookingCourtRate,
  type BookingCustomerProfileResponse,
  type BookingFinancialStatus,
  type BookingOverviewFilters,
  type BookingOverviewResponse,
  type BookingOverviewRow,
  type BookingPaymentMethod,
  type BookingPaymentRow,
  type BookingPaymentStatus,
  type BookingPaymentsResponse,
  type BookingSource,
} from '../../lib/portalApi';
import { INVOICE_CONFIG } from '../../lib/invoiceConfig';
import {
  ArrowPathIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  PencilSquareIcon,
  PlusIcon,
  ReceiptPercentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { CreateBookingModal } from './_components/CreateBookingModal';
import { EditBookingModal } from './_components/EditBookingModal';

type ViewPreset = NonNullable<BookingOverviewFilters['view']>;
type BookingStatusFilter = NonNullable<BookingOverviewFilters['bookingStatus']>;
type PaymentStatusFilter = 'ALL' | Exclude<BookingFinancialStatus, 'PARTIAL'>;
type PaymentMethodFilter = 'ALL' | Exclude<BookingPaymentMethod, 'OTHER'>;
type SectionTab = 'overview' | 'payments-report';
type CalendarEventQuickFilter = 'ALL' | 'RECURRING' | 'BOOKINGS' | 'PAID' | 'CANCELLED' | 'EXCEPTIONS';
type SelectedOverviewEvent =
  | { kind: 'booking'; bookingId: string }
  | { kind: 'block'; event: BookingCalendarEvent };

type BookingPageFilters = {
  view: ViewPreset;
  startDate: string;
  endDate: string;
  court: string;
  label: string;
  bookingStatus: BookingStatusFilter;
  paymentStatus: PaymentStatusFilter;
  paymentMethod: PaymentMethodFilter;
  source: 'ALL' | BookingSource;
  search: string;
};

type PaymentDraft = {
  amount: string;
  method: Exclude<BookingPaymentMethod, 'OTHER'>;
  status: BookingPaymentStatus;
  transactionRef: string;
  note: string;
};

type RecurringBlockDraft = {
  dayOfWeek: string;
  courtType: string;
  time: string;
  isBlocked: boolean;
  label: string;
  startDate: string;
  endDate: string;
};

type CourtRateDraft = {
  name: string;
  hourlyRate: string;
};

type ExportRow = Record<string, string | number | null | undefined>;

const DEFAULT_PAYMENT_DRAFT: PaymentDraft = {
  amount: '',
  method: 'CASH',
  status: 'PAID',
  transactionRef: '',
  note: '',
};

const DAY_NAMES = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DEFAULT_COURT_RATE_SEED: BookingCourtRate[] = [
  { name: 'Basketball AC', hourlyRate: 40 },
  { name: 'Basketball 3x3', hourlyRate: 30 },
  { name: 'Padel', hourlyRate: 35 },
  { name: 'Volleyball', hourlyRate: 35 },
];

function formatCurrency(value: number): string {
  return `JOD ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatHourlyRate(value: number): string {
  return `JOD ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}/hr`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function localDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function localDayKey(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getPresetRange(view: ViewPreset): { startDate: string; endDate: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  if (view === 'day') {
    const date = localDateInput(now);
    return { startDate: date, endDate: date };
  }

  if (view === 'month') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { startDate: localDateInput(first), endDate: localDateInput(last) };
  }

  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { startDate: localDateInput(monday), endDate: localDateInput(sunday) };
}

function customerName(row: BookingOverviewRow): string {
  if (row.customerName && row.customerName.trim()) return row.customerName.trim();
  if (row.member) return `${row.member.firstName} ${row.member.lastName}`.trim();
  return 'Unknown customer';
}

function customerKey(row: BookingOverviewRow): string | null {
  if (row.member?.id) return `member:${row.member.id}`;
  if (row.customerEmail) return `email:${row.customerEmail}`;
  if (row.customerPhone) return `phone:${row.customerPhone}`;
  return null;
}

function bookingStatusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  const s = String(status || '').toUpperCase();
  if (s === 'CONFIRMED') return 'success';
  if (s === 'PENDING') return 'warning';
  if (s === 'CANCELLED') return 'danger';
  if (s === 'COMPLETED') return 'info';
  return 'neutral';
}

function paymentStatusBadgeVariant(status: BookingFinancialStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (status === 'PAID') return 'success';
  if (status === 'PARTIAL') return 'warning';
  if (status === 'REFUNDED') return 'danger';
  return 'neutral';
}

function statusLabel(status: string, notes: string | null): string {
  const upper = String(status || '').toUpperCase();
  if (upper === 'CANCELLED' && String(notes || '').toUpperCase().includes('[NO_SHOW]')) return 'NO_SHOW';
  return upper;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function downloadCsv(filename: string, rows: ExportRow[], columns: string[]): void {
  const header = columns.map((c) => escapeCsvCell(c)).join(',');
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(String(row[c] ?? ''))).join(','));
  const content = [header, ...lines].join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 300);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildPrintableTableHtml(title: string, subtitle: string, columns: string[], rows: ExportRow[]): string {
  const tableHead = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
  const tableBody = rows.map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(String(row[c] ?? ''))}</td>`).join('')}</tr>`).join('');
  return `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}h1{margin:0 0 4px 0;font-size:22px}p{margin:0 0 16px 0;color:#475569}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f8fafc;text-transform:uppercase;letter-spacing:.04em;font-size:11px}</style></head><body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p><table><thead><tr>${tableHead}</tr></thead><tbody>${tableBody}</tbody></table></body></html>`;
}

function printHtmlWithIframe(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 120);
}

function openHtmlInNewTabViaBlob(html: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1200);
}

function openHtmlDocument(html: string, autoPrint: boolean): void {
  const w = window.open('', '_blank', 'width=1000,height=700');
  if (!w) {
    if (autoPrint) {
      printHtmlWithIframe(html);
      return;
    }
    openHtmlInNewTabViaBlob(html);
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();

  if (autoPrint) {
    setTimeout(() => {
      w.focus();
      w.print();
    }, 180);
  }
}

function openPrintableDocument(title: string, subtitle: string, columns: string[], rows: ExportRow[], autoPrint: boolean): void {
  const html = buildPrintableTableHtml(title, subtitle, columns, rows);
  openHtmlDocument(html, autoPrint);
}

function bookingReceiptId(bookingId: string, paymentId: string, createdAtIso: string): string {
  const d = new Date(createdAtIso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `BKR-${y}${m}${day}-${bookingId.slice(-4).toUpperCase()}-${paymentId.slice(-4).toUpperCase()}`;
}

function buildBookingReceiptHtml(input: {
  booking: BookingPaymentsResponse['booking'];
  payment: BookingPaymentRow;
  financials: BookingPaymentsResponse['financials'];
}): string {
  const { booking, payment, financials } = input;
  const receiptNo = bookingReceiptId(booking.id, payment.id, payment.createdAt);
  const issuedAt = formatDateTime(payment.createdAt);
  const customer = booking.customerName || 'Customer';
  const isRefund = payment.status === 'REFUNDED';
  const signedAmount = isRefund ? -Math.abs(payment.amount) : Math.abs(payment.amount);
  const runningPaid = financials.netPaid;
  const remaining = financials.remainingAmount;

  return `<!doctype html>
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
              <div style="font-size:15px; font-weight:800">${escapeHtml(INVOICE_CONFIG.companyName)}</div>
              <div class="muted" style="font-size:12px">${escapeHtml(INVOICE_CONFIG.companyAddress)}</div>
              <div class="muted" style="font-size:12px">${escapeHtml(INVOICE_CONFIG.companyPhone)} | ${escapeHtml(INVOICE_CONFIG.companyEmail)}</div>
            </div>
          </div>
          <div style="text-align:right">
            <div style="font-size:30px; font-weight:900">${isRefund ? 'REFUND RECEIPT' : 'RECEIPT'}</div>
            <div class="muted" style="font-size:12px">${escapeHtml(receiptNo)}</div>
          </div>
        </div>
        <div class="line"></div>
        <div class="grid">
          <div class="card">
            <div style="font-weight:700; margin-bottom:6px">Customer</div>
            <div>${escapeHtml(customer)}</div>
            <div class="muted">${escapeHtml(booking.customerPhone || booking.customerEmail || '-')}</div>
            <div style="margin-top:8px" class="muted">Court: ${escapeHtml(booking.facilityArea || '-')}</div>
            <div class="muted">Booking ID: ${escapeHtml(booking.id)}</div>
            <div class="muted">Date: ${escapeHtml(formatDate(booking.startTime))} ${escapeHtml(formatTime(booking.startTime))} - ${escapeHtml(formatTime(booking.endTime))}</div>
          </div>
          <div class="card">
            <div style="font-weight:700; margin-bottom:6px">Payment</div>
            <div class="muted">Issued: ${escapeHtml(issuedAt)}</div>
            <div class="muted">Method: ${escapeHtml(payment.method)}</div>
            <div class="muted">Status: ${escapeHtml(payment.status)}</div>
            <div class="muted">Transaction Ref: ${escapeHtml(payment.transactionRef || '-')}</div>
            <div class="amount">${signedAmount.toFixed(2)} JOD</div>
          </div>
        </div>

        <table>
          <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>${isRefund ? 'Booking payment refund' : 'Booking payment'} - ${escapeHtml(booking.id)}</td>
              <td style="text-align:right; font-weight:700">${signedAmount.toFixed(2)} JOD</td>
            </tr>
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row"><span class="muted">Booking Total</span><strong>${financials.totalAmount.toFixed(2)} JOD</strong></div>
          <div class="totals-row"><span class="muted">Paid to Date</span><strong>${runningPaid.toFixed(2)} JOD</strong></div>
          <div class="totals-row"><span class="muted">Remaining</span><strong>${remaining.toFixed(2)} JOD</strong></div>
        </div>
      </div>
    </body>
  </html>`;
}

function enumerateDays(rangeStartIso: string, rangeEndIso: string): Date[] {
  const start = new Date(rangeStartIso);
  const end = new Date(rangeEndIso);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const out: Date[] = [];
  for (let d = new Date(start); d.getTime() <= end.getTime(); d.setDate(d.getDate() + 1)) {
    out.push(new Date(d));
  }
  return out;
}

function getRecurringDraftFromEvent(event: BookingCalendarEvent): RecurringBlockDraft {
  const start = new Date(event.startTime);
  return {
    dayOfWeek: DAY_NAMES[start.getDay()],
    courtType: event.court || 'Basketball AC',
    time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
    isBlocked: String(event.status || '').toUpperCase() !== 'FREE',
    label: event.title || '',
    startDate: '',
    endDate: '',
  };
}

function getCourtHourlyRate(court: string | null | undefined, lookup: Record<string, number>): number {
  if (!court) return 30;
  return lookup[court] ?? 30;
}

function buildCourtRateDrafts(source: BookingCourtRate[]): CourtRateDraft[] {
  const byName = new Map<string, number>();
  source.forEach((row) => {
    const name = String(row.name || '').trim();
    if (!name) return;
    const amount = Math.max(1, Math.round(Number(row.hourlyRate || 0)));
    byName.set(name, amount);
  });
  return Array.from(byName.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, hourlyRate]) => ({ name, hourlyRate: String(hourlyRate) }));
}

function buildBookingRowsForExport(rows: BookingOverviewRow[], courtRateLookup: Record<string, number>): ExportRow[] {
  return rows.map((row) => ({
    BookingID: row.id,
    DateTime: `${formatDate(row.startTime)} ${formatTime(row.startTime)} - ${formatTime(row.endTime)}`,
    Court: row.facilityArea || '-',
    RatePerHour: getCourtHourlyRate(row.facilityArea, courtRateLookup),
    Customer: customerName(row),
    Phone: row.customerPhone || '-',
    Status: statusLabel(row.status, row.notes),
    Hours: row.financials.totalHours,
    TotalAmount: row.financials.totalAmount,
    PaidAmount: row.financials.paidAmount,
    RemainingAmount: row.financials.remainingAmount,
    PaymentStatus: row.financials.paymentStatus,
    PaymentMethod: row.financials.latestPaymentMethod || '-',
    Source: row.source,
  }));
}

function toReceiptBookingSnapshot(booking: BookingOverviewRow): BookingPaymentsResponse['booking'] {
  return {
    id: booking.id,
    customerName: customerName(booking),
    customerPhone: booking.customerPhone || null,
    customerEmail: booking.customerEmail || null,
    startTime: booking.startTime,
    endTime: booking.endTime,
    facilityArea: booking.facilityArea || null,
    status: booking.status,
  };
}

function pickLatestPayment(payments: BookingPaymentRow[]): BookingPaymentRow | null {
  if (payments.length === 0) return null;
  const sorted = [...payments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return sorted[0] ?? null;
}

function eventTypeLabel(type: BookingCalendarEvent['type']): string {
  if (type === 'RECURRING_BLOCK') return 'Recurring';
  if (type === 'BOOKING') return 'Booking';
  if (type === 'MAINTENANCE') return 'Maintenance';
  return 'Exception';
}

function eventBadgeLabel(event: BookingCalendarEvent): string {
  const status = String(event.status || '').toUpperCase();
  if (event.type === 'BOOKING' && status === 'CANCELLED') return 'Cancelled';
  if (event.type === 'BOOKING' && event.paymentStatus === 'PAID') return 'Paid';
  return eventTypeLabel(event.type);
}

function eventMatchesQuickFilter(event: BookingCalendarEvent, filter: CalendarEventQuickFilter): boolean {
  if (filter === 'ALL') return true;
  const status = String(event.status || '').toUpperCase();
  if (filter === 'RECURRING') return event.type === 'RECURRING_BLOCK';
  if (filter === 'BOOKINGS') return event.type === 'BOOKING';
  if (filter === 'PAID') return event.type === 'BOOKING' && event.paymentStatus === 'PAID';
  if (filter === 'CANCELLED') return event.type === 'BOOKING' && status === 'CANCELLED';
  return event.type === 'EXCEPTION' || event.type === 'MAINTENANCE';
}

function badgeDotClass(status: string): string {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'CONFIRMED' || normalized === 'COMPLETED') return 'bg-emerald-500';
  if (normalized === 'PENDING' || normalized === 'PARTIAL') return 'bg-amber-500';
  if (normalized === 'CANCELLED' || normalized === 'NO_SHOW' || normalized === 'REFUNDED') return 'bg-rose-500';
  if (normalized === 'PAID') return 'bg-emerald-500';
  if (normalized === 'UNPAID') return 'bg-slate-400';
  return 'bg-slate-400';
}

function eventBarColor(color: BookingCalendarEvent['color']): string {
  if (color === 'green') return 'bg-emerald-500';
  if (color === 'red') return 'bg-rose-500';
  if (color === 'gray') return 'bg-slate-400';
  if (color === 'orange') return 'bg-orange-500';
  return 'bg-blue-500';
}

function eventSurfaceColor(color: BookingCalendarEvent['color']): string {
  if (color === 'green') return 'border-emerald-200 bg-emerald-50/85';
  if (color === 'red') return 'border-rose-200 bg-rose-50/85';
  if (color === 'gray') return 'border-slate-200 bg-slate-50/90';
  if (color === 'orange') return 'border-orange-200 bg-orange-50/85';
  return 'border-blue-200 bg-blue-50/85';
}

function SideDrawer({
  open,
  title,
  subtitle,
  onClose,
  children,
  width = 'w-[460px]',
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button type="button" aria-label="Close drawer" onClick={onClose} className="absolute inset-0 bg-slate-900/35" />
      <aside className={`absolute right-0 top-0 h-full ${width} max-w-full overflow-y-auto border-l border-ui-border bg-white p-5 shadow-2xl`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-ui-textPrimary">{title}</h3>
            {subtitle ? <p className="text-xs text-ui-textMuted">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-ui-border p-1 text-ui-textMuted transition hover:bg-ui-softBg">
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}

function EventDetailsDrawer(props: {
  open: boolean;
  selectedEvent: SelectedOverviewEvent | null;
  booking: BookingOverviewRow | null;
  paymentsLoading: boolean;
  deletingBookingId: string | null;
  blockDraft: RecurringBlockDraft | null;
  blockError: string | null;
  blockSaving: boolean;
  onClose: () => void;
  onStatusChange: (bookingId: string, nextStatus: string) => void;
  onOpenPayments: (bookingId: string) => void;
  onEditBooking: (booking: BookingOverviewRow) => void;
  onDeleteBooking: (bookingId: string) => void;
  onMarkPaid: () => void;
  onRefund: (bookingId: string) => void;
  onSaveBlock: () => void;
  onSetFree: () => void;
  onDeleteBlock: () => void;
  onBlockDraftChange: React.Dispatch<React.SetStateAction<RecurringBlockDraft | null>>;
  courtRateLookup: Record<string, number>;
}) {
  const {
    open,
    selectedEvent,
    booking,
    paymentsLoading,
    deletingBookingId,
    blockDraft,
    blockError,
    blockSaving,
    onClose,
    onStatusChange,
    onOpenPayments,
    onEditBooking,
    onDeleteBooking,
    onMarkPaid,
    onRefund,
    onSaveBlock,
    onSetFree,
    onDeleteBlock,
    onBlockDraftChange,
    courtRateLookup,
  } = props;

  const isBooking = selectedEvent?.kind === 'booking' && !!booking;
  const isBlock = selectedEvent?.kind === 'block' && !!blockDraft;
  const blockEvent = selectedEvent?.kind === 'block' ? selectedEvent.event : null;

  return (
    <SideDrawer
      open={open && !!selectedEvent}
      onClose={onClose}
      title={isBooking ? 'Event Details' : (blockEvent?.type === 'EXCEPTION' ? 'Exception Event' : 'Recurring Event')}
      subtitle={
        isBooking && booking
          ? `Booking ID: ${booking.id}`
          : blockEvent?.id
      }
    >
      {isBooking && booking ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-ui-border bg-ui-softBg p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-ui-textPrimary">{customerName(booking)}</p>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {booking.financials.paymentStatus === 'PAID' ? 'Paid' : statusLabel(booking.status, booking.notes)}
              </span>
            </div>
            <p className="text-ui-textMuted">{booking.customerPhone || booking.customerEmail || '-'}</p>
            <p className="mt-2 text-ui-textPrimary">{formatDate(booking.startTime)} | {formatTime(booking.startTime)} - {formatTime(booking.endTime)}</p>
            <p className="text-ui-textMuted">Court: {booking.facilityArea || '-'}</p>
            <p className="text-ui-textMuted">Status: {statusLabel(booking.status, booking.notes)}</p>
            <p className="text-ui-textMuted">Rate: {formatHourlyRate(getCourtHourlyRate(booking.facilityArea, courtRateLookup))}</p>
          </div>

          <div className="rounded-xl border border-ui-border p-3">
            <p className="text-sm font-semibold text-ui-textPrimary">Payment Info</p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
              <p className="text-ui-textMuted">Total</p>
              <p className="text-right font-semibold text-ui-textPrimary">{formatCurrency(booking.financials.totalAmount)}</p>
              <p className="text-ui-textMuted">Paid</p>
              <p className="text-right font-semibold text-ui-textPrimary">{formatCurrency(booking.financials.netPaid)}</p>
              <p className="text-ui-textMuted">Remaining</p>
              <p className="text-right font-semibold text-ui-textPrimary">{formatCurrency(booking.financials.remainingAmount)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => onOpenPayments(booking.id)}>View</Button>
            <Button variant="secondary" onClick={() => onEditBooking(booking)}>Edit</Button>
            <Button variant="secondary" onClick={() => onStatusChange(booking.id, 'CONFIRMED')}>Confirm</Button>
            <Button variant="secondary" onClick={() => onStatusChange(booking.id, 'CANCELLED')}>Cancel</Button>
            <Button variant="secondary" onClick={onMarkPaid} disabled={booking.financials.remainingAmount <= 0 || paymentsLoading}>Mark Paid</Button>
            <Button variant="secondary" onClick={() => onRefund(booking.id)}>Refund</Button>
            <Button
              variant="destructive"
              className="col-span-2"
              onClick={() => onDeleteBooking(booking.id)}
              isLoading={deletingBookingId === booking.id}
              disabled={deletingBookingId !== null}
            >
              Delete Booking
            </Button>
          </div>
        </div>
      ) : null}

      {isBlock && blockDraft ? (
        <div className="space-y-3">
          {blockError ? <p className="text-sm text-ui-danger">{blockError}</p> : null}
          <div className="rounded-xl border border-ui-border bg-ui-softBg p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-ui-textPrimary">{blockEvent?.title || 'Recurring Event'}</p>
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                {eventTypeLabel(blockEvent?.type || 'RECURRING_BLOCK')}
              </span>
            </div>
            <p className="mt-1 text-ui-textMuted">{blockEvent?.court || blockDraft.courtType || '-'}</p>
            <p className="text-ui-textMuted">{blockEvent ? `${formatDate(blockEvent.startTime)} | ${formatTime(blockEvent.startTime)} - ${formatTime(blockEvent.endTime)}` : '-'}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="control-label">Day of week</label>
              <select value={blockDraft.dayOfWeek} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, dayOfWeek: e.target.value } : prev))} className="control-field">
                {DAY_NAMES.map((dayName) => (<option key={dayName} value={dayName}>{dayName}</option>))}
              </select>
            </div>
            <Input label="Time" type="time" value={blockDraft.time} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, time: e.target.value } : prev))} />
            <Input label="Court" value={blockDraft.courtType} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, courtType: e.target.value } : prev))} />
            <Input label="Label" value={blockDraft.label} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, label: e.target.value } : prev))} />
            <Input label="Start date" type="date" value={blockDraft.startDate} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, startDate: e.target.value } : prev))} />
            <Input label="End date" type="date" value={blockDraft.endDate} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, endDate: e.target.value } : prev))} />
          </div>

          <div className="flex items-center gap-2">
            <input id="block-is-blocked" type="checkbox" checked={blockDraft.isBlocked} onChange={(e) => onBlockDraftChange((prev) => (prev ? { ...prev, isBlocked: e.target.checked } : prev))} className="h-4 w-4 rounded border-ui-border" />
            <label htmlFor="block-is-blocked" className="text-sm text-ui-textPrimary">Keep this slot blocked</label>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={onSaveBlock} isLoading={blockSaving}>Edit</Button>
            <Button variant="secondary" onClick={onSetFree} isLoading={blockSaving}>Set Free</Button>
            <Button variant="secondary" onClick={onDeleteBlock} isLoading={blockSaving}>Delete</Button>
          </div>
        </div>
      ) : null}
    </SideDrawer>
  );
}

export default function BookingsPage() {
  const initial = getPresetRange('week');
  const [companyId, setCompanyId] = useState<string | undefined>(undefined);
  const [section, setSection] = useState<SectionTab>('overview');
  const [filters, setFilters] = useState<BookingPageFilters>({
    view: 'week',
    startDate: initial.startDate,
    endDate: initial.endDate,
    court: 'ALL',
    label: 'ALL',
    bookingStatus: 'ALL',
    paymentStatus: 'ALL',
    paymentMethod: 'ALL',
    source: 'ALL',
    search: '',
  });

  const [overview, setOverview] = useState<BookingOverviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingBooking, setEditingBooking] = useState<BookingOverviewRow | null>(null);
  const [calendarQuickFilter, setCalendarQuickFilter] = useState<CalendarEventQuickFilter>('ALL');
  const [calendarPanelOpen, setCalendarPanelOpen] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<SelectedOverviewEvent | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);

  const [paymentsDrawerOpen, setPaymentsDrawerOpen] = useState<boolean>(false);
  const [bookingPayments, setBookingPayments] = useState<BookingPaymentsResponse | null>(null);
  const [paymentsLoading, setPaymentsLoading] = useState<boolean>(false);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(DEFAULT_PAYMENT_DRAFT);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSubmitting, setPaymentSubmitting] = useState<boolean>(false);

  const [selectedBlockEvent, setSelectedBlockEvent] = useState<BookingCalendarEvent | null>(null);
  const [blockDraft, setBlockDraft] = useState<RecurringBlockDraft | null>(null);
  const [blockSaving, setBlockSaving] = useState<boolean>(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  const [customerModalOpen, setCustomerModalOpen] = useState<boolean>(false);
  const [customerProfile, setCustomerProfile] = useState<BookingCustomerProfileResponse | null>(null);
  const [customerLoading, setCustomerLoading] = useState<boolean>(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [courtRatesOpen, setCourtRatesOpen] = useState<boolean>(false);
  const [courtRatesDraft, setCourtRatesDraft] = useState<CourtRateDraft[]>([]);
  const [courtRatesLoading, setCourtRatesLoading] = useState<boolean>(false);
  const [courtRatesSaving, setCourtRatesSaving] = useState<boolean>(false);
  const [courtRatesError, setCourtRatesError] = useState<string | null>(null);

  const selectedBooking = useMemo<BookingOverviewRow | null>(
    () => overview?.bookings.find((row) => row.id === selectedBookingId) ?? null,
    [overview, selectedBookingId],
  );

  const courtRateLookup = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    (overview?.courts || []).forEach((court) => {
      if (court.name?.trim()) map[court.name.trim()] = Number(court.hourlyRate || 0);
    });
    return map;
  }, [overview]);

  const courtOptions = useMemo<Array<{ name: string; hourlyRate: number }>>(() => {
    if ((overview?.courts || []).length > 0) {
      return [{ name: 'ALL', hourlyRate: 0 }, ...overview.courts];
    }
    const values = new Set<string>();
    (overview?.bookings || []).forEach((row) => {
      if (row.facilityArea?.trim()) values.add(row.facilityArea.trim());
    });
    (overview?.calendarEvents || []).forEach((event) => {
      if (event.court?.trim()) values.add(event.court.trim());
    });
    return [{ name: 'ALL', hourlyRate: 0 }, ...Array.from(values).map((name) => ({ name, hourlyRate: 30 }))];
  }, [overview]);

  const labelOptions = useMemo<string[]>(() => ['ALL', ...(overview?.labels || [])], [overview]);

  const calendarDays = useMemo<Date[]>(() => {
    if (!overview) return [];
    return enumerateDays(overview.range.start, overview.range.end);
  }, [overview]);

  const eventsByDay = useMemo<Record<string, BookingCalendarEvent[]>>(() => {
    const map: Record<string, BookingCalendarEvent[]> = {};
    (overview?.calendarEvents || []).forEach((event) => {
      const key = localDayKey(event.startTime);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });
    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    });
    return map;
  }, [overview]);

  const loadOverview = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);

    try {
      const payload = await bookingsApi.getOverview({
        companyId,
        view: filters.view,
        startDate: filters.startDate,
        endDate: filters.endDate,
        court: filters.court,
        label: filters.label,
        bookingStatus: filters.bookingStatus,
        paymentStatus: filters.paymentStatus,
        paymentMethod: filters.paymentMethod,
        source: filters.source,
        search: filters.search,
      });
      setOverview(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings overview');
    } finally {
      setLoading(false);
    }
  }, [companyId, filters]);

  async function loadBookingPayments(bookingId: string): Promise<void> {
    setPaymentsLoading(true);
    setPaymentError(null);
    try {
      const payload = await bookingsApi.getPayments(bookingId);
      setBookingPayments(payload);
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to load booking payments');
    } finally {
      setPaymentsLoading(false);
    }
  }

  async function refreshAll(): Promise<void> {
    await loadOverview();
    if (selectedBookingId) await loadBookingPayments(selectedBookingId);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const company = await getFirstCompany();
        if (!mounted) return;
        setCompanyId(company?.id);
      } catch {
        if (!mounted) return;
        setCompanyId(undefined);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!companyId) return;
    void loadOverview();
  }, [companyId, loadOverview]);

  const paymentRows = overview?.paymentReport.rows || [];
  const bookingExportRows = useMemo<ExportRow[]>(
    () => buildBookingRowsForExport(overview?.bookings || [], courtRateLookup),
    [overview, courtRateLookup],
  );

  function handleViewChange(nextView: ViewPreset): void {
    if (nextView === 'custom') {
      setFilters((prev) => ({ ...prev, view: nextView }));
      return;
    }

    const range = getPresetRange(nextView);
    setFilters((prev) => ({ ...prev, view: nextView, startDate: range.startDate, endDate: range.endDate }));
  }

  async function quickStatusUpdate(bookingId: string, nextStatus: string): Promise<void> {
    try {
      await bookingsApi.update(bookingId, { status: nextStatus });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update booking status');
    }
  }

  async function deleteBookingFromPortal(bookingId: string): Promise<void> {
    const confirmed = window.confirm('Delete this booking? This action cannot be undone.');
    if (!confirmed) return;

    setDeletingBookingId(bookingId);
    setError(null);
    try {
      await bookingsApi.delete(bookingId);
      if (selectedBookingId === bookingId) {
        setSelectedBookingId(null);
        setBookingPayments(null);
        setPaymentsDrawerOpen(false);
      }
      if (editingBooking?.id === bookingId) {
        setEditingBooking(null);
      }
      setIsDrawerOpen(false);
      setSelectedEvent(null);
      await loadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete booking');
    } finally {
      setDeletingBookingId(null);
    }
  }

  async function openBookingDrawer(bookingId: string): Promise<void> {
    setSelectedEvent({ kind: 'booking', bookingId });
    setSelectedBookingId(bookingId);
    setIsDrawerOpen(true);
    await loadBookingPayments(bookingId);
  }

  function handleCalendarEventClick(event: BookingCalendarEvent): void {
    if (event.type === 'BOOKING' && event.bookingId) {
      void openBookingDrawer(event.bookingId);
      return;
    }

    setSelectedBlockEvent(event);
    setBlockDraft(getRecurringDraftFromEvent(event));
    setBlockError(null);
    setSelectedEvent({ kind: 'block', event });
    setIsDrawerOpen(true);
  }

  async function saveBlockChanges(): Promise<void> {
    if (!selectedBlockEvent?.blockId || !blockDraft) return;
    setBlockSaving(true);
    setBlockError(null);

    try {
      await bookingsApi.updateRecurringBlock(selectedBlockEvent.blockId, {
        dayOfWeek: blockDraft.dayOfWeek,
        courtType: blockDraft.courtType,
        time: blockDraft.time,
        isBlocked: blockDraft.isBlocked,
        label: blockDraft.label || null,
        startDate: blockDraft.startDate || null,
        endDate: blockDraft.endDate || null,
      });
      await loadOverview();
      setIsDrawerOpen(false);
      setSelectedEvent(null);
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Failed to update recurring block');
    } finally {
      setBlockSaving(false);
    }
  }

  async function markBlockFree(): Promise<void> {
    if (!selectedBlockEvent?.blockId) return;
    setBlockSaving(true);
    setBlockError(null);

    try {
      await bookingsApi.updateRecurringBlock(selectedBlockEvent.blockId, { isBlocked: false });
      await loadOverview();
      setIsDrawerOpen(false);
      setSelectedEvent(null);
    } catch (err) {
      setBlockError(err instanceof Error ? err.message : 'Failed to update block status');
    } finally {
      setBlockSaving(false);
    }
  }

  async function submitPayment(generateReceipt: boolean = false): Promise<void> {
    if (!selectedBookingId) return;

    const amount = Math.round(Number(paymentDraft.amount || 0));
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('Amount must be greater than 0');
      return;
    }

    setPaymentSubmitting(true);
    setPaymentError(null);

    try {
      const result = await bookingsApi.addPayment(selectedBookingId, {
        amount,
        method: paymentDraft.method,
        status: paymentDraft.status,
        transactionRef: paymentDraft.transactionRef || null,
        note: paymentDraft.note || null,
      });

      if (bookingPayments) {
        setBookingPayments((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            payments: result.payments,
            financials: result.financials,
          };
        });
      }

      if (generateReceipt) {
        const newestPayment = pickLatestPayment(result.payments);
        const activeBooking = selectedBooking ? toReceiptBookingSnapshot(selectedBooking) : bookingPayments?.booking;
        if (newestPayment && activeBooking) {
          const html = buildBookingReceiptHtml({
            booking: activeBooking,
            payment: newestPayment,
            financials: result.financials,
          });
          openHtmlDocument(html, false);
        }
      }

      setPaymentDraft(DEFAULT_PAYMENT_DRAFT);
      await refreshAll();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to save payment');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function markBookingFullyPaid(): Promise<void> {
    if (!selectedBookingId || !bookingPayments) return;
    const remaining = Math.round(Number(bookingPayments.financials.remainingAmount || 0));
    if (remaining <= 0) return;

    setPaymentSubmitting(true);
    setPaymentError(null);

    try {
      const result = await bookingsApi.addPayment(selectedBookingId, {
        amount: remaining,
        method: 'CASH',
        status: 'PAID',
        note: 'Marked paid from booking drawer',
      });

      setBookingPayments((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          payments: result.payments,
          financials: result.financials,
        };
      });

      const newestPayment = pickLatestPayment(result.payments);
      if (newestPayment) {
        const html = buildBookingReceiptHtml({
          booking: bookingPayments.booking,
          payment: newestPayment,
          financials: result.financials,
        });
        openHtmlDocument(html, false);
      }

      await refreshAll();
    } catch (err) {
      setPaymentError(err instanceof Error ? err.message : 'Failed to mark booking paid');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function openCustomerProfile(row: BookingOverviewRow): Promise<void> {
    const key = customerKey(row);
    if (!key) {
      setCustomerError('No customer key (member/email/phone) available for this booking');
      setCustomerProfile(null);
      setCustomerModalOpen(true);
      return;
    }

    setCustomerModalOpen(true);
    setCustomerLoading(true);
    setCustomerError(null);

    try {
      const payload = await bookingsApi.getCustomerProfile(key);
      setCustomerProfile(payload);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : 'Failed to load customer profile');
      setCustomerProfile(null);
    } finally {
      setCustomerLoading(false);
    }
  }

  function exportBookingsCsv(): void {
    const columns = ['BookingID', 'DateTime', 'Court', 'RatePerHour', 'Customer', 'Phone', 'Status', 'Hours', 'TotalAmount', 'PaidAmount', 'RemainingAmount', 'PaymentStatus', 'PaymentMethod', 'Source'];
    downloadCsv(`bookings-${filters.startDate}-to-${filters.endDate}.csv`, bookingExportRows, columns);
  }

  function exportBookingsPdf(): void {
    const columns = ['BookingID', 'DateTime', 'Court', 'RatePerHour', 'Customer', 'Status', 'Hours', 'TotalAmount', 'PaidAmount', 'RemainingAmount', 'PaymentStatus', 'Source'];
    const rows = bookingExportRows.map((row) => {
      const next: ExportRow = {};
      columns.forEach((c) => {
        next[c] = row[c];
      });
      return next;
    });
    openPrintableDocument('Bookings Export', `Range ${filters.startDate} to ${filters.endDate} | Court ${filters.court} | Status ${filters.bookingStatus}`, columns, rows, true);
  }

  function exportPaymentsReportCsv(): void {
    const columns = ['Date', 'BookingID', 'Customer', 'Court', 'Amount', 'Method', 'Status', 'Reference', 'CreatedBy'];
    const rows: ExportRow[] = paymentRows.map((row) => ({
      Date: formatDateTime(row.createdAt),
      BookingID: row.bookingId,
      Customer: row.customerName || '-',
      Court: row.court || '-',
      Amount: row.amount,
      Method: row.method,
      Status: row.status,
      Reference: row.transactionRef || '-',
      CreatedBy: row.createdByAdminId || '-',
    }));
    downloadCsv(`payments-report-${filters.startDate}-to-${filters.endDate}.csv`, rows, columns);
  }

  function exportPaymentsReportPdf(): void {
    const columns = ['Date', 'BookingID', 'Customer', 'Court', 'Amount', 'Method', 'Status', 'Reference'];
    const rows: ExportRow[] = paymentRows.map((row) => ({
      Date: formatDateTime(row.createdAt),
      BookingID: row.bookingId,
      Customer: row.customerName || '-',
      Court: row.court || '-',
      Amount: row.amount,
      Method: row.method,
      Status: row.status,
      Reference: row.transactionRef || '-',
    }));
    openPrintableDocument('Payments Report', `Range ${filters.startDate} to ${filters.endDate}`, columns, rows, true);
  }

  function exportCustomerStatementCsv(): void {
    if (!customerProfile) return;
    const columns = ['Date', 'BookingID', 'Court', 'Amount', 'Method', 'Status', 'TransactionRef'];
    const rows: ExportRow[] = customerProfile.paymentHistory.map((row) => ({
      Date: formatDateTime(row.createdAt),
      BookingID: row.bookingId,
      Court: row.court || '-',
      Amount: row.amount,
      Method: row.method,
      Status: row.status,
      TransactionRef: row.transactionRef || '-',
    }));
    downloadCsv(`customer-statement-${customerProfile.customer.key}.csv`, rows, columns);
  }

  function exportCustomerStatementPdf(): void {
    if (!customerProfile) return;
    const columns = ['Date', 'BookingID', 'Court', 'Amount', 'Method', 'Status'];
    const rows: ExportRow[] = customerProfile.paymentHistory.map((row) => ({
      Date: formatDateTime(row.createdAt),
      BookingID: row.bookingId,
      Court: row.court || '-',
      Amount: row.amount,
      Method: row.method,
      Status: row.status,
    }));
    openPrintableDocument('Customer Statement', `${customerProfile.customer.name || 'Customer'} | ${customerProfile.customer.phone || ''}`, columns, rows, true);
  }

  function viewPaymentReceipt(booking: BookingPaymentsResponse['booking'], payment: BookingPaymentRow, financials: BookingPaymentsResponse['financials']): void {
    const html = buildBookingReceiptHtml({ booking, payment, financials });
    openHtmlDocument(html, false);
  }

  function downloadPaymentReceiptPdf(booking: BookingPaymentsResponse['booking'], payment: BookingPaymentRow, financials: BookingPaymentsResponse['financials']): void {
    const html = buildBookingReceiptHtml({ booking, payment, financials });
    openHtmlDocument(html, true);
  }

  if (!companyId) {
    return (
      <div className="space-y-4">
        <h1 className="text-[30px] font-extrabold tracking-tight text-ui-textPrimary">Bookings</h1>
        <Card>
          <CardBody>
            <p className="text-sm text-ui-textMuted">No company found. Create/select a company first to manage bookings.</p>
          </CardBody>
        </Card>
      </div>
    );
  }

  const bookingCount = overview?.bookings.length || 0;
  const kpiCards = [
    { key: 'collected', label: 'Total Collected', value: formatCurrency(overview?.kpis.totalCollected || 0), tone: 'border-emerald-500', iconTone: 'bg-emerald-100 text-emerald-700', icon: <BanknotesIcon className="h-5 w-5" /> },
    { key: 'pending', label: 'Total Pending', value: formatCurrency(overview?.kpis.totalPending || 0), tone: 'border-orange-500', iconTone: 'bg-orange-100 text-orange-700', icon: <ClockIcon className="h-5 w-5" /> },
    { key: 'refunds', label: 'Total Refunds', value: formatCurrency(overview?.kpis.totalRefunds || 0), tone: 'border-rose-500', iconTone: 'bg-rose-100 text-rose-700', icon: <ReceiptPercentIcon className="h-5 w-5" /> },
    { key: 'revenue', label: 'Total Revenue', value: formatCurrency(overview?.kpis.totalRevenue || 0), tone: 'border-blue-500', iconTone: 'bg-blue-100 text-blue-700', icon: <CurrencyDollarIcon className="h-5 w-5" /> },
    { key: 'bookings', label: 'Bookings Count', value: String(overview?.kpis.bookingsCount || 0), tone: 'border-slate-400', iconTone: 'bg-slate-100 text-slate-700', icon: <CalendarDaysIcon className="h-5 w-5" /> },
    { key: 'hours', label: 'Total Hours Booked', value: String(overview?.kpis.totalHoursBooked || 0), tone: 'border-cyan-500', iconTone: 'bg-cyan-100 text-cyan-700', icon: <ClockIcon className="h-5 w-5" /> },
    { key: 'utilization', label: 'Utilization %', value: `${Number(overview?.kpis.utilizationPercent || 0).toFixed(2)}%`, tone: 'border-indigo-500', iconTone: 'bg-indigo-100 text-indigo-700', icon: <ChartBarIcon className="h-5 w-5" />, caption: `Available hours: ${overview?.kpis.availableHours || 0}` },
  ];

  function viewToday(): void {
    const range = getPresetRange('day');
    setFilters((prev) => ({ ...prev, view: 'day', startDate: range.startDate, endDate: range.endDate }));
  }

  function viewThisWeek(): void {
    const range = getPresetRange('week');
    setFilters((prev) => ({ ...prev, view: 'week', startDate: range.startDate, endDate: range.endDate }));
  }

  async function openCourtRatesModal(): Promise<void> {
    setCourtRatesOpen(true);
    setCourtRatesLoading(true);
    setCourtRatesError(null);
    try {
      let source: BookingCourtRate[] = (overview?.courts || []).length
        ? (overview?.courts || [])
        : [];
      if (!source.length) {
        const apiRates = await bookingsApi.getCourtRates().catch(() => []);
        if (Array.isArray(apiRates) && apiRates.length) source = apiRates;
      }
      if (!source.length) {
        source = courtOptions
          .filter((court) => court.name !== 'ALL')
          .map((court) => ({ name: court.name, hourlyRate: court.hourlyRate || 30 }));
      }
      if (!source.length) {
        source = DEFAULT_COURT_RATE_SEED;
      }
      setCourtRatesDraft(buildCourtRateDrafts(source));
    } catch (err) {
      setCourtRatesError(err instanceof Error ? err.message : 'Failed to load court rates');
      setCourtRatesDraft(buildCourtRateDrafts(DEFAULT_COURT_RATE_SEED));
    } finally {
      setCourtRatesLoading(false);
    }
  }

  async function saveCourtRates(): Promise<void> {
    const cleaned = courtRatesDraft
      .map((row) => ({
        name: String(row.name || '').trim(),
        hourlyRate: Math.round(Number(row.hourlyRate || 0)),
      }))
      .filter((row) => row.name || row.hourlyRate > 0);

    if (cleaned.length === 0) {
      setCourtRatesError('No court rates to save.');
      return;
    }

    const payload: BookingCourtRate[] = [];
    const seen = new Set<string>();
    for (const row of cleaned) {
      const name = row.name;
      const hourlyRate = row.hourlyRate;
      if (!name) {
        setCourtRatesError('Court name is required.');
        return;
      }
      if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
        setCourtRatesError(`Invalid hourly rate for ${name}.`);
        return;
      }
      const key = name.toLowerCase();
      if (seen.has(key)) {
        setCourtRatesError(`Duplicate court name: ${name}`);
        return;
      }
      seen.add(key);
      payload.push({ name, hourlyRate });
    }

    setCourtRatesSaving(true);
    setCourtRatesError(null);
    try {
      await bookingsApi.updateCourtRates({ rates: payload });
      setCourtRatesOpen(false);
      await refreshAll();
    } catch (err) {
      setCourtRatesError(err instanceof Error ? err.message : 'Failed to save court rates');
    } finally {
      setCourtRatesSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-8 bg-slate-50/45 pb-10">
      <div className="mb-8 border-b border-ui-border pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-[30px] font-extrabold tracking-tight text-ui-textPrimary">Bookings</h1>
            <p className="mt-1 text-sm text-ui-textMuted">Calendar, bookings, payments, and settlement in one page.</p>
          </div>
          <div className="flex items-center gap-2 lg:justify-end">
            <Button variant="secondary" onClick={() => void loadOverview()} leadingIcon={<ArrowPathIcon className="h-4 w-4" />}>
              Refresh
            </Button>
            <Button onClick={() => setShowCreateModal(true)} leadingIcon={<PlusIcon className="h-5 w-5" />}>
              New Booking
            </Button>
          </div>
        </div>
      </div>

      <Card className="rounded-xl border border-ui-border bg-white shadow-sm">
        <CardBody className="rounded-xl bg-slate-100/45 p-6">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ui-textPrimary">
            <FunnelIcon className="h-4 w-4" />
            Global Filters
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
            <div>
              <label className="control-label">Date range</label>
              <select value={filters.view} onChange={(e) => handleViewChange(e.target.value as ViewPreset)} className="control-field h-10">
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div>
              <label className="control-label">Court</label>
              <select value={filters.court} onChange={(e) => setFilters((prev) => ({ ...prev, court: e.target.value }))} className="control-field h-10">
                {courtOptions.map((court) => (
                  <option key={court.name} value={court.name}>
                    {court.name === 'ALL' ? 'ALL' : `${court.name} (${formatHourlyRate(court.hourlyRate)})`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="control-label">Label / Club</label>
              <select value={filters.label} onChange={(e) => setFilters((prev) => ({ ...prev, label: e.target.value }))} className="control-field h-10">
                {labelOptions.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="control-label">Booking status</label>
              <select value={filters.bookingStatus} onChange={(e) => setFilters((prev) => ({ ...prev, bookingStatus: e.target.value as BookingStatusFilter }))} className="control-field h-10">
                <option value="ALL">All</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
                <option value="NO_SHOW">No-show</option>
              </select>
            </div>

            <div>
              <label className="control-label">Payment status</label>
              <select value={filters.paymentStatus} onChange={(e) => setFilters((prev) => ({ ...prev, paymentStatus: e.target.value as PaymentStatusFilter }))} className="control-field h-10">
                <option value="ALL">All</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PAID">Paid</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            <div>
              <label className="control-label">Payment method</label>
              <select value={filters.paymentMethod} onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value as PaymentMethodFilter }))} className="control-field h-10">
                <option value="ALL">All</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="ONLINE">Online</option>
                <option value="TRANSFER">Transfer</option>
              </select>
            </div>

            <div>
              <label className="control-label">Source</label>
              <select value={filters.source} onChange={(e) => setFilters((prev) => ({ ...prev, source: e.target.value as 'ALL' | BookingSource }))} className="control-field h-10">
                <option value="ALL">All</option>
                <option value="WEBSITE">Website</option>
                <option value="APP">App</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          {filters.view === 'custom' ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:max-w-[520px]">
              <Input label="Start date" type="date" className="h-10" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} />
              <Input label="End date" type="date" className="h-10" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} />
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="flex-1">
              <Input
                label="Search"
                className="h-10"
                placeholder="Customer name / phone / booking ID"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              />
            </div>

            <div className="flex items-end justify-end gap-2 xl:min-w-fit">
              <Button variant="secondary" onClick={exportBookingsCsv} leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}>
                Export CSV
              </Button>
              <Button variant="secondary" onClick={exportBookingsPdf} leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}>
                Export PDF
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ui-textMuted">Court Rates</p>
            <Button size="sm" variant="secondary" onClick={() => void openCourtRatesModal()} leadingIcon={<PencilSquareIcon className="h-3.5 w-3.5" />}>
              Edit Rates
            </Button>
            {(overview?.courts || []).map((court) => (
              <span key={court.name} className="rounded-full border border-ui-border bg-white px-3 py-1 text-xs font-semibold text-ui-textPrimary">
                {court.name}: {formatHourlyRate(court.hourlyRate)}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      {error ? (
        <Card className="rounded-xl border border-rose-200 bg-rose-50 shadow-sm">
          <CardBody>
            <p className="text-sm text-rose-700">{error}</p>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((item) => (
          <Card key={item.key} className={`rounded-xl border border-ui-border bg-white p-0 shadow-sm transition hover:shadow-md ${item.tone} border-l-4`}>
            <CardBody className="p-6">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ui-textMuted">{item.label}</p>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${item.iconTone}`}>{item.icon}</div>
              </div>
              <p className="mt-3 text-right text-3xl font-bold leading-none text-ui-textPrimary">{item.value}</p>
              {item.caption ? <p className="mt-2 text-right text-xs text-ui-textMuted">{item.caption}</p> : null}
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="mb-4 mt-6">
        <div className="inline-flex rounded-xl border border-ui-border bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setSection('overview')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${section === 'overview' ? 'bg-[#0b1f4f] text-white shadow-sm' : 'text-ui-textMuted hover:bg-ui-softBg'}`}
          >
            Booking Overview
          </button>
          <button
            type="button"
            onClick={() => setSection('payments-report')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${section === 'payments-report' ? 'bg-[#0b1f4f] text-white shadow-sm' : 'text-ui-textMuted hover:bg-ui-softBg'}`}
          >
            Payments Report
          </button>
        </div>
      </div>

            {section === 'overview' ? (
        <>
          <Card className="min-w-0 rounded-xl border border-ui-border bg-white shadow-sm">
            <CardHeader className="border-b border-ui-border px-6 py-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-ui-textPrimary">Bookings Table</h2>
                  <span className="rounded-full border border-ui-border bg-slate-100 px-2.5 py-1 text-xs font-semibold text-ui-textMuted">{bookingCount} bookings</span>
                </div>
                <Button variant="secondary" onClick={() => setCalendarPanelOpen(true)} leadingIcon={<CalendarDaysIcon className="h-4 w-4" />}>
                  Open Calendar
                </Button>
              </div>
            </CardHeader>
            <CardBody className="h-[720px] p-0">
              {bookingCount === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <CalendarDaysIcon className="h-10 w-10 text-slate-400" />
                  <p className="text-base font-semibold text-ui-textPrimary">No bookings for selected range</p>
                  <p className="text-sm text-ui-textMuted">Try today view or reset filters to review activity quickly.</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    <Button variant="secondary" onClick={viewToday}>View Today</Button>
                    <Button variant="secondary" onClick={viewThisWeek}>This Week</Button>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-x-hidden overflow-y-auto">
                  <div className="hidden 2xl:block">
                    <table className="w-full table-fixed">
                      <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur">
                        <tr className="text-[11px] uppercase tracking-[0.12em] text-ui-textMuted">
                          <th className="w-[120px] px-3 py-3 text-left font-semibold">Court</th>
                          <th className="w-[180px] px-3 py-3 text-left font-semibold">Customer</th>
                          <th className="w-[140px] px-3 py-3 text-left font-semibold">Time</th>
                          <th className="w-[120px] px-3 py-3 text-left font-semibold">Status</th>
                          <th className="w-[90px] px-3 py-3 text-right font-semibold">Total</th>
                          <th className="w-[90px] px-3 py-3 text-right font-semibold">Paid</th>
                          <th className="w-[70px] px-3 py-3 text-center font-semibold">Details</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(overview?.bookings || []).map((row, index) => (
                          <tr
                            key={row.id}
                            onClick={() => void openBookingDrawer(row.id)}
                            className={`cursor-pointer border-t border-ui-border text-sm text-ui-textPrimary transition hover:bg-sky-50/60 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}
                          >
                            <td className="truncate whitespace-nowrap px-3 py-3" title={row.facilityArea || '-'}>{row.facilityArea || '-'}</td>
                            <td className="px-3 py-3">
                              <button type="button" onClick={(e) => { e.stopPropagation(); void openCustomerProfile(row); }} className="block max-w-full truncate text-left font-semibold text-brand-primaryBlue hover:underline" title={customerName(row)}>
                                {customerName(row)}
                              </button>
                              <p className="truncate whitespace-nowrap text-xs text-ui-textMuted">{row.customerPhone || row.customerEmail || '-'}</p>
                            </td>
                            <td className="truncate whitespace-nowrap px-3 py-3 text-sm">
                              {new Date(row.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} | {formatTime(row.startTime)}
                            </td>
                            <td className="truncate px-3 py-3">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${badgeDotClass(statusLabel(row.status, row.notes))}`} />
                                <Badge variant={bookingStatusBadgeVariant(row.status)}>{statusLabel(row.status, row.notes)}</Badge>
                              </span>
                            </td>
                            <td className="truncate whitespace-nowrap px-3 py-3 text-right font-semibold">{formatCurrency(row.financials.totalAmount)}</td>
                            <td className="truncate whitespace-nowrap px-3 py-3 text-right font-semibold">{formatCurrency(row.financials.netPaid)}</td>
                            <td className="px-3 py-3 text-center">
                              <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); void openBookingDrawer(row.id); }}>View</Button>
                            </td>
                          </tr>
                        ))}
                        {bookingCount < 8 ? (
                          <tr className="pointer-events-none">
                            <td colSpan={7} className="h-28 bg-gradient-to-b from-transparent to-slate-50/40" />
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-2 p-3 2xl:hidden">
                    {(overview?.bookings || []).map((row, index) => (
                      <div key={row.id} onClick={() => void openBookingDrawer(row.id)} className={`cursor-pointer rounded-xl border border-ui-border p-3 transition hover:border-slate-300 hover:shadow-sm ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-ui-textPrimary">{row.facilityArea || '-'}</p>
                          <Badge variant={bookingStatusBadgeVariant(row.status)}>{statusLabel(row.status, row.notes)}</Badge>
                        </div>
                        <button type="button" onClick={(e) => { e.stopPropagation(); void openCustomerProfile(row); }} className="mt-1 block w-full truncate text-left text-sm font-semibold text-brand-primaryBlue">
                          {customerName(row)}
                        </button>
                        <p className="text-xs text-ui-textMuted">{formatDate(row.startTime)} | {formatTime(row.startTime)} - {formatTime(row.endTime)}</p>
                        <div className="mt-2 flex items-center justify-between text-sm">
                          <p className="font-semibold text-ui-textPrimary">{formatCurrency(row.financials.totalAmount)}</p>
                          <Badge variant={paymentStatusBadgeVariant(row.financials.paymentStatus)}>{row.financials.paymentStatus}</Badge>
                        </div>
                        <div className="mt-2">
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); void openBookingDrawer(row.id); }}>View Details</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>

          <SideDrawer
            open={calendarPanelOpen}
            onClose={() => setCalendarPanelOpen(false)}
            title="Calendar Overview"
            subtitle="Recurring blocks, bookings, paid/cancelled, and exceptions."
            width="w-[760px]"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-end gap-1.5 text-[10px] font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-slate-700">Recurring</span>
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700">Booking</span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">Paid</span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-rose-700">Cancelled</span>
                <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-1 text-orange-700">Exception</span>
              </div>

              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
                <div>
                  <label className="control-label">Range</label>
                  <select
                    value={filters.view}
                    onChange={(e) => handleViewChange(e.target.value as ViewPreset)}
                    className="control-field h-9"
                  >
                    <option value="day">Day</option>
                    <option value="week">Week</option>
                    <option value="month">Month</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <Button size="sm" variant="secondary" onClick={viewToday}>Today</Button>
                <Button size="sm" variant="secondary" onClick={viewThisWeek}>This week</Button>
              </div>

              {filters.view === 'custom' ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    label="Start date"
                    type="date"
                    className="h-9"
                    value={filters.startDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                  <Input
                    label="End date"
                    type="date"
                    className="h-9"
                    value={filters.endDate}
                    onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              ) : null}

              <div className="flex flex-wrap gap-1.5">
                {([
                  ['ALL', 'All'],
                  ['RECURRING', 'Recurring'],
                  ['BOOKINGS', 'Bookings'],
                  ['PAID', 'Paid'],
                  ['CANCELLED', 'Cancelled'],
                  ['EXCEPTIONS', 'Exceptions'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCalendarQuickFilter(value)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      calendarQuickFilter === value
                        ? 'border-[#0b1f4f] bg-[#0b1f4f] text-white'
                        : 'border-ui-border bg-white text-ui-textMuted hover:border-slate-300 hover:text-ui-textPrimary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="max-h-[calc(100vh-210px)] space-y-4 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2">
                {loading ? <p className="text-sm text-ui-textMuted">Loading calendar...</p> : null}
                {!loading && calendarDays.length === 0 ? <p className="text-sm text-ui-textMuted">No calendar days in selected range.</p> : null}

                {calendarDays.map((day) => {
                  const key = localDayKey(day);
                  const items = (eventsByDay[key] || []).filter((event) => eventMatchesQuickFilter(event, calendarQuickFilter));
                  return (
                    <section key={key} className="rounded-xl border border-ui-border bg-white shadow-sm">
                      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-ui-border bg-white px-4 py-2.5">
                        <p className="text-[15px] font-semibold text-ui-textPrimary">{day.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                        <span className="rounded-full border border-ui-border bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-ui-textMuted">{items.length} events</span>
                      </div>

                      <div className="space-y-1.5 p-3">
                        {items.length === 0 ? <p className="text-xs text-ui-textMuted">No events</p> : null}
                        {items.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => {
                              setCalendarPanelOpen(false);
                              handleCalendarEventClick(event);
                            }}
                            className={`relative w-full rounded-lg border py-2 pl-3 pr-2 text-left text-xs transition hover:border-slate-300 hover:shadow-sm ${eventSurfaceColor(event.color)}`}
                          >
                            <span className={`absolute left-0 top-0 h-full w-1 rounded-l-lg ${eventBarColor(event.color)}`} />
                            <div className="flex items-center justify-between gap-2">
                              <p className="pr-2 text-[12px] font-semibold text-ui-textPrimary">{event.title}</p>
                              <span className="rounded-full border border-white/70 bg-white/80 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{eventBadgeLabel(event)}</span>
                            </div>
                            <p className="mt-1 truncate text-[11px] text-ui-textMuted">
                              {formatTime(event.startTime)} - {formatTime(event.endTime)} | {event.court || 'Court not set'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </SideDrawer>
        </>
      ) : (
        <Card className="rounded-xl border border-ui-border bg-white shadow-sm">
          <CardHeader className="border-b border-ui-border px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ui-textPrimary">Daily Cashier / Settlement - Payments Report</h2>
                <p className="text-xs text-ui-textMuted">Totals by payment method and payment list within selected date range.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={exportPaymentsReportCsv} leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}>Export CSV</Button>
                <Button variant="secondary" onClick={exportPaymentsReportPdf} leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}>Export PDF</Button>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-6 p-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(['CASH', 'CARD', 'ONLINE', 'TRANSFER'] as const).map((method) => {
                const totals = overview?.paymentReport.byMethod[method] || { paid: 0, refunded: 0, net: 0 };
                return (
                  <Card key={method} className="rounded-xl border border-ui-border bg-white shadow-sm">
                    <CardBody className="p-6">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ui-textMuted">{method}</p>
                      <p className="mt-2 text-2xl font-bold text-ui-textPrimary">{formatCurrency(totals.net)}</p>
                      <p className="text-xs text-ui-textMuted">Paid: {formatCurrency(totals.paid)}</p>
                      <p className="text-xs text-ui-textMuted">Refunded: {formatCurrency(totals.refunded)}</p>
                    </CardBody>
                  </Card>
                );
              })}
            </div>

            <div className="overflow-x-auto rounded-xl border border-ui-border shadow-sm">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-ui-softBg">
                  <tr className="text-[11px] uppercase tracking-[0.12em] text-ui-textMuted">
                    <th className="px-3 py-3 text-left font-semibold">Date</th>
                    <th className="px-3 py-3 text-left font-semibold">Booking</th>
                    <th className="px-3 py-3 text-left font-semibold">Customer</th>
                    <th className="px-3 py-3 text-left font-semibold">Court</th>
                    <th className="px-3 py-3 text-left font-semibold">Amount</th>
                    <th className="px-3 py-3 text-left font-semibold">Method</th>
                    <th className="px-3 py-3 text-left font-semibold">Status</th>
                    <th className="px-3 py-3 text-left font-semibold">Transaction Ref</th>
                    <th className="px-3 py-3 text-left font-semibold">Created By</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-3 py-10 text-center text-ui-textMuted">No payments in this range.</td>
                    </tr>
                  ) : null}
                  {paymentRows.map((row) => (
                    <tr key={row.id} className="border-t border-ui-border">
                      <td className="px-3 py-3">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-3">{row.bookingId}</td>
                      <td className="px-3 py-3">{row.customerName || '-'}</td>
                      <td className="px-3 py-3">{row.court || '-'}</td>
                      <td className="px-3 py-3">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-3">{row.method}</td>
                      <td className="px-3 py-3"><Badge variant={row.status === 'REFUNDED' ? 'danger' : 'success'}>{row.status}</Badge></td>
                      <td className="px-3 py-3">{row.transactionRef || '-'}</td>
                      <td className="px-3 py-3">{row.createdByAdminId || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
      )}

      <EventDetailsDrawer
        open={isDrawerOpen}
        selectedEvent={selectedEvent}
        booking={selectedBooking}
        paymentsLoading={paymentsLoading}
        deletingBookingId={deletingBookingId}
        blockDraft={blockDraft}
        blockError={blockError}
        blockSaving={blockSaving}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedEvent(null);
        }}
        onStatusChange={(bookingId, nextStatus) => {
          void quickStatusUpdate(bookingId, nextStatus);
        }}
        onOpenPayments={(bookingId) => {
          setSelectedBookingId(bookingId);
          setPaymentsDrawerOpen(true);
          void loadBookingPayments(bookingId);
        }}
        onEditBooking={(booking) => setEditingBooking(booking)}
        onDeleteBooking={(bookingId) => {
          void deleteBookingFromPortal(bookingId);
        }}
        onMarkPaid={() => { void markBookingFullyPaid(); }}
        onRefund={(bookingId) => {
          setSelectedBookingId(bookingId);
          setPaymentDraft((prev) => ({ ...prev, status: 'REFUNDED' }));
          setPaymentsDrawerOpen(true);
          void loadBookingPayments(bookingId);
        }}
        onSaveBlock={() => { void saveBlockChanges(); }}
        onSetFree={() => { void markBlockFree(); }}
        onDeleteBlock={() => { void markBlockFree(); }}
        onBlockDraftChange={setBlockDraft}
        courtRateLookup={courtRateLookup}
      />

      <SideDrawer open={paymentsDrawerOpen && !!selectedBookingId} onClose={() => setPaymentsDrawerOpen(false)} title="Payments" subtitle={selectedBookingId ? `Booking ID: ${selectedBookingId}` : undefined} width="w-[620px]">
        <div className="space-y-4">
          {paymentsLoading ? <p className="text-sm text-ui-textMuted">Loading payments...</p> : null}
          {paymentError ? <p className="text-sm text-ui-danger">{paymentError}</p> : null}

          {bookingPayments ? (
            <div className="rounded-xl border border-ui-border bg-ui-softBg p-3 text-sm">
              <p className="font-semibold text-ui-textPrimary">{bookingPayments.booking.customerName}</p>
              <p className="text-ui-textMuted">{formatDate(bookingPayments.booking.startTime)} | {formatTime(bookingPayments.booking.startTime)} - {formatTime(bookingPayments.booking.endTime)}</p>
              <div className="mt-2 grid grid-cols-2 gap-1">
                <p className="text-ui-textMuted">Total amount</p>
                <p className="text-right font-semibold text-ui-textPrimary">{formatCurrency(bookingPayments.financials.totalAmount)}</p>
                <p className="text-ui-textMuted">Total paid</p>
                <p className="text-right font-semibold text-ui-textPrimary">{formatCurrency(bookingPayments.financials.netPaid)}</p>
                <p className="text-ui-textMuted">Remaining</p>
                <p className="text-right font-semibold text-ui-textPrimary">{formatCurrency(bookingPayments.financials.remainingAmount)}</p>
                <p className="text-ui-textMuted">Payment status</p>
                <p className="text-right"><Badge variant={paymentStatusBadgeVariant(bookingPayments.financials.paymentStatus)}>{bookingPayments.financials.paymentStatus}</Badge></p>
              </div>
              <div className="mt-3">
                <Button variant="secondary" onClick={() => void markBookingFullyPaid()} disabled={bookingPayments.financials.remainingAmount <= 0 || paymentSubmitting}>Mark Paid (Remaining)</Button>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-ui-border p-3">
            <p className="text-sm font-semibold text-ui-textPrimary">Add Payment / Refund</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input label="Amount" type="number" min="1" value={paymentDraft.amount} onChange={(e) => setPaymentDraft((prev) => ({ ...prev, amount: e.target.value }))} />
              <div>
                <label className="control-label">Method</label>
                <select value={paymentDraft.method} onChange={(e) => setPaymentDraft((prev) => ({ ...prev, method: e.target.value as Exclude<BookingPaymentMethod, 'OTHER'> }))} className="control-field">
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                  <option value="TRANSFER">Transfer</option>
                </select>
              </div>
              <div>
                <label className="control-label">Status</label>
                <select value={paymentDraft.status} onChange={(e) => setPaymentDraft((prev) => ({ ...prev, status: e.target.value as BookingPaymentStatus }))} className="control-field">
                  <option value="PAID">Paid</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <Input label="Transaction Ref" value={paymentDraft.transactionRef} onChange={(e) => setPaymentDraft((prev) => ({ ...prev, transactionRef: e.target.value }))} />
            </div>
            <Input label="Note" className="mt-3" value={paymentDraft.note} onChange={(e) => setPaymentDraft((prev) => ({ ...prev, note: e.target.value }))} />
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" onClick={() => setPaymentDraft(DEFAULT_PAYMENT_DRAFT)}>Reset</Button>
              <Button variant="secondary" onClick={() => void submitPayment(false)} isLoading={paymentSubmitting}>Save Payment</Button>
              <Button onClick={() => void submitPayment(true)} isLoading={paymentSubmitting}>Save + Receipt</Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-ui-border">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-ui-softBg">
                <tr className="text-[11px] uppercase tracking-[0.12em] text-ui-textMuted">
                  <th className="px-3 py-2 text-left font-semibold">Date</th>
                  <th className="px-3 py-2 text-left font-semibold">Amount</th>
                  <th className="px-3 py-2 text-left font-semibold">Method</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Transaction Ref</th>
                  <th className="px-3 py-2 text-left font-semibold">Created By</th>
                  <th className="px-3 py-2 text-left font-semibold">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {(bookingPayments?.payments || []).length === 0 ? (
                  <tr><td colSpan={7} className="px-3 py-8 text-center text-ui-textMuted">No payments recorded yet.</td></tr>
                ) : null}
                {(bookingPayments?.payments || []).map((row) => (
                  <tr key={row.id} className="border-t border-ui-border">
                    <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                    <td className="px-3 py-2">{row.method}</td>
                    <td className="px-3 py-2"><Badge variant={row.status === 'REFUNDED' ? 'danger' : 'success'}>{row.status}</Badge></td>
                    <td className="px-3 py-2">{row.transactionRef || '-'}</td>
                    <td className="px-3 py-2">{row.createdByAdminId || '-'}</td>
                    <td className="px-3 py-2">
                      {bookingPayments ? (
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" variant="secondary" onClick={() => viewPaymentReceipt(bookingPayments.booking, row, bookingPayments.financials)}>View</Button>
                          <Button size="sm" variant="secondary" onClick={() => downloadPaymentReceiptPdf(bookingPayments.booking, row, bookingPayments.financials)}>PDF</Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </SideDrawer>

      <Modal open={customerModalOpen} onClose={() => setCustomerModalOpen(false)} title="Customer Profile" description="Lifetime booking and payment history" size="2xl">
        {customerLoading ? <p className="text-sm text-ui-textMuted">Loading customer profile...</p> : null}
        {customerError ? <p className="text-sm text-ui-danger">{customerError}</p> : null}

        {customerProfile ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ui-border bg-ui-softBg p-3">
              <div>
                <p className="text-sm font-bold text-ui-textPrimary">{customerProfile.customer.name || 'Customer'}</p>
                <p className="text-xs text-ui-textMuted">{customerProfile.customer.phone || customerProfile.customer.email || '-'}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={exportCustomerStatementCsv} leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}>Export CSV</Button>
                <Button variant="secondary" onClick={exportCustomerStatementPdf} leadingIcon={<DocumentArrowDownIcon className="h-4 w-4" />}>Export PDF</Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardBody><p className="text-xs text-ui-textMuted">Total bookings</p><p className="text-xl font-bold text-ui-textPrimary">{customerProfile.totals.totalBookings}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-ui-textMuted">Total paid</p><p className="text-xl font-bold text-ui-textPrimary">{formatCurrency(customerProfile.totals.totalPaid)}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-ui-textMuted">Total unpaid</p><p className="text-xl font-bold text-ui-textPrimary">{formatCurrency(customerProfile.totals.totalUnpaid)}</p></CardBody></Card>
              <Card><CardBody><p className="text-xs text-ui-textMuted">Total refunds</p><p className="text-xl font-bold text-ui-textPrimary">{formatCurrency(customerProfile.totals.totalRefunds)}</p></CardBody></Card>
            </div>

            <div className="overflow-x-auto rounded-xl border border-ui-border">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-ui-softBg">
                  <tr className="text-[11px] uppercase tracking-[0.12em] text-ui-textMuted">
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Booking</th>
                    <th className="px-3 py-2 text-left font-semibold">Court</th>
                    <th className="px-3 py-2 text-left font-semibold">Amount</th>
                    <th className="px-3 py-2 text-left font-semibold">Method</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-left font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {customerProfile.paymentHistory.length === 0 ? (<tr><td colSpan={7} className="px-3 py-8 text-center text-ui-textMuted">No payment history.</td></tr>) : null}
                  {customerProfile.paymentHistory.map((row) => (
                    <tr key={row.id} className="border-t border-ui-border">
                      <td className="px-3 py-2">{formatDateTime(row.createdAt)}</td>
                      <td className="px-3 py-2">{row.bookingId}</td>
                      <td className="px-3 py-2">{row.court || '-'}</td>
                      <td className="px-3 py-2">{formatCurrency(row.amount)}</td>
                      <td className="px-3 py-2">{row.method}</td>
                      <td className="px-3 py-2"><Badge variant={row.status === 'REFUNDED' ? 'danger' : 'success'}>{row.status}</Badge></td>
                      <td className="px-3 py-2">{row.transactionRef || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={courtRatesOpen} onClose={() => setCourtRatesOpen(false)} title="Edit Court Rates" description="Update hourly price for each court" size="md">
        <div className="space-y-4">
          {courtRatesError ? <p className="text-sm text-ui-danger">{courtRatesError}</p> : null}
          {courtRatesLoading ? (
            <p className="text-sm text-ui-textMuted">Loading court rates...</p>
          ) : courtRatesDraft.length === 0 ? (
            <p className="text-sm text-ui-textMuted">No courts available yet.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCourtRatesDraft((prev) => [...prev, { name: '', hourlyRate: '30' }])}
                  leadingIcon={<PlusIcon className="h-3.5 w-3.5" />}
                >
                  Add Court
                </Button>
              </div>
              {courtRatesDraft.map((row, index) => (
                <div key={`${row.name}-${index}`} className="grid grid-cols-[1fr_140px_auto] items-center gap-2 rounded-lg border border-ui-border bg-ui-softBg p-2">
                  <input
                    type="text"
                    value={row.name}
                    placeholder="Court name"
                    onChange={(e) =>
                      setCourtRatesDraft((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: e.target.value } : item,
                        ),
                      )
                    }
                    className="control-field h-10 w-full"
                  />
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={row.hourlyRate}
                    onChange={(e) =>
                      setCourtRatesDraft((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, hourlyRate: e.target.value } : item,
                        ),
                      )
                    }
                    className="control-field h-10 w-full"
                  />
                  <button
                    type="button"
                    aria-label="Remove court rate row"
                    onClick={() =>
                      setCourtRatesDraft((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ui-border text-ui-textMuted transition hover:bg-white"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCourtRatesOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveCourtRates()} isLoading={courtRatesSaving || courtRatesLoading}>Save Rates</Button>
          </div>
        </div>
      </Modal>

      {showCreateModal ? (
        <CreateBookingModal
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            void refreshAll();
          }}
        />
      ) : null}

      {editingBooking ? (
        <EditBookingModal
          open={!!editingBooking}
          booking={editingBooking}
          onClose={() => {
            setEditingBooking(null);
            void refreshAll();
          }}
        />
      ) : null}

      {loading ? (
        <div className="fixed bottom-6 right-6 z-30 rounded-full border border-ui-border bg-white px-4 py-2 text-xs font-semibold text-ui-textMuted shadow-lg">
          Loading filtered bookings...
        </div>
      ) : null}
    </div>
  );
}

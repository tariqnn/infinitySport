import { getApiBaseUrl } from './getApiBaseUrl';

const ROUTE_BASE_URL = typeof window === 'undefined' ? getApiBaseUrl().replace(/\/$/, '') : '';

// Get company ID from localStorage or context (you may need to adjust this)
function getCompanyId(): string | undefined {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('companyId') || undefined;
  }
  return undefined;
}

async function portalFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const companyId = getCompanyId();
  const headers = new Headers(options?.headers || undefined);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (companyId) {
    headers.set('x-company-id', companyId);
  }

  const url = `${ROUTE_BASE_URL}/api${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });
  } catch {
    throw new Error(`Cannot connect to route handler at ${url}.`);
  }

  if (!response.ok) {
    const rawError = await response.text().catch(() => '');
    let message = response.statusText || 'Unknown server error';

    if (rawError) {
      try {
        const parsed = JSON.parse(rawError) as { message?: string; error?: string };
        message = parsed.message || parsed.error || message;
      } catch {
        message = rawError.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || message;
      }
    }

    throw new Error(`Request failed (${response.status}): ${message}`);
  }

  return response.json();
}

async function portalDbFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  return portalFetch<T>(endpoint, options);
}

// Module-specific API helpers
export const membersApi = {
  list: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalDbFetch<unknown[]>(`/portal/members${params}`);
  },
  get: (id: string) => portalDbFetch<unknown>(`/portal/members/${id}`),
  create: (data: unknown) => portalDbFetch<unknown>('/portal/members', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalDbFetch<unknown>(`/portal/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalDbFetch<void>(`/portal/members/${id}`, { method: 'DELETE' }),
};

export const coachesApi = {
  list: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalDbFetch<unknown[]>(`/portal/coaches${params}`);
  },
  get: (id: string) => portalDbFetch<unknown>(`/portal/coaches/${id}`),
  create: (data: unknown) => portalDbFetch<unknown>('/portal/coaches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalDbFetch<unknown>(`/portal/coaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalDbFetch<void>(`/portal/coaches/${id}`, { method: 'DELETE' }),
};

export const landingCoachesApi = {
  list: () => portalDbFetch<unknown[]>('/portal/landing-coaches'),
};

export type BookingSource = 'WEBSITE' | 'APP' | 'ADMIN';
export type BookingPaymentMethod = 'CASH' | 'CARD' | 'ONLINE' | 'TRANSFER' | 'OTHER';
export type BookingPaymentStatus = 'PAID' | 'REFUNDED';
export type BookingFinancialStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type BookingOverviewFilters = {
  companyId?: string;
  view?: 'day' | 'week' | 'month' | 'custom';
  startDate?: string;
  endDate?: string;
  court?: string;
  label?: string;
  bookingStatus?: 'ALL' | 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
  paymentStatus?: 'ALL' | BookingFinancialStatus;
  paymentMethod?: 'ALL' | Exclude<BookingPaymentMethod, 'OTHER'>;
  source?: 'ALL' | BookingSource;
  search?: string;
};

export type BookingOverviewRow = {
  id: string;
  companyId: string;
  startTime: string;
  endTime: string;
  facilityArea: string | null;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  notes: string | null;
  source: BookingSource;
  member: { id: string; firstName: string; lastName: string } | null;
  class: { id: string; name: string } | null;
  coach: { id: string; firstName: string; lastName: string } | null;
  financials: {
    totalHours: number;
    totalAmount: number;
    paidAmount: number;
    refundAmount: number;
    netPaid: number;
    remainingAmount: number;
    paymentStatus: BookingFinancialStatus;
    latestPaymentMethod: BookingPaymentMethod | null;
  };
};

export type BookingCalendarEvent = {
  id: string;
  type: 'BOOKING' | 'RECURRING_BLOCK' | 'MAINTENANCE' | 'EXCEPTION';
  bookingId?: string;
  blockId?: string;
  title: string;
  court: string | null;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus?: BookingFinancialStatus;
  openTime?: string | null;
  closeTime?: string | null;
  color: 'blue' | 'green' | 'red' | 'gray' | 'orange';
};

export type BookingPaymentRow = {
  id: string;
  bookingId: string;
  customerId: string | null;
  amount: number;
  method: BookingPaymentMethod;
  status: BookingPaymentStatus;
  transactionRef: string | null;
  createdByAdminId: string | null;
  createdAt: string;
  updatedAt: string;
  bookingStartTime?: string | null;
  court?: string | null;
  customerName?: string | null;
};

export type BookingCourtRate = {
  name: string;
  hourlyRate: number;
};

export type BookingOverviewResponse = {
  range: { start: string; end: string };
  filters: Record<string, string | null>;
  kpis: {
    totalCollected: number;
    totalPending: number;
    totalRefunds: number;
    totalRevenue: number;
    bookingsCount: number;
    totalHoursBooked: number;
    utilizationPercent: number;
    availableHours: number;
  };
  bookings: BookingOverviewRow[];
  calendarEvents: BookingCalendarEvent[];
  paymentReport: {
    byMethod: Record<string, { paid: number; refunded: number; net: number }>;
    rows: BookingPaymentRow[];
  };
  courts: BookingCourtRate[];
  labels: string[];
};

export type BookingPaymentsResponse = {
  booking: {
    id: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    startTime: string;
    endTime: string;
    facilityArea: string | null;
    status: string;
  };
  payments: BookingPaymentRow[];
  financials: BookingOverviewRow['financials'];
};

export type BookingCustomerProfileResponse = {
  customer: {
    key: string;
    name: string | null;
    phone: string | null;
    email: string | null;
  };
  totals: {
    totalBookings: number;
    totalPaid: number;
    totalUnpaid: number;
    totalRefunds: number;
  };
  bookings: Array<{
    id: string;
    startTime: string;
    endTime: string;
    facilityArea: string | null;
    status: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    source: BookingSource;
    financials: BookingOverviewRow['financials'];
  }>;
  paymentHistory: BookingPaymentRow[];
};

export const bookingsApi = {
  list: (companyId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<unknown[]>(`/portal/bookings${query}`);
  },
  get: (id: string) => portalDbFetch<unknown>(`/portal/bookings/${id}`),
  create: (data: unknown) => portalDbFetch<unknown>('/portal/bookings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalDbFetch<unknown>(`/portal/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalDbFetch<void>(`/portal/bookings/${id}`, { method: 'DELETE' }),
  getOverview: (filters: BookingOverviewFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.companyId) params.append('companyId', filters.companyId);
    if (filters.view) params.append('view', filters.view);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.court) params.append('court', filters.court);
    if (filters.label) params.append('label', filters.label);
    if (filters.bookingStatus) params.append('bookingStatus', filters.bookingStatus);
    if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    if (filters.source) params.append('source', filters.source);
    if (filters.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<BookingOverviewResponse>(`/portal/bookings/overview${query}`);
  },
  getCourtRates: () => portalDbFetch<BookingCourtRate[]>('/portal/bookings/court-rates'),
  updateCourtRates: (data: { rates: BookingCourtRate[]; createdByAdminId?: string | null }) =>
    portalDbFetch<BookingCourtRate[]>('/portal/bookings/court-rates', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getPayments: (bookingId: string) => portalDbFetch<BookingPaymentsResponse>(`/portal/bookings/${bookingId}/payments`),
  addPayment: (
    bookingId: string,
    data: {
      amount: number;
      method: BookingPaymentMethod;
      status?: BookingPaymentStatus;
      transactionRef?: string | null;
      customerId?: string | null;
      createdByAdminId?: string | null;
      note?: string | null;
    }
  ) => portalDbFetch<{ success: boolean; bookingId: string; financials: BookingOverviewRow['financials']; payments: BookingPaymentRow[] }>(
    `/portal/bookings/${bookingId}/payments`,
    { method: 'POST', body: JSON.stringify(data) }
  ),
  getCustomerProfile: (customerKey: string) =>
    portalDbFetch<BookingCustomerProfileResponse>(`/portal/bookings/customers/${encodeURIComponent(customerKey)}/profile`),
  updateRecurringBlock: (
    blockId: string,
    data: {
      dayOfWeek?: string;
      courtType?: string;
      time?: string;
      isBlocked?: boolean;
      label?: string | null;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) => portalDbFetch<unknown>(`/portal/bookings/recurring-blocks/${blockId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  duplicateRecurringBlock: (
    blockId: string,
    data?: {
      dayOfWeek?: string;
      courtType?: string;
      time?: string;
      label?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      isBlocked?: boolean;
    }
  ) => portalDbFetch<unknown>(`/portal/bookings/recurring-blocks/${blockId}/duplicate`, { method: 'POST', body: JSON.stringify(data || {}) }),
};

export const classesApi = {
  list: (companyId?: string, coachId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (coachId) params.append('coachId', coachId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<unknown[]>(`/portal/classes${query}`);
  },
  get: (id: string) => portalDbFetch<unknown>(`/portal/classes/${id}`),
  create: (data: unknown) => portalDbFetch<unknown>('/portal/classes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalDbFetch<unknown>(`/portal/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalDbFetch<void>(`/portal/classes/${id}`, { method: 'DELETE' }),
  enrollments: {
    list: (classId?: string, memberId?: string) => {
      const params = new URLSearchParams();
      if (classId) params.append('classId', classId);
      if (memberId) params.append('memberId', memberId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<unknown[]>(`/portal/enrollments${query}`);
    },
    create: (data: unknown) => portalFetch<unknown>('/portal/enrollments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/enrollments/${id}`, { method: 'DELETE' }),
  },
};

export const subscriptionsApi = {
  list: (companyId?: string, memberId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (memberId) params.append('memberId', memberId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<unknown[]>(`/portal/subscriptions${query}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/subscriptions/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/subscriptions/${id}`, { method: 'DELETE' }),
};

export const financeApi = {
  // Budget
  budgetCategories: {
    list: (companyId?: string) => {
      const params = companyId ? `?companyId=${companyId}` : '';
      return portalFetch<unknown[]>(`/portal/budget-categories${params}`);
    },
    get: (id: string) => portalFetch<unknown>(`/portal/budget-categories/${id}`),
    create: (data: unknown) => portalFetch<unknown>('/portal/budget-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/budget-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/budget-categories/${id}`, { method: 'DELETE' }),
  },
  budgetEntries: {
    list: (companyId?: string, categoryId?: string, periodStart?: string, periodEnd?: string) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (categoryId) params.append('categoryId', categoryId);
      if (periodStart) params.append('periodStart', periodStart);
      if (periodEnd) params.append('periodEnd', periodEnd);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<unknown[]>(`/portal/budget-entries${query}`);
    },
    get: (id: string) => portalFetch<unknown>(`/portal/budget-entries/${id}`),
    create: (data: unknown) => portalFetch<unknown>('/portal/budget-entries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/budget-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/budget-entries/${id}`, { method: 'DELETE' }),
  },
  // Invoices (create, delete, PDF via Nest API to avoid Node/fs in portal build)
  invoices: {
    list: (companyId?: string, status?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<unknown[]>(`/portal/invoices${query}`);
    },
    get: (id: string) => portalFetch<unknown>(`/portal/invoices/${id}`),
    create: (data: Record<string, unknown>) =>
      portalFetch<unknown>('/portal/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => {
      const url = `${ROUTE_BASE_URL}/api/portal/invoices/${id}`;
      const res = await fetch(url, {
        method: 'DELETE',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(getCompanyId() ? { 'x-company-id': getCompanyId()! } : {}),
        },
      });
      if (res.status === 204) return;
      const json = await res.json().catch(() => ({}));
      throw new Error((json as { message?: string }).message || res.statusText);
    },
    getPdfUrl: (id: string) => `${ROUTE_BASE_URL}/api/portal/invoices/${id}/pdf`,
  },
  // Cash Flow
  cashFlow: {
    list: (companyId?: string, type?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (type) params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<unknown[]>(`/portal/cash-flow${query}`);
    },
    get: (id: string) => portalFetch<unknown>(`/portal/cash-flow/${id}`),
    create: (data: unknown) => portalFetch<unknown>('/portal/cash-flow', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/cash-flow/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/cash-flow/${id}`, { method: 'DELETE' }),
  },
  // Petty Cash
  pettyCash: {
    list: (companyId?: string, type?: string, startDate?: string, endDate?: string) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (type) params.append('type', type);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<unknown[]>(`/portal/petty-cash${query}`);
    },
    get: (id: string) => portalFetch<unknown>(`/portal/petty-cash/${id}`),
    create: (data: unknown) => portalFetch<unknown>('/portal/petty-cash', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/petty-cash/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/petty-cash/${id}`, { method: 'DELETE' }),
  },
};

export const inventoryApi = {
  list: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<unknown[]>(`/portal/inventory${query}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/inventory/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/inventory/${id}`, { method: 'DELETE' }),
};

export const tasksApi = {
  list: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<unknown[]>(`/portal/staff-tasks${query}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/staff-tasks/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/staff-tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/staff-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/staff-tasks/${id}`, { method: 'DELETE' }),
};

export const settingsApi = {
  get: (companyId: string) => portalFetch<unknown>(`/portal/settings/${companyId}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/settings', { method: 'POST', body: JSON.stringify(data) }),
  update: (companyId: string, data: unknown) => portalFetch<unknown>(`/portal/settings/${companyId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const dashboardApi = {
  stats: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalFetch<unknown>(`/portal/dashboard/stats${params}`);
  },
};

export type PackageRegistrationRow = {
  id: string;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerAge: number | null;
  isPaid: boolean;
  basePriceJod: number;
  discountType: string;
  discountValue: number | null;
  discountReason: string | null;
  finalPriceJod: number;
  periodStartsAt: string | null;
  periodEndsAt: string | null;
  isFrozen: boolean;
  frozenAt: string | null;
  sessionsBonus: number;
  collected?: number; // sum of active receipts (from API when available)
  createdAt: string;
  updatedAt: string;
};

export type PackagePricingRow = { packageName: string; basePriceJod: number | null };

export type ReceiptRow = {
  id: string;
  receiptId: string;
  registrationId: string;
  personName: string;
  personPhone: string;
  packageName: string;
  dateTimeIssued: string;
  amountPaid: number;
  paymentMethod: string;
  privateNote: string;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
};

export type RegistrationTotals = {
  totalRegistered: number;
  paidCount: number;
  partialCount: number;
  unpaidCount: number;
  expectedTotal: number;
  collectedTotal: number;
  remainingTotal: number;
  discountsTotal: number;
  byMethod: Record<string, number>;
  byPackage?: Record<string, { registered: number; expected: number; collected: number; remaining: number }>;
};

export const packageRegistrationsApi = {
  list: (packageName?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (packageName) params.append('packageName', packageName);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<PackageRegistrationRow[]>(`/portal/package-registrations${query}`);
  },
  create: (data: {
    packageName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerAge?: number | null;
    basePriceJod?: number;
    discountType?: string;
    discountValue?: number | null;
    discountReason?: string | null;
    periodStartsAt?: string | null;
  }) =>
    portalDbFetch<PackageRegistrationRow>('/portal/package-registrations', { method: 'POST', body: JSON.stringify(data) }),
  getTotals: (packageName?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (packageName) params.append('packageName', packageName);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<RegistrationTotals>(`/portal/package-registrations/totals${query}`);
  },
  bulkCreate: (data: { startDate?: string | null; registrations: Array<{ packageName: string; customerName: string; customerPhone: string; customerEmail?: string | null; customerAge?: number | null; basePriceJod?: number; periodStartsAt?: string | null }> }) =>
    portalDbFetch<{ results: Array<{ success: boolean; id?: string; row?: number; error?: string }> }>('/portal/package-registrations/bulk', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateForPerson: (data: {
    person: { customerName: string; customerPhone: string; customerEmail?: string | null; customerAge?: number | null };
    periodStartsAt?: string | null;
    registrations: Array<{
      packageName: string;
      basePriceJod?: number;
      discountType?: string;
      discountValue?: number | null;
      discountReason?: string | null;
      periodStartsAt?: string | null;
    }>;
  }) =>
    portalDbFetch<{ created: number; registrations: PackageRegistrationRow[] }>('/portal/package-registrations/bulk-for-person', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: {
    packageName?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string | null;
    customerAge?: number | null;
    isPaid?: boolean;
    isFrozen?: boolean;
    basePriceJod?: number;
    discountType?: string;
    discountValue?: number | null;
    discountReason?: string | null;
    periodStartsAt?: string | null;
    periodEndsAt?: string | null;
  }) =>
    portalDbFetch<PackageRegistrationRow>(`/portal/package-registrations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalDbFetch<void>(`/portal/package-registrations/${id}`, { method: 'DELETE' }),
  reregister: (id: string) =>
    portalDbFetch<PackageRegistrationRow>(`/portal/package-registrations/${id}/reregister`, { method: 'POST' }),
  markPaid: (id: string, data: { amountPaid: number; paymentMethod: string; privateNote: string }) =>
    portalDbFetch<ReceiptRow>(`/portal/package-registrations/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(data) }),
  markUnpaid: (id: string, voidReason?: string) =>
    portalDbFetch<{ success: boolean; voidedCount?: number }>(`/portal/package-registrations/${id}/mark-unpaid`, {
      method: 'POST',
      body: JSON.stringify({ voidReason: voidReason ?? 'Marked as unpaid by staff' }),
    }),
  getReceipts: (id: string) => portalDbFetch<ReceiptRow[]>(`/portal/package-registrations/${id}/receipts`),
  addSessionAdjustment: (id: string, data: { reason: string }) =>
    portalDbFetch<{ success: boolean; sessionsBonus: number }>(`/portal/package-registrations/${id}/session-adjustment`, { method: 'POST', body: JSON.stringify(data) }),
  getSessionAdjustments: (id: string) =>
    portalDbFetch<Array<{ id: string; change: number; reason: string; createdAt: string }>>(`/portal/package-registrations/${id}/session-adjustments`),
};

export type PackageOption = {
  id: string;
  sportType: string;
  name: string;
  description: string | null;
  sessionsCount: number;
  trackingType: string;
  pricingType: string;
  currentPriceJod: number | null;
  isActive: boolean;
  sortOrder: number;
};

export const packagePricingApi = {
  list: () => portalDbFetch<Array<{ packageName: string; basePriceJod: number | null }>>('/portal/package-pricing'),
};

export const packagesApi = {
  list: () => portalDbFetch<PackageOption[]>('/portal/packages'),
};

export const receiptsApi = {
  get: (id: string) => portalDbFetch<ReceiptRow & { registration?: PackageRegistrationRow; user?: { id: string; email: string; name: string | null; isActive: boolean } }>(`/portal/receipts/${id}`),
  void: (id: string, voidReason: string) =>
    portalDbFetch<void>(`/portal/receipts/${id}/void`, { method: 'PATCH', body: JSON.stringify({ voidReason }) }),
};

async function memberFetch<T>(endpoint: string, memberEmail: string, options?: RequestInit): Promise<T> {
  const url = `${ROUTE_BASE_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-member-email': memberEmail.trim(),
      ...options?.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error((err as { message?: string }).message || `Request ${response.status}`);
  }
  return response.json();
}

export type MemberInvoiceRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  registrationId?: string;
  packageName?: string;
};

export const meApi = {
  getMe: (email: string) => memberFetch<{ id: string; email: string; name: string | null; phone: string | null; role: string; isActive: boolean }>('/portal/me', email),
  getInvoices: (email: string) => memberFetch<MemberInvoiceRow[]>('/portal/me/invoices', email),
  getReceipt: (id: string, email: string) => memberFetch<ReceiptRow & { registration?: PackageRegistrationRow }>(`/portal/me/receipts/${id}`, email),
};

export const packageSessionCanceledApi = {
  list: (packageName?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (packageName) params.append('packageName', packageName);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<Array<{ id: string; packageName: string; sessionDate: string; reason: string; reasonDetail: string | null }>>(`/portal/package-session-canceled${query}`);
  },
  create: (data: { packageName: string; sessionDate: string; reason: string; reasonDetail?: string | null }) =>
    portalDbFetch<unknown>('/portal/package-session-canceled', { method: 'POST', body: JSON.stringify(data) }),
};

// Helper to get first company (for initial setup)
// Creates "Infinity Sporty" company in DB if none exists
type CompanyLite = { id: string; name?: string };

export async function getFirstCompany(): Promise<CompanyLite | null> {
  try {
    const companies = await portalDbFetch<CompanyLite[]>('/portal/companies');
    if (companies && companies.length > 0) {
      return companies[0];
    }
    // Create default company if none exists
    try {
      const created = await portalDbFetch<CompanyLite>('/portal/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Infinity Sporty',
          contactName: 'Infinity Sporty',
          contactEmail: 'infinitysportsacademyjo@gmail.com',
          status: 'ACTIVE',
        }),
      });
      if (created && created.id) {
        return created;
      }
      throw new Error('Company creation returned invalid data');
    } catch (createErr: unknown) {
      console.error('Could not create default company:', createErr);
      // Return null instead of default object so callers know it failed
      return null;
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('Cannot connect')) {
      return null;
    }
    console.error('Failed to fetch companies:', err);
    try {
      const created = await portalDbFetch<CompanyLite>('/portal/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Infinity Sporty',
          contactName: 'Infinity Sporty',
          contactEmail: 'infinitysportsacademyjo@gmail.com',
          status: 'ACTIVE',
        }),
      });
      if (created && created.id) return created;
    } catch {}
    return null;
  }
}


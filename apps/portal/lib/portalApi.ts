import { getApiBaseUrl } from './getApiBaseUrl';

const ROUTE_BASE_URL = typeof window === 'undefined' ? getApiBaseUrl().replace(/\/$/, '') : '';
const GET_CACHE_TTL_MS = 30_000;

type PortalClientCacheEntry = {
  data: unknown;
  expiresAt: number;
};

const portalGetCache = new Map<string, PortalClientCacheEntry>();
const portalGetInflight = new Map<string, Promise<unknown>>();

// Get company ID from localStorage or context (you may need to adjust this)
function getCompanyId(): string | undefined {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('companyId') || undefined;
  }
  return undefined;
}

function canUsePortalGetCache(method: string): boolean {
  return typeof window !== 'undefined' && method === 'GET';
}

function readPortalGetCache<T>(cacheKey: string): T | null {
  const cached = portalGetCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    portalGetCache.delete(cacheKey);
    return null;
  }
  return cached.data as T;
}

function writePortalGetCache(cacheKey: string, data: unknown): void {
  portalGetCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + GET_CACHE_TTL_MS,
  });
}

function clearPortalGetCache(): void {
  portalGetCache.clear();
  portalGetInflight.clear();
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
  const method = (options?.method || 'GET').toUpperCase();
  const cacheKey = `${method}:${companyId ?? ''}:${url}`;
  const useClientCache = canUsePortalGetCache(method);

  if (useClientCache) {
    const cached = readPortalGetCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const inflight = portalGetInflight.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  let response: Response;
  const requestPromise = (async () => {
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

    if (response.status === 204) {
      if (!useClientCache) clearPortalGetCache();
      return null as T;
    }

    const data = await response.json();
    if (useClientCache) {
      writePortalGetCache(cacheKey, data);
    } else {
      clearPortalGetCache();
    }

    return data as T;
  })().finally(() => {
    if (useClientCache) {
      portalGetInflight.delete(cacheKey);
    }
  });

  if (useClientCache) {
    portalGetInflight.set(cacheKey, requestPromise as Promise<unknown>);
  }

  return requestPromise;
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
  rewardPointsPerHour: number;
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
  cashBookCategories: {
    list: (companyId?: string, type?: CashBookTransactionType) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (type) params.append('type', type);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<CashBookCategoryRow[]>(`/portal/cash-book-categories${query}`);
    },
    create: (data: {
      companyId?: string;
      company?: { connect: { id: string } };
      type: CashBookTransactionType;
      name: string;
    }) => portalFetch<CashBookCategoryRow>('/portal/cash-book-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; type?: CashBookTransactionType }) =>
      portalFetch<CashBookCategoryRow>(`/portal/cash-book-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string, force = false) =>
      portalFetch<void>(`/portal/cash-book-categories/${id}${force ? '?force=1' : ''}`, { method: 'DELETE' }),
  },
  cashBookTransactions: {
    list: (filters?: {
      companyId?: string;
      type?: CashBookTransactionType | 'ALL';
      startDate?: string;
      endDate?: string;
      search?: string;
    }) => {
      const params = new URLSearchParams();
      if (filters?.companyId) params.append('companyId', filters.companyId);
      if (filters?.type && filters.type !== 'ALL') params.append('type', filters.type);
      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.search) params.append('search', filters.search);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<CashBookTransactionRow[]>(`/portal/cash-book-transactions${query}`);
    },
    create: (data: {
      companyId?: string;
      company?: { connect: { id: string } };
      type: CashBookTransactionType;
      amount: number;
      categoryId?: string | null;
      note?: string | null;
      date: string;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
      attachmentType?: string | null;
      attachmentSize?: number | null;
    }) => portalFetch<CashBookTransactionRow>('/portal/cash-book-transactions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: {
      type?: CashBookTransactionType;
      amount?: number;
      categoryId?: string | null;
      note?: string | null;
      date?: string;
      attachmentUrl?: string | null;
      attachmentName?: string | null;
      attachmentType?: string | null;
      attachmentSize?: number | null;
    }) => portalFetch<CashBookTransactionRow>(`/portal/cash-book-transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/cash-book-transactions/${id}`, { method: 'DELETE' }),
  },
};

export type CashBookTransactionType = 'INCOME' | 'EXPENSE';

export type CashBookCategoryRow = {
  id: string;
  companyId: string;
  name: string;
  type: CashBookTransactionType;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    transactions: number;
  };
};

export type CashBookTransactionRow = {
  id: string;
  companyId: string;
  type: CashBookTransactionType;
  categoryId: string | null;
  categoryName: string;
  amount: number;
  note: string | null;
  date: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentType: string | null;
  attachmentSize: number | null;
  createdAt: string;
  updatedAt: string;
  category?: CashBookCategoryRow | null;
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

export type ShopItemStatus = 'ACTIVE' | 'SOLD_OUT' | 'HIDDEN';

export type GuestAccountRow = {
  email: string;
  /** Firestore `guestAccess` document id when this row comes from Firebase (may differ from `email` for UID-keyed docs). */
  firestoreDocId?: string | null;
  /** Which Firestore collection this row was loaded from (default `guestAccess`). */
  guestAccessCollection?: string | null;
  name: string | null;
  bookingsCount: number;
  lastBookingAt: string | null;
  lastCourt: string | null;
  rewardPoints: number;
  manualPoints: number;
  totalPoints: number;
  linkedPlayersCount: number;
  parentUid: string | null;
  hasGuestAccess: boolean;
};

export type GuestPointAdjustmentRow = {
  id: string;
  customerEmail: string;
  change: number;
  reason: string;
  createdBy: string | null;
  createdAt: string;
};

export type ShopItemRow = {
  id: string;
  companyId: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  pointsCost: number;
  quantityAvailable: number | null;
  status: ShopItemStatus;
  isFeatured: boolean;
  redemptionNote: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export const shopApi = {
  list: (companyId?: string, status?: ShopItemStatus | 'all') => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<ShopItemRow[]>(`/portal/shop-items${query}`);
  },
  create: (data: {
    companyId: string;
    name: string;
    category?: string | null;
    description?: string | null;
    imageUrl?: string | null;
    pointsCost: number;
    quantityAvailable?: number | null;
    status?: ShopItemStatus;
    isFeatured?: boolean;
    redemptionNote?: string | null;
    sortOrder?: number;
  }) => portalFetch<ShopItemRow>('/portal/shop-items', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      category: string | null;
      description: string | null;
      imageUrl: string | null;
      pointsCost: number;
      quantityAvailable: number | null;
      status: ShopItemStatus;
      isFeatured: boolean;
      redemptionNote: string | null;
      sortOrder: number;
    }>
  ) => portalFetch<ShopItemRow>(`/portal/shop-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/shop-items/${id}`, { method: 'DELETE' }),
  publish: (companyId: string) =>
    portalFetch<{ success: boolean; synced: number }>('/portal/shop-items/publish', {
      method: 'POST',
      body: JSON.stringify({ companyId }),
    }),
};

export const guestAccountsApi = {
  list: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<GuestAccountRow[]>(`/portal/guest-accounts${query}`);
  },
  addPointAdjustment: (
    email: string,
    data: { points: number; reason: string; createdBy?: string | null; customerName?: string | null },
  ) =>
    portalDbFetch<{ success: boolean; totalPoints: number; rewardPoints: number; manualPoints: number }>(
      `/portal/guest-accounts/${encodeURIComponent(email)}/point-adjustment`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  getPointAdjustments: (email: string) =>
    portalDbFetch<GuestPointAdjustmentRow[]>(
      `/portal/guest-accounts/${encodeURIComponent(email)}/point-adjustments`,
    ),
  /** Pass `firestoreDocId` when present so the correct `guestAccess` document is removed (UID-keyed docs). */
  delete: (accountKey: string) =>
    portalDbFetch<{ success: boolean }>(
      `/portal/guest-accounts/${encodeURIComponent(accountKey)}`,
      { method: 'DELETE' },
    ),
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
  status: string;
  playerId?: string | null;
  playerCode?: string | null;
  currentCycle?: number;
  sessionsLeft: number | null;
  sessionsUsedOverride: number | null;
  sessionsPerWeek: number | null;
  nextPaymentDate: string | null;
  planLabel: string | null;
  pointsBalance?: number;
  isPaid: boolean;
  basePriceJod: number;
  discountType: string;
  discountValue: number | null;
  discountReason: string | null;
  finalPriceJod: number;
  durationMonths: number;
  periodStartsAt: string | null;
  cycleStartedAt: string | null;
  periodEndsAt: string | null;
  isFrozen: boolean;
  frozenAt: string | null;
  sessionsBonus: number;
  collected?: number; // sum of active receipts (from API when available)
  createdAt: string;
  updatedAt: string;
};

export type RegistrationRenewalHistoryRow = {
  id: string;
  registrationId: string;
  playerCode: string;
  cycleNumber: number;
  action: string;
  snapshot: Record<string, unknown> | null;
  createdAt: string;
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
  paymentPeriodKey: string | null;
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
  overCollectedTotal?: number;
  discountsTotal: number;
  byMethod: Record<string, number>;
  paymentMonth?: string;
  monthExpectedTotal?: number;
  monthCollectedTotal?: number;
  monthRemainingTotal?: number;
  monthByMethod?: Record<string, number>;
  frozenRegistered?: number;
  frozenExpectedTotal?: number;
  frozenCollectedTotal?: number;
  frozenRemainingTotal?: number;
  frozenMonthExpectedTotal?: number;
  frozenMonthCollectedTotal?: number;
  frozenMonthRemainingTotal?: number;
  frozenMonthByMethod?: Record<string, number>;
  byPackage?: Record<string, { registered: number; expected: number; collected: number; remaining: number }>;
};

export type OldRegistrationImportRow = {
  row?: number;
  packageName: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  customerAge?: number | null;
  durationMonths?: number | null;
  sessionsLeft?: number | null;
  nextPaymentDate?: string | null;
  planLabel?: string | null;
  basePriceJod?: number;
  periodStartsAt?: string | null;
  amountPaid?: number | null;
  paymentMethod?: string | null;
  paymentPeriodKey?: string | null;
  privateNote?: string | null;
};

export type OldRegistrationImportResult = {
  row: number;
  status: 'created' | 'renewed' | 'skipped' | 'failed';
  id?: string;
  existingId?: string;
  message?: string;
  error?: string;
};

export const packageRegistrationsApi = {
  list: (
    packageName?: string | readonly string[],
    startDate?: string,
    endDate?: string,
    search?: string,
    excludePackageName?: string | readonly string[],
  ) => {
    const params = new URLSearchParams();
    for (const name of Array.isArray(packageName) ? packageName : packageName ? [packageName] : []) {
      params.append('packageName', name);
    }
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (search) params.append('search', search);
    for (const name of Array.isArray(excludePackageName) ? excludePackageName : excludePackageName ? [excludePackageName] : []) {
      params.append('excludePackageName', name);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<PackageRegistrationRow[]>(`/portal/package-registrations${query}`);
  },
  create: (data: {
    packageName: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string | null;
    customerAge?: number | null;
    durationMonths?: number | null;
    sessionsLeft?: number | null;
    sessionsUsedOverride?: number | null;
    sessionsPerWeek?: number | null;
    nextPaymentDate?: string | null;
    planLabel?: string | null;
    basePriceJod?: number;
    discountType?: string;
    discountValue?: number | null;
    discountReason?: string | null;
    periodStartsAt?: string | null;
  }) =>
    portalDbFetch<PackageRegistrationRow>('/portal/package-registrations', { method: 'POST', body: JSON.stringify(data) }),
  startCycle: (id: string, data?: { startedAt?: string | null }) =>
    portalDbFetch<PackageRegistrationRow>(`/portal/package-registrations/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),
  getTotals: (
    packageName?: string | readonly string[],
    startDate?: string,
    endDate?: string,
    excludePackageName?: string | readonly string[],
    paymentMonth?: string,
  ) => {
    const params = new URLSearchParams();
    for (const name of Array.isArray(packageName) ? packageName : packageName ? [packageName] : []) {
      params.append('packageName', name);
    }
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (paymentMonth) params.append('paymentMonth', paymentMonth);
    for (const name of Array.isArray(excludePackageName) ? excludePackageName : excludePackageName ? [excludePackageName] : []) {
      params.append('excludePackageName', name);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<RegistrationTotals>(`/portal/package-registrations/totals${query}`);
  },
  bulkCreate: (data: { startDate?: string | null; registrations: Array<{ packageName: string; customerName: string; customerPhone: string; customerEmail?: string | null; customerAge?: number | null; sessionsLeft?: number | null; nextPaymentDate?: string | null; planLabel?: string | null; basePriceJod?: number; periodStartsAt?: string | null }> }) =>
    portalDbFetch<{ results: Array<{ success: boolean; id?: string; row?: number; error?: string }> }>('/portal/package-registrations/bulk', { method: 'POST', body: JSON.stringify(data) }),
  oldImport: (data: { renewExisting?: boolean; registrations: OldRegistrationImportRow[] }) =>
    portalDbFetch<{ results: OldRegistrationImportResult[] }>('/portal/package-registrations/old-import', { method: 'POST', body: JSON.stringify(data) }),
  bulkCreateForPerson: (data: {
    person: { customerName: string; customerPhone: string; customerEmail?: string | null; customerAge?: number | null };
    periodStartsAt?: string | null;
    registrations: Array<{
      packageName: string;
      sessionsLeft?: number | null;
      nextPaymentDate?: string | null;
      planLabel?: string | null;
      basePriceJod?: number;
      discountType?: string;
      discountValue?: number | null;
      discountReason?: string | null;
      durationMonths?: number | null;
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
    status?: string;
    durationMonths?: number | null;
    sessionsLeft?: number | null;
    sessionsUsedOverride?: number | null;
    sessionsPerWeek?: number | null;
    nextPaymentDate?: string | null;
    planLabel?: string | null;
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
  reregister: (id: string, data?: {
    periodStartsAt?: string | null;
    durationMonths?: number | null;
    sessionsLeft?: number | null;
    sessionsPerWeek?: number | null;
    nextPaymentDate?: string | null;
    basePriceJod?: number | null;
    amountPaid?: number | null;
    paymentMethod?: string | null;
    paymentPeriodKey?: string | null;
    privateNote?: string | null;
  }) =>
    portalDbFetch<PackageRegistrationRow>(`/portal/package-registrations/${id}/reregister`, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    }),
  recordOldMonth: (id: string, data: {
    periodStartsAt: string;
    durationMonths?: number | null;
    sessionsLeft?: number | null;
    basePriceJod?: number | null;
    amountPaid?: number | null;
    paymentMethod?: string | null;
    paymentPeriodKey?: string | null;
    privateNote?: string | null;
  }) =>
    portalDbFetch<{ success: boolean; registrationId: string; currentCycle: number; receiptId?: string | null }>(
      `/portal/package-registrations/${id}/old-month`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  markPaid: (id: string, data: { amountPaid: number; paymentMethod: string; privateNote: string; paymentPeriodKey?: string | null }) =>
    portalDbFetch<ReceiptRow>(`/portal/package-registrations/${id}/mark-paid`, { method: 'POST', body: JSON.stringify(data) }),
  markUnpaid: (id: string, voidReason?: string) =>
    portalDbFetch<{ success: boolean; voidedCount?: number }>(`/portal/package-registrations/${id}/mark-unpaid`, {
      method: 'POST',
      body: JSON.stringify({ voidReason: voidReason ?? 'Marked as unpaid by staff' }),
    }),
  updateManualFinancials: (id: string, data: {
    finalPriceJod?: number | null;
    collected?: number | null;
    paymentMethod?: string | null;
    paymentPeriodKey?: string | null;
    privateNote?: string | null;
  }) =>
    portalDbFetch<PackageRegistrationRow>(`/portal/package-registrations/${id}/manual-financials`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  getReceipts: (id: string) => portalDbFetch<ReceiptRow[]>(`/portal/package-registrations/${id}/receipts`),
  addSessionAdjustment: (id: string, data: { reason: string }) =>
    portalDbFetch<{ success: boolean; sessionsBonus: number }>(`/portal/package-registrations/${id}/session-adjustment`, { method: 'POST', body: JSON.stringify(data) }),
  getSessionAdjustments: (id: string) =>
    portalDbFetch<Array<{ id: string; change: number; reason: string; createdAt: string }>>(`/portal/package-registrations/${id}/session-adjustments`),
  addPointAdjustment: (id: string, data: { points: number; reason: string; createdBy?: string | null }) =>
    portalDbFetch<{ success: boolean; addedPoints: number; pointsBalance: number }>(`/portal/package-registrations/${id}/point-adjustment`, { method: 'POST', body: JSON.stringify(data) }),
  getPointAdjustments: (id: string) =>
    portalDbFetch<Array<{ id: string; change: number; reason: string; createdBy: string | null; createdAt: string }>>(`/portal/package-registrations/${id}/point-adjustments`),
  getHistory: (id: string) =>
    portalDbFetch<{
      playerCode: string | null;
      currentCycle: number;
      history: RegistrationRenewalHistoryRow[];
    }>(`/portal/package-registrations/${id}/history`),
  updateOldMonthHistory: (historyId: string, data: {
    periodStartsAt?: string | null;
    periodEndsAt?: string | null;
    durationMonths?: number | null;
    sessionsLeft?: number | null;
    basePriceJod?: number | null;
    amountPaid?: number | null;
    paymentMethod?: string | null;
    paymentPeriodKey?: string | null;
    privateNote?: string | null;
  }) =>
    portalDbFetch<{ success: boolean }>(`/portal/registration-history/${historyId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteOldMonthHistory: (historyId: string) =>
    portalDbFetch<{ success: boolean }>(`/portal/registration-history/${historyId}`, {
      method: 'DELETE',
    }),
};

export type PackageOption = {
  id: string;
  sportType: string;
  name: string;
  description: string | null;
  durationMonths: number;
  sessionsCount: number;
  trackingType: string;
  pricingType: string;
  currentPriceJod: number | null;
  isActive: boolean;
  showOnWebsite: boolean;
  sortOrder: number;
};

export const packagePricingApi = {
  list: () => portalDbFetch<Array<{ packageName: string; basePriceJod: number | null }>>('/portal/package-pricing'),
};

export type CompetitionRegistrationRow = {
  id: string;
  competitionType: string;
  participantName: string | null;
  age: number | null;
  gender: string | null;
  customerPhone: string | null;
  teamName: string | null;
  playerOne: string | null;
  playerTwo: string | null;
  playerThree: string | null;
  playerFour: string | null;
  isPaid: boolean;
  amountDue: number | null;
  amountPaid: number | null;
  paymentMethod: string | null;
  paidAt: string | null;
  source: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export const competitionRegistrationsApi = {
  list: (competitionType?: string) => {
    const params = new URLSearchParams();
    if (competitionType && competitionType !== 'ALL') params.append('competitionType', competitionType);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<CompetitionRegistrationRow[]>(`/portal/competition-registrations${query}`);
  },
    update: (id: string, data: Partial<{
      competitionType: string;
    participantName: string | null;
    age: number | null;
    gender: string | null;
    customerPhone: string | null;
    teamName: string | null;
    playerOne: string | null;
    playerTwo: string | null;
      playerThree: string | null;
      playerFour: string | null;
      isPaid: boolean;
      amountDue: number | null;
      amountPaid: number | null;
      paymentMethod: string | null;
      status: string;
  }>) =>
    portalDbFetch<CompetitionRegistrationRow>(`/portal/competition-registrations/${id}`, {
      method: 'PATCH',
        body: JSON.stringify(data),
      }),
  delete: (id: string) =>
    portalDbFetch<{ success: boolean }>(`/portal/competition-registrations/${id}`, { method: 'DELETE' }),
  };

export const packagesApi = {
  list: (options?: { includeInactive?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.includeInactive) params.append('includeInactive', '1');
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalDbFetch<PackageOption[]>(`/portal/packages${query}`);
  },
  create: (
    data: {
      name: string;
      sportType: string;
      description?: string | null;
      durationMonths: number;
      sessionsCount: number;
      trackingType: string;
      pricingType: string;
      currentPriceJod: number | null;
      isActive: boolean;
      showOnWebsite: boolean;
      sortOrder: number;
    }
  ) => portalDbFetch<PackageOption>('/portal/packages', { method: 'POST', body: JSON.stringify(data) }),
  update: (
    id: string,
    data: Partial<{
      name: string;
      sportType: string;
      description: string | null;
      durationMonths: number;
      sessionsCount: number;
      trackingType: string;
      pricingType: string;
      currentPriceJod: number | null;
      isActive: boolean;
      showOnWebsite: boolean;
      sortOrder: number;
    }>
  ) => portalDbFetch<PackageOption>(`/portal/packages/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalDbFetch<{ success: boolean }>(`/portal/packages/${id}`, { method: 'DELETE' }),
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

function getCurrentWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const format = (value: Date) =>
    `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  return {
    startDate: format(monday),
    endDate: format(sunday),
  };
}

export async function prefetchPortalRouteData(href: string): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];

  switch (href) {
    case '/':
      tasks.push(
        (async () => {
          const company = await getFirstCompany();
          const companyId = company?.id;
          await Promise.allSettled([
            classesApi.list(companyId),
            inventoryApi.list(companyId),
            financeApi.invoices.list(companyId),
            packageRegistrationsApi.list(),
          ]);
        })(),
      );
      break;
    case '/coaches':
      tasks.push(landingCoachesApi.list());
      break;
    case '/bookings':
      tasks.push(
        (async () => {
          const company = await getFirstCompany();
          const companyId = company?.id;
          if (!companyId) return;
          const range = getCurrentWeekRange();
          await Promise.allSettled([
            bookingsApi.getOverview({
              companyId,
              view: 'week',
              startDate: range.startDate,
              endDate: range.endDate,
              court: 'ALL',
              label: 'ALL',
              bookingStatus: 'ALL',
              paymentStatus: 'ALL',
              paymentMethod: 'ALL',
              source: 'ALL',
              search: '',
            }),
            bookingsApi.getCourtRates(),
          ]);
        })(),
      );
      break;
    case '/registrations':
      tasks.push(
        Promise.allSettled([
          packageRegistrationsApi.list(undefined, undefined, undefined, undefined, ['Basketball Summer Camp', 'Volleyball Summer Camp']),
          packagesApi.list(),
          packageSessionCanceledApi.list(),
        ]),
      );
      break;
    case '/summer-camp-registrations':
      tasks.push(
        Promise.allSettled([
          packageRegistrationsApi.list(['Basketball Summer Camp', 'Volleyball Summer Camp']),
          packagesApi.list(),
          packageSessionCanceledApi.list(),
        ]),
      );
      break;
    case '/guests':
      tasks.push(guestAccountsApi.list());
      break;
    case '/classes':
      tasks.push(
        (async () => {
          const company = await getFirstCompany();
          const companyId = company?.id;
          await Promise.allSettled([
            classesApi.list(companyId),
            coachesApi.list(companyId),
          ]);
        })(),
      );
      break;
    case '/shop':
      tasks.push(
        (async () => {
          const company = await getFirstCompany();
          if (!company?.id) return;
          await shopApi.list(company.id);
        })(),
      );
      break;
    case '/inventory':
      tasks.push(
        (async () => {
          const company = await getFirstCompany();
          await inventoryApi.list(company?.id);
        })(),
      );
      break;
    case '/financials':
      tasks.push(
        (async () => {
          const company = await getFirstCompany();
          const companyId = company?.id;
          if (!companyId) return;
          await Promise.allSettled([
            financeApi.cashBookCategories.list(companyId),
            financeApi.cashBookTransactions.list({ companyId }),
          ]);
        })(),
      );
      break;
    default:
      break;
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}

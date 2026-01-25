import { getApiBaseUrl } from './getApiBaseUrl';

const API_BASE_URL = getApiBaseUrl();

// Get company ID from localStorage or context (you may need to adjust this)
function getCompanyId(): string | undefined {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('companyId') || undefined;
  }
  return undefined;
}

async function portalFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const companyId = getCompanyId();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (companyId) {
    headers['x-company-id'] = companyId;
  }

  const url = `${API_BASE_URL}/api${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      cache: 'no-store',
    });
  } catch {
    // Match admin-style error clarity
    throw new Error(`Cannot connect to API at ${url}. Set NEXT_PUBLIC_API_BASE_URL or ensure the API is reachable.`);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
    throw new Error(`API error (${response.status}): ${errorData.message || response.statusText}`);
  }

  return response.json();
}

// Module-specific API helpers
export const membersApi = {
  list: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalFetch<unknown[]>(`/portal/members${params}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/members/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/members', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/members/${id}`, { method: 'DELETE' }),
};

export const coachesApi = {
  list: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalFetch<unknown[]>(`/portal/coaches${params}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/coaches/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/coaches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/coaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/coaches/${id}`, { method: 'DELETE' }),
};

export const bookingsApi = {
  list: (companyId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<unknown[]>(`/portal/bookings${query}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/bookings/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/bookings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/bookings/${id}`, { method: 'DELETE' }),
};

export const classesApi = {
  list: (companyId?: string, coachId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (coachId) params.append('coachId', coachId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<unknown[]>(`/portal/classes${query}`);
  },
  get: (id: string) => portalFetch<unknown>(`/portal/classes/${id}`),
  create: (data: unknown) => portalFetch<unknown>('/portal/classes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/classes/${id}`, { method: 'DELETE' }),
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
    list: (companyId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<unknown[]>(`/portal/invoices${query}`);
    },
    get: (id: string) => portalFetch<unknown>(`/portal/invoices/${id}`),
    create: (data: Record<string, unknown>) =>
      portalFetch<unknown>('/portal/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: unknown) => portalFetch<unknown>(`/portal/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => {
      const url = `${API_BASE_URL}/api/portal/invoices/${id}`;
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
    getPdfUrl: (id: string) => `${API_BASE_URL}/api/portal/invoices/${id}/pdf`,
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

// Helper to get first company (for initial setup)
// Creates "Infinity Sporty" company in DB if none exists
export async function getFirstCompany() {
  try {
    const companies = await portalFetch<unknown[]>('/portal/companies');
    if (companies && companies.length > 0) {
      return companies[0];
    }
    // Create default company if none exists
    try {
      const created = await portalFetch<unknown>('/portal/companies', {
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
      if (created && typeof created === 'object' && created !== null && 'id' in created) {
        return created;
      }
      throw new Error('Company creation returned invalid data');
    } catch (createErr: unknown) {
      console.error('Could not create default company:', createErr);
      // Return null instead of default object so callers know it failed
      return null;
    }
  } catch (err: unknown) {
    // If API is unreachable, skip retry (POST would fail the same way)
    if (err instanceof Error && err.message.includes('Cannot connect to API')) {
      return null;
    }
    console.error('Failed to fetch companies:', err);
    try {
      const created = await portalFetch<unknown>('/portal/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Infinity Sporty',
          contactName: 'Infinity Sporty',
          contactEmail: 'infinitysportsacademyjo@gmail.com',
          status: 'ACTIVE',
        }),
      });
      if (created && typeof created === 'object' && created !== null && 'id' in created) return created;
    } catch {}
    return null;
  }
}


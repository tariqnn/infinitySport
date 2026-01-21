const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://infinitysport.onrender.com';

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

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

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
    return portalFetch<any[]>(`/portal/members${params}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/members/${id}`),
  create: (data: any) => portalFetch<any>('/portal/members', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/members/${id}`, { method: 'DELETE' }),
};

export const coachesApi = {
  list: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalFetch<any[]>(`/portal/coaches${params}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/coaches/${id}`),
  create: (data: any) => portalFetch<any>('/portal/coaches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/coaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/coaches/${id}`, { method: 'DELETE' }),
};

export const bookingsApi = {
  list: (companyId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<any[]>(`/portal/bookings${query}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/bookings/${id}`),
  create: (data: any) => portalFetch<any>('/portal/bookings', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/bookings/${id}`, { method: 'DELETE' }),
};

export const classesApi = {
  list: (companyId?: string, coachId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (coachId) params.append('coachId', coachId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<any[]>(`/portal/classes${query}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/classes/${id}`),
  create: (data: any) => portalFetch<any>('/portal/classes', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/classes/${id}`, { method: 'DELETE' }),
  enrollments: {
    list: (classId?: string, memberId?: string) => {
      const params = new URLSearchParams();
      if (classId) params.append('classId', classId);
      if (memberId) params.append('memberId', memberId);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<any[]>(`/portal/enrollments${query}`);
    },
    create: (data: any) => portalFetch<any>('/portal/enrollments', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/enrollments/${id}`, { method: 'DELETE' }),
  },
};

export const subscriptionsApi = {
  list: (companyId?: string, memberId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (memberId) params.append('memberId', memberId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<any[]>(`/portal/subscriptions${query}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/subscriptions/${id}`),
  create: (data: any) => portalFetch<any>('/portal/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/subscriptions/${id}`, { method: 'DELETE' }),
};

export const financeApi = {
  // Budget
  budgetCategories: {
    list: (companyId?: string) => {
      const params = companyId ? `?companyId=${companyId}` : '';
      return portalFetch<any[]>(`/portal/budget-categories${params}`);
    },
    get: (id: string) => portalFetch<any>(`/portal/budget-categories/${id}`),
    create: (data: any) => portalFetch<any>('/portal/budget-categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => portalFetch<any>(`/portal/budget-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
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
      return portalFetch<any[]>(`/portal/budget-entries${query}`);
    },
    get: (id: string) => portalFetch<any>(`/portal/budget-entries/${id}`),
    create: (data: any) => portalFetch<any>('/portal/budget-entries', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => portalFetch<any>(`/portal/budget-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/budget-entries/${id}`, { method: 'DELETE' }),
  },
  // Invoices
  invoices: {
    list: (companyId?: string, status?: string) => {
      const params = new URLSearchParams();
      if (companyId) params.append('companyId', companyId);
      if (status) params.append('status', status);
      const query = params.toString() ? `?${params.toString()}` : '';
      return portalFetch<any[]>(`/portal/invoices${query}`);
    },
    get: (id: string) => portalFetch<any>(`/portal/invoices/${id}`),
    create: (data: any) => portalFetch<any>('/portal/invoices', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => portalFetch<any>(`/portal/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/invoices/${id}`, { method: 'DELETE' }),
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
      return portalFetch<any[]>(`/portal/cash-flow${query}`);
    },
    get: (id: string) => portalFetch<any>(`/portal/cash-flow/${id}`),
    create: (data: any) => portalFetch<any>('/portal/cash-flow', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => portalFetch<any>(`/portal/cash-flow/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
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
      return portalFetch<any[]>(`/portal/petty-cash${query}`);
    },
    get: (id: string) => portalFetch<any>(`/portal/petty-cash/${id}`),
    create: (data: any) => portalFetch<any>('/portal/petty-cash', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => portalFetch<any>(`/portal/petty-cash/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => portalFetch<void>(`/portal/petty-cash/${id}`, { method: 'DELETE' }),
  },
};

export const inventoryApi = {
  list: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<any[]>(`/portal/inventory${query}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/inventory/${id}`),
  create: (data: any) => portalFetch<any>('/portal/inventory', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/inventory/${id}`, { method: 'DELETE' }),
};

export const tasksApi = {
  list: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return portalFetch<any[]>(`/portal/staff-tasks${query}`);
  },
  get: (id: string) => portalFetch<any>(`/portal/staff-tasks/${id}`),
  create: (data: any) => portalFetch<any>('/portal/staff-tasks', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => portalFetch<any>(`/portal/staff-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => portalFetch<void>(`/portal/staff-tasks/${id}`, { method: 'DELETE' }),
};

export const settingsApi = {
  get: (companyId: string) => portalFetch<any>(`/portal/settings/${companyId}`),
  create: (data: any) => portalFetch<any>('/portal/settings', { method: 'POST', body: JSON.stringify(data) }),
  update: (companyId: string, data: any) => portalFetch<any>(`/portal/settings/${companyId}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

export const dashboardApi = {
  stats: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return portalFetch<any>(`/portal/dashboard/stats${params}`);
  },
};

// Helper to get first company (for initial setup)
export async function getFirstCompany() {
  const companies = await portalFetch<any[]>('/portal/companies');
  return companies[0];
}


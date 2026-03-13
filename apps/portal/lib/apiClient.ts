import { getApiBaseUrl } from './getApiBaseUrl';

const ROUTE_BASE_URL = getApiBaseUrl();

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${ROUTE_BASE_URL}/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown API error' }));
    throw new Error(`API error (${response.status}): ${errorData.message || response.statusText}`);
  }

  return response.json();
}

// Companies
export const apiClient = {
  // Companies
  getCompanies: () => request<any[]>('/portal/companies'),
  getCompany: (id: string) => request<any>(`/portal/companies/${id}`),
  createCompany: (data: any) => request<any>('/portal/companies', { method: 'POST', body: JSON.stringify(data) }),
  updateCompany: (id: string, data: any) => request<any>(`/portal/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCompany: (id: string) => request<void>(`/portal/companies/${id}`, { method: 'DELETE' }),

  // Members
  getMembers: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return request<any[]>(`/portal/members${params}`);
  },
  getMember: (id: string) => request<any>(`/portal/members/${id}`),
  createMember: (data: any) => request<any>('/portal/members', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (id: string, data: any) => request<any>(`/portal/members/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteMember: (id: string) => request<void>(`/portal/members/${id}`, { method: 'DELETE' }),

  // Bookings
  getBookings: (companyId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/bookings${query}`);
  },
  getBooking: (id: string) => request<any>(`/portal/bookings/${id}`),
  createBooking: (data: any) => request<any>('/portal/bookings', { method: 'POST', body: JSON.stringify(data) }),
  updateBooking: (id: string, data: any) => request<any>(`/portal/bookings/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBooking: (id: string) => request<void>(`/portal/bookings/${id}`, { method: 'DELETE' }),

  // Subscriptions
  getSubscriptions: (companyId?: string, memberId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (memberId) params.append('memberId', memberId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/subscriptions${query}`);
  },
  getSubscription: (id: string) => request<any>(`/portal/subscriptions/${id}`),
  createSubscription: (data: any) => request<any>('/portal/subscriptions', { method: 'POST', body: JSON.stringify(data) }),
  updateSubscription: (id: string, data: any) => request<any>(`/portal/subscriptions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSubscription: (id: string) => request<void>(`/portal/subscriptions/${id}`, { method: 'DELETE' }),

  // Invoices
  getInvoices: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/invoices${query}`);
  },
  getInvoice: (id: string) => request<any>(`/portal/invoices/${id}`),
  createInvoice: (data: any) => request<any>('/portal/invoices', { method: 'POST', body: JSON.stringify(data) }),
  updateInvoice: (id: string, data: any) => request<any>(`/portal/invoices/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInvoice: (id: string) => request<void>(`/portal/invoices/${id}`, { method: 'DELETE' }),

  // Coaches
  getCoaches: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return request<any[]>(`/portal/coaches${params}`);
  },
  getCoach: (id: string) => request<any>(`/portal/coaches/${id}`),
  createCoach: (data: any) => request<any>('/portal/coaches', { method: 'POST', body: JSON.stringify(data) }),
  updateCoach: (id: string, data: any) => request<any>(`/portal/coaches/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCoach: (id: string) => request<void>(`/portal/coaches/${id}`, { method: 'DELETE' }),

  // Classes
  getClasses: (companyId?: string, coachId?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (coachId) params.append('coachId', coachId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/classes${query}`);
  },
  getClass: (id: string) => request<any>(`/portal/classes/${id}`),
  createClass: (data: any) => request<any>('/portal/classes', { method: 'POST', body: JSON.stringify(data) }),
  updateClass: (id: string, data: any) => request<any>(`/portal/classes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteClass: (id: string) => request<void>(`/portal/classes/${id}`, { method: 'DELETE' }),

  // Class Enrollments
  getEnrollments: (classId?: string, memberId?: string) => {
    const params = new URLSearchParams();
    if (classId) params.append('classId', classId);
    if (memberId) params.append('memberId', memberId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/enrollments${query}`);
  },
  getEnrollment: (id: string) => request<any>(`/portal/enrollments/${id}`),
  createEnrollment: (data: any) => request<any>('/portal/enrollments', { method: 'POST', body: JSON.stringify(data) }),
  deleteEnrollment: (id: string) => request<void>(`/portal/enrollments/${id}`, { method: 'DELETE' }),

  // Inventory Items
  getInventoryItems: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/inventory${query}`);
  },
  getInventoryItem: (id: string) => request<any>(`/portal/inventory/${id}`),
  createInventoryItem: (data: any) => request<any>('/portal/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventoryItem: (id: string, data: any) => request<any>(`/portal/inventory/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInventoryItem: (id: string) => request<void>(`/portal/inventory/${id}`, { method: 'DELETE' }),

  // Shop Items
  getShopItems: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status && status !== 'all') params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/shop-items${query}`);
  },
  getShopItem: (id: string) => request<any>(`/portal/shop-items/${id}`),
  createShopItem: (data: any) => request<any>('/portal/shop-items', { method: 'POST', body: JSON.stringify(data) }),
  updateShopItem: (id: string, data: any) => request<any>(`/portal/shop-items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteShopItem: (id: string) => request<void>(`/portal/shop-items/${id}`, { method: 'DELETE' }),
  publishShopItems: (companyId: string) =>
    request<any>('/portal/shop-items/publish', { method: 'POST', body: JSON.stringify({ companyId }) }),

  // Staff Tasks
  getStaffTasks: (companyId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (status) params.append('status', status);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/staff-tasks${query}`);
  },
  getStaffTask: (id: string) => request<any>(`/portal/staff-tasks/${id}`),
  createStaffTask: (data: any) => request<any>('/portal/staff-tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateStaffTask: (id: string, data: any) => request<any>(`/portal/staff-tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteStaffTask: (id: string) => request<void>(`/portal/staff-tasks/${id}`, { method: 'DELETE' }),

  // Company Settings
  getCompanySettings: (companyId: string) => request<any>(`/portal/settings/${companyId}`),
  createCompanySettings: (data: any) => request<any>('/portal/settings', { method: 'POST', body: JSON.stringify(data) }),
  updateCompanySettings: (companyId: string, data: any) => request<any>(`/portal/settings/${companyId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardStats: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return request<any>(`/portal/dashboard/stats${params}`);
  },

  // Budget Categories
  getBudgetCategories: (companyId?: string) => {
    const params = companyId ? `?companyId=${companyId}` : '';
    return request<any[]>(`/portal/budget-categories${params}`);
  },
  getBudgetCategory: (id: string) => request<any>(`/portal/budget-categories/${id}`),
  createBudgetCategory: (data: any) => request<any>('/portal/budget-categories', { method: 'POST', body: JSON.stringify(data) }),
  updateBudgetCategory: (id: string, data: any) => request<any>(`/portal/budget-categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBudgetCategory: (id: string) => request<void>(`/portal/budget-categories/${id}`, { method: 'DELETE' }),

  // Budget Entries
  getBudgetEntries: (companyId?: string, categoryId?: string, periodStart?: string, periodEnd?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (categoryId) params.append('categoryId', categoryId);
    if (periodStart) params.append('periodStart', periodStart);
    if (periodEnd) params.append('periodEnd', periodEnd);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/budget-entries${query}`);
  },
  getBudgetEntry: (id: string) => request<any>(`/portal/budget-entries/${id}`),
  createBudgetEntry: (data: any) => request<any>('/portal/budget-entries', { method: 'POST', body: JSON.stringify(data) }),
  updateBudgetEntry: (id: string, data: any) => request<any>(`/portal/budget-entries/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBudgetEntry: (id: string) => request<void>(`/portal/budget-entries/${id}`, { method: 'DELETE' }),

  // Cash Flow
  getCashFlowEntries: (companyId?: string, type?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/cash-flow${query}`);
  },
  getCashFlowEntry: (id: string) => request<any>(`/portal/cash-flow/${id}`),
  createCashFlowEntry: (data: any) => request<any>('/portal/cash-flow', { method: 'POST', body: JSON.stringify(data) }),
  updateCashFlowEntry: (id: string, data: any) => request<any>(`/portal/cash-flow/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCashFlowEntry: (id: string) => request<void>(`/portal/cash-flow/${id}`, { method: 'DELETE' }),

  // Petty Cash
  getPettyCashTransactions: (companyId?: string, type?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (companyId) params.append('companyId', companyId);
    if (type) params.append('type', type);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<any[]>(`/portal/petty-cash${query}`);
  },
  getPettyCashTransaction: (id: string) => request<any>(`/portal/petty-cash/${id}`),
  createPettyCashTransaction: (data: any) => request<any>('/portal/petty-cash', { method: 'POST', body: JSON.stringify(data) }),
  updatePettyCashTransaction: (id: string, data: any) => request<any>(`/portal/petty-cash/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePettyCashTransaction: (id: string) => request<void>(`/portal/petty-cash/${id}`, { method: 'DELETE' }),
};

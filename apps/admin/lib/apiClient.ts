// Use same-origin route handlers by default. Optionally override via env.
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_APP_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return '';
};

const ROUTE_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT_MS = 12000;
const GET_CACHE_TTL_MS = 30_000;

type ClientCacheEntry = {
  data: unknown;
  expiresAt: number;
};

const clientGetCache = new Map<string, ClientCacheEntry>();
const clientGetInflight = new Map<string, Promise<unknown>>();

function canUseClientGetCache(method: string): boolean {
  return typeof window !== 'undefined' && method === 'GET';
}

function readClientGetCache<T>(cacheKey: string): T | null {
  const cached = clientGetCache.get(cacheKey);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    clientGetCache.delete(cacheKey);
    return null;
  }
  return cached.data as T;
}

function writeClientGetCache(cacheKey: string, data: unknown): void {
  clientGetCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + GET_CACHE_TTL_MS,
  });
}

function clearClientGetCache(): void {
  clientGetCache.clear();
  clientGetInflight.clear();
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ROUTE_BASE_URL;
    // Log route base in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin route client initialized with base URL:', this.baseUrl || '(same-origin)');
    }
  }

  private async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure baseUrl doesn't have trailing slash and endpoint starts with /
    const baseUrl = this.baseUrl.replace(/\/$/, '');
    const endpointPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${endpointPath}`;
    const method = (options.method || 'GET').toUpperCase();
    const cacheKey = `${method}:${url}`;
    const useClientCache = canUseClientGetCache(method);

    if (useClientCache) {
      const cached = readClientGetCache<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      const inflight = clientGetInflight.get(cacheKey);
      if (inflight) {
        return inflight as Promise<T>;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`API error: ${response.status} ${errorText}`);
        }

        if (response.status === 204) {
          if (!useClientCache) clearClientGetCache();
          return null as T;
        }

        const data = await response.json();
        if (useClientCache) {
          writeClientGetCache(cacheKey, data);
        } else {
          clearClientGetCache();
        }

        return data as T;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Please try again.`);
        }
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          throw new Error(
            `Cannot connect to route handler at ${url}. Make sure the admin app is running.`
          );
        }
        throw error;
      } finally {
        clearTimeout(timeout);
        if (useClientCache) {
          clientGetInflight.delete(cacheKey);
        }
      }
    })();

    if (useClientCache) {
      clientGetInflight.set(cacheKey, requestPromise as Promise<unknown>);
    }

    return requestPromise;
  }

  // Hero
  async getHero() {
    return this.request('/api/admin/hero');
  }

  async updateHero(data: any) {
    return this.request('/api/admin/hero', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Programs
  async getPrograms() {
    return this.request('/api/admin/programs');
  }

  async getProgram(id: string) {
    return this.request(`/api/admin/programs/${id}`);
  }

  async createProgram(data: any) {
    return this.request('/api/admin/programs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProgram(id: string, data: any) {
    return this.request(`/api/admin/programs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProgram(id: string) {
    return this.request(`/api/admin/programs/${id}`, {
      method: 'DELETE',
    });
  }

  // Coaches
  async getCoaches() {
    return this.request('/api/admin/coaches');
  }

  async getCoach(id: string) {
    return this.request(`/api/admin/coaches/${id}`);
  }

  async createCoach(data: any) {
    return this.request('/api/admin/coaches', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCoach(id: string, data: any) {
    return this.request(`/api/admin/coaches/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteCoach(id: string) {
    return this.request(`/api/admin/coaches/${id}`, {
      method: 'DELETE',
    });
  }

  // Offers
  async getOffers() {
    return this.request('/api/admin/offers');
  }

  async getOffer(id: string) {
    return this.request(`/api/admin/offers/${id}`);
  }

  async createOffer(data: any) {
    return this.request('/api/admin/offers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOffer(id: string, data: any) {
    return this.request(`/api/admin/offers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOffer(id: string) {
    return this.request(`/api/admin/offers/${id}`, {
      method: 'DELETE',
    });
  }

  // Events
  async getEvents() {
    return this.request('/api/admin/events');
  }

  async getEvent(id: string) {
    return this.request(`/api/admin/events/${id}`);
  }

  async createEvent(data: any) {
    return this.request('/api/admin/events', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEvent(id: string, data: any) {
    return this.request(`/api/admin/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEvent(id: string) {
    return this.request(`/api/admin/events/${id}`, {
      method: 'DELETE',
    });
  }

  // Announcements
  async getAnnouncements() {
    return this.request('/api/admin/announcements');
  }

  async getAnnouncement(id: string) {
    return this.request(`/api/admin/announcements/${id}`);
  }

  async createAnnouncement(data: any) {
    return this.request('/api/admin/announcements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAnnouncement(id: string, data: any) {
    return this.request(`/api/admin/announcements/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAnnouncement(id: string) {
    return this.request(`/api/admin/announcements/${id}`, {
      method: 'DELETE',
    });
  }

  // Facilities
  async getFacilities() {
    return this.request('/api/admin/facilities');
  }

  async getFacility(id: string) {
    return this.request(`/api/admin/facilities/${id}`);
  }

  async createFacility(data: any) {
    return this.request('/api/admin/facilities', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFacility(id: string, data: any) {
    return this.request(`/api/admin/facilities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFacility(id: string) {
    return this.request(`/api/admin/facilities/${id}`, {
      method: 'DELETE',
    });
  }

  // Footer Links
  async getFooterLinks() {
    return this.request('/api/admin/footer-links');
  }

  async getFooterLink(id: string) {
    return this.request(`/api/admin/footer-links/${id}`);
  }

  async createFooterLink(data: any) {
    return this.request('/api/admin/footer-links', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFooterLink(id: string, data: any) {
    return this.request(`/api/admin/footer-links/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteFooterLink(id: string) {
    return this.request(`/api/admin/footer-links/${id}`, {
      method: 'DELETE',
    });
  }

  // Footer Settings
  async getFooterSettings() {
    return this.request('/api/admin/footer-settings');
  }

  async updateFooterSettings(data: any) {
    return this.request('/api/admin/footer-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Packages (sellable packages for Landing + Portal)
  async getPackages() {
    return this.request('/api/admin/packages');
  }

  async getPackage(id: string) {
    return this.request(`/api/admin/packages/${id}`);
  }

  async createPackage(data: any) {
    return this.request('/api/admin/packages', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePackage(id: string, data: any) {
    return this.request(`/api/admin/packages/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePackage(id: string) {
    return this.request(`/api/admin/packages/${id}`, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();

export async function prefetchAdminRouteData(href: string): Promise<void> {
  const tasks: Array<Promise<unknown>> = [];

  switch (href) {
    case '/landing-content':
      tasks.push(
        apiClient.getHero(),
        apiClient.getCoaches(),
        apiClient.getPackages(),
        apiClient.getOffers(),
        apiClient.getEvents(),
        apiClient.getAnnouncements(),
        apiClient.getFacilities(),
        apiClient.getFooterSettings(),
        apiClient.getFooterLinks(),
      );
      break;
    case '/hero':
      tasks.push(apiClient.getHero());
      break;
    case '/coaches':
      tasks.push(apiClient.getCoaches());
      break;
    case '/packages':
      tasks.push(apiClient.getPackages());
      break;
    case '/offers':
      tasks.push(apiClient.getOffers());
      break;
    case '/events':
      tasks.push(apiClient.getEvents());
      break;
    case '/announcements':
      tasks.push(apiClient.getAnnouncements());
      break;
    case '/facilities':
      tasks.push(apiClient.getFacilities());
      break;
    case '/footer':
      tasks.push(apiClient.getFooterSettings(), apiClient.getFooterLinks());
      break;
    default:
      break;
  }

  if (!tasks.length) return;
  await Promise.allSettled(tasks);
}

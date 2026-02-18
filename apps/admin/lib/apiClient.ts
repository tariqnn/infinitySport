// Use deployed API URL in production; in development use local API unless overridden
const getApiBaseUrl = () => {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl;
  // In development, talk to local API so admin packages and other routes work
  if (process.env.NODE_ENV === 'development') return 'http://localhost:4000';
  return 'http://localhost:4000';
};

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT_MS = 12000;

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
    // Log the API URL in development for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin API Client initialized with base URL:', this.baseUrl);
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
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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
        return null as T;
      }

      return response.json();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. Please try again.`);
      }
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error(
          `Cannot connect to API at ${url}. Make sure the API server is running on ${this.baseUrl}`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
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

// Keep portal API base URL logic consistent with the rest of the monorepo (landing/admin).
// - If NEXT_PUBLIC_API_BASE_URL is set, use it
// - In development, default to http://localhost:4000 so Create Invoice and other API calls work without .env
// - In production, default to the deployed API
export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  return 'https://infinitysport.onrender.com';
}


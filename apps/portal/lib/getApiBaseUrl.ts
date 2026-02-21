// Base URL for portal internal route calls.
// - Browser: same-origin
// - Server: can use PORTAL_INTERNAL_BASE_URL, otherwise default local portal dev port
export function getApiBaseUrl() {
  if (typeof window !== 'undefined') return '';
  const envUrl = process.env.PORTAL_INTERNAL_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  return 'http://localhost:3002';
}


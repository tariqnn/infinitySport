// Keep portal API base URL logic consistent with the rest of the monorepo.
// - If NEXT_PUBLIC_API_BASE_URL is set, use it
// - Otherwise:
//   - dev: use local API (http://localhost:4000)
//   - prod: use deployed API
export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }

  return 'https://infinitysport.onrender.com';
}


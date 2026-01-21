// Keep portal API base URL logic consistent with the rest of the monorepo (landing/admin).
// - If NEXT_PUBLIC_API_BASE_URL is set, use it (this is how you point to localhost:4000)
// - Otherwise default to the deployed API (avoids ERR_CONNECTION_REFUSED when local API isn't running)
export function getApiBaseUrl() {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  return 'https://infinitysport.onrender.com';
}


/**
 * Base URL for client-side API calls (forms, booking, etc.).
 * With static export there are no Next.js API routes — set NEXT_PUBLIC_API_BASE_URL
 * to your backend (e.g. https://api.infinitysportsjo.com) so forms work.
 */
export function getClientApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  return base.replace(/\/$/, '');
}

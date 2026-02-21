/**
 * Optional base URL override for client-side requests.
 * Leave empty to use same-origin routes.
 */
export function getClientApiBase(): string {
  const base = process.env.NEXT_PUBLIC_APP_BASE_URL ?? '';
  return base.replace(/\/$/, '');
}

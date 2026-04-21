export function addDurationMonthsToDateInput(value: string, months = 1): string {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setMonth(parsed.getMonth() + Math.max(1, Math.round(months || 1)));
  return parsed.toISOString().slice(0, 10);
}

export function addOneMonthToDateInput(value: string): string {
  return addDurationMonthsToDateInput(value, 1);
}

export function getPackageDefaultPrice(
  packageName: string,
  defaultPricesByPackage?: Record<string, number>,
): number | null {
  const value = defaultPricesByPackage?.[packageName];
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

export function hasPackageDefaultPrice(
  packageName: string,
  defaultPricesByPackage?: Record<string, number>,
): boolean {
  return getPackageDefaultPrice(packageName, defaultPricesByPackage) != null;
}

export function getPackageDefaultSessions(
  packageName: string,
  defaultSessionsByPackage?: Record<string, number>,
): number | null {
  const value = defaultSessionsByPackage?.[packageName];
  if (value == null || !Number.isFinite(value)) return null;
  const normalized = Math.max(0, Math.round(value));
  return normalized > 0 ? normalized : null;
}

export function getPackageDefaultDurationMonths(
  packageName: string,
  defaultDurationMonthsByPackage?: Record<string, number>,
): number {
  const value = defaultDurationMonthsByPackage?.[packageName];
  if (value == null || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.round(value));
}

type GuardState = {
  unavailableUntil: number;
  lastReason: string;
};

const globalGuard = globalThis as unknown as { __webDbGuard?: GuardState };

function readMsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

// Keep normal outages short and panic cooldown practical so production can self-recover quickly.
const COOLDOWN_MS = readMsFromEnv('DB_GUARD_COOLDOWN_MS', 45_000);
const PANIC_COOLDOWN_MS = readMsFromEnv('DB_GUARD_PANIC_COOLDOWN_MS', 90_000);

function state(): GuardState {
  if (!globalGuard.__webDbGuard) {
    globalGuard.__webDbGuard = {
      unavailableUntil: 0,
      lastReason: '',
    };
  }
  return globalGuard.__webDbGuard;
}

function errorMeta(error: unknown): { code?: string; name?: string; message: string } {
  if (!error || typeof error !== 'object') return { message: '' };
  const record = error as { code?: string; name?: string; message?: string };
  return { code: record.code, name: record.name, message: record.message || '' };
}

export function isDatabaseUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = errorMeta(error);
  const message = record.message.toLowerCase();

  return (
    record.code === 'P1001' ||
    record.code === 'P1002' ||
    record.name === 'PrismaClientRustPanicError' ||
    message.includes('timer has gone away') ||
    message.includes('can\'t reach database server') ||
    message.includes('database server') ||
    message.includes('prisma query engine has a panic') ||
    message.includes('prismaclientrustpanicerror')
  );
}

export function noteDatabaseFailure(context: string, error: unknown): void {
  if (!isDatabaseUnavailableError(error)) return;

  const s = state();
  const meta = errorMeta(error);
  const message = meta.message.toLowerCase();
  const isPanic = meta.name === 'PrismaClientRustPanicError' || message.includes('timer has gone away');
  const cooldownMs = isPanic ? PANIC_COOLDOWN_MS : COOLDOWN_MS;
  const reason = `${context}: ${meta.code || meta.name || 'db-error'}`;
  s.unavailableUntil = Date.now() + cooldownMs;
  s.lastReason = reason;

  console.warn(`[db-guard] cooling down DB access for ${cooldownMs}ms (${reason})`);
}

export async function canAttemptDatabaseQuery(): Promise<boolean> {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return false;

  const s = state();
  const now = Date.now();
  return s.unavailableUntil <= now;
}

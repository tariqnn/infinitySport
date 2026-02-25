type GuardState = {
  unavailableUntil: number;
  lastReason: string;
};

const globalGuard = globalThis as unknown as { __webDbGuard?: GuardState };

const COOLDOWN_MS = 45_000;

function state(): GuardState {
  if (!globalGuard.__webDbGuard) {
    globalGuard.__webDbGuard = {
      unavailableUntil: 0,
      lastReason: '',
    };
  }
  return globalGuard.__webDbGuard;
}

function isLikelyTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const record = error as { code?: string; name?: string; message?: string };
  const message = (record.message || '').toLowerCase();

  return (
    record.code === 'P1001' ||
    record.code === 'P1002' ||
    record.name === 'PrismaClientRustPanicError' ||
    message.includes('timer has gone away') ||
    message.includes('can\'t reach database server') ||
    message.includes('database server') ||
    message.includes('prisma query engine has a panic')
  );
}

export function noteDatabaseFailure(context: string, error: unknown): void {
  if (!isLikelyTransientDbError(error)) return;

  const s = state();
  const reason = `${context}: ${(error as { code?: string; name?: string; message?: string })?.code || (error as { name?: string })?.name || 'db-error'}`;
  s.unavailableUntil = Date.now() + COOLDOWN_MS;
  s.lastReason = reason;

  console.warn(`[db-guard] cooling down DB access for ${COOLDOWN_MS}ms (${reason})`);
}

export async function canAttemptDatabaseQuery(): Promise<boolean> {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return false;

  const s = state();
  const now = Date.now();
  return s.unavailableUntil <= now;
}

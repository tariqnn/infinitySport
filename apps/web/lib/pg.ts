import { Pool } from 'pg';

const globalPg = globalThis as unknown as { __webPgPool?: Pool };

function shouldUseSsl(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    const sslMode = (parsed.searchParams.get('sslmode') || '').toLowerCase();
    if (sslMode === 'disable') return false;
    if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return false;
    return true;
  } catch {
    return /sslmode=require|ssl=true/i.test(connectionString);
  }
}

export function getPgPool(): Pool {
  if (globalPg.__webPgPool) return globalPg.__webPgPool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing');
  }

  const pool = new Pool({
    connectionString,
    max: Number.parseInt(process.env.PG_POOL_MAX || '1', 10) || 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: shouldUseSsl(connectionString)
      ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' }
      : undefined,
  });

  globalPg.__webPgPool = pool;
  return pool;
}

import { Pool } from 'pg';

const globalPg = globalThis as unknown as { __webPgPool?: Pool };

function shouldUseSsl(connectionString: string): boolean {
  return /sslmode=require|ssl=true/i.test(connectionString);
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
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  });

  globalPg.__webPgPool = pool;
  return pool;
}

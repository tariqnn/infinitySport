import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  for (const p of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '..', '.env'), resolve(process.cwd(), '..', '..', '.env')]) {
    if (existsSync(p)) { config({ path: p }); break; }
  }
}

const g = globalThis as unknown as { __portalPrisma?: PrismaClient };

export const prisma = g.__portalPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') g.__portalPrisma = prisma;

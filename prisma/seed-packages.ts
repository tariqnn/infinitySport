/**
 * Seed the Package table (sellable packages for Landing + Portal dropdowns).
 * Run: npx ts-node --project prisma/tsconfig.json prisma/seed-packages.ts
 * Or add to package.json: "prisma:seed-packages": "cd prisma && ts-node --project tsconfig.json seed-packages.ts"
 *
 * This populates the Package table so the Portal "Add registration" and "Add Multiple People"
 * dropdowns show all programs (Basketball, Gymnastics A–D, Volleyball).
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

type PackageSeed = {
  name: string;
  sportType: string;
  description?: string | null;
  sessionsCount: number;
  trackingType: string;
  pricingType: 'FIXED' | 'MANUAL';
  currentPriceJod: number | null;
  sortOrder: number;
};

const PACKAGES: PackageSeed[] = [
  { name: 'Basketball - Little Kobes U12-U10', sportType: 'BASKETBALL', sessionsCount: 10, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 120, sortOrder: 10 },
  { name: 'Basketball - Ballers & Hoopers U12–U14', sportType: 'BASKETBALL', sessionsCount: 12, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 120, sortOrder: 20 },
  { name: 'Basketball - Warriors', sportType: 'BASKETBALL', sessionsCount: 12, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 120, sortOrder: 30 },
  { name: 'Basketball - Private 1v1 Sessions', sportType: 'BASKETBALL', sessionsCount: 0, trackingType: 'SESSIONS', pricingType: 'MANUAL', currentPriceJod: null, sortOrder: 40 },
  { name: 'Basketball - Small Groups', sportType: 'BASKETBALL', sessionsCount: 0, trackingType: 'SESSIONS', pricingType: 'MANUAL', currentPriceJod: null, sortOrder: 50 },
  { name: 'Gymnastics Package A', sportType: 'GYMNASTICS', sessionsCount: 12, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 120, sortOrder: 60 },
  { name: 'Gymnastics Package B', sportType: 'GYMNASTICS', sessionsCount: 8, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 100, sortOrder: 70 },
  { name: 'Gymnastics Package C', sportType: 'GYMNASTICS', sessionsCount: 18, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 140, sortOrder: 80 },
  { name: 'Gymnastics Package D', sportType: 'GYMNASTICS', sessionsCount: 12, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 120, sortOrder: 90 },
  { name: 'Volleyball', sportType: 'VOLLEYBALL', sessionsCount: 10, trackingType: 'SESSIONS', pricingType: 'FIXED', currentPriceJod: 100, sortOrder: 100 },
];

async function main() {
  console.log('Seeding Package table (sellable packages for Portal/Admin)...');
  const pkg = (prisma as any).package;
  if (!pkg) {
    console.error('Package model not found. Run: npx prisma generate');
    process.exit(1);
  }
  for (const row of PACKAGES) {
    await pkg.upsert({
      where: { name: row.name },
      create: {
        name: row.name,
        sportType: row.sportType,
        description: row.description ?? null,
        sessionsCount: row.sessionsCount,
        trackingType: row.trackingType,
        pricingType: row.pricingType,
        currentPriceJod: row.currentPriceJod,
        isActive: true,
        sortOrder: row.sortOrder,
      },
      update: {
        sportType: row.sportType,
        description: row.description ?? undefined,
        sessionsCount: row.sessionsCount,
        trackingType: row.trackingType,
        pricingType: row.pricingType,
        currentPriceJod: row.currentPriceJod,
        isActive: true,
        sortOrder: row.sortOrder,
      },
    });
    console.log(`  ${row.name} (${row.sportType}): ${row.currentPriceJod != null ? row.currentPriceJod + ' JOD' : 'Contact for pricing'}`);
  }
  console.log('Done. Portal and Admin package dropdowns will show all packages.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

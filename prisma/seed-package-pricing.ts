/**
 * Seed PackagePricing with fixed prices from your programs.
 * Run: npm run prisma:seed-package-pricing
 *
 * Recheck list (must match portal + Add registration):
 *   Basketball - Little Kobes U10            120 JOD
 *   Basketball - Ballers & Hoopers U12–U14  120 JOD
 *   Basketball - Warriors                   120 JOD
 *   Basketball - Private 1v1 Sessions        Contact for pricing (manual)
 *   Basketball - Small Groups                Contact for pricing (manual)
 *   Gymnastics Package A                    120 JOD
 *   Gymnastics Package B                    100 JOD
 *   Gymnastics Package C                    140 JOD
 *   Gymnastics Package D                    120 JOD
 *   Volleyball                              100 JOD
 */
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const PACKAGES: { packageName: string; basePriceJod: number | null }[] = [
  { packageName: 'Basketball - Little Kobes U10', basePriceJod: 120 },
  { packageName: 'Basketball - Ballers & Hoopers U12–U14', basePriceJod: 120 },
  { packageName: 'Basketball - Warriors', basePriceJod: 120 },
  { packageName: 'Basketball - Private 1v1 Sessions', basePriceJod: null },
  { packageName: 'Basketball - Small Groups', basePriceJod: null },
  { packageName: 'Gymnastics Package A', basePriceJod: 120 },
  { packageName: 'Gymnastics Package B', basePriceJod: 100 },
  { packageName: 'Gymnastics Package C', basePriceJod: 140 },
  { packageName: 'Gymnastics Package D', basePriceJod: 120 },
  { packageName: 'Volleyball', basePriceJod: 100 },
];

async function main() {
  console.log('Seeding PackagePricing...');
  const pkg = (prisma as any).packagePricing;
  if (!pkg) {
    console.error('PackagePricing model not found. Run: npx prisma generate');
    process.exit(1);
  }
  for (const row of PACKAGES) {
    await pkg.upsert({
      where: { packageName: row.packageName },
      create: {
        packageName: row.packageName,
        basePriceJod: row.basePriceJod,
      },
      update: {
        basePriceJod: row.basePriceJod,
      },
    });
    console.log(`  ${row.packageName}: ${row.basePriceJod != null ? row.basePriceJod + ' JOD' : 'Contact for pricing'}`);
  }
  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

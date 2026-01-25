import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// Basketball academy slots: Little Kobes (Fri 10–11), Ballers & Hoopers (Fri 11–12), Warriors (Fri 12–1, Sat 7–8).
// Add these to BlockedSlot so the public booking form cannot book at these times.
const ACADEMY_SLOTS: { dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }[] = [
  { dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '10:00', isBlocked: true },
  { dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '11:00', isBlocked: true },
  { dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '12:00', isBlocked: true },
  { dayOfWeek: 'SATURDAY', courtType: 'Basketball AC', time: '19:00', isBlocked: true },
];

async function main() {
  const r = await prisma.blockedSlot.createMany({ data: ACADEMY_SLOTS, skipDuplicates: true });
  console.log('Basketball academy blocks: added', r.count, 'slots (duplicates skipped).');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

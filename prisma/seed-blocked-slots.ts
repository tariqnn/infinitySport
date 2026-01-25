import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

const TO_INSERT: { dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }[] = (() => {
  const out: { dayOfWeek: string; courtType: string; time: string; isBlocked: boolean }[] = [];
  // Recurring blocks: team trainings, volleyball, and basketball academy (Little Kobes, Ballers & Hoopers, Warriors)
  const ALWAYS_FULL: Record<string, Partial<Record<string, string[]>>> = {
    MONDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'], Volleyball: ['19:00'] },
    WEDNESDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'] },
    FRIDAY: { 'Basketball AC': ['10:00', '11:00', '12:00', '22:00', '23:00', '00:00'] },
    SATURDAY: { 'Basketball AC': ['17:00', '18:00', '19:00'], Volleyball: ['15:00', '16:00'] },
    SUNDAY: { Volleyball: ['15:00', '16:00'] },
  };
  for (const [day, courts] of Object.entries(ALWAYS_FULL)) {
    for (const [courtType, times] of Object.entries(courts)) {
      for (const time of times ?? []) {
        out.push({ dayOfWeek: day, courtType, time, isBlocked: true });
      }
    }
  }
  return out;
})();

async function main() {
  const n = await prisma.blockedSlot.count();
  if (n > 0) {
    console.log(`BlockedSlot already has ${n} rows. Skipping.`);
    return;
  }
  await prisma.blockedSlot.createMany({ data: TO_INSERT });
  console.log(`Created ${TO_INSERT.length} blocked slots.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

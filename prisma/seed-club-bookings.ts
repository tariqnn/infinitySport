import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

// Club bookings: label = club name for grouping. Re-running this seed deletes existing slots for each label then re-inserts (idempotent).
type Slot = { label: string; dayOfWeek: string; courtType: string; time: string };

const CLUB_BOOKINGS: Slot[] = [
  // Basketball Academy — Basketball AC
  { label: 'Basketball Academy', dayOfWeek: 'MONDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Basketball Academy', dayOfWeek: 'MONDAY', courtType: 'Basketball AC', time: '18:00' },
  { label: 'Basketball Academy', dayOfWeek: 'MONDAY', courtType: 'Basketball AC', time: '19:00' },
  { label: 'Basketball Academy', dayOfWeek: 'WEDNESDAY', courtType: 'Basketball AC', time: '16:00' },
  { label: 'Basketball Academy', dayOfWeek: 'WEDNESDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Basketball Academy', dayOfWeek: 'WEDNESDAY', courtType: 'Basketball AC', time: '18:00' },
  { label: 'Basketball Academy', dayOfWeek: 'WEDNESDAY', courtType: 'Basketball AC', time: '19:00' },
  { label: 'Basketball Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '10:00' },
  { label: 'Basketball Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '11:00' },
  { label: 'Basketball Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '12:00' },
  { label: 'Basketball Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Basketball Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '18:00' },
  { label: 'Basketball Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '19:00' },
  { label: 'Basketball Academy', dayOfWeek: 'SATURDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Basketball Academy', dayOfWeek: 'SATURDAY', courtType: 'Basketball AC', time: '18:00' },
  { label: 'Basketball Academy', dayOfWeek: 'SATURDAY', courtType: 'Basketball AC', time: '19:00' },
  // Apex Academy — same court (Basketball AC)
  { label: 'Apex Academy', dayOfWeek: 'MONDAY', courtType: 'Basketball AC', time: '20:00' },
  { label: 'Apex Academy', dayOfWeek: 'MONDAY', courtType: 'Basketball AC', time: '21:00' },
  { label: 'Apex Academy', dayOfWeek: 'WEDNESDAY', courtType: 'Basketball AC', time: '20:00' },
  { label: 'Apex Academy', dayOfWeek: 'WEDNESDAY', courtType: 'Basketball AC', time: '21:00' },
  { label: 'Apex Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '20:00' },
  { label: 'Apex Academy', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '21:00' },
  { label: 'Apex Academy', dayOfWeek: 'SATURDAY', courtType: 'Basketball AC', time: '20:00' },
  { label: 'Apex Academy', dayOfWeek: 'SATURDAY', courtType: 'Basketball AC', time: '21:00' },
  // Volleyball — same court (Basketball AC)
  { label: 'Volleyball', dayOfWeek: 'TUESDAY', courtType: 'Basketball AC', time: '19:00' },
  { label: 'Volleyball', dayOfWeek: 'TUESDAY', courtType: 'Basketball AC', time: '20:00' },
  { label: 'Volleyball', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '15:00' },
  { label: 'Volleyball', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '16:00' },
  { label: 'Volleyball', dayOfWeek: 'SUNDAY', courtType: 'Basketball AC', time: '19:00' },
  { label: 'Volleyball', dayOfWeek: 'SUNDAY', courtType: 'Basketball AC', time: '20:00' },
  // Gym — same court (Basketball AC)
  { label: 'Gym', dayOfWeek: 'TUESDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Gym', dayOfWeek: 'TUESDAY', courtType: 'Basketball AC', time: '18:00' },
  { label: 'Gym', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '16:00' },
  { label: 'Gym', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Gym', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '18:00' },
  { label: 'Gym', dayOfWeek: 'SUNDAY', courtType: 'Basketball AC', time: '17:00' },
  { label: 'Gym', dayOfWeek: 'SUNDAY', courtType: 'Basketball AC', time: '18:00' },
  // مقاولون — same court (Basketball AC)
  { label: 'مقاولون', dayOfWeek: 'TUESDAY', courtType: 'Basketball AC', time: '16:00' },
  { label: 'مقاولون', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '13:00' },
  { label: 'مقاولون', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '14:00' },
  { label: 'مقاولون', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '15:00' },
  { label: 'مقاولون', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '19:00' },
  { label: 'مقاولون', dayOfWeek: 'THURSDAY', courtType: 'Basketball AC', time: '20:00' },
  { label: 'مقاولون', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '13:00' },
  { label: 'مقاولون', dayOfWeek: 'FRIDAY', courtType: 'Basketball AC', time: '14:00' },
  // Badminton (ريشة) — same court (Basketball AC)
  { label: 'Badminton (ريشة)', dayOfWeek: 'TUESDAY', courtType: 'Basketball AC', time: '21:00' },
  { label: 'Badminton (ريشة)', dayOfWeek: 'SUNDAY', courtType: 'Basketball AC', time: '21:00' },
];

const LABELS = [...new Set(CLUB_BOOKINGS.map((s) => s.label))];

async function main() {
  for (const label of LABELS) {
    const deleted = await prisma.blockedSlot.deleteMany({ where: { label } });
    if (deleted.count > 0) console.log(`Deleted ${deleted.count} existing slots for "${label}".`);
  }
  const data = CLUB_BOOKINGS.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    courtType: s.courtType,
    time: s.time,
    isBlocked: true,
    label: s.label,
  }));
  await prisma.blockedSlot.createMany({ data, skipDuplicates: true });
  console.log(`Club bookings: inserted ${data.length} blocked slots for ${LABELS.length} clubs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

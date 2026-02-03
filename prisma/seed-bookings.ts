import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

/**
 * Removes any existing test/dummy bookings (notes contain "Test booking").
 * Does not create new dummy data. Run this to clean the booking section.
 */
async function main() {
  const deleted = await prisma.booking.deleteMany({
    where: { notes: { contains: 'Test booking' } },
  });
  if (deleted.count > 0) {
    console.log('Removed', deleted.count, 'test/dummy bookings.');
  } else {
    console.log('No test bookings found. Nothing to remove.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

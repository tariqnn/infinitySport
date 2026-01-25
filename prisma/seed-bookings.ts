import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

function inDays(days: number, hour: number, minute: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function hourLater(d: Date): Date {
  const out = new Date(d);
  out.setTime(out.getTime() + 60 * 60 * 1000);
  return out;
}

async function main() {
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'Infinity Sports',
        contactName: 'Admin',
        contactEmail: 'admin@infinitysport.jo',
        phone: '+962 7 9624 4059',
      },
    });
    console.log('Created company:', company.name);
  }

  // Remove existing test bookings so we can re-run this seed
  const deleted = await prisma.booking.deleteMany({
    where: { notes: { contains: 'Test booking' } },
  });
  if (deleted.count > 0) {
    console.log('Removed', deleted.count, 'existing test bookings');
  }

  const toCreate = [
    { facilityArea: 'Basketball AC',   start: inDays(1, 10, 0),  status: 'PENDING' as const,   isPaid: false, customerName: 'Ahmad Hassan',  customerPhone: '+962 79 111 2233', customerEmail: 'ahmad@test.com',  notes: 'Test booking' },
    { facilityArea: 'Padel',           start: inDays(1, 14, 0),  status: 'CONFIRMED' as const, isPaid: true,  customerName: 'Sara Ali',      customerPhone: '+962 79 222 3344', customerEmail: 'sara@test.com',   notes: 'Test booking - paid' },
    { facilityArea: 'Volleyball',      start: inDays(2, 17, 0),  status: 'PENDING' as const,   isPaid: false, customerName: 'Omar Khalil',   customerPhone: '+962 79 333 4455', customerEmail: null,             notes: 'Test booking' },
    { facilityArea: 'Basketball 3x3',  start: inDays(2, 19, 0),  status: 'CONFIRMED' as const, isPaid: false, customerName: 'Leen Ahmad',    customerPhone: '+962 79 444 5566', customerEmail: 'leen@test.com',  notes: 'Test booking' },
    { facilityArea: 'Basketball AC',   start: inDays(3, 9, 0),   status: 'COMPLETED' as const, isPaid: true,  customerName: 'Rami Nasser',   customerPhone: '+962 79 555 6677', customerEmail: null,             notes: 'Test booking - completed' },
    { facilityArea: 'Padel',           start: inDays(3, 16, 0),  status: 'CANCELLED' as const, isPaid: false, customerName: 'Yara Taha',     customerPhone: '+962 79 666 7788', customerEmail: 'yara@test.com',  notes: 'Test booking - cancelled' },
    { facilityArea: 'Volleyball',      start: inDays(4, 11, 0),  status: 'PENDING' as const,   isPaid: true,  customerName: 'Khaled Ibrahim', customerPhone: '+962 79 777 8899', customerEmail: null,             notes: 'Test booking' },
    { facilityArea: 'Basketball AC',   start: inDays(5, 18, 0),  status: 'CONFIRMED' as const, isPaid: true,  customerName: 'Noor Mahmoud',  customerPhone: '+962 79 888 9900', customerEmail: 'noor@test.com',  notes: 'Test booking - weekend' },
  ];

  for (const r of toCreate) {
    await prisma.booking.create({
      data: {
        companyId: company!.id,
        facilityArea: r.facilityArea,
        startTime: r.start,
        endTime: hourLater(r.start),
        status: r.status,
        isPaid: r.isPaid,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        customerEmail: r.customerEmail,
        notes: r.notes,
      },
    });
  }

  console.log('Created', toCreate.length, 'test bookings.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from root directory
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  console.log('📡 Testing database connection...');
  
  // Test connection first
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful!');
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error(error);
    process.exit(1);
  }

  // Clear existing data
  // FooterSettings is a newer table; use `as any` to avoid compile errors if prisma client isn't generated yet.
  await (prisma as any).footerSettings?.deleteMany?.().catch(() => undefined);
  await prisma.footerLink.deleteMany();
  await prisma.facilityHighlight.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.offer.deleteMany();
  await prisma.program.deleteMany();
  await prisma.heroSection.deleteMany();

  // Hero Section
  const hero = await prisma.heroSection.create({
    data: {
      title: 'Elevating Jordanian Athletes',
      subtitle: 'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.',
      primaryCta: 'Explore Programs',
      primaryUrl: '/contact',
      secondaryCta: 'Book a Tour',
      secondaryUrl: '/contact',
      backgroundImageUrl: 'https://images.unsplash.com/photo-1461897104016-0b3b00cc81ee?auto=format&fit=crop&w=2000&q=80',
      backgroundVideoUrl: '/main-video.mp4',
    },
  });
  console.log('✅ Created hero section');

  // Programs
  const programs = await Promise.all([
    prisma.program.create({
      data: {
        name: 'Elite Court Lab',
        description: 'High-tempo basketball development with pro analytics and skill labs.',
        level: 'Pro tier',
        slug: 'elite-court-lab',
        highlight: true,
        order: 0,
      },
    }),
    prisma.program.create({
      data: {
        name: 'Padel League',
        description: 'Tournament-style match play with coach feedback and match analytics.',
        level: 'Intermediate',
        slug: 'padel-league',
        highlight: false,
        order: 1,
      },
    }),
    prisma.program.create({
      data: {
        name: 'Swim Sprint Academy',
        description: 'Olympic pool conditioning, underwater video analysis, and strength labs.',
        level: 'Advanced',
        slug: 'swim-sprint-academy',
        highlight: false,
        order: 2,
      },
    }),
    prisma.program.create({
      data: {
        name: 'Junior Performance Lab',
        description: 'Age-specific multi-sport conditioning for power, agility, and recovery.',
        level: 'Beginner',
        slug: 'junior-performance-lab',
        highlight: false,
        order: 3,
      },
    }),
  ]);
  console.log(`✅ Created ${programs.length} programs`);

  // Offers
  const offers = await Promise.all([
    prisma.offer.create({
      data: {
        name: 'Court Flex',
        pricePerMonth: 220,
        badge: 'Popular',
        description: 'Unlimited court access, group sessions, and recovery pods.',
        features: [
          'Unlimited basketball & padel slots',
          'Weekly performance labs',
          'Priority event booking',
        ],
        order: 0,
      },
    }),
    prisma.offer.create({
      data: {
        name: 'Elite Family',
        pricePerMonth: 360,
        badge: 'New',
        description: 'Family-wide membership with concierge booking and junior academy.',
        features: [
          '4 family members included',
          'Junior academy track',
          'Concierge scheduling',
        ],
        order: 1,
      },
    }),
    prisma.offer.create({
      data: {
        name: 'Corporate Performance',
        pricePerMonth: 0, // Custom pricing
        description: 'Executive wellness, off-sites, and bespoke event programming.',
        features: [
          'Corporate wellness labs',
          'Leadership off-sites',
          'Dedicated account lead',
        ],
        order: 2,
      },
    }),
  ]);
  console.log(`✅ Created ${offers.length} offers`);

  // Events
  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: 'Regional Combine',
        description: 'Scouting combine for U18 athletes with pro metrics.',
        date: new Date('2025-01-24T17:00:00.000Z'),
        location: 'Infinity Arena',
        highlight: true,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Padel Invitational',
        description: 'Teams from KSA, UAE, and Jordan compete for the Infinity Cup.',
        date: new Date('2025-02-12T09:00:00.000Z'),
        location: 'Padel Dome',
        highlight: true,
      },
    }),
    prisma.event.create({
      data: {
        title: 'Corporate Wellness Lab',
        description: 'Invite-only executive session with performance diagnostics.',
        date: new Date('2025-03-07T08:30:00.000Z'),
        location: 'Studio B',
        highlight: false,
      },
    }),
  ]);
  console.log(`✅ Created ${events.length} events`);

  // Announcements
  const announcements = await Promise.all([
    prisma.announcement.create({
      data: {
        title: 'New Infinity Arena reveal',
        body: 'Book a private walkthrough of the 2025 expansion with the pro locker wing.',
        publishedAt: new Date('2024-12-01'),
        isPinned: true,
      },
    }),
    prisma.announcement.create({
      data: {
        title: 'Scholarship submissions',
        body: 'Applications for the 2025 Elite Scholarship close January 30.',
        publishedAt: new Date('2024-11-15'),
        isPinned: false,
      },
    }),
  ]);
  console.log(`✅ Created ${announcements.length} announcements`);

  // Facility Highlights
  const facilities = await Promise.all([
    prisma.facilityHighlight.create({
      data: {
        name: 'Infinity Arena',
        description: 'NBA-length courts, LED tracking, and 1,200-seat showcase bowl.',
        imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1600&q=80',
      },
    }),
    prisma.facilityHighlight.create({
      data: {
        name: 'Padel Dome',
        description: 'Climate-controlled courts with broadcast-grade lighting.',
        imageUrl: 'https://images.unsplash.com/photo-1519861155734-94c5852b1b64?auto=format&fit=crop&w=1200&q=80',
      },
    }),
    prisma.facilityHighlight.create({
      data: {
        name: 'Performance Lab',
        description: 'Strength pods, cold plunge suites, and recovery tech.',
        imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80',
      },
    }),
  ]);
  console.log(`✅ Created ${facilities.length} facility highlights`);

  // Footer Links
  const footerLinks = await Promise.all([
    prisma.footerLink.create({
      data: {
        label: 'About Us',
        url: '/about',
        group: 'About',
        order: 0,
      },
    }),
    prisma.footerLink.create({
      data: {
        label: 'Programs',
        url: '/sports',
        group: 'Programs',
        order: 0,
      },
    }),
    prisma.footerLink.create({
      data: {
        label: 'Events',
        url: '/events',
        group: 'Programs',
        order: 1,
      },
    }),
    prisma.footerLink.create({
      data: {
        label: 'Contact',
        url: '/contact',
        group: 'Support',
        order: 0,
      },
    }),
    prisma.footerLink.create({
      data: {
        label: 'FAQ',
        url: '/faq',
        group: 'Support',
        order: 1,
      },
    }),
  ]);
  console.log(`✅ Created ${footerLinks.length} footer links`);

  // Footer Settings
  await (prisma as any).footerSettings?.create?.({
    data: {
      address: 'Shemisani, Princess Alia College',
      phone: '07 9624 4059',
      email: 'infinitysportsacademyjo@gmail.com',
      contactRecipientEmail: 'infinitysportsacademyjo@gmail.com',
      socialLinks: [{ id: 'instagram', label: 'Instagram', href: 'https://instagram.com/infinity.sports.academy' }],
    },
  });
  console.log('✅ Created footer settings');

  console.log('✨ Seeding completed!');
  console.log('\n📊 Summary:');
  console.log(`   - Hero Section: 1`);
  console.log(`   - Programs: ${programs.length}`);
  console.log(`   - Offers: ${offers.length}`);
  console.log(`   - Events: ${events.length}`);
  console.log(`   - Announcements: ${announcements.length}`);
  console.log(`   - Facilities: ${facilities.length}`);
  console.log(`   - Footer Links: ${footerLinks.length}`);
  console.log(`   - Footer Settings: 1`);

  // Create test bookings if company exists
  const companies = await prisma.company.findMany();
  if (companies.length > 0) {
    const company = companies[0];
    const now = new Date();
    
    // Delete existing test bookings first
    await prisma.booking.deleteMany({
      where: {
        companyId: company.id,
        notes: {
          contains: 'Test booking',
        },
      },
    });
    
    // Create some test bookings
    const testBookings = [
      {
        companyId: company.id,
        facilityArea: 'Basketball AC',
        startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
        status: 'PENDING' as const,
        isPaid: false,
        customerName: 'Test Customer 1',
        customerPhone: '+962791234567',
        customerEmail: 'test1@example.com',
        notes: 'Test booking from seed',
      },
      {
        companyId: company.id,
        facilityArea: 'Padel',
        startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'CONFIRMED' as const,
        isPaid: true,
        customerName: 'Test Customer 2',
        customerPhone: '+962791234568',
        customerEmail: 'test2@example.com',
        notes: 'Test booking - paid',
      },
      {
        companyId: company.id,
        facilityArea: 'Basketball 3x3',
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: 'PENDING' as const,
        isPaid: false,
        customerName: 'Test Customer 3',
        customerPhone: '+962791234569',
        notes: 'Test booking - unpaid',
      },
    ];

    for (const bookingData of testBookings) {
      await prisma.booking.create({
        data: bookingData,
      });
    }
    console.log(`✅ Created ${testBookings.length} test bookings`);
  }

  console.log('\n🎉 Database is ready! You can now start the API server.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


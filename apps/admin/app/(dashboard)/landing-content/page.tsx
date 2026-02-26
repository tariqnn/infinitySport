import Link from 'next/link';
import { getLandingContent } from '@infinity/mock-api';
import { PageHero } from '../../_components/PageHero';
import { prisma } from '../../../lib/db';

export default async function LandingContentMapPage() {
  const content = await getLandingContent();
  let coachesCount = 0;
  let packagesCount = 0;
  try {
    const [coachCount, packageCount] = await Promise.all([
      prisma.landingCoach.count(),
      prisma.package.count({ where: { isActive: true } }),
    ]);
    coachesCount = coachCount;
    packagesCount = packageCount;
  } catch (error) {
    console.error('[admin] failed to load content map counts:', error);
  }

  const sections = [
    { title: 'Hero', description: content.hero.title, href: '/hero' },
    { title: 'Programs', description: `${content.programs.length} cards`, href: '/programs' },
    { title: 'Coaches', description: `${coachesCount} profiles`, href: '/coaches' },
    { title: 'Packages', description: `${packagesCount} active`, href: '/packages' },
    { title: 'Offers', description: `${content.offers.length} plans`, href: '/offers' },
    { title: 'Events', description: `${content.events.length} scheduled`, href: '/events' },
    { title: 'Announcements', description: `${content.announcements.length} banners`, href: '/announcements' },
    { title: 'Facilities', description: `${content.facilityHighlights.length} highlights`, href: '/facilities' },
    { title: 'Footer', description: content.footer.address, href: '/footer' }
  ];

  return (
    <>
      <PageHero
        eyebrow="Content map"
        title="Landing page architecture"
        description="Every section below is editable inside this admin. Use it as a quick reference for the marketing site's building blocks."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.title} href={section.href} className="glass-card block p-6 transition hover:shadow-card-hover">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{section.title}</p>
            <p className="mt-2 font-display text-xl font-semibold text-[var(--text-primary)]">{section.description}</p>
            <p className="mt-3 text-sm font-semibold text-[var(--primary)]">Open {section.title.toLowerCase()}</p>
          </Link>
        ))}
      </div>
    </>
  );
}

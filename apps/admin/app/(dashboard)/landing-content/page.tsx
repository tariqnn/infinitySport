import Link from 'next/link';
import { getLandingContent } from '@infinity/mock-api';
import { PageHero } from '../../_components/PageHero';
import { prisma } from '../../../lib/db';
import { Layers3, FileText, Users, Gift, CalendarRange, Megaphone, Footprints, Settings } from 'lucide-react';

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
    {
      title: 'Hero Banner',
      description: 'The main headline, subtitle, and background video at the top of the website.',
      detail: content.hero.title || 'Not set',
      href: '/hero',
      icon: Layers3,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Programs & Prices',
      description: 'Sports programs with schedules and prices. These appear as cards on the website.',
      detail: `${packagesCount} active program${packagesCount !== 1 ? 's' : ''}`,
      href: '/packages',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Coaches',
      description: 'Coach names, photos, and bios shown on the website.',
      detail: `${coachesCount} coach profile${coachesCount !== 1 ? 's' : ''}`,
      href: '/coaches',
      icon: Users,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Offers',
      description: 'Membership plans and seasonal promotions displayed on the website.',
      detail: `${content.offers.length} plan${content.offers.length !== 1 ? 's' : ''}`,
      href: '/offers',
      icon: Gift,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      title: 'Events',
      description: 'Upcoming events, sessions, and community activities.',
      detail: `${content.events.length} event${content.events.length !== 1 ? 's' : ''}`,
      href: '/events',
      icon: CalendarRange,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Announcements',
      description: 'Banner alerts that appear at the very top of the website.',
      detail: `${content.announcements.length} banner${content.announcements.length !== 1 ? 's' : ''}`,
      href: '/announcements',
      icon: Megaphone,
      color: 'bg-rose-50 text-rose-600',
    },
    {
      title: 'Facilities',
      description: 'Photos and descriptions of the sports facilities.',
      detail: `${content.facilityHighlights.length} highlight${content.facilityHighlights.length !== 1 ? 's' : ''}`,
      href: '/facilities',
      icon: Footprints,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Footer & Contact',
      description: 'Address, phone number, email, and social media links at the bottom of every page.',
      detail: content.footer.address || 'Not set',
      href: '/footer',
      icon: Settings,
      color: 'bg-slate-100 text-slate-600',
    },
  ];

  return (
    <>
      <PageHero
        eyebrow="Website sections"
        title="All Website Content"
        description="Your website is made up of the sections below. Click any section to edit it. Changes you save will appear on the website automatically."
      />
      <div className="grid gap-5 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.title} href={section.href} className="glass-card group block p-6 transition hover:shadow-strong">
              <div className="flex items-start gap-4">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${section.color}`}>
                  <Icon className="h-6 w-6" strokeWidth={2.2} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{section.title}</p>
                  <p className="mt-1 text-base leading-relaxed text-[var(--text-muted)]">{section.description}</p>
                  <p className="mt-2 text-sm font-semibold text-[var(--text-muted)]">{section.detail}</p>
                </div>
              </div>
              <p className="mt-4 inline-flex items-center gap-1.5 text-base font-bold text-[var(--primary)] group-hover:underline">
                Edit {section.title.toLowerCase()}
                <span className="transition group-hover:translate-x-0.5">&rarr;</span>
              </p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

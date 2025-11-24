import Link from 'next/link';
import { getLandingContent } from '@infinity/mock-api';
import { PageHero } from '../../_components/PageHero';

export default async function LandingContentMapPage() {
  const content = await getLandingContent();

  const sections = [
    { title: 'Hero', description: content.hero.title, href: '/hero' },
    { title: 'Programs', description: `${content.programs.length} cards`, href: '/programs' },
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
        description="Every section below is editable inside this admin. Use it as a quick reference for the marketing site’s building blocks."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.title} href={section.href} className="glass-card block p-5 transition hover:-translate-y-1">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">{section.title}</p>
            <p className="mt-2 font-display text-2xl font-semibold text-slate-900">{section.description}</p>
            <p className="mt-3 text-sm font-semibold text-brand-blue">Open {section.title.toLowerCase()}</p>
          </Link>
        ))}
      </div>
    </>
  );
}


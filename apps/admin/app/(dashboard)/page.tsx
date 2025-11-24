import Link from 'next/link';
import { getLandingContent } from '@infinity/mock-api';
import { ArrowUpRight } from 'lucide-react';
import { PageHero } from '../_components/PageHero';
import { StatCard } from '../_components/StatCard';

export default async function DashboardPage() {
  const content = await getLandingContent();

  const stats = [
    { label: 'Programs live', value: String(content.programs.filter((p) => p.isActive !== false).length), delta: `${content.programs.length} total`, accent: 'blue' as const },
    { label: 'Offers & plans', value: String(content.offers.filter((o) => o.isActive !== false).length), delta: 'on landing page', accent: 'teal' as const },
    { label: 'Upcoming events', value: String(content.events.filter((e) => e.isActive !== false).length), delta: 'next 90 days', accent: 'green' as const },
    { label: 'Live announcements', value: String(content.announcements.filter((a) => a.isActive !== false).length), delta: `${content.announcements.length} total`, accent: 'blue' as const }
  ];

  return (
    <>
      <section className="relative overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.08)] bg-white p-8 shadow-panel">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,38,255,0.08),transparent_55%),radial-gradient(circle_at_80%_0%,rgba(105,255,219,0.12),transparent_50%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-lightblue">Infinity Sport</p>
            <h1 className="font-display text-4xl font-black text-[var(--text-primary)]">
              Admin Command Center
            </h1>
            <p className="max-w-2xl text-sm text-[var(--text-muted)]">
              Guide the public landing page with editorial precision. Update hero narratives, launch offers, and keep events synchronized with operations.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/hero" className="glow-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
                Edit hero content
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                href="/events"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.12)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-brand-offwhite"
              >
                Manage events
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-[rgba(15,23,42,0.06)] bg-white p-4 text-[var(--text-primary)] shadow-panel">
            <p className="text-xs uppercase tracking-[0.25em] text-brand-blue">Last publish</p>
            <p className="mt-2 font-display text-2xl font-bold text-[var(--text-primary)]">{new Date(content.updatedAt).toLocaleString()}</p>
            <p className="text-sm text-[var(--text-muted)]">by {content.updatedBy}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <PageHero
        eyebrow="Overview"
        title="Landing content modules"
        description="Each module below maps directly to a section on infinitysport.jo. Keep them updated to maintain a premium, cohesive brand."
        actions={
          <Link href="/landing-content" className="glow-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
            Review content map
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card space-y-4 p-6">
          <h3 className="font-display text-xl font-semibold text-[var(--text-primary)]">Programs snapshot</h3>
          <div className="space-y-3">
            {content.programs.slice(0, 4).map((program) => (
              <div key={program.id} className="flex items-center justify-between rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-sm">
                <div>
                  <p className="font-semibold text-[var(--text-primary)]">{program.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{program.sportType}</p>
                </div>
                <span className="rounded-full bg-brand-offwhite px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
                  {program.isFeatured ? 'Featured' : 'Standard'}
                </span>
              </div>
            ))}
          </div>
          <Link href="/programs" className="text-sm font-semibold text-brand-lightblue hover:underline">
            Manage programs
          </Link>
        </div>
        <div className="glass-card space-y-4 p-6">
          <h3 className="font-display text-xl font-semibold text-[var(--text-primary)]">Upcoming events</h3>
          <div className="space-y-3">
            {content.events.slice(0, 4).map((event) => (
              <div key={event.id} className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-4 py-3 text-sm shadow-sm">
                <p className="font-semibold text-[var(--text-primary)]">{event.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(event.date).toLocaleDateString()} · {event.location}
                </p>
              </div>
            ))}
          </div>
          <Link href="/events" className="text-sm font-semibold text-brand-lightblue hover:underline">
            Open event manager
          </Link>
        </div>
      </div>
    </>
  );
}

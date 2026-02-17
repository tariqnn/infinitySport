import Link from 'next/link';
import { getLandingContent } from '@infinity/mock-api';
import { ArrowUpRight, CalendarClock, CalendarRange, FileText, Gift, Layers3, Megaphone } from 'lucide-react';
import { PageHero } from '../_components/PageHero';
import { StatCard } from '../_components/StatCard';

export default async function DashboardPage() {
  const content = await getLandingContent();

  const stats = [
    { label: 'Programs live', value: String(content.programs.filter((p) => p.isActive !== false).length), delta: `${content.programs.length} total`, accent: 'blue' as const },
    { label: 'Offers & plans', value: String(content.offers.filter((o) => o.isActive !== false).length), delta: 'on landing page', accent: 'teal' as const },
    { label: 'Upcoming events', value: String(content.events.filter((e) => e.isActive !== false).length), delta: 'next 90 days', accent: 'green' as const },
    { label: 'Live announcements', value: String(content.announcements.filter((a) => a.isActive !== false).length), delta: `${content.announcements.length} total`, accent: 'blue' as const },
  ];

  const activeModules =
    content.programs.filter((p) => p.isActive !== false).length +
    content.offers.filter((o) => o.isActive !== false).length +
    content.events.filter((e) => e.isActive !== false).length +
    content.announcements.filter((a) => a.isActive !== false).length;

  const totalModules =
    content.programs.length +
    content.offers.length +
    content.events.length +
    content.announcements.length;

  const quickActions = [
    {
      title: 'Hero',
      description: 'Refresh the headline, CTA, and background media.',
      href: '/hero',
      icon: Layers3,
    },
    {
      title: 'Programs',
      description: 'Add, reorder, or highlight training programs.',
      href: '/programs',
      icon: FileText,
    },
    {
      title: 'Offers',
      description: 'Update pricing, plans, and seasonal promotions.',
      href: '/offers',
      icon: Gift,
    },
    {
      title: 'Events',
      description: 'Schedule upcoming sessions and community events.',
      href: '/events',
      icon: CalendarRange,
    },
    {
      title: 'Announcements',
      description: 'Publish landing page banners and alerts.',
      href: '/announcements',
      icon: Megaphone,
    },
    {
      title: 'Bookings',
      description: 'Review incoming booking requests quickly.',
      href: '/bookings',
      icon: CalendarClock,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome card */}
      <section className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-80" aria-hidden />
        <div className="relative grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div className="space-y-4">
            <p className="inline-flex items-center rounded-full bg-[var(--primary-light)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Infinity Sport
            </p>
            <h1 className="font-display text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">
              Admin command center
            </h1>
            <p className="max-w-xl text-sm text-[var(--text-muted)]">
              Update hero content, keep programs and events current, and make sure every landing module stays on-brand.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/hero" className="btn-primary inline-flex items-center gap-2">
                Edit hero
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/landing-content" className="btn-secondary inline-flex items-center gap-2">
                Content map
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/events" className="btn-secondary inline-flex items-center gap-2">
                Events
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl border border-[var(--border-muted)] bg-white/80 px-4 py-3 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Last updated</p>
              <p className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">
                {new Date(content.updatedAt).toLocaleString()}
              </p>
              <p className="text-sm text-[var(--text-muted)]">by {content.updatedBy}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border-muted)] bg-white/80 px-4 py-3 shadow-soft">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Published modules</p>
              <p className="mt-1 font-display text-lg font-semibold text-[var(--text-primary)]">
                {activeModules} of {totalModules}
              </p>
              <p className="text-sm text-[var(--text-muted)]">Live sections on the site</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {/* Quick actions */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="section-kicker">Quick actions</p>
            <h2 className="section-title">Jump back into the work</h2>
          </div>
          <Link href="/landing-content" className="btn-secondary inline-flex items-center gap-2">
            View content map
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="glass-card group flex h-full flex-col gap-4 p-5 transition"
              >
                <div className="flex items-start gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] shadow-soft">
                    <Icon className="h-5 w-5" strokeWidth={2.2} />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{action.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{action.description}</p>
                  </div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
                  Open workspace
                  <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Content modules */}
      <PageHero
        eyebrow="Overview"
        title="Landing content modules"
        description="Each module maps to a section on the public site. Keep them updated for a consistent brand."
        actions={
          <Link href="/landing-content" className="btn-primary inline-flex items-center gap-2">
            Open content map
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      {/* Quick links: Programs & Events */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">Programs</h3>
            <Link href="/programs" className="text-xs font-semibold text-[var(--primary)] hover:underline">
              Manage ->
            </Link>
          </div>
          <ul className="space-y-2">
            {content.programs.slice(0, 4).map((program) => (
              <li
                key={program.id}
                className="flex items-center justify-between rounded-2xl border border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{program.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{program.sportType}</p>
                </div>
                <span className="rounded-full bg-[var(--primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--primary)]">
                  {program.isFeatured ? 'Featured' : 'Standard'}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-[var(--text-primary)]">Upcoming events</h3>
            <Link href="/events" className="text-xs font-semibold text-[var(--primary)] hover:underline">
              Manage ->
            </Link>
          </div>
          <ul className="space-y-2">
            {content.events.slice(0, 4).map((event) => (
              <li
                key={event.id}
                className="rounded-2xl border border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-4 py-3 text-sm"
              >
                <p className="font-medium text-[var(--text-primary)]">{event.title}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(event.date).toLocaleDateString()} - {event.location}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

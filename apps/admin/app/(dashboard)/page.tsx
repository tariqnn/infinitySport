import Link from 'next/link';
import { getLandingContent } from '@infinity/mock-api';
import { ArrowUpRight, CalendarRange, FileText, Gift, Layers3, Megaphone, Users, Calendar } from 'lucide-react';
import { StatCard } from '../_components/StatCard';
import { prisma } from '../../lib/db';

export default async function DashboardPage() {
  const content = await getLandingContent();
  let coachesLive = 0;
  let coachesTotal = 0;
  let programsLive = 0;
  let programsTotal = 0;
  let programsPreview: Array<{ id: string; name: string; sportType: string }> = [];
  try {
    const [liveCount, totalCount, packageLiveCount, packageTotalCount, packagePreview] = await Promise.all([
      prisma.landingCoach.count({ where: { isActive: true } }),
      prisma.landingCoach.count(),
      prisma.package.count({ where: { isActive: true } }),
      prisma.package.count(),
      prisma.package.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 5,
        select: { id: true, name: true, sportType: true },
      }),
    ]);
    coachesLive = liveCount;
    coachesTotal = totalCount;
    programsLive = packageLiveCount;
    programsTotal = packageTotalCount;
    programsPreview = packagePreview;
  } catch (error) {
    console.error('[admin] failed to load dashboard data:', error);
  }

  const stats = [
    { label: 'Programs live', value: String(programsLive), delta: `${programsTotal} total`, accent: 'blue' as const },
    { label: 'Coaches live', value: String(coachesLive), delta: `${coachesTotal} total`, accent: 'blue' as const },
    { label: 'Offers & plans', value: String(content.offers.filter((o) => o.isActive !== false).length), delta: 'on website', accent: 'teal' as const },
    { label: 'Upcoming events', value: String(content.events.filter((e) => e.isActive !== false).length), delta: 'next 90 days', accent: 'green' as const },
  ];

  const quickActions = [
    {
      title: 'Programs & Prices',
      description: 'Add, edit, or remove the sports programs and prices shown on the website.',
      href: '/packages',
      icon: FileText,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Hero Banner',
      description: 'Change the main headline, subtitle, and background video visitors see first.',
      href: '/hero',
      icon: Layers3,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Coaches',
      description: 'Update coach names, photos, and bios shown on the website.',
      href: '/coaches',
      icon: Users,
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Events',
      description: 'Add or update upcoming events and sessions displayed on the website.',
      href: '/events',
      icon: CalendarRange,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      title: 'Offers',
      description: 'Manage membership plans and seasonal promotions.',
      href: '/offers',
      icon: Gift,
      color: 'bg-teal-50 text-teal-600',
    },
    {
      title: 'Announcements',
      description: 'Create or remove banner alerts shown at the top of the website.',
      href: '/announcements',
      icon: Megaphone,
      color: 'bg-rose-50 text-rose-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <section className="glass-card relative overflow-hidden p-7 sm:p-8">
        <div className="space-y-4">
          <h1 className="font-display text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Welcome to Admin
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-[var(--text-muted)]">
            Use this panel to manage your website content. Any changes you save here will automatically appear on the live website.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/packages" className="btn-primary inline-flex items-center gap-2">
              Edit Programs
              <ArrowUpRight className="h-5 w-5" />
            </Link>
            <Link href="/landing-content" className="btn-secondary inline-flex items-center gap-2">
              View All Sections
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it works hint */}
      <section className="rounded-2xl border-2 border-blue-200 bg-blue-50 px-7 py-5">
        <p className="text-base font-bold text-blue-900">How does this work?</p>
        <p className="mt-1 text-base leading-relaxed text-blue-800">
          When you edit content here (like programs, prices, coaches, or events) and click <strong>Save</strong>, the changes go live on the website automatically. No need to do anything else.
        </p>
      </section>

      {/* Stats */}
      <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      {/* Quick actions */}
      <section className="space-y-5">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">What do you want to edit?</h2>
          <p className="mt-1 text-base text-[var(--text-muted)]">Click on any section below to start editing.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="glass-card group flex h-full flex-col gap-4 p-6 transition"
              >
                <div className="flex items-start gap-4">
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${action.color}`}>
                    <Icon className="h-6 w-6" strokeWidth={2.2} />
                  </span>
                  <div className="space-y-1.5">
                    <p className="text-lg font-bold text-[var(--text-primary)]">{action.title}</p>
                    <p className="text-base leading-relaxed text-[var(--text-muted)]">{action.description}</p>
                  </div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 text-base font-bold text-[var(--primary)]">
                  Open
                  <ArrowUpRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Quick previews */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Programs on Website</h3>
            <Link href="/packages" className="text-base font-bold text-[var(--primary)] hover:underline">
              Edit
            </Link>
          </div>
          <ul className="space-y-2.5">
            {programsPreview.map((program) => (
              <li key={program.id} className="rounded-xl border-2 border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-5 py-3.5">
                <p className="text-base font-semibold text-[var(--text-primary)]">{program.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{program.sportType}</p>
              </li>
            ))}
            {programsPreview.length === 0 && (
              <li className="rounded-xl border-2 border-dashed border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-5 py-4 text-base text-[var(--text-muted)]">
                No programs yet. Click "Edit Programs" above to add your first one.
              </li>
            )}
          </ul>
        </div>
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">Upcoming Events</h3>
            <Link href="/events" className="text-base font-bold text-[var(--primary)] hover:underline">
              Edit
            </Link>
          </div>
          <ul className="space-y-2.5">
            {content.events.slice(0, 4).map((event) => (
              <li
                key={event.id}
                className="rounded-xl border-2 border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-5 py-3.5"
              >
                <p className="text-base font-semibold text-[var(--text-primary)]">{event.title}</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {new Date(event.date).toLocaleDateString()} &mdash; {event.location}
                </p>
              </li>
            ))}
            {content.events.length === 0 && (
              <li className="rounded-xl border-2 border-dashed border-[var(--border-muted)] bg-[var(--bg-card-muted)] px-5 py-4 text-base text-[var(--text-muted)]">
                No events yet. Click "Edit" to add one.
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

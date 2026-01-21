"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LayoutDashboard, Layers3, CalendarRange, Gift, Megaphone, Footprints, Settings, Calendar } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/landing-content', label: 'Landing Content', icon: LayoutDashboard },
  { href: '/hero', label: 'Hero', icon: Layers3 },
  { href: '/programs', label: 'Programs', icon: Layers3 },
  { href: '/offers', label: 'Offers', icon: Gift },
  { href: '/events', label: 'Events', icon: CalendarRange },
  { href: '/bookings', label: 'Bookings', icon: Calendar },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/facilities', label: 'Facilities', icon: Footprints },
  { href: '/footer', label: 'Footer', icon: Settings }
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-64 flex-col border-r border-[rgba(15,23,42,0.06)] bg-white px-6 py-8 shadow-panel lg:flex">
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-[linear-gradient(120deg,#1426FF,#24D2C1,#61FF45)] p-2 shadow-aurora">
          <span className="font-display text-xl font-black text-white">IS</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Infinity Sport</p>
          <p className="text-xs uppercase tracking-[0.2em] text-brand-blue">Admin</p>
        </div>
      </div>

      <nav className="mt-10 flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'group flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition',
                active
                  ? 'bg-[rgba(20,38,255,0.08)] text-brand-blue shadow-aurora'
                  : 'text-slate-500 hover:text-brand-blue hover:bg-brand-offwhite'
              )}
            >
              <span
                className={clsx(
                  'h-full w-1 rounded-full',
                  active ? 'bg-brand-green' : 'bg-transparent group-hover:bg-brand-blue'
                )}
              />
              <Icon className={clsx('h-4 w-4', active ? 'text-brand-blue' : 'text-slate-400 group-hover:text-brand-blue')} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="rounded-3xl border border-[rgba(15,23,42,0.06)] bg-brand-offwhite p-4 text-sm text-slate-600 shadow-panel">
        <p className="text-xs uppercase tracking-[0.25em] text-brand-blue">Need help?</p>
        <p className="mt-2 font-semibold text-[var(--text-primary)]">partners@infinitysport.jo</p>
        <p className="mt-1 text-xs text-slate-500">v2.0.0</p>
      </div>
    </aside>
  );
}


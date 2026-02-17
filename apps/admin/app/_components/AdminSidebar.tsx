"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  Layers3,
  CalendarRange,
  Gift,
  Megaphone,
  Footprints,
  Settings,
  Calendar,
  CalendarClock,
  FileText,
  Package,
} from 'lucide-react';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Main',
    items: [{ href: '/', label: 'Dashboard', icon: Home }],
  },
  {
    label: 'Content',
    items: [
      { href: '/landing-content', label: 'Landing Content', icon: LayoutDashboard },
      { href: '/hero', label: 'Hero', icon: Layers3 },
      { href: '/programs', label: 'Programs', icon: FileText },
      { href: '/packages', label: 'Packages', icon: Package },
      { href: '/offers', label: 'Offers', icon: Gift },
      { href: '/events', label: 'Events', icon: CalendarRange },
    ],
  },
  {
    label: 'Bookings',
    items: [
      { href: '/bookings', label: 'Bookings', icon: Calendar },
      { href: '/booking-availability', label: 'Availability', icon: CalendarClock },
    ],
  },
  {
    label: 'More',
    items: [
      { href: '/announcements', label: 'Announcements', icon: Megaphone },
      { href: '/facilities', label: 'Facilities', icon: Footprints },
      { href: '/footer', label: 'Footer', icon: Settings },
    ],
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-72 flex-shrink-0 flex-col border-r border-[var(--border-muted)] bg-white/90 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border-muted)] px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent-teal)] text-sm font-bold text-white shadow-soft">
          IS
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-primary)]">Infinity Sport</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition',
                        active
                          ? 'bg-[var(--primary-light)] text-[var(--primary)] shadow-soft'
                          : 'text-[var(--text-muted)] hover:bg-[var(--bg-card-muted)] hover:text-[var(--text-primary)]'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-xl border transition',
                          active
                            ? 'border-[var(--primary)]/20 bg-white text-[var(--primary)]'
                            : 'border-transparent text-[var(--text-muted)] group-hover:border-[var(--border-muted)] group-hover:bg-white group-hover:text-[var(--text-primary)]'
                        )}
                      >
                        <Icon className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border-muted)] p-4">
        <div className="rounded-2xl bg-[var(--bg-card-muted)] px-4 py-4 text-xs shadow-soft">
          <p className="font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">Support</p>
          <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">partners@infinitysport.jo</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Build</span>
            <span>v2.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

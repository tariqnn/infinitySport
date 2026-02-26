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
  Users,
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
      { href: '/coaches', label: 'Coaches', icon: Users },
      { href: '/packages', label: 'Programs', icon: FileText },
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
    <aside className="hidden min-h-screen w-[250px] flex-shrink-0 flex-col border-r border-[#13274f] bg-[#050b1f] lg:flex">
      <div className="flex h-[72px] items-center gap-3 border-b border-[#13274f] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e63ff] text-sm font-bold text-white">
          oo
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">InfinitySport</p>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-300">Admin Console</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={clsx(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                        active
                          ? 'bg-[#1e63ff] text-white shadow-[0_8px_18px_rgba(30,99,255,0.35)]'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-5 w-5 items-center justify-center transition',
                          active
                            ? 'text-white'
                            : 'text-slate-300 group-hover:text-white'
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

      <div className="border-t border-[#13274f] p-3">
        <div className="rounded-xl bg-[#081432] px-4 py-4 text-xs">
          <p className="font-semibold uppercase tracking-[0.2em] text-slate-300">Support</p>
          <p className="mt-2 text-sm font-semibold text-white">partners@infinitysport.jo</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-300">
            <span>Build</span>
            <span>v2.0.0</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

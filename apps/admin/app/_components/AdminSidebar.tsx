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
  X,
} from 'lucide-react';
import clsx from 'clsx';

const navGroups = [
  {
    label: 'Main',
    items: [{ href: '/', label: 'Dashboard', icon: Home }],
  },
  {
    label: 'Website Content',
    items: [
      { href: '/landing-content', label: 'Landing Content', icon: LayoutDashboard, hint: 'Overview of all sections' },
      { href: '/hero', label: 'Hero Banner', icon: Layers3, hint: 'Main headline & video' },
      { href: '/coaches', label: 'Coaches', icon: Users, hint: 'Coach profiles shown on site' },
      { href: '/packages', label: 'Programs & Prices', icon: FileText, hint: 'Sports programs on landing' },
      { href: '/offers', label: 'Offers', icon: Gift, hint: 'Seasonal promotions' },
      { href: '/events', label: 'Events', icon: CalendarRange, hint: 'Upcoming events' },
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
      { href: '/announcements', label: 'Announcements', icon: Megaphone, hint: 'Top banner alerts' },
      { href: '/facilities', label: 'Facilities', icon: Footprints },
      { href: '/footer', label: 'Footer & Contact', icon: Settings },
    ],
  },
];

export function AdminSidebar({
  variant = "desktop",
  onNavigate,
}: {
  variant?: "desktop" | "mobile";
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const isDesktop = variant === "desktop";

  return (
    <aside
      className={clsx(
        "w-[280px] shrink-0 flex-col border-r border-[#13274f] bg-[#050b1f] text-slate-100",
        isDesktop ? "hidden lg:flex" : "flex"
      )}
      style={{ minHeight: isDesktop ? '100vh' : undefined }}
    >
      <div className="flex h-[80px] items-center justify-between border-b border-[#13274f] px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e63ff] text-sm font-bold text-white">
            oo
          </div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold text-white">InfinitySport</p>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-300">Admin</p>
          </div>
        </div>
        {!isDesktop && onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            className="rounded-xl border border-white/20 p-2 text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="mb-2 px-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
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
                      onClick={() => onNavigate?.()}
                      className={clsx(
                        'group flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-medium transition',
                        active
                          ? 'bg-[#1e63ff] text-white shadow-[0_8px_18px_rgba(30,99,255,0.35)]'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      )}
                    >
                      <span
                        className={clsx(
                          'flex h-6 w-6 shrink-0 items-center justify-center transition',
                          active ? 'text-white' : 'text-slate-300 group-hover:text-white'
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={2.25} />
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

      <div className="border-t border-[#13274f] p-4">
        <div className="rounded-xl bg-[#081432] px-4 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300">Need help?</p>
          <p className="mt-2 text-base font-semibold text-white">partners@infinitysport.jo</p>
          <p className="mt-1 text-sm text-slate-400">v2.0.0</p>
        </div>
      </div>
    </aside>
  );
}

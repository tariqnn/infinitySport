"use client";

import Link from 'next/link';
import { ArrowUpRight, ExternalLink, Menu, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? 'http://localhost:3000';

function formatPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const segment = pathname.replace(/^\//, '').replace(/-/g, ' ');
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

function getPageHint(pathname: string): string {
  if (pathname === '/') return 'Overview of your website and quick actions';
  if (pathname.startsWith('/hero')) return 'Edit the main banner visitors see first';
  if (pathname.startsWith('/packages')) return 'Programs and prices shown on your website';
  if (pathname.startsWith('/coaches')) return 'Coach profiles shown on the website';
  if (pathname.startsWith('/landing-content')) return 'Map of all website sections you can edit';
  if (pathname.startsWith('/offers')) return 'Membership plans and seasonal promotions';
  if (pathname.startsWith('/events')) return 'Upcoming events and schedules';
  if (pathname.startsWith('/announcements')) return 'Banner alerts at top of the website';
  if (pathname.startsWith('/facilities')) return 'Facility highlights shown on the website';
  if (pathname.startsWith('/footer')) return 'Contact info and social links in the footer';
  if (pathname.startsWith('/bookings')) return 'Incoming booking requests';
  if (pathname.startsWith('/booking-availability')) return 'Block or open time slots for bookings';
  return 'Manage content and settings';
}

export function AdminTopbar({ onOpenSidebar }: { onOpenSidebar?: () => void }) {
  const pathname = usePathname();
  const pageTitle = formatPageTitle(pathname);
  const pageHint = getPageHint(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[80px] items-center justify-between gap-4 border-b-2 border-[var(--border-muted)] bg-white px-5 sm:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        {/* Mobile menu button */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex items-center justify-center rounded-xl border-2 border-[var(--border-muted)] bg-white p-2.5 text-[var(--text-primary)] lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-bold text-[var(--text-primary)]">
            {pageTitle}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{pageHint}</p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border-2 border-[var(--border-muted)] bg-white px-4 py-2 text-sm font-bold text-[var(--text-muted)] md:flex">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-green)]" />
          Live
        </div>
        <Link
          href={marketingUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary inline-flex items-center gap-2"
        >
          <span className="hidden sm:inline">View Website</span>
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}

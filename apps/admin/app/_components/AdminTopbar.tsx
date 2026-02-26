"use client";

import Link from 'next/link';
import { ArrowUpRight, ExternalLink, Search } from 'lucide-react';
import { usePathname } from 'next/navigation';

const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? 'http://localhost:3000';

function formatPageTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const segment = pathname.replace(/^\//, '').replace(/-/g, ' ');
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function AdminTopbar() {
  const pathname = usePathname();
  const pageTitle = formatPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-4 border-b border-[var(--border-muted)] bg-white px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold text-[var(--text-primary)]">
            {pageTitle}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            {pathname === '/' ? 'Overview and quick actions' : 'Manage content and settings'}
          </p>
        </div>
        <div className="relative hidden w-72 lg:block xl:w-96">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search programs, events, content..."
            className="h-10 w-full rounded-full border border-[var(--border-muted)] bg-[var(--bg-card-muted)] pl-9 pr-14 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)]/30"
            aria-label="Search admin content"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-[var(--border-muted)] bg-white px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
            Ctrl K
          </span>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <div className="hidden items-center gap-2 rounded-lg border border-[var(--border-muted)] bg-white px-3 py-1 text-xs font-semibold text-[var(--text-muted)] md:flex">
          <span className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
          Live
        </div>
        <Link
          href={marketingUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary inline-flex items-center gap-2"
        >
          <span className="hidden sm:inline">Preview site</span>
          <ExternalLink className="h-4 w-4" />
        </Link>
        <Link
          href="/portal-link"
          className="btn-primary inline-flex items-center gap-2"
        >
          <span className="hidden sm:inline">Portal</span>
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}

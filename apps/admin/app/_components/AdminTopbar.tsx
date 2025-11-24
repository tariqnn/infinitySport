"use client";

import Link from 'next/link';
import { ArrowUpRight, ExternalLink } from 'lucide-react';
import { usePathname } from 'next/navigation';

const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_ORIGIN ?? 'http://localhost:3000';

export function AdminTopbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[rgba(15,23,42,0.06)] bg-white/90 px-6 py-4 shadow-panel backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-[0.25em] text-brand-blue">{pathname === '/' ? 'Mission Control' : 'CMS'}</p>
        <h1 className="font-display text-2xl font-bold text-[var(--text-primary)]">
          {pathname === '/' ? 'Infinity Sport Admin' : pathname.replace('/', '').replace('-', ' ')}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={marketingUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.12)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-brand-offwhite"
        >
          Preview landing
          <ExternalLink className="h-4 w-4" />
        </Link>
        <Link
          href="/portal-link"
          className="glow-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
        >
          Open portal
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </header>
  );
}


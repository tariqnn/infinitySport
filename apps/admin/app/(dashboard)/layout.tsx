'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { AdminSidebar } from '../_components/AdminSidebar';
import { AdminTopbar } from '../_components/AdminTopbar';
import { PageTransition } from '../_components/PageTransition';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const mobileSidebar = useMemo(() => {
    if (!mobileOpen) return null;
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          className="absolute inset-0 bg-[#020617]/70"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
        <div className="relative h-full w-[280px] max-w-[88vw]">
          <AdminSidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    );
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen w-full bg-[var(--bg-shell)]">
      <AdminSidebar variant="desktop" />
      {mobileSidebar}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 px-5 py-7 sm:px-7">
          <PageTransition>
            <div className="mx-auto max-w-[1300px] space-y-6">{children}</div>
          </PageTransition>
        </main>
        <footer className="border-t-2 border-[var(--border-muted)] bg-white px-5 py-4 sm:px-7">
          <div className="mx-auto flex max-w-[1300px] items-center justify-between text-sm text-[var(--text-muted)]">
            <p>&copy; {new Date().getFullYear()} Infinity Sport Admin</p>
            <p>{process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev'}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

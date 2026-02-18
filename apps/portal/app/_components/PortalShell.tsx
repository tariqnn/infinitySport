"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { PortalSidebar } from "./PortalSidebar";
import { PortalTopbar } from "./PortalTopbar";

export function PortalShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  // Print/view pages should not show portal chrome (sidebar/topbar/padding)
  if (pathname?.startsWith("/receipts/")) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const mobileSidebar = useMemo(() => {
    if (!mobileOpen) return null;
    return (
      <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
        <button
          type="button"
          className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
        <div className="relative h-full w-[22rem] max-w-[88vw] border-r border-ui-border bg-white shadow-2xl">
          <div className="flex h-16 items-center justify-between border-b border-ui-border px-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand-glow">
                <span className="text-sm font-extrabold">IS</span>
              </div>
              <div>
                <p className="text-sm font-bold text-ui-textPrimary">Infinity Sport</p>
                <p className="text-xs text-ui-textMuted">Portal</p>
              </div>
            </div>
            <button
              type="button"
              className={clsx(
                "inline-flex items-center justify-center rounded-xl border border-ui-border bg-white p-2 text-ui-textPrimary shadow-sm",
                "transition hover:bg-ui-softBg focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/25 focus:ring-offset-2"
              )}
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
          <PortalSidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    );
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen bg-ui-softBg">
      <PortalSidebar variant="desktop" />
      {mobileSidebar}

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-7 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-[1280px]">{children}</div>
        </main>
      </div>
    </div>
  );
}


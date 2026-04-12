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
  const isReceiptPage = pathname?.startsWith("/receipts/");
  const isInvoicePage = pathname?.startsWith("/invoices/");

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
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
          className="absolute inset-0 bg-[#020617]/70"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />

        <div className="relative h-full w-[280px] max-w-[88vw]">
          <button
            type="button"
            className={clsx(
              "absolute right-2 top-3 z-10 inline-flex items-center justify-center rounded-xl border border-white/20 bg-[#0b1738] p-2 text-white",
              "focus:outline-none focus:ring-2 focus:ring-white/30"
            )}
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
          <PortalSidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
        </div>
      </div>
    );
  }, [mobileOpen]);

  if (isReceiptPage || isInvoicePage) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-ui-softBg">
      <PortalSidebar variant="desktop" />
      {mobileSidebar}

      <div className="flex min-w-0 flex-1 flex-col">
        <PortalTopbar onOpenSidebar={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="mx-auto w-full max-w-[1300px]">{children}</div>
        </main>
      </div>
    </div>
  );
}

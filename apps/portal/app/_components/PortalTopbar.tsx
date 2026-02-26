"use client";

import { ReactNode } from "react";
import clsx from "clsx";
import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

export function PortalTopbar({
  onOpenSidebar,
  rightSlot,
}: {
  onOpenSidebar?: () => void;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ui-border bg-white">
      <div className="flex h-[72px] items-center gap-3 px-4 md:px-6">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={clsx(
            "inline-flex items-center justify-center rounded-lg border border-ui-border bg-white p-2 text-ui-textPrimary shadow-sm md:hidden",
            "transition hover:bg-ui-softBg focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/25"
          )}
          aria-label="Open navigation"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <div className="relative hidden max-w-[420px] flex-1 md:block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-textMuted" />
          <input
            placeholder="Global search..."
            className="h-10 w-full rounded-full border border-ui-border bg-[#f8fafc] pl-10 pr-4 text-sm text-ui-textPrimary placeholder:text-ui-textMuted focus:border-brand-primaryBlue/30 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {rightSlot}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ui-border bg-white text-ui-textMuted transition hover:text-ui-textPrimary"
            aria-label="Notifications"
          >
            <BellIcon className="h-4 w-4" />
          </button>
          <p className="hidden text-xs font-semibold uppercase tracking-[0.08em] text-ui-textMuted sm:block">
            Workspace:
            <span className="ml-1 font-bold text-ui-textPrimary">InfinitySports</span>
          </p>
        </div>
      </div>
    </header>
  );
}

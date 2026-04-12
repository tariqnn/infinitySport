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
    <header className="sticky top-0 z-30 border-b-2 border-ui-border bg-white">
      <div className="flex h-[80px] items-center gap-4 px-5 md:px-7">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={clsx(
            "inline-flex items-center justify-center rounded-xl border-2 border-ui-border bg-white p-2.5 text-ui-textPrimary shadow-sm md:hidden",
            "transition hover:bg-ui-softBg focus:outline-none focus:ring-3 focus:ring-brand-primaryBlue/30"
          )}
          aria-label="Open navigation"
        >
          <Bars3Icon className="h-6 w-6" />
        </button>

        <div className="relative hidden max-w-[480px] flex-1 md:block">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ui-textMuted" />
          <input
            placeholder="Search..."
            className="h-12 w-full rounded-xl border-2 border-ui-border bg-[#f8fafc] pl-12 pr-5 text-base text-ui-textPrimary placeholder:text-ui-textMuted focus:border-brand-primaryBlue/30 focus:outline-none"
          />
        </div>

        <div className="ml-auto flex items-center gap-3">
          {rightSlot}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ui-border bg-white text-ui-textMuted transition hover:text-ui-textPrimary"
            aria-label="Notifications"
          >
            <BellIcon className="h-5 w-5" />
          </button>
          <p className="hidden text-sm font-bold text-ui-textMuted sm:block">
            Workspace:
            <span className="ml-1.5 font-extrabold text-ui-textPrimary">InfinitySports</span>
          </p>
        </div>
      </div>
    </header>
  );
}

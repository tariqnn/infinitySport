"use client";

import { ReactNode } from "react";
import clsx from "clsx";
import { Bars3Icon, LifebuoyIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export function PortalTopbar({
  onOpenSidebar,
  rightSlot,
}: {
  onOpenSidebar?: () => void;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-ui-border bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 md:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={clsx(
            "inline-flex items-center justify-center rounded-xl border border-ui-border bg-white p-2 text-ui-textPrimary shadow-sm",
            "transition hover:bg-ui-softBg focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/25 focus:ring-offset-2 md:hidden"
          )}
          aria-label="Open navigation"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-3 md:justify-between">
          <div className="hidden max-w-[620px] flex-1 md:flex">
            <label className="relative w-full">
              <span className="sr-only">Search</span>
              <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-textMuted" />
              <input
                placeholder="Search members, bookings, or tools…"
                className={clsx(
                  "h-10 w-full rounded-2xl border border-ui-border bg-white pl-11 pr-4 text-sm text-ui-textPrimary shadow-sm",
                  "placeholder:text-ui-textMuted/80 transition",
                  "focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/20 focus:border-brand-primaryBlue"
                )}
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#support"
              className={clsx(
                "hidden items-center gap-2 rounded-2xl border border-ui-border bg-white px-3 py-2 text-sm font-semibold text-ui-textPrimary shadow-sm",
                "transition hover:bg-ui-softBg focus:outline-none focus:ring-2 focus:ring-brand-primaryBlue/25 focus:ring-offset-2 sm:inline-flex"
              )}
            >
              <LifebuoyIcon className="h-4 w-4 text-ui-textMuted" />
              Support
            </a>

            {rightSlot}

            <div className="flex items-center gap-3 pl-2">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-ui-textPrimary">Facility Admin</p>
                <p className="text-xs text-ui-textMuted">Administrator</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-primaryBlue to-[#5b4bff] text-sm font-semibold text-white shadow-[0_12px_25px_rgba(29,72,255,0.25)]">
                FA
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}


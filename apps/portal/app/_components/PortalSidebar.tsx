"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChartBarIcon,
  UsersIcon,
  CalendarIcon,
  CreditCardIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  MapIcon,
  InboxStackIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon
} from "@heroicons/react/24/outline";
import clsx from "clsx";

const NAV = {
  core: [
    { label: "Dashboard", href: "/", icon: ChartBarIcon },
    { label: "Members", href: "/members", icon: UsersIcon },
    { label: "Coaches", href: "/coaches", icon: UserGroupIcon },
    { label: "Bookings", href: "/bookings", icon: CalendarIcon },
  ],
  resources: [
    { label: "Financials", href: "/financials", icon: CreditCardIcon },
    { label: "Settings", href: "/settings", icon: Cog6ToothIcon },
  ],
  operations: [
    { label: "Classes", href: "/classes", icon: MapIcon },
    { label: "Registrations", href: "/registrations", icon: ClipboardDocumentListIcon },
    { label: "Inventory", href: "/inventory", icon: InboxStackIcon },
    { label: "Staff Tools", href: "/staff", icon: ClipboardDocumentCheckIcon },
  ],
} as const;

function NavSection({
  title,
  items,
  pathname,
  onNavigate,
}: {
  title?: string;
  items: Array<{ label: string; href: string; icon: any }>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1">
      {title ? (
        <div className="px-4 pt-5 text-[11px] font-bold uppercase tracking-[0.22em] text-ui-textMuted">
          {title}
        </div>
      ) : null}
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={clsx(
              "group flex items-center gap-3 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
              active
                ? "bg-gradient-to-r from-[#5b4bff] to-brand-primaryBlue text-white shadow-[0_10px_24px_rgba(29,72,255,0.22)]"
                : "text-ui-textMuted hover:bg-ui-softBg hover:text-ui-textPrimary"
            )}
          >
            <Icon
              className={clsx(
                "h-5 w-5",
                active ? "text-white" : "text-ui-textMuted group-hover:text-brand-primaryBlue"
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function PortalSidebar({
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
        "w-[264px] flex-col border-r border-ui-border bg-white",
        isDesktop ? "hidden md:flex" : "flex"
      )}
    >
      {/* Desktop brand header (mobile header lives in `PortalShell`) */}
      {isDesktop ? (
        <div className="flex items-center gap-3 border-b border-ui-border px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-primaryBlue to-[#5b4bff] text-white shadow-[0_12px_25px_rgba(29,72,255,0.25)]">
            <span className="text-lg font-extrabold">∞</span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ui-textPrimary">Infinity Sport</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ui-textMuted">
              Management
            </p>
          </div>
        </div>
      ) : null}

      {/* Navigation */}
      <nav className="flex-1 space-y-4 px-3 py-4">
        <NavSection items={NAV.core as any} pathname={pathname} onNavigate={onNavigate} />
        <NavSection title="Resources" items={NAV.resources as any} pathname={pathname} onNavigate={onNavigate} />
        <NavSection title="Operations" items={NAV.operations as any} pathname={pathname} onNavigate={onNavigate} />
      </nav>

      {/* Footer CTA */}
      <div className="border-t border-ui-border p-4">
        <div className="rounded-2xl border border-ui-border bg-ui-softBg p-4">
          <p className="text-sm font-semibold text-ui-textPrimary">Need help?</p>
          <p className="mt-1 text-xs text-ui-textMuted">Check documentation or contact support.</p>
          <button className="mt-3 w-full rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ui-textPrimary shadow-sm transition hover:bg-ui-softBg">
            Get support
          </button>
        </div>
      </div>
    </aside>
  );
}

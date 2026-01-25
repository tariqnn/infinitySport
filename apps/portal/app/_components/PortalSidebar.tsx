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

const sidebarItems = [
  { label: "Dashboard", href: "/", icon: ChartBarIcon },
  { label: "Members", href: "/members", icon: UsersIcon },
  { label: "Coaches", href: "/coaches", icon: UserGroupIcon },
  { label: "Bookings", href: "/bookings", icon: CalendarIcon },
  { label: "Classes", href: "/classes", icon: MapIcon },
  { label: "Registrations", href: "/registrations", icon: ClipboardDocumentListIcon },
  { label: "Financials", href: "/financials", icon: CreditCardIcon },
  { label: "Inventory", href: "/inventory", icon: InboxStackIcon },
  { label: "Staff Tools", href: "/staff", icon: ClipboardDocumentCheckIcon },
  { label: "Settings", href: "/settings", icon: Cog6ToothIcon }
];

export function PortalSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-col border-r border-ui-border bg-white md:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-ui-border px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand-glow">
          <span className="text-lg font-bold">IS</span>
        </div>
        <div>
          <p className="text-sm font-bold text-ui-textPrimary">Infinity Sport</p>
          <p className="text-xs text-ui-textMuted">Portal</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-brand-gradient/10 text-brand-primaryBlue"
                  : "text-ui-textMuted hover:bg-ui-softBg hover:text-ui-textPrimary"
              )}
            >
              {/* Active indicator bar */}
              {active && (
                <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-gradient" />
              )}
              <Icon
                className={clsx(
                  "h-5 w-5 transition-colors",
                  active
                    ? "text-brand-primaryBlue"
                    : "text-ui-textMuted group-hover:text-brand-primaryBlue"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer CTA */}
      <div className="border-t border-ui-border p-4">
        <div className="rounded-lg bg-brand-gradient p-4 text-white shadow-brand-glow">
          <p className="text-sm font-semibold">Need Help?</p>
          <p className="mt-1 text-xs text-white/90">Contact support for assistance</p>
          <button className="mt-3 w-full rounded-lg bg-white/20 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/30">
            Get Support
          </button>
        </div>
      </div>
    </aside>
  );
}

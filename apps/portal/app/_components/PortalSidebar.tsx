"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon,
  CreditCardIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  MapIcon,
  InboxStackIcon,
  GiftTopIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", href: "/", icon: ChartBarIcon },
      { label: "Coaches", href: "/coaches", icon: UserGroupIcon },
      { label: "Bookings", href: "/bookings", icon: CalendarIcon },
      { label: "Registrations", href: "/registrations", icon: ClipboardDocumentListIcon },
      { label: "Guest Accounts", href: "/guests", icon: UserGroupIcon },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Classes", href: "/classes", icon: MapIcon },
      { label: "Shop", href: "/shop", icon: GiftTopIcon },
      { label: "Inventory", href: "/inventory", icon: InboxStackIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Financials", href: "/financials", icon: CreditCardIcon },
      { label: "Salaries", href: "/salaries", icon: BanknotesIcon },
    ],
  },
] as const;

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
        "w-[250px] shrink-0 flex-col border-r border-[#13274f] bg-[#050b1f] text-slate-100",
        isDesktop ? "hidden md:flex" : "flex"
      )}
    >
      <div className="flex h-[72px] items-center gap-3 border-b border-[#13274f] px-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e63ff] text-sm font-extrabold text-white">
          oo
        </div>
        <p className="text-xl font-bold text-white">InfinitySport</p>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onNavigate?.()}
                  className={clsx(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-[#1e63ff] text-white shadow-[0_8px_18px_rgba(30,99,255,0.35)]"
                      : "text-slate-200 hover:bg-white/8 hover:text-white"
                  )}
                >
                  <Icon className={clsx("h-4 w-4", active ? "text-white" : "text-slate-300 group-hover:text-white")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#13274f] p-3">
        <div className="flex items-center gap-3 rounded-xl bg-[#081432] px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a426f] text-xs font-semibold text-white">
            AP
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">Alexander Pierce</p>
            <p className="text-xs text-slate-300">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

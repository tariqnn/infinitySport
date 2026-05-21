"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  TrophyIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import { prefetchPortalRouteData } from "../../lib/portalApi";

const NAV_SECTIONS = [
  {
    label: "Core",
    items: [
      { label: "Dashboard", href: "/", icon: ChartBarIcon },
      { label: "Coaches", href: "/coaches", icon: UserGroupIcon },
      { label: "Bookings", href: "/bookings", icon: CalendarIcon },
      { label: "Registrations", href: "/registrations", icon: ClipboardDocumentListIcon },
      { label: "Summer Camp", href: "/summer-camp-registrations", icon: SunIcon },
      { label: "Competitions", href: "/competitions", icon: TrophyIcon },
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
  const router = useRouter();
  const isDesktop = variant === "desktop";
  const navHrefs = useMemo(
    () => NAV_SECTIONS.flatMap((section) => section.items.map((item) => item.href)),
    [],
  );

  const prefetchItem = useCallback(
    (href: string) => {
      router.prefetch(href);
      void prefetchPortalRouteData(href);
    },
    [router],
  );

  useEffect(() => {
    const timeouts: number[] = [];
    const bootstrap = window.setTimeout(() => {
      navHrefs
        .filter((href) => href !== pathname)
        .forEach((href, index) => {
          const timer = window.setTimeout(() => prefetchItem(href), 120 * index);
          timeouts.push(timer);
        });
    }, 150);

    return () => {
      window.clearTimeout(bootstrap);
      timeouts.forEach((timer) => window.clearTimeout(timer));
    };
  }, [navHrefs, pathname, prefetchItem]);

  return (
    <aside
      className={clsx(
        "w-[280px] shrink-0 flex-col border-r border-[#13274f] bg-[#050b1f] text-slate-100",
        isDesktop ? "hidden md:flex" : "flex"
      )}
    >
      <div className="flex h-[80px] items-center gap-3 border-b border-[#13274f] px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e63ff] text-sm font-extrabold text-white">
          oo
        </div>
        <p className="text-xl font-bold text-white">InfinitySport</p>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-6">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="space-y-1.5">
            <p className="px-3 pb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
              {section.label}
            </p>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={() => onNavigate?.()}
                  onMouseEnter={() => prefetchItem(item.href)}
                  onFocus={() => prefetchItem(item.href)}
                  className={clsx(
                    "group flex items-center gap-3.5 rounded-xl px-4 py-3 text-base font-semibold transition",
                    active
                      ? "bg-[#1e63ff] text-white shadow-[0_8px_18px_rgba(30,99,255,0.35)]"
                      : "text-slate-200 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className={clsx("h-6 w-6 shrink-0", active ? "text-white" : "text-slate-300 group-hover:text-white")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-[#13274f] p-4">
        <div className="flex items-center gap-3 rounded-xl bg-[#081432] px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2a426f] text-sm font-bold text-white">
            AP
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">Alexander Pierce</p>
            <p className="text-sm text-slate-300">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

"use client";
import Link from "next/link";
import Image from "next/image";
import { LanguageToggle } from "./LanguageToggle";
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useLanguage } from "./LanguageProvider";

const navLinks = [
  { key: "nav_home", href: "/#home" },
  { key: "nav_facilities", href: "/facilities" },
  { key: "nav_coaches", href: "/coaches" },
  { key: "nav_programs", href: "/sports" },
  { key: "nav_events", href: "/events" },
  { key: "nav_booking", href: "/booking" }
] as const;

export function NavbarWithLanguage() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { tr } = useLanguage();
  const isActive = (href: string) => {
    if (href === "/#home" || href === "/") return pathname === "/";
    return pathname.startsWith(href.replace("/#", "/"));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <div className="flex items-center gap-6">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#003DA5] text-white shadow-button transition-all duration-300 hover:scale-105 hover:shadow-button-hover lg:hidden"
            aria-label="Open menu"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <Bars3Icon className="h-6 w-6 transition-transform duration-300" />
          </button>
          <Link href="/" className="flex items-center transition-all duration-300 hover:scale-105" aria-label="Infinity Sport Home">
            <Image 
              src="/infinity-logo.png?v=2" 
              alt="Infinity Sport Logo" 
              width={160} 
              height={160} 
              className="h-28 w-28 sm:h-32 sm:w-32 md:h-36 md:w-36 lg:h-40 lg:w-40 object-contain flex-shrink-0"
            />
          </Link>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-bold lg:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.key}
                href={link.href}
                className={`group relative px-1 py-2 transition-all duration-300 ${
                  active 
                    ? "text-brand-black" 
                    : "text-gray-700 hover:text-brand-blue-primary"
                }`}
              >
                <span className="relative z-10">{tr(link.key)}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-[#003DA5] rounded-full" />
                )}
                {!active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-brand-blue-primary transition-all duration-300 ease-out group-hover:scale-x-100 rounded-full" />
                )}
              </Link>
            );
          })}
          <button 
            aria-label="Search site" 
            className="text-gray-700 transition-all duration-300 hover:text-brand-blue-primary hover:scale-110"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
          </button>
        </nav>
        <div className="hidden items-center gap-4 lg:flex">
          <LanguageToggle />
          <Link
            href="/contact"
            className="rounded-full bg-[#003DA5] px-8 py-2.5 text-sm font-bold text-white shadow-button transition-all duration-300 hover:scale-105 hover:shadow-button-hover hover:bg-[#003DA5]/90"
          >
            {tr("nav_join")}
          </Link>
        </div>
        <button
          className="inline-flex items-center justify-center rounded-xl border border-gray-200 p-2 text-gray-600 transition hover:border-brand-blue-primary hover:text-brand-blue-primary lg:hidden"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Toggle navigation"
        >
          {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white px-4 pb-6 pt-4">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  className={`rounded-xl px-4 py-3 font-medium transition ${
                    active
                      ? "bg-[#003DA5]/10 text-brand-black"
                      : "text-gray-600 hover:bg-brand-blue-primary/10 hover:text-brand-blue-primary"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {tr(link.key)}
                </Link>
              );
            })}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <LanguageToggle />
            </div>
            <Link
              href="/contact"
              className="mt-4 rounded-full bg-[#003DA5] px-6 py-3 text-center text-sm font-semibold text-white shadow-button transition hover:shadow-button-hover hover:bg-[#003DA5]/90"
              onClick={() => setIsOpen(false)}
            >
              {tr("nav_join")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

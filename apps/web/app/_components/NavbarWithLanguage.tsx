"use client";
import Link from "next/link";
import Image from "next/image";
import { LanguageToggle } from "./LanguageToggle";
import { Bars3Icon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { label: "Home", href: "/#home" },
  { label: "Facilities", href: "/facilities" },
  { label: "Trainer", href: "/#trainer" },
  { label: "Events", href: "/events" },
  { label: "Offers", href: "/offers" },
  { label: "Booking", href: "/booking" }
];

export function NavbarWithLanguage() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = (href: string) => {
    if (href === "/#home" || href === "/") return pathname === "/";
    return pathname.startsWith(href.replace("/#", "/"));
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/50 bg-white/80 backdrop-blur-xl shadow-[0_4px_24px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-300">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
        <div className="flex items-center gap-6">
          <button
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-button text-white shadow-button transition-all duration-300 hover:scale-105 hover:shadow-button-hover lg:hidden"
            aria-label="Open menu"
            onClick={() => setIsOpen((prev) => !prev)}
          >
            <Bars3Icon className="h-6 w-6 transition-transform duration-300" />
          </button>
          <Link href="/" className="flex items-center gap-3 font-display text-base font-black tracking-[0.2em] text-brand-black transition-all duration-300 hover:scale-105 sm:text-lg sm:tracking-[0.3em] md:text-xl">
            <Image 
              src="/infinity-logo.png" 
              alt="Infinity Sport Logo" 
              width={40} 
              height={40} 
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain"
            />
            INFINITY SPORT
          </Link>
        </div>
        <nav className="hidden items-center gap-8 text-sm font-bold lg:flex">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`group relative px-1 py-2 transition-all duration-300 ${
                  active 
                    ? "text-brand-black" 
                    : "text-gray-700 hover:text-brand-blue-primary"
                }`}
              >
                <span className="relative z-10">{link.label}</span>
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-gradient-button rounded-full" />
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
            className="rounded-full bg-gradient-button px-8 py-2.5 text-sm font-bold text-white shadow-button transition-all duration-300 hover:scale-105 hover:shadow-button-hover"
          >
            Join Infinity Sport
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
                  key={link.href}
                  href={link.href}
                  className={`rounded-xl px-4 py-3 font-medium transition ${
                    active
                      ? "bg-brand-green-primary/10 text-brand-black"
                      : "text-gray-600 hover:bg-brand-blue-primary/10 hover:text-brand-blue-primary"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="mt-4 border-t border-gray-200 pt-4">
              <LanguageToggle />
            </div>
            <Link
              href="/contact"
              className="mt-4 rounded-full bg-gradient-button px-6 py-3 text-center text-sm font-semibold text-white shadow-button transition hover:shadow-button-hover"
              onClick={() => setIsOpen(false)}
            >
              Join Infinity Sport
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

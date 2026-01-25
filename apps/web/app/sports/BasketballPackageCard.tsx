'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { BasketballPackage } from '@infinity/mock-api';

export function BasketballPackageCard({ pkg }: { pkg: BasketballPackage }) {
  const [open, setOpen] = useState(false);
  const hasPrice = pkg.price != null && pkg.price !== '';
  const hasTimeSlots = Array.isArray(pkg.timeSlots) && pkg.timeSlots.length > 0;
  const price = pkg.price ?? '';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((o) => !o)}
      className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover cursor-pointer"
    >
      <div className="mb-4">
        <span className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold">Basketball</span>
        <h3 className="mt-2 text-xl font-bold text-brand-black">{pkg.title}</h3>
      </div>
      {pkg.note ? <p className="mb-4 text-sm italic text-gray-500">{pkg.note}</p> : null}
      <ul className="space-y-2 text-sm text-gray-600">
        {pkg.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {!open && (hasPrice || hasTimeSlots) ? (
        <p className="mt-4 text-sm font-semibold text-brand-blue-primary">Click to see price & times →</p>
      ) : null}

      {open && (hasPrice || hasTimeSlots) ? (
        <div className="mt-4 rounded-xl border border-brand-lightBlue/30 bg-brand-lightBlue/5 p-4">
          {hasPrice ? (
            <div className="mb-2">
              <span className="text-2xl font-bold text-brand-black">
                {price.includes('Contact') || price.includes('Enquire') ? price : `${price} JOD`}
              </span>
              {pkg.priceNote ? <span className="ml-2 text-sm text-gray-600">{pkg.priceNote}</span> : null}
            </div>
          ) : null}
          {hasTimeSlots ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Time slots</p>
              <ul className="text-sm text-gray-700 space-y-1">
                {pkg.timeSlots!.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link
            href="/booking"
            onClick={(e) => e.stopPropagation()}
            className="mt-4 flex items-center justify-center rounded-lg bg-brand-green-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green-dark"
          >
            Book
          </Link>
        </div>
      ) : null}
    </div>
  );
}

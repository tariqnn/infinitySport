'use client';

import { useState } from 'react';
import Link from 'next/link';

export function VolleyballPackageCard() {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((o) => !o)}
      className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover cursor-pointer max-w-2xl mx-auto"
    >
      <h3 className="text-xl font-bold text-brand-black mb-2">Volleyball</h3>
      <p className="text-sm text-gray-500 mb-3">Starting age: 7 years and up</p>

      {!open ? (
        <p className="mt-2 text-sm font-semibold text-brand-blue-primary">Click to see details & register →</p>
      ) : (
        <>
          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
              10% discount for siblings
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
              Special rate for groups
            </li>
          </ul>
          <div className="mb-2">
            <span className="text-2xl font-bold text-brand-black">100 JOD</span>
            <span className="text-sm text-gray-500"> — for 10 sessions</span>
          </div>
          <p className="text-xs text-gray-500 font-medium mb-1">Training Schedule</p>
          <p className="text-sm text-gray-700 mb-2">Saturday 3:00–5:00 PM</p>
          <p className="text-sm text-gray-700 mb-4">Tuesday & Sunday 7:00–9:00 PM</p>
          <Link
            href="/packages/register?package=Volleyball"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center rounded-lg bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#003DA5]/90"
          >
            Register now
          </Link>
        </>
      )}
    </div>
  );
}

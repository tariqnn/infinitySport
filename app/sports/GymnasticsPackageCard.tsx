'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface GymnasticsPackageProps {
  title: string;
  daysHours: string;
  bullets: string[];
  price: string;
  sessionsNote: string;
  schedule: string;
}

export function GymnasticsPackageCard({
  title,
  daysHours,
  bullets,
  price,
  sessionsNote,
  schedule,
}: GymnasticsPackageProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => setOpen((o) => !o)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((o) => !o)}
      className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover cursor-pointer"
    >
      <h3 className="text-xl font-bold text-brand-black mb-2">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{daysHours}</p>

      {!open ? (
        <p className="mt-2 text-sm font-semibold text-brand-blue-primary">Click to see details & book →</p>
      ) : (
        <>
          <ul className="space-y-2 text-sm text-gray-600 mb-4">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
                {b}
              </li>
            ))}
          </ul>
          <div className="mb-2">
            <span className="text-2xl font-bold text-brand-black">{price}</span>
            <span className="text-sm text-gray-500"> — {sessionsNote}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium">Training Schedule</p>
          <p className="text-sm text-gray-600 mb-4">{schedule}</p>
          <Link
            href={`/packages/register?package=${encodeURIComponent(`Gymnastics ${title}`)}`}
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

import Link from 'next/link';
import { CompetitionRegistrationForm } from './CompetitionRegistrationForm';

export const metadata = {
  title: 'Weekend Competitions Registration | Infinity Sports',
};

export default function WeekendCompetitionsRegisterPage() {
  return (
    <main className="bg-white py-20">
      <section className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-8">
        <div>
          <Link href="/events" className="text-sm font-bold text-brand-blue-primary hover:underline">
            Back to events
          </Link>
          <p className="mt-8 text-sm font-bold uppercase tracking-[0.3em] text-brand-green-dark">Weekend competitions</p>
          <h1 className="mt-3 text-4xl font-black text-brand-black sm:text-5xl">
            Register for this weekend&apos;s basketball events
          </h1>
          <p className="mt-4 text-base leading-7 text-gray-600">
            Choose the competition first, then the form changes for that format.
            Team events require 3 players minimum. Individual contests only need player details.
          </p>
          <div className="mt-6 overflow-hidden rounded-2xl border border-brand-lightBlue/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/1.jpeg" alt="Weekend basketball competitions" className="h-72 w-full object-cover" />
          </div>
        </div>

        <CompetitionRegistrationForm />
      </section>
    </main>
  );
}

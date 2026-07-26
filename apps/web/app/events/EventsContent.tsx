'use client';

import Link from 'next/link';
import { type EventResponse } from '../../lib/apiClient';
import { useLanguage } from '../_components/LanguageProvider';
import { tr } from '../../lib/translations';

function registrationLinkFor(event: EventResponse): string | undefined {
  const title = event.title.trim().toLowerCase();
  if (title.includes('basketball') && title.includes('summer camp')) {
    return '/events/basketball-summer-camp/register';
  }
  if (title.includes('volleyball') && title.includes('summer camp')) {
    return '/events/volleyball-summer-camp/register';
  }
  if ((title.includes('warriors') || title.includes('nba')) && title.includes('coach') && title.includes('camp')) {
    return '/events/warriors-assistant-coach-camp/register';
  }
  if (title.includes('weekend') && title.includes('basketball') && title.includes('competition')) {
    return '/events/weekend-competitions/register';
  }
  return event.registrationUrl || event.link;
}

function EventCard({
  event,
  past = false,
}: {
  event: EventResponse;
  past?: boolean;
}) {
  const detailUrl = `/events/${encodeURIComponent(event.slug || event.id)}`;
  const registrationUrl = registrationLinkFor(event);
  const imageUrl = event.imageUrl || '/events.jpeg';

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-brand-lightBlue/20 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-1 hover:border-brand-green-primary/60 hover:shadow-[0_16px_42px_rgba(20,26,255,0.14)]">
      <Link href={detailUrl} className="relative block h-52 overflow-hidden focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-blue-primary">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={event.title}
          className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${past ? 'opacity-80' : ''}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#003DA5] shadow">
          {past ? 'Event recap' : registrationUrl ? 'Registration open' : 'Upcoming event'}
        </span>
        {event.contentType === 'VIDEO' ? (
          <span className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
            Video
          </span>
        ) : null}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-dark">
          {new Date(event.date).toLocaleDateString(undefined, {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
        <h3 className="mt-2 text-2xl font-black leading-tight text-brand-black">
          <Link href={detailUrl} className="transition hover:text-brand-blue-primary">
            {event.title}
          </Link>
        </h3>
        <p className="mt-2 text-sm font-semibold text-brand-blue-primary">{event.location || 'Infinity Sports'}</p>
        {event.description ? (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-gray-600">{event.description}</p>
        ) : null}
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Link
            href={detailUrl}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#003DA5] px-4 text-sm font-bold text-white transition hover:bg-[#002d7a] focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30"
          >
            {past ? 'View recap' : 'View event'}
          </Link>
          {!past && registrationUrl ? (
            <Link
              href={registrationUrl}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border-2 border-[#003DA5] px-4 text-sm font-bold text-[#003DA5] transition hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20"
            >
              Register
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function EventsContent({ eventsData }: { eventsData: EventResponse[] }) {
  const { language } = useLanguage();
  const now = Date.now();
  const upcoming = eventsData.filter((event) => new Date(event.date).getTime() >= now);
  const past = eventsData.filter((event) => new Date(event.date).getTime() < now);
  const featured = upcoming[0] || eventsData[0];

  return (
    <div className="bg-white pb-24">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        {featured ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={featured.imageUrl || '/events.jpeg'}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/20" />
          </>
        ) : null}
        <div className="relative mx-auto flex min-h-[520px] max-w-7xl items-end px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-[#60D394]">
              {tr(language, 'events_kicker')}
            </p>
            <h1 className="mt-4 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {featured?.title || tr(language, 'events_title')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
              {featured?.description || tr(language, 'events_subtitle')}
            </p>
            {featured ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/events/${encodeURIComponent(featured.slug || featured.id)}`}
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#60D394] px-6 text-sm font-black text-slate-950 transition hover:bg-[#79e2a9]"
                >
                  Explore event
                </Link>
                {registrationLinkFor(featured) ? (
                  <Link
                    href={registrationLinkFor(featured)!}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/40 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Register now
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-6 lg:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand-green-dark">
          {tr(language, 'events_upcoming_kicker')}
        </p>
        <h2 className="mt-2 text-3xl font-black text-brand-black sm:text-4xl">
          {tr(language, 'events_upcoming_title')}
        </h2>
        <p className="mt-3 max-w-2xl text-gray-600">{tr(language, 'events_upcoming_subtitle')}</p>

        {upcoming.length > 0 ? (
          <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-9 rounded-2xl border border-brand-lightBlue/20 bg-slate-50 p-10 text-center">
            <h3 className="text-2xl font-bold text-brand-black">New schedule coming soon</h3>
            <p className="mt-3 text-gray-600">We are preparing the next Infinity Sports event calendar.</p>
            <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-[#003DA5] px-6 text-sm font-bold text-white">
              Join the waitlist
            </Link>
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-brand-green-dark">Archive</p>
          <h2 className="mt-2 text-3xl font-black text-brand-black sm:text-4xl">Past events & showcases</h2>
          <p className="mt-3 text-gray-600">Open an event to relive its gallery or featured video.</p>
          <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <EventCard key={event.id} event={event} past />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { type EventResponse } from '../../lib/apiClient';
import { useLanguage } from '../_components/LanguageProvider';
import { tr } from '../../lib/translations';

function isBasketballSummerCamp(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized === 'basketball summer camp' || (normalized.includes('basketball') && normalized.includes('summer camp'));
}

function isVolleyballSummerCamp(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized === 'volleyball summer camp' || (normalized.includes('volleyball') && normalized.includes('summer camp'));
}

function isWeekendBasketballCompetition(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized.includes('weekend') && normalized.includes('basketball') && normalized.includes('competition');
}

export function EventsContent({ eventsData }: { eventsData: EventResponse[] }) {
  const { language } = useLanguage();

  const events = eventsData.map((event) => {
    const isBasketballCamp = isBasketballSummerCamp(event.title);
    const isVolleyballCamp = isVolleyballSummerCamp(event.title);
    const isSummerCamp = isBasketballCamp || isVolleyballCamp;
    const isCompetition = event.id === 'weekend-basketball-competitions' || isWeekendBasketballCompetition(event.title);
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location || 'Infinity Sports',
      description: event.description || '',
      imageUrl: event.imageUrl || (isBasketballCamp ? '/hero-basketball.jpg' : '/events.jpeg'),
      link: isBasketballCamp
        ? '/events/basketball-summer-camp/register'
        : isVolleyballCamp
          ? '/events/volleyball-summer-camp/register'
          : isCompetition
            ? '/events/weekend-competitions/register'
            : event.link || '/contact',
      highlight: event.highlight || false,
      isSummerCamp,
      isCompetition,
    };
  });

  const upcoming = events.filter((event) => new Date(event.date) >= new Date());
  const past = events.filter((event) => new Date(event.date) < new Date());
  const topEvent = upcoming[0] || events[0];
  const heroEventImage = topEvent?.imageUrl || '/events.jpeg';

  return (
    <div className="bg-white py-24">
      {/* Hero Section with Event Image */}
      <div className="relative mx-auto max-w-7xl px-6 lg:px-8 mb-16">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">{tr(language, 'events_kicker')}</p>
          <h1 className="mt-3 text-4xl font-black text-brand-black sm:text-5xl lg:text-6xl">
            {topEvent?.title || tr(language, 'events_title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-gray-600 sm:text-lg">
            {topEvent?.description || tr(language, 'events_subtitle')}
          </p>
          {topEvent?.location ? (
            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold text-brand-blue-primary">{topEvent.location}</p>
          ) : null}
        </div>
        <div className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] w-full rounded-2xl overflow-hidden border-2 border-brand-lightBlue/20 shadow-[0_8px_32px_rgba(0,0,0,0.08)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroEventImage} alt="Upcoming Events" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 ? (
        <div className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">{tr(language, 'events_upcoming_kicker')}</p>
            <h2 className="mt-2 text-3xl font-bold text-brand-black">{tr(language, 'events_upcoming_title')}</h2>
            <p className="mt-2 text-gray-600">{tr(language, 'events_upcoming_subtitle')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <div
                key={event.id}
                className="group flex flex-col rounded-2xl border-2 border-brand-lightBlue/20 bg-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)]"
              >
                <div className="relative h-48 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="rounded-full bg-[#003DA5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-lg">
                      Registration Open
                    </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-brand-black group-hover:text-brand-green-primary transition-colors">{event.title}</h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-brand-green-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(event.date).toLocaleDateString(undefined, {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                    <p className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-brand-green-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {event.location}
                    </p>
                  </div>
                  {event.description && (
                    <p className="mt-4 text-sm text-gray-600 leading-relaxed line-clamp-3">{event.description}</p>
                  )}
                  <Link
                    href={event.link}
                    className="mt-6 rounded-full bg-[#003DA5] px-6 py-3 text-center text-sm font-bold text-white shadow-button transition-all duration-300 hover:scale-105 hover:shadow-button-hover hover:bg-[#003DA5]/90"
                  >
                    {event.isSummerCamp || event.isCompetition ? 'Register now' : 'Secure slot'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-2xl px-6 text-center">
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-12 shadow-card">
            <h3 className="text-2xl font-bold text-brand-black">New schedule coming soon</h3>
            <p className="mt-4 text-gray-600">
              We are finalizing our upcoming events calendar. Subscribe to updates for early access.
            </p>
            <Link
              href="/contact"
              className="mt-6 inline-block rounded-full bg-[#003DA5] px-8 py-3 text-sm font-bold text-white shadow-button transition hover:shadow-button-hover hover:bg-[#003DA5]/90"
            >
              Join waitlist
            </Link>
          </div>
        </div>
      )}

      {/* Past Events */}
      {past.length > 0 && (
        <div className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Archive</p>
            <h2 className="mt-2 text-3xl font-bold text-brand-black">Past events & showcases</h2>
            <p className="mt-2 text-gray-600">Relive our recent combines, tournaments, and community activations.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <div
                key={event.id}
                className="group flex flex-col rounded-2xl border-2 border-brand-lightBlue/20 bg-white overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.08)] transition-all duration-500 hover:-translate-y-2 hover:border-brand-green-primary/60 hover:shadow-[0_16px_48px_rgba(20,26,255,0.2)]"
              >
                <div className="relative h-40 w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    className="h-full w-full object-cover opacity-75 transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-black text-brand-black group-hover:text-brand-green-primary transition-colors">{event.title}</h3>
                  <p className="mt-2 text-sm text-gray-500 flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-green-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </p>
                  {event.description && (
                    <p className="mt-4 text-sm text-gray-600 leading-relaxed line-clamp-2">{event.description}</p>
                  )}
                  <Link
                    href="/contact"
                    className="mt-6 text-sm font-semibold text-brand-blue-primary transition-colors hover:text-brand-green-primary inline-flex items-center gap-2"
                  >
                    Request recap
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

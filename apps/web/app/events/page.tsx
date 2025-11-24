import Link from 'next/link';
import { fetchEvents } from '../../lib/apiClient';

export const metadata = {
  title: 'Events & Programs'
};

export default async function EventsPage() {
  const eventsData = await fetchEvents();
  
  // Transform API data to match UI structure
  const events = eventsData.map((event: any) => ({
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location || 'Infinity Campus',
    description: event.description || '',
    link: event.link || '/events',
    highlight: event.highlight || false,
  }));
  
  const upcoming = events.filter((event) => new Date(event.date) >= new Date());
  const past = events.filter((event) => new Date(event.date) < new Date());

  return (
    <div className="bg-white py-24">
      {/* Hero Section */}
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Events</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">Signature Infinity Sports programs</h1>
        <p className="mt-4 text-lg text-gray-600">
          Seasonal combines, international showcases, and corporate leagues engineered for peak performance.
        </p>
      </div>

      {/* Upcoming Events */}
      {upcoming.length > 0 ? (
        <div className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Upcoming</p>
            <h2 className="mt-2 text-3xl font-bold text-brand-black">Reserve your slot</h2>
            <p className="mt-2 text-gray-600">Secure team entries, book corporate hospitality, or register individual athletes.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <div
                key={event.id}
                className="flex flex-col rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
              >
                <div className="mb-4">
                  <span className="rounded-full bg-brand-lightBlue/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-blue-primary">
                    Registration Open
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-brand-black">{event.title}</h3>
                <div className="mt-3 space-y-2 text-sm text-gray-600">
                  <p className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-brand-green-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="h-4 w-4 text-brand-green-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </p>
                </div>
                {event.description && (
                  <p className="mt-4 text-sm text-gray-600">{event.description}</p>
                )}
                <Link
                  href="/contact"
                  className="mt-6 rounded-full bg-gradient-button px-6 py-3 text-center text-sm font-bold text-white shadow-button transition hover:shadow-button-hover"
                >
                  Secure slot
                </Link>
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
              className="mt-6 inline-block rounded-full bg-gradient-button px-8 py-3 text-sm font-bold text-white shadow-button transition hover:shadow-button-hover"
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
                className="flex flex-col rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
              >
                <h3 className="text-xl font-bold text-brand-black">{event.title}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </p>
                {event.description && (
                  <p className="mt-4 text-sm text-gray-600">{event.description}</p>
                )}
                <Link
                  href="/contact"
                  className="mt-6 text-sm font-semibold text-brand-blue-primary transition hover:text-brand-green-primary"
                >
                  Request recap →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


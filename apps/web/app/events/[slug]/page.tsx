import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchEventBySlug } from '../../../lib/apiClient';
import { EventGallery } from './EventGallery';

export const dynamic = 'force-dynamic';

type EventPageProps = {
  params: Promise<{ slug: string }>;
};

function formatEventDate(startValue: string, endValue?: string) {
  const start = new Date(startValue);
  const startText = start.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (!endValue) return `${startText} · ${startTime}`;

  const end = new Date(endValue);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${startText} · ${startTime}–${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;
  }
  return `${startText} · ${startTime} — ${end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export async function generateMetadata({ params }: EventPageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventBySlug(decodeURIComponent(slug));
  if (!event) return { title: 'Event not found' };
  return {
    title: event.title,
    description: event.description || `Event details for ${event.title} at Infinity Sports.`,
    openGraph: event.imageUrl ? { images: [event.imageUrl] } : undefined,
  };
}

export default async function EventPage({ params }: EventPageProps) {
  const { slug } = await params;
  const event = await fetchEventBySlug(decodeURIComponent(slug));
  if (!event) notFound();

  const imageUrl = event.imageUrl || '/events.jpeg';
  const galleryImages = (event.galleryUrls || []).filter(Boolean);
  const isVideo = event.contentType === 'VIDEO' && Boolean(event.videoUrl);
  const registrationUrl = event.registrationUrl || event.link;
  const isPast = new Date(event.endAt || event.date).getTime() < Date.now();

  return (
    <div className="bg-white">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-10 lg:px-8 lg:pb-20">
          <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-sm text-slate-400">
            <Link href="/events" className="transition hover:text-white">Events</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate text-slate-200">{event.title}</span>
          </nav>

          <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              {isVideo ? (
                <video
                  src={event.videoUrl}
                  poster={imageUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="aspect-video w-full object-cover"
                >
                  Your browser does not support this event video.
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt={event.title} className="aspect-video w-full object-cover" />
              )}
            </div>
            <div>
              <span className="inline-flex rounded-full bg-[#60D394] px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950">
                {isPast ? 'Event recap' : 'Upcoming event'}
              </span>
              <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">{event.title}</h1>
              <div className="mt-6 space-y-3 text-sm leading-6 text-slate-200">
                <p className="flex gap-3">
                  <span className="font-black text-[#60D394]">Date</span>
                  <span>{formatEventDate(event.date, event.endAt)}</span>
                </p>
                <p className="flex gap-3">
                  <span className="font-black text-[#60D394]">Place</span>
                  <span>{event.location || 'Infinity Sports'}</span>
                </p>
              </div>
              {!isPast && registrationUrl ? (
                <Link
                  href={registrationUrl}
                  className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#60D394] px-7 text-sm font-black text-slate-950 transition hover:bg-[#79e2a9] focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  Register for this event
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="grid gap-14 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-brand-green-dark">About the event</p>
            <h2 className="mt-2 text-3xl font-black text-brand-black">Event overview</h2>
            <div className="mt-6 whitespace-pre-line text-base leading-8 text-gray-600">
              {event.description || 'More information about this event will be added soon.'}
            </div>

            {!isVideo && galleryImages.length > 0 ? (
              <section className="mt-14">
                <p className="text-sm font-black uppercase tracking-[0.25em] text-brand-green-dark">Gallery</p>
                <h2 className="mt-2 mb-6 text-3xl font-black text-brand-black">Inside the event</h2>
                <EventGallery images={galleryImages} title={event.title} />
              </section>
            ) : null}
          </div>

          <aside className="h-fit rounded-2xl border border-brand-lightBlue/20 bg-slate-50 p-6 lg:sticky lg:top-28">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-green-dark">Event information</p>
            <dl className="mt-5 space-y-5">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">When</dt>
                <dd className="mt-1 text-sm font-semibold leading-6 text-brand-black">{formatEventDate(event.date, event.endAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Where</dt>
                <dd className="mt-1 text-sm font-semibold text-brand-black">{event.location || 'Infinity Sports'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-gray-400">Media</dt>
                <dd className="mt-1 text-sm font-semibold text-brand-black">{isVideo ? 'Featured video' : galleryImages.length > 0 ? `${galleryImages.length} gallery photos` : 'Event overview'}</dd>
              </div>
            </dl>
            {!isPast && registrationUrl ? (
              <Link href={registrationUrl} className="mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#003DA5] px-4 text-sm font-black text-white hover:bg-[#002d7a]">
                Register now
              </Link>
            ) : null}
            <Link href="/events" className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-[#003DA5] hover:bg-blue-50">
              Back to all events
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

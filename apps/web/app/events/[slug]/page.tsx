import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchEventBySlug } from '../../../lib/apiClient';
import { getYouTubeEmbedUrl } from '../../../lib/youtube';
import { EventGallery } from './EventGallery';
import { EventRegistrationForm } from './EventRegistrationForm';

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
  const liveEmbedUrl = event.contentType === 'LIVE' ? getYouTubeEmbedUrl(event.videoUrl) : null;
  const isLive = Boolean(liveEmbedUrl);
  const tournamentOptions = (event.tournamentOptions || []).filter(Boolean);
  const jerseySizes = (event.jerseySizes || []).filter(Boolean);
  const usesBuiltInRegistration = Boolean(
    event.registrationEnabled && tournamentOptions.length > 0 && jerseySizes.length > 0,
  );
  const isPast = new Date(event.endAt || event.date).getTime() < Date.now();

  return (
    <div className="overflow-x-hidden bg-white">
      <section className="bg-slate-950 text-white">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-8 lg:px-8 lg:pb-20">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/events" className="transition hover:text-white">Events</Link>
            <span aria-hidden="true">/</span>
            <span className="truncate text-slate-200">{event.title}</span>
          </nav>

          <header className="mt-10 max-w-4xl border-l-4 border-[#60D394] pl-5 sm:mt-12 sm:pl-7">
            <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              {event.title}
            </h1>
          </header>

          <div className="mt-9 grid min-w-0 gap-6 border-y border-white/20 py-6 md:grid-cols-[1.15fr_1fr]">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#60D394]">Date</p>
              <p className="mt-1.5 max-w-full break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere] sm:text-base">
                {formatEventDate(event.date, event.endAt)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#60D394]">Place</p>
              <p className="mt-1.5 max-w-full break-words text-sm font-semibold leading-6 text-white [overflow-wrap:anywhere] sm:text-base">
                {event.location || 'Infinity Sports'}
              </p>
            </div>
          </div>

          <div className="mt-8 min-w-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
            {isLive ? (
              <div>
                <div className="flex items-center gap-2 border-b border-white/10 bg-red-600 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
                  Live now
                </div>
                <iframe
                  src={liveEmbedUrl!}
                  title={`${event.title} live stream`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="strict-origin-when-cross-origin"
                  className="aspect-video w-full focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#60D394]"
                />
              </div>
            ) : isVideo ? (
              <video
                src={event.videoUrl}
                poster={imageUrl}
                controls
                playsInline
                preload="metadata"
                className="aspect-[16/8] w-full object-cover lg:aspect-[16/7]"
              >
                Your browser does not support this event video.
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={event.title}
                className="aspect-[16/9] w-full object-cover sm:aspect-[16/8] lg:aspect-[16/7]"
              />
            )}
          </div>
        </div>
      </section>

      {!isPast && usesBuiltInRegistration ? (
        <section id="register" className="scroll-mt-32 border-b border-brand-lightBlue/20 bg-[#F4F8FF]">
          <div className="mx-auto min-w-0 max-w-6xl px-6 py-16 lg:px-8 lg:py-20">
            <EventRegistrationForm
              eventId={event.id}
              eventTitle={event.title}
              tournamentOptions={tournamentOptions}
              jerseySizes={jerseySizes}
            />
          </div>
        </section>
      ) : null}

      {!isVideo && !isLive && galleryImages.length > 0 ? (
        <main className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <p className="text-sm font-black uppercase tracking-[0.25em] text-brand-green-dark">Gallery</p>
          <h2 className="mb-6 mt-2 text-3xl font-black text-brand-black">Inside the event</h2>
          <EventGallery images={galleryImages} title={event.title} />
        </main>
      ) : null}
    </div>
  );
}

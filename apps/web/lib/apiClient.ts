import type {
  LandingAnnouncement,
  LandingContent,
  LandingEvent,
  LandingFacilityHighlight,
  LandingOffer,
  LandingProgram,
} from '@infinity/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

export type ProgramResponse = {
  id: string;
  name: string;
  description?: string;
  slug?: string;
  highlight?: boolean;
  level?: string;
};

export type OfferResponse = {
  id: string;
  name: string;
  pricePerMonth: number;
  description?: string;
  features?: string[];
  badge?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  link?: string;
};

export type EventResponse = {
  id: string;
  title: string;
  date: string;
  location?: string;
  description?: string;
  link?: string;
  highlight?: boolean;
};

export type FacilityResponse = {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  specs?: string[];
};

export type AnnouncementResponse = {
  id: string;
  title: string;
  body: string;
  isPinned?: boolean;
};

type LandingApiResponse = {
  hero?: {
    title: string;
    subtitle: string;
    primaryCta: string;
    primaryUrl: string;
    secondaryCta?: string;
    secondaryUrl?: string;
    backgroundImageUrl?: string;
  };
  programs?: ProgramResponse[];
  offers?: OfferResponse[];
  events?: EventResponse[];
  announcements?: AnnouncementResponse[];
  facilities?: FacilityResponse[];
};

async function jsonFetch<T>(endpoint: string): Promise<T> {
  const response = await fetch(endpoint, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export async function fetchPrograms(): Promise<ProgramResponse[]> {
  try {
    return await jsonFetch<ProgramResponse[]>(`${API_BASE_URL}/api/public/programs`);
  } catch (error) {
    console.error('Failed to fetch programs:', error);
    return [];
  }
}

export async function fetchOffers(): Promise<OfferResponse[]> {
  try {
    return await jsonFetch<OfferResponse[]>(`${API_BASE_URL}/api/public/offers`);
  } catch (error) {
    console.error('Failed to fetch offers:', error);
    return [];
  }
}

export async function fetchEvents(): Promise<EventResponse[]> {
  try {
    return await jsonFetch<EventResponse[]>(`${API_BASE_URL}/api/public/events`);
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return [];
  }
}

export async function fetchFacilities(): Promise<FacilityResponse[]> {
  try {
    return await jsonFetch<FacilityResponse[]>(`${API_BASE_URL}/api/public/facilities`);
  } catch (error) {
    console.error('Failed to fetch facilities:', error);
    return [];
  }
}

export async function fetchAnnouncements(): Promise<AnnouncementResponse[]> {
  try {
    return await jsonFetch<AnnouncementResponse[]>(`${API_BASE_URL}/api/public/announcements`);
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    return [];
  }
}

export async function fetchLandingContent(): Promise<LandingContent> {
  try {
    const data = await jsonFetch<LandingApiResponse>(`${API_BASE_URL}/api/public/landing`);

    const defaultHero: LandingContent['hero'] = {
      title: 'Elevating Jordanian Athletes',
      subtitle: 'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.',
      primaryCtaLabel: 'Explore Programs',
      primaryCtaLink: '/contact',
      secondaryCtaLabel: 'Book a Tour',
      secondaryCtaLink: '/contact',
      backgroundImageUrl: undefined,
      backgroundVideoUrl: undefined,
    };

    const hero: LandingContent['hero'] = data.hero
      ? {
          title: data.hero.title,
          subtitle: data.hero.subtitle,
          primaryCtaLabel: data.hero.primaryCta,
          primaryCtaLink: data.hero.primaryUrl,
          secondaryCtaLabel: data.hero.secondaryCta || undefined,
          secondaryCtaLink: data.hero.secondaryUrl || undefined,
          backgroundImageUrl: data.hero.backgroundImageUrl || undefined,
          backgroundVideoUrl: undefined,
        }
      : defaultHero;

    const transformed: LandingContent = {
      hero,
      highlights: [], // Not in current schema, can be added later
      programs: (data.programs || []).map((p): LandingProgram => ({
        id: p.id,
        title: p.name,
        description: p.description ?? '',
        sportType: p.level || 'multi',
        badge: p.level || undefined,
        link: `/sports#${p.slug}`,
        mediaUrl: undefined,
        isFeatured: p.highlight || false,
        isActive: true,
      })),
      offers: (data.offers || []).map((o): LandingOffer => ({
        id: o.id,
        name: o.name,
        price: o.pricePerMonth === 0 ? 'Custom' : `JD ${o.pricePerMonth}/mo`,
        badge: o.badge || undefined,
        description: o.description,
        features: o.features || [],
        link: '/offers',
        isFeatured: false,
        isActive: true,
      })),
      events: (data.events || []).map((e): LandingEvent => ({
        id: e.id,
        title: e.title,
        date: e.date,
        location: e.location,
        description: e.description || undefined,
        link: '/events',
        isActive: e.highlight !== false,
      })),
      announcements: (data.announcements || []).map((a): LandingAnnouncement => ({
        id: a.id,
        title: a.title,
        message: a.body,
        isPinned: a.isPinned || false,
        isActive: true,
        link: '/contact',
      })),
      facilityHighlights: (data.facilities || []).map((f): LandingFacilityHighlight => ({
        id: f.id,
        name: f.name,
        description: f.description,
        mediaUrl: f.imageUrl || undefined,
        badge: undefined,
      })),
      footer: {
        address: 'Infinity Campus, Airport Road, Amman, Jordan',
        phone: '+962 6 555 8899',
        email: 'hello@infinitysport.jo',
        contactRecipientEmail: 'hello@infinitysport.jo',
        socialLinks: [],
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    
    return transformed;
  } catch (error) {
    console.error('Failed to fetch landing content:', error);
    // Return fallback data
    return {
      hero: {
        title: 'Elevating Jordanian Athletes',
        subtitle: 'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.',
        primaryCtaLabel: 'Explore Programs',
        primaryCtaLink: '/contact',
        secondaryCtaLabel: 'Book a Tour',
        secondaryCtaLink: '/contact',
        backgroundImageUrl: undefined,
      },
      highlights: [],
      programs: [],
      offers: [],
      events: [],
      announcements: [],
      facilityHighlights: [],
      footer: {
        address: 'Infinity Campus, Airport Road, Amman, Jordan',
        phone: '+962 6 555 8899',
        email: 'hello@infinitysport.jo',
        contactRecipientEmail: 'hello@infinitysport.jo',
        socialLinks: [],
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    } as LandingContent;
  }
}


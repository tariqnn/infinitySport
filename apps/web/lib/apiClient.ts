import type {
  LandingAnnouncement,
  LandingContent,
  LandingEvent,
  LandingFacilityHighlight,
  LandingOffer,
  LandingProgram,
} from '@infinity/types';
import { cache } from 'react';

// Default to deployed API, allow override via environment variable
const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  return 'https://infinitysport.onrender.com';
};

const API_BASE_URL = getApiBaseUrl();

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

// Fallback facilities when API returns none (used in landing + facilities page)
const FALLBACK_FACILITIES: { id: string; name: string; description: string }[] = [
  { id: 'iba-5x5', name: 'IBA Approved Court 5x5', description: 'Full-size basketball court meeting IBA standards for official 5x5 play.' },
  { id: 'fiba-3x3', name: 'FIBA Approved 3x3 Court', description: 'FIBA-approved half-court for official 3x3 basketball.' },
  { id: 'multipurpose-hall', name: 'Multipurpose Hall', description: 'Suitable for Yoga, Pilates, Ballet, Kickboxing, and more.' },
  { id: 'padel-merry', name: 'Padel Court by Merry Sports', description: 'Professional padel court by Merry Sports.' },
  { id: 'volleyball', name: 'Official Volleyball Court', description: 'Full-size official volleyball court.' },
  { id: 'gymnastics', name: 'Official Gymnastics Training Facility', description: 'Dedicated gymnastics training facility meeting official standards.' },
];

type LandingApiResponse = {
  hero?: {
    title: string;
    subtitle: string;
    primaryCta: string;
    primaryUrl: string;
    secondaryCta?: string;
    secondaryUrl?: string;
    backgroundImageUrl?: string;
    backgroundVideoUrl?: string;
  };
  programs?: ProgramResponse[];
  offers?: OfferResponse[];
  events?: EventResponse[];
  announcements?: AnnouncementResponse[];
  facilities?: FacilityResponse[];
  footerSettings?: {
    address: string;
    phone: string;
    email: string;
    contactRecipientEmail?: string | null;
    socialLinks?: unknown;
  } | null;
};

async function jsonFetch<T>(endpoint: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchPrograms(): Promise<ProgramResponse[]> {
  try {
    return await jsonFetch<ProgramResponse[]>(`${API_BASE_URL}/api/public/programs`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch programs:', error);
    }
    return [];
  }
}

export async function fetchOffers(): Promise<OfferResponse[]> {
  try {
    return await jsonFetch<OfferResponse[]>(`${API_BASE_URL}/api/public/offers`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch offers:', error);
    }
    return [];
  }
}

export async function fetchEvents(): Promise<EventResponse[]> {
  try {
    return await jsonFetch<EventResponse[]>(`${API_BASE_URL}/api/public/events`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch events:', error);
    }
    return [];
  }
}

// Our Facility & Venues: always use these 6 (excludes Padel Dome, Infinity Arena, etc.)
export async function fetchFacilities(): Promise<FacilityResponse[]> {
  return FALLBACK_FACILITIES.map((f): FacilityResponse => ({
    id: f.id,
    name: f.name,
    description: f.description,
    imageUrl: undefined,
    specs: undefined,
  }));
}

export async function fetchAnnouncements(): Promise<AnnouncementResponse[]> {
  try {
    return await jsonFetch<AnnouncementResponse[]>(`${API_BASE_URL}/api/public/announcements`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch announcements:', error);
    }
    return [];
  }
}

async function _fetchLandingContent(): Promise<LandingContent> {
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
          backgroundVideoUrl: data.hero.backgroundVideoUrl || undefined,
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
        description: o.description ?? '',
        features: o.features ?? [],
        link: o.link || '/offers',
        isFeatured: Boolean(o.isFeatured),
        isActive: o.isActive !== false,
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
      facilityHighlights: ((data.facilities || []).length > 0
        ? (data.facilities || []).map((f): LandingFacilityHighlight => ({
            id: f.id,
            name: f.name,
            description: f.description ?? '',
            mediaUrl: f.imageUrl || undefined,
            badge: undefined,
          }))
        : FALLBACK_FACILITIES.map((f): LandingFacilityHighlight => ({
            id: f.id,
            name: f.name,
            description: f.description,
            mediaUrl: undefined,
            badge: undefined,
          }))),
      footer: (() => {
        const fallback: LandingContent['footer'] = {
          address: 'Shemisani, Princess Alia College',
          phone: '07 9624 4059',
          email: 'infinitysportsacademyjo@gmail.com',
          contactRecipientEmail: 'infinitysportsacademyjo@gmail.com',
          socialLinks: [
            { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/infinity.sports.academy' },
          ],
        };

        if (!data.footerSettings) return fallback;

        const rawLinks = data.footerSettings.socialLinks;
        const socialLinks =
          Array.isArray(rawLinks)
            ? rawLinks
                .map((link: unknown) => {
                  const obj = typeof link === 'object' && link !== null ? (link as Record<string, unknown>) : null;
                  const id = obj && typeof obj.id === 'string' ? obj.id : undefined;
                  const label = obj && typeof obj.label === 'string' ? obj.label : undefined;
                  const href = obj && typeof obj.href === 'string' ? obj.href : undefined;
                  if (!label || !href) return null;
                  return { id: id || label.toLowerCase(), label, href };
                })
                .filter((v): v is { id: string; label: string; href: string } => Boolean(v))
            : fallback.socialLinks;

        return {
          address: data.footerSettings.address || fallback.address,
          phone: data.footerSettings.phone || fallback.phone,
          email: data.footerSettings.email || fallback.email,
          contactRecipientEmail:
            data.footerSettings.contactRecipientEmail || data.footerSettings.email || fallback.contactRecipientEmail,
          socialLinks,
        };
      })(),
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    
    return transformed;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to fetch landing content:', error);
    }
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
      facilityHighlights: FALLBACK_FACILITIES.map((f): LandingFacilityHighlight => ({
        id: f.id,
        name: f.name,
        description: f.description,
        mediaUrl: undefined,
        badge: undefined,
      })),
      footer: {
        address: 'Shemisani, Princess Alia College',
        phone: '07 9624 4059',
        email: 'infinitysportsacademyjo@gmail.com',
        contactRecipientEmail: 'infinitysportsacademyjo@gmail.com',
        socialLinks: [
          { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/infinity.sports.academy' },
        ],
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    } as LandingContent;
  }
}

// Memoize per-request so Home + Footer don't trigger multiple slow API calls.
export const fetchLandingContent = cache(_fetchLandingContent);
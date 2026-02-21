import type {
  LandingAnnouncement,
  LandingContent,
  LandingEvent,
  LandingFacilityHighlight,
  LandingOffer,
  LandingProgram,
} from '@infinity/types';
import { cache } from 'react';

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

export type PackageResponse = {
  id: string;
  sportType: string;
  name: string;
  description: string | null;
  descriptionBullets: string[] | null;
  sessionsCount: number;
  trackingType: string;
  pricingType: string;
  currentPriceJod: number | null;
  timeSlots: unknown;
  isActive: boolean;
  sortOrder: number;
};

const FALLBACK_FACILITIES: { id: string; name: string; description: string }[] = [
  { id: 'iba-5x5', name: 'FIBA Approved Court 5x5', description: 'Full-size basketball court meeting FIBA standards for official 5x5 play.' },
  { id: 'fiba-3x3', name: 'FIBA Approved 3x3 Court', description: 'FIBA-approved half-court for official 3x3 basketball.' },
  { id: 'multipurpose-hall', name: 'Multipurpose Hall', description: 'Suitable for Yoga, Pilates, Ballet, Kickboxing, and more.' },
  { id: 'padel-merry', name: 'Padel Court by Merry Sports', description: 'Professional padel court by Merry Sports.' },
  { id: 'volleyball', name: 'Official Volleyball Court', description: 'Full-size official volleyball court.' },
  { id: 'gymnastics', name: 'Official Gymnastics Training Facility', description: 'Dedicated gymnastics training facility meeting official standards.' },
];

function canUseDb() {
  return typeof window === 'undefined' && Boolean(process.env.DATABASE_URL?.trim());
}

async function getPrisma() {
  const mod = await import('./db');
  return mod.prisma;
}

export async function fetchPrograms(): Promise<ProgramResponse[]> {
  if (!canUseDb()) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.program.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      slug: row.slug ?? undefined,
      highlight: row.highlight,
      level: row.level ?? undefined,
    }));
  } catch {
    return [];
  }
}

export async function fetchPackages(): Promise<PackageResponse[]> {
  if (!canUseDb()) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      sportType: row.sportType,
      name: row.name,
      description: row.description,
      descriptionBullets: Array.isArray(row.descriptionBullets) ? (row.descriptionBullets as string[]) : null,
      sessionsCount: row.sessionsCount,
      trackingType: row.trackingType,
      pricingType: row.pricingType,
      currentPriceJod: row.currentPriceJod,
      timeSlots: row.timeSlots,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    }));
  } catch {
    return [];
  }
}

export async function fetchOffers(): Promise<OfferResponse[]> {
  if (!canUseDb()) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.offer.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      pricePerMonth: row.pricePerMonth,
      description: row.description ?? '',
      features: row.features ?? [],
      badge: row.badge ?? undefined,
      isFeatured: false,
      isActive: true,
      link: undefined,
    }));
  } catch {
    return [];
  }
}

export async function fetchEvents(): Promise<EventResponse[]> {
  if (!canUseDb()) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.event.findMany({ orderBy: { date: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date.toISOString(),
      location: row.location ?? undefined,
      description: row.description ?? undefined,
      link: undefined,
      highlight: row.highlight,
    }));
  } catch {
    return [];
  }
}

export async function fetchFacilities(): Promise<FacilityResponse[]> {
  if (!canUseDb()) {
    return FALLBACK_FACILITIES.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
    }));
  }

  try {
    const prisma = await getPrisma();
    const rows = await prisma.facilityHighlight.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    if (rows.length === 0) {
      return FALLBACK_FACILITIES.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
      }));
    }
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      imageUrl: row.imageUrl ?? undefined,
      specs: undefined,
    }));
  } catch {
    return FALLBACK_FACILITIES.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
    }));
  }
}

export async function fetchAnnouncements(): Promise<AnnouncementResponse[]> {
  if (!canUseDb()) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.announcement.findMany({ orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }] });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      isPinned: row.isPinned,
    }));
  } catch {
    return [];
  }
}

export function getLandingFallback(): LandingContent {
  return {
    hero: {
      title: 'Elevating Jordanian Athletes',
      subtitle: 'Infinity Sports delivers elite training programs, professional coaching, and world-class facilities for teams and individuals across the region.',
      primaryCtaLabel: 'Explore Programs',
      primaryCtaLink: '/contact',
      secondaryCtaLabel: 'Book a Tour',
      secondaryCtaLink: '/contact',
      backgroundImageUrl: undefined,
      backgroundVideoUrl: undefined,
    },
    highlights: [],
    programs: [],
    offers: [],
    events: [],
    announcements: [],
    facilityHighlights: FALLBACK_FACILITIES.map((item): LandingFacilityHighlight => ({
      id: item.id,
      name: item.name,
      description: item.description,
      mediaUrl: undefined,
      badge: undefined,
    })),
    footer: {
      address: 'Shemisani, Princess Alia College',
      phone: '07 9624 4059',
      email: 'infinitysportsacademyjo@gmail.com',
      contactRecipientEmail: 'infinitysportsacademyjo@gmail.com',
      socialLinks: [{ id: 'instagram', label: 'Instagram', href: 'https://instagram.com/infinity.sports.academy' }],
    },
    updatedAt: new Date().toISOString(),
    updatedBy: 'System',
  };
}

async function _fetchLandingContent(): Promise<LandingContent> {
  if (!canUseDb()) return getLandingFallback();

  try {
    const prisma = await getPrisma();
    const [hero, programs, offers, events, announcements, facilities, footerSettings] = await Promise.all([
      prisma.heroSection.findFirst({ orderBy: { updatedAt: 'desc' } }),
      prisma.program.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      prisma.offer.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      prisma.event.findMany({ orderBy: { date: 'asc' } }),
      prisma.announcement.findMany({ orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }] }),
      prisma.facilityHighlight.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] }),
      prisma.footerSettings.findFirst({ orderBy: { updatedAt: 'desc' } }),
    ]);

    const fallback = getLandingFallback();
    const rawSocialLinks = footerSettings?.socialLinks;
    const socialLinks = Array.isArray(rawSocialLinks)
      ? rawSocialLinks
          .map((item: unknown) => {
            if (!item || typeof item !== 'object') return null;
            const record = item as Record<string, unknown>;
            if (typeof record.label !== 'string' || typeof record.href !== 'string') return null;
            return {
              id: String(record.id || record.label).toLowerCase(),
              label: record.label,
              href: record.href,
            };
          })
          .filter(Boolean) as Array<{ id: string; label: string; href: string }>
      : fallback.footer.socialLinks;

    return {
      hero: hero
        ? {
            title: hero.title,
            subtitle: hero.subtitle,
            primaryCtaLabel: hero.primaryCta,
            primaryCtaLink: hero.primaryUrl,
            secondaryCtaLabel: hero.secondaryCta || undefined,
            secondaryCtaLink: hero.secondaryUrl || undefined,
            backgroundImageUrl: hero.backgroundImageUrl || undefined,
            backgroundVideoUrl: hero.backgroundVideoUrl || undefined,
          }
        : fallback.hero,
      highlights: [],
      programs: programs.map((program): LandingProgram => ({
        id: program.id,
        title: program.name,
        description: program.description ?? '',
        sportType: program.level || 'multi',
        badge: program.level || undefined,
        link: `/sports#${program.slug}`,
        mediaUrl: undefined,
        isFeatured: program.highlight,
        isActive: true,
      })),
      offers: offers.map((offer): LandingOffer => ({
        id: offer.id,
        name: offer.name,
        price: offer.pricePerMonth === 0 ? 'Custom' : `JD ${offer.pricePerMonth}/mo`,
        badge: offer.badge || undefined,
        description: offer.description ?? '',
        features: offer.features ?? [],
        link: '/offers',
        isFeatured: false,
        isActive: true,
      })),
      events: events.map((event): LandingEvent => ({
        id: event.id,
        title: event.title,
        date: event.date.toISOString(),
        location: event.location,
        description: event.description || undefined,
        link: '/events',
        isActive: event.highlight !== false,
      })),
      announcements: announcements.map((announcement): LandingAnnouncement => ({
        id: announcement.id,
        title: announcement.title,
        message: announcement.body,
        isPinned: announcement.isPinned,
        isActive: true,
        link: '/contact',
      })),
      facilityHighlights:
        facilities.length > 0
          ? facilities.map((facility): LandingFacilityHighlight => ({
              id: facility.id,
              name: facility.name,
              description: facility.description ?? '',
              mediaUrl: facility.imageUrl || undefined,
              badge: undefined,
            }))
          : fallback.facilityHighlights,
      footer: {
        address: footerSettings?.address || fallback.footer.address,
        phone: footerSettings?.phone || fallback.footer.phone,
        email: footerSettings?.email || fallback.footer.email,
        contactRecipientEmail:
          footerSettings?.contactRecipientEmail || footerSettings?.email || fallback.footer.contactRecipientEmail,
        socialLinks,
      },
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
  } catch {
    return getLandingFallback();
  }
}

export const fetchLandingContent = cache(_fetchLandingContent);

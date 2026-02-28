import type {
  LandingAnnouncement,
  LandingContent,
  LandingEvent,
  LandingFacilityHighlight,
  LandingOffer,
  LandingProgram,
} from '@infinity/types';
import { canAttemptDatabaseQuery, noteDatabaseFailure } from './dbGuard';

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
  imageUrl?: string;
  link?: string;
  highlight?: boolean;
};

export type CoachResponse = {
  id: string;
  name: string;
  sport: string;
  description: string;
  quote?: string;
  achievements: string[];
  imageUrl: string;
  isActive: boolean;
  order: number;
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

const FALLBACK_PACKAGES: PackageResponse[] = [
  {
    id: 'fallback-basketball',
    sportType: 'basketball',
    name: 'Basketball Academy',
    description: 'Skill development, gameplay IQ, and strength progression for youth athletes.',
    descriptionBullets: ['Fundamentals', 'Conditioning', 'Match play'],
    sessionsCount: 12,
    trackingType: 'MONTHLY',
    pricingType: 'SUBSCRIPTION',
    currentPriceJod: null,
    timeSlots: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'fallback-gymnastics',
    sportType: 'gymnastics',
    name: 'Gymnastics Program',
    description: 'Balance, flexibility, and discipline training designed for all levels.',
    descriptionBullets: ['Beginner to advanced', 'Technique focus', 'Safe progression'],
    sessionsCount: 12,
    trackingType: 'MONTHLY',
    pricingType: 'SUBSCRIPTION',
    currentPriceJod: null,
    timeSlots: null,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'fallback-volleyball',
    sportType: 'volleyball',
    name: 'Volleyball Program',
    description: 'Competitive volleyball sessions including passing, serving, and team systems.',
    descriptionBullets: ['Tactical drills', 'Team training', 'Competitive preparation'],
    sessionsCount: 12,
    trackingType: 'MONTHLY',
    pricingType: 'SUBSCRIPTION',
    currentPriceJod: null,
    timeSlots: null,
    isActive: true,
    sortOrder: 3,
  },
];

const FALLBACK_COACHES: CoachResponse[] = [
  {
    id: 'fallback-coach-ammar',
    name: 'Ammar Salman',
    sport: 'Basketball',
    description: 'Head coach focused on fundamentals, game awareness, and athlete growth.',
    quote: 'Discipline and consistency build champions.',
    achievements: ['Youth development specialist', 'Team systems coach'],
    imageUrl: '/ammar-salman.jpg',
    isActive: true,
    order: 1,
  },
  {
    id: 'fallback-coach-raghad',
    name: 'Raghad Haimour',
    sport: 'Gymnastics',
    description: 'Gymnastics coach delivering structured progressions in a safe training environment.',
    quote: 'Progress starts with perfect fundamentals.',
    achievements: ['Progressive training plans', 'Beginner to advanced support'],
    imageUrl: '/raghad-haimour.jpeg',
    isActive: true,
    order: 2,
  },
  {
    id: 'fallback-coach-rahaf',
    name: 'Rahaf Haimour',
    sport: 'Volleyball',
    description: 'Volleyball coach emphasizing teamwork, technique, and match readiness.',
    quote: 'Strong teams are built in practice.',
    achievements: ['Team coordination training', 'Competitive drill design'],
    imageUrl: '/rahaf-haimour.jpeg',
    isActive: true,
    order: 3,
  },
];

type CacheKey = 'packages' | 'coaches' | 'landingContent';
type CacheStore = {
  fresh: Partial<Record<CacheKey, { value: unknown; expiresAt: number }>>;
  stale: Partial<Record<CacheKey, { value: unknown; expiresAt: number }>>;
};

const globalCache = globalThis as unknown as { __webApiCache?: CacheStore };

function readMsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

const WEB_CACHE_TTL_MS = readMsFromEnv('WEB_API_CACHE_TTL_MS', 60_000);
const WEB_STALE_TTL_MS = readMsFromEnv('WEB_API_STALE_TTL_MS', 15 * 60_000);

function cacheStore(): CacheStore {
  if (!globalCache.__webApiCache) {
    globalCache.__webApiCache = { fresh: {}, stale: {} };
  }
  return globalCache.__webApiCache;
}

function getFreshCache<T>(key: CacheKey): T | null {
  const entry = cacheStore().fresh[key];
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry.value as T;
}

function getStaleCache<T>(key: CacheKey): T | null {
  const entry = cacheStore().stale[key];
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) return null;
  return entry.value as T;
}

function writeCache<T>(key: CacheKey, value: T): void {
  const now = Date.now();
  const store = cacheStore();
  store.fresh[key] = { value, expiresAt: now + WEB_CACHE_TTL_MS };
  store.stale[key] = { value, expiresAt: now + WEB_STALE_TTL_MS };
}

function canUseDb() {
  if (typeof window !== 'undefined') return false;

  const candidates = [
    process.env.DATABASE_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL,
    process.env.PRISMA_DATABASE_URL,
    process.env.NEON_DATABASE_URL,
  ];
  const explicit = candidates.find((value): value is string => typeof value === 'string' && !!value.trim());
  if (explicit && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = explicit.trim();
  }

  if (!process.env.DATABASE_URL?.trim()) {
    const inferred = Object.entries(process.env).find(([key, value]) => {
      if (typeof value !== 'string' || !value.trim()) return false;
      if (!/^postgres(ql)?:\/\//i.test(value.trim())) return false;
      return /(DATABASE|POSTGRES|PRISMA|NEON|DB|URL)/i.test(key);
    });
    if (inferred) {
      process.env.DATABASE_URL = (inferred[1] as string).trim();
    }
  }

  return Boolean(process.env.DATABASE_URL?.trim());
}

async function getPrisma() {
  const mod = await import('./db');
  return mod.prisma;
}

export async function fetchPrograms(): Promise<ProgramResponse[]> {
  if (!canUseDb()) return [];
  if (!(await canAttemptDatabaseQuery())) return [];
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
  } catch (error) {
    noteDatabaseFailure('fetchPrograms', error);
    return [];
  }
}

export async function fetchPackages(): Promise<PackageResponse[]> {
  const fresh = getFreshCache<PackageResponse[]>('packages');
  if (fresh) return fresh;

  const stale = getStaleCache<PackageResponse[]>('packages');
  if (!canUseDb()) return stale || FALLBACK_PACKAGES;
  if (!(await canAttemptDatabaseQuery())) return stale || FALLBACK_PACKAGES;
  try {
    const prisma = await getPrisma();
    const rows = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    if (!rows.length) {
      writeCache('packages', FALLBACK_PACKAGES);
      return FALLBACK_PACKAGES;
    }
    const mapped = rows.map((row) => ({
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
    writeCache('packages', mapped);
    return mapped;
  } catch (error) {
    noteDatabaseFailure('fetchPackages', error);
    return stale || FALLBACK_PACKAGES;
  }
}

export async function fetchOffers(): Promise<OfferResponse[]> {
  if (!canUseDb()) return [];
  if (!(await canAttemptDatabaseQuery())) return [];
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
  } catch (error) {
    noteDatabaseFailure('fetchOffers', error);
    return [];
  }
}

export async function fetchEvents(): Promise<EventResponse[]> {
  if (!canUseDb()) return [];
  if (!(await canAttemptDatabaseQuery())) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.event.findMany({ orderBy: { date: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date.toISOString(),
      location: row.location ?? undefined,
      description: row.description ?? undefined,
      imageUrl: row.imageUrl ?? undefined,
      link: undefined,
      highlight: row.highlight,
    }));
  } catch (error) {
    noteDatabaseFailure('fetchEvents', error);
    return [];
  }
}

export async function fetchCoaches(): Promise<CoachResponse[]> {
  const fresh = getFreshCache<CoachResponse[]>('coaches');
  if (fresh) return fresh;

  const stale = getStaleCache<CoachResponse[]>('coaches');
  if (!canUseDb()) return stale || FALLBACK_COACHES;
  if (!(await canAttemptDatabaseQuery())) return stale || FALLBACK_COACHES;
  try {
    const prisma = await getPrisma();
    const rows = await prisma.landingCoach.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    if (!rows.length) {
      writeCache('coaches', FALLBACK_COACHES);
      return FALLBACK_COACHES;
    }
    const mapped = rows.map((row) => ({
      id: row.id,
      name: row.name,
      sport: row.sport,
      description: row.description,
      quote: row.quote ?? undefined,
      achievements: row.achievements ?? [],
      imageUrl: row.imageUrl,
      isActive: row.isActive,
      order: row.order,
    }));
    writeCache('coaches', mapped);
    return mapped;
  } catch (error) {
    noteDatabaseFailure('fetchCoaches', error);
    return stale || FALLBACK_COACHES;
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
  if (!(await canAttemptDatabaseQuery())) {
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
  } catch (error) {
    noteDatabaseFailure('fetchFacilities', error);
    return FALLBACK_FACILITIES.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
    }));
  }
}

export async function fetchAnnouncements(): Promise<AnnouncementResponse[]> {
  if (!canUseDb()) return [];
  if (!(await canAttemptDatabaseQuery())) return [];
  try {
    const prisma = await getPrisma();
    const rows = await prisma.announcement.findMany({ orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }] });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      isPinned: row.isPinned,
    }));
  } catch (error) {
    noteDatabaseFailure('fetchAnnouncements', error);
    return [];
  }
}

export function getLandingFallback(): LandingContent {
  const fallbackPrograms: LandingProgram[] = FALLBACK_PACKAGES.map((program) => ({
    id: program.id,
    title: program.name,
    description: program.description?.trim() || 'Program details available on the sports page.',
    sportType: program.sportType || 'multi',
    badge: program.sportType || undefined,
    link: `/sports#${(program.sportType || 'other').toLowerCase().replace(/\s+/g, '-')}`,
    mediaUrl: undefined,
    isFeatured: false,
    isActive: true,
  }));

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
    programs: fallbackPrograms,
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
  const fresh = getFreshCache<LandingContent>('landingContent');
  if (fresh) return fresh;

  const stale = getStaleCache<LandingContent>('landingContent');
  if (!canUseDb()) return stale || getLandingFallback();
  if (!(await canAttemptDatabaseQuery())) return stale || getLandingFallback();

  try {
    const prisma = await getPrisma();
    const hero = await prisma.heroSection.findFirst({ orderBy: { updatedAt: 'desc' } });
    const programs = await prisma.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const offers = await prisma.offer.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    const events = await prisma.event.findMany({ orderBy: { date: 'asc' } });
    const announcements = await prisma.announcement.findMany({ orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }] });
    const facilities = await prisma.facilityHighlight.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    const footerSettings = await prisma.footerSettings.findFirst({ orderBy: { updatedAt: 'desc' } });

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

    const result: LandingContent = {
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
        description: program.description?.trim() || 'Program details available on the sports page.',
        sportType: program.sportType || 'multi',
        badge: program.sportType || undefined,
        link: `/sports#${(program.sportType || 'other').toLowerCase().replace(/\s+/g, '-')}`,
        mediaUrl: undefined,
        isFeatured: false,
        isActive: program.isActive,
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
        imageUrl: event.imageUrl || undefined,
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
    writeCache('landingContent', result);
    return result;
  } catch (error) {
    noteDatabaseFailure('fetchLandingContent', error);
    return stale || getLandingFallback();
  }
}

export async function fetchLandingContent(): Promise<LandingContent> {
  return _fetchLandingContent();
}

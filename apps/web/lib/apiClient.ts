import type {
  LandingAnnouncement,
  LandingContent,
  LandingEvent,
  LandingFacilityHighlight,
  LandingFooter,
  LandingHero,
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
  // --- Volleyball ---
  {
    id: 'fallback-volleyball',
    sportType: 'VOLLEYBALL',
    name: 'Volleyball',
    description: 'Volleyball training programme open to all ages.',
    descriptionBullets: [
      'Sunday, Tuesday, Saturday 7–9 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'FIXED',
    currentPriceJod: 100,
    timeSlots: [{ label: 'Sunday, Tuesday, Saturday 7–9 PM' }],
    isActive: true,
    sortOrder: 0,
  },
  // --- Boxing ---
  {
    id: 'fallback-boxing-juniors',
    sportType: 'BOXING',
    name: 'Boxing - Juniors (Age 6–11)',
    description: 'Boxing fundamentals for ages 6–11.',
    descriptionBullets: [
      'Age group: 6–11 years.',
      'Sunday, Tuesday, Thursday 6–7 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'FIXED',
    currentPriceJod: 80,
    timeSlots: [{ label: 'Sunday, Tuesday, Thursday 6–7 PM' }],
    isActive: true,
    sortOrder: 10,
  },
  {
    id: 'fallback-boxing-youth',
    sportType: 'BOXING',
    name: 'Boxing - Youth (Age 12–18)',
    description: 'Boxing training for ages 12–18.',
    descriptionBullets: [
      'Age group: 12–18 years.',
      'Sunday, Tuesday, Thursday 7–8 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'FIXED',
    currentPriceJod: 80,
    timeSlots: [{ label: 'Sunday, Tuesday, Thursday 7–8 PM' }],
    isActive: true,
    sortOrder: 11,
  },
  // --- Basketball ---
  {
    id: 'fallback-basketball-academy',
    sportType: 'BASKETBALL',
    name: 'Basketball Academy (Age 8–11)',
    description: 'Group academy programme for ages 8–11.',
    descriptionBullets: [
      'Age group: 8–11 years.',
      'Monday, Wednesday, Saturday 5–6 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: [{ label: 'Monday, Wednesday, Saturday 5–6 PM' }],
    isActive: true,
    sortOrder: 20,
  },
  {
    id: 'fallback-basketball-private',
    sportType: 'BASKETBALL',
    name: 'Basketball - Private Lessons',
    description: 'One-on-one private basketball coaching.',
    descriptionBullets: [
      'Monday, Wednesday, Saturday 6–7 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: [{ label: 'Monday, Wednesday, Saturday 6–7 PM' }],
    isActive: true,
    sortOrder: 21,
  },
  {
    id: 'fallback-basketball-small-group-u16',
    sportType: 'BASKETBALL',
    name: 'Basketball - Small Group U16',
    description: 'Small-group training for U16 players.',
    descriptionBullets: [
      'Monday, Wednesday 7–8 PM.',
      'Friday 11 AM–12 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: [{ label: 'Monday, Wednesday 7–8 PM' }, { label: 'Friday 11 AM–12 PM' }],
    isActive: true,
    sortOrder: 22,
  },
  {
    id: 'fallback-basketball-women',
    sportType: 'BASKETBALL',
    name: 'Basketball - Women',
    description: 'Basketball sessions for women.',
    descriptionBullets: [
      'Monday, Wednesday 8–9 PM.',
      'Saturday 4–5 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: [{ label: 'Monday, Wednesday 8–9 PM' }, { label: 'Saturday 4–5 PM' }],
    isActive: true,
    sortOrder: 23,
  },
  {
    id: 'fallback-basketball-young-men',
    sportType: 'BASKETBALL',
    name: 'Basketball - Young Men',
    description: 'Basketball sessions for young men.',
    descriptionBullets: [
      'Tuesday, Sunday 9–10 PM.',
      'Thursday 6–7 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: [{ label: 'Tuesday, Sunday 9–10 PM' }, { label: 'Thursday 6–7 PM' }],
    isActive: true,
    sortOrder: 24,
  },
  {
    id: 'fallback-basketball-girls-u16',
    sportType: 'BASKETBALL',
    name: 'Basketball - Girls U16',
    description: 'Basketball sessions for girls under 16.',
    descriptionBullets: [
      'Friday, Saturday 12–1 PM.',
      'Sunday 4–5 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: [{ label: 'Friday, Saturday 12–1 PM' }, { label: 'Sunday 4–5 PM' }],
    isActive: true,
    sortOrder: 25,
  },
  // --- Gymnastics ---
  {
    id: 'fallback-gymnastics-beginners',
    sportType: 'GYMNASTICS',
    name: 'Gymnastics - Beginners',
    description: 'Beginner gymnastics programme for new athletes.',
    descriptionBullets: [
      'Sunday, Tuesday, Friday 4:30–5:30 PM.',
      'Foundational body control and flexibility.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: [{ label: 'Sunday, Tuesday, Friday 4:30–5:30 PM' }],
    isActive: true,
    sortOrder: 30,
  },
  {
    id: 'fallback-gymnastics-advance',
    sportType: 'GYMNASTICS',
    name: 'Gymnastics - Advance',
    description: 'Advanced gymnastics training for experienced athletes.',
    descriptionBullets: [
      'Sunday, Tuesday, Friday 5:30–7:00 PM.',
      'Advanced movement combinations and technique refinement.',
    ],
    sessionsCount: 0,
    trackingType: 'DAYS',
    pricingType: 'FIXED',
    currentPriceJod: 140,
    timeSlots: [{ label: 'Sunday, Tuesday, Friday 5:30–7:00 PM' }],
    isActive: true,
    sortOrder: 31,
  },
];

const FALLBACK_COACHES: CoachResponse[] = [
  {
    id: 'fallback-coach-samer',
    name: 'Coach Samer Nino',
    sport: 'Basketball',
    description:
      'Founder of Infinity Sports Academy with extensive national team and club coaching experience focused on youth development.',
    quote: 'Developing disciplined athletes through modern training systems.',
    achievements: [
      'Former assistant coach for Jordan national teams',
      'Led multiple championship-winning age groups',
      'Founder of Infinity Sports Academy',
    ],
    imageUrl: '/samer.png',
    isActive: true,
    order: 1,
  },
  {
    id: 'fallback-coach-naef',
    name: 'Coach Naef Asfour',
    sport: 'Basketball',
    description: 'FIBA-licensed basketball coach specializing in player development, performance optimization, and tactical systems.',
    achievements: ['FIBA licensed coach', 'Head Coach of Fuhies Women Team', 'Arab Women Champions 2024'],
    imageUrl: '/naef-asfour.jpeg',
    isActive: true,
    order: 2,
  },
  {
    id: 'fallback-coach-raya',
    name: 'Coach Raya Abu Jamous',
    sport: 'Gymnastics',
    description: 'National-level athlete and experienced gymnastics coach with strong background in conditioning and strength training.',
    quote: 'Building strong foundations for long-term athletic success.',
    achievements: [],
    imageUrl: '/raya-abu-jamous.jpeg',
    isActive: true,
    order: 3,
  },
  {
    id: 'fallback-coach-ahmad',
    name: 'Coach Ahmad Aldarawish',
    sport: 'Gymnastics',
    description: 'Dedicated multi-sport athlete and coach focused on conditioning, endurance, and performance growth.',
    achievements: [],
    imageUrl: '/ahmad-aldarawesh.jpg',
    isActive: true,
    order: 4,
  },
  {
    id: 'fallback-coach-ammar',
    name: 'Coach Ammar Salman',
    sport: 'Gymnastics',
    description: 'Active athlete and coach with a disciplined training background in strength, endurance, and performance techniques.',
    achievements: [],
    imageUrl: '/ammar-salman.jpg',
    isActive: true,
    order: 5,
  },
  {
    id: 'fallback-coach-wahab',
    name: 'Coach Abdulwahab Abu Khanfar',
    sport: 'Volleyball',
    description: 'Former national team player and founder of Spikers Academy, experienced in youth player development.',
    achievements: ['Former Jordan national team member', 'Founder of Spikers Academy', 'Premier and First Division competition experience'],
    imageUrl: '/wahab-abu-khanfar.jpeg',
    isActive: true,
    order: 6,
  },
  {
    id: 'fallback-coach-leen',
    name: 'Coach Leen Al Qassem',
    sport: 'Volleyball',
    description: 'Former national team player with physical education background and coaching experience across schools and academies.',
    achievements: ['Former Jordan national team player', 'Physical education degree', 'FIVB coaching and refereeing certification'],
    imageUrl: '/leen.jpeg',
    isActive: true,
    order: 7,
  },
  {
    id: 'fallback-coach-rahaf',
    name: 'Coach Rahaf Haimour',
    sport: 'Volleyball',
    description: 'Experienced volleyball coach and mentor with strong communication and team leadership skills.',
    achievements: ['Former Jordan national team player', 'Youth mentorship and professional training experience'],
    imageUrl: '/rahaf-haimour.jpeg',
    isActive: true,
    order: 8,
  },
  {
    id: 'fallback-coach-raghad',
    name: 'Coach Raghad Haimour',
    sport: 'Volleyball',
    description: 'Professional volleyball player and coach with experience preparing athletes for competitions and tournaments.',
    achievements: ['Coach at Abd Alhammed Sharaf International School', 'Player with Al-Nassr club', 'Jordan national team member'],
    imageUrl: '/raghad-haimour.jpeg',
    isActive: true,
    order: 9,
  },
  {
    id: 'fallback-coach-abdullah',
    name: 'Coach Abdullah Yahya',
    sport: 'Volleyball',
    description: 'National team player and youth coach at Spikers Academy with official FIVB coaching certification.',
    achievements: ['Jordan men national team player', 'Spikers Academy youth coach', 'FIVB official coaching certificate'],
    imageUrl: '/abdallah-yahya.jpeg',
    isActive: true,
    order: 10,
  },
  {
    id: 'fallback-coach-ayham',
    name: 'Coach Ayham',
    sport: 'Volleyball',
    description: 'Volleyball coach and national-level player committed to youth athlete development.',
    achievements: ['Jordan men national team player', 'Spikers Academy youth coach'],
    imageUrl: '/ayham.jpeg',
    isActive: true,
    order: 11,
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

// Default to immediate freshness so Admin edits appear on Landing without delay.
const WEB_CACHE_TTL_MS = readMsFromEnv('WEB_API_CACHE_TTL_MS', 0);
const WEB_STALE_TTL_MS = readMsFromEnv('WEB_API_STALE_TTL_MS', 15 * 60_000);

function shouldUseSsl(connectionString: string): boolean {
  try {
    const parsed = new URL(connectionString);
    const host = parsed.hostname.toLowerCase();
    const sslMode = (parsed.searchParams.get('sslmode') || '').toLowerCase();
    if (sslMode === 'disable') return false;
    if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') return true;
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.local')) return false;
    return true;
  } catch {
    return /sslmode=require|ssl=true/i.test(connectionString);
  }
}

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

  // Shared-host deployments sometimes expose DB URL via runtime-env.json only.
  if (!process.env.DATABASE_URL?.trim()) {
    try {
      const req = (0, eval)('require') as (id: string) => unknown;
      const fs = req('fs') as {
        existsSync: (path: string) => boolean;
        readFileSync: (path: string, encoding: string) => string;
      };
      const path = req('path') as { join: (...parts: string[]) => string };
      const cwd = process.cwd();
      const candidates = [
        path.join(cwd, 'runtime-env.json'),
        path.join(cwd, 'hostinger-output', 'runtime-env.json'),
        path.join(cwd, '.builds', 'source', 'repository', 'hostinger-output', 'runtime-env.json'),
      ];
      for (const file of candidates) {
        if (!fs.existsSync(file)) continue;
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { DATABASE_URL?: string };
        if (typeof parsed.DATABASE_URL === 'string' && parsed.DATABASE_URL.trim()) {
          process.env.DATABASE_URL = parsed.DATABASE_URL.trim();
          break;
        }
      }
    } catch {
      // Ignore and continue with env-only resolution.
    }
  }

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

function getServerPgPool() {
  if (typeof window !== 'undefined') {
    throw new Error('getServerPgPool must run on the server');
  }

  const globalPg = globalThis as unknown as {
    __webApiPgPool?: {
      query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
    };
  };
  if (globalPg.__webApiPgPool) return globalPg.__webApiPgPool;

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing');
  }

  const req = (0, eval)('require') as (id: string) => { Pool: new (config: object) => unknown };
  const { Pool } = req('pg');
  const pool = new Pool({
    connectionString,
    max: Number.parseInt(process.env.PG_POOL_MAX || '1', 10) || 1,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: shouldUseSsl(connectionString)
      ? { rejectUnauthorized: process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true' }
      : undefined,
  }) as {
    query: <T = unknown>(text: string, values?: unknown[]) => Promise<{ rows: T[] }>;
  };
  globalPg.__webApiPgPool = pool;
  return pool;
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
    const landingRows = await prisma.landingCoach.findMany({
      where: { isActive: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    if (landingRows.length) {
      const mapped = landingRows.map((row) => ({
        id: row.id,
        name: row.name,
        sport: row.sport,
        description: row.description,
        quote: row.quote ?? undefined,
        achievements: Array.isArray(row.achievements) ? (row.achievements as string[]) : [],
        imageUrl: row.imageUrl,
        isActive: row.isActive,
        order: row.order,
      }));
      writeCache('coaches', mapped);
      return mapped;
    }

    // Secondary source: portal coaches table when landingCoach is empty.
    const portalRows = await prisma.coach.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });
    if (portalRows.length) {
      const mappedFromPortal = portalRows.map((row, index) => ({
        id: row.id,
        name: [row.firstName, row.lastName].filter(Boolean).join(' ').trim(),
        sport: row.specialty || 'Multi-Sport',
        description: row.bio || `${[row.firstName, row.lastName].filter(Boolean).join(' ').trim()} coaching profile.`,
        quote: undefined,
        achievements: [] as string[],
        imageUrl: '',
        isActive: true,
        order: index + 1,
      }));
      writeCache('coaches', mappedFromPortal);
      return mappedFromPortal;
    }

    writeCache('coaches', FALLBACK_COACHES);
    return FALLBACK_COACHES;
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

export async function fetchHero(): Promise<LandingHero | null> {
  if (!canUseDb()) return null;
  if (!(await canAttemptDatabaseQuery())) return null;
  try {
    const prisma = await getPrisma();
    const row = await prisma.heroSection.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!row) return null;
    return {
      title: row.title,
      subtitle: row.subtitle,
      primaryCtaLabel: row.primaryCta,
      primaryCtaLink: row.primaryUrl,
      secondaryCtaLabel: row.secondaryCta ?? undefined,
      secondaryCtaLink: row.secondaryUrl ?? undefined,
      backgroundImageUrl: row.backgroundImageUrl ?? undefined,
      backgroundVideoUrl: row.backgroundVideoUrl ?? undefined,
    };
  } catch (error) {
    noteDatabaseFailure('fetchHero', error);
    return null;
  }
}

export async function fetchFooter(): Promise<LandingFooter | null> {
  if (!canUseDb()) return null;
  if (!(await canAttemptDatabaseQuery())) return null;
  try {
    const prisma = await getPrisma();
    const row = await prisma.footerSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    if (!row) return null;
    const socialLinks = Array.isArray(row.socialLinks)
      ? (row.socialLinks as { id?: string; label?: string; href?: string }[]).map((l) => ({
          id: l.id ?? '',
          label: l.label ?? '',
          href: l.href ?? '',
        }))
      : [];
    return {
      address: row.address,
      phone: row.phone,
      email: row.email,
      contactRecipientEmail: row.contactRecipientEmail ?? undefined,
      socialLinks,
    };
  } catch (error) {
    noteDatabaseFailure('fetchFooter', error);
    return null;
  }
}

export function getLandingFallback(): LandingContent {
  const fallbackPrograms: LandingProgram[] = FALLBACK_PACKAGES.map((program) => {
    const slots = Array.isArray(program.timeSlots)
      ? (program.timeSlots as { label?: string }[])
          .map((s) => (typeof s === 'string' ? s : s?.label ?? ''))
          .filter(Boolean)
          .join(' · ')
      : undefined;
    const priceLabel =
      program.pricingType === 'MANUAL' || program.currentPriceJod == null
        ? 'Contact for pricing'
        : `${program.currentPriceJod} JOD`;
    return {
      id: program.id,
      title: program.name,
      description: program.description?.trim() || 'Program details available on the sports page.',
      sportType: program.sportType || 'multi',
      badge: program.sportType || undefined,
      link: `/sports#${(program.sportType || 'other').toLowerCase().replace(/\s+/g, '-')}`,
      mediaUrl: undefined,
      isFeatured: false,
      isActive: true,
      schedule: slots || undefined,
      priceLabel,
    };
  });

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

function mapPackageToProgram(program: PackageResponse): LandingProgram {
  const slots = Array.isArray(program.timeSlots)
    ? (program.timeSlots as { label?: string }[]).map((s) => (typeof s === 'string' ? s : s?.label ?? '')).filter(Boolean).join(' · ')
    : undefined;
  return {
    id: program.id,
    title: program.name,
    description: program.description?.trim() || 'Program details available on the sports page.',
    sportType: program.sportType || 'multi',
    badge: program.sportType || undefined,
    link: `/sports#${(program.sportType || 'other').toLowerCase().replace(/\s+/g, '-')}`,
    mediaUrl: undefined,
    isFeatured: false,
    isActive: program.isActive,
    schedule: slots || undefined,
    priceLabel: program.pricingType === 'MANUAL' || program.currentPriceJod == null ? 'Contact for pricing' : `${program.currentPriceJod} JOD`,
  };
}

function mapOfferToLanding(offer: OfferResponse): LandingOffer {
  return {
    id: offer.id,
    name: offer.name,
    price: offer.badge || `${offer.pricePerMonth} JOD/month`,
    description: offer.description || '',
    features: Array.isArray(offer.features) ? offer.features : [],
    badge: offer.badge,
    isFeatured: offer.isFeatured,
    isActive: offer.isActive,
    link: offer.link,
  };
}

function mapEventToLanding(event: EventResponse): LandingEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    location: event.location,
    description: event.description,
    link: event.link,
    isActive: true,
    imageUrl: event.imageUrl,
  };
}

function mapAnnouncementToLanding(a: AnnouncementResponse): LandingAnnouncement {
  return {
    id: a.id,
    title: a.title,
    message: a.body,
    isPinned: a.isPinned,
  };
}

function mapFacilityToLanding(f: FacilityResponse): LandingFacilityHighlight {
  return {
    id: f.id,
    name: f.name,
    description: f.description || '',
    mediaUrl: undefined,
    badge: undefined,
  };
}

async function _fetchLandingContent(): Promise<LandingContent> {
  const fresh = getFreshCache<LandingContent>('landingContent');
  if (fresh) return fresh;

  const stale = getStaleCache<LandingContent>('landingContent');
  if (!canUseDb()) return stale || getLandingFallback();

  try {
    const fallback = getLandingFallback();

    const [programs, hero, coaches, offers, events, announcements, facilities, footer] = await Promise.all([
      fetchPackages(),
      fetchHero(),
      fetchCoaches(),
      fetchOffers(),
      fetchEvents(),
      fetchAnnouncements(),
      fetchFacilities(),
      fetchFooter(),
    ]);

    const result: LandingContent = {
      hero: hero || fallback.hero,
      highlights: fallback.highlights,
      programs: programs.length > 0 ? programs.map(mapPackageToProgram) : fallback.programs,
      offers: offers.length > 0 ? offers.map(mapOfferToLanding) : fallback.offers,
      events: events.map(mapEventToLanding),
      announcements: announcements.map(mapAnnouncementToLanding),
      facilityHighlights: facilities.length > 0 ? facilities.map(mapFacilityToLanding) : fallback.facilityHighlights,
      footer: footer || fallback.footer,
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    writeCache('landingContent', result);
    return result;
  } catch (error) {
    if (stale) return stale;
    return getLandingFallback();
  }
}

export async function fetchLandingContent(): Promise<LandingContent> {
  return _fetchLandingContent();
}

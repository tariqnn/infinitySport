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
    id: 'fallback-package-little-kobes',
    sportType: 'BASKETBALL',
    name: 'Basketball - Little Kobes U10',
    description: 'U10 foundational basketball program focused on fun, movement skills, and core fundamentals.',
    descriptionBullets: [
      'Have fun and support healthy growth.',
      'Ball handling and dribbling fundamentals.',
      'Basic shooting skills and passing types.',
    ],
    sessionsCount: 0,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: null,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'fallback-package-volleyball',
    sportType: 'VOLLEYBALL',
    name: 'Volleyball',
    description: 'Volleyball program for ages 7+ with weekday and weekend training slots.',
    descriptionBullets: [
      'Starting age: 7 years and up.',
      '10% discount for siblings.',
      'Special rate for groups.',
      'Training schedule: Saturday 3:00-5:00 PM, Tuesday & Sunday 7:00-9:00 PM.',
    ],
    sessionsCount: 0,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: null,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'fallback-package-ballers-hoopers',
    sportType: 'BASKETBALL',
    name: 'Basketball - Ballers & Hoopers U12–U14',
    description: 'U12-U14 development track that builds confidence, court movement, and strong finishing basics.',
    descriptionBullets: [
      'U12 Ballers: stay confident and improve shooting with footwork.',
      'U12 Ballers: different types of finishing.',
      'U14 Hoopers: basic court movement and teamwork habits.',
      'U14 Hoopers: introduce form-shooting fundamentals.',
    ],
    sessionsCount: 12,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'fallback-package-warriors',
    sportType: 'BASKETBALL',
    name: 'Basketball - Warriors',
    description: 'U16+ skilled group focused on game IQ, team culture, and two-way performance.',
    descriptionBullets: [
      'Read game situations and make better decisions.',
      'Be a good teammate and lead by example.',
      'Refine offensive and defensive skills.',
    ],
    sessionsCount: 12,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: null,
    isActive: true,
    sortOrder: 30,
  },
  {
    id: 'fallback-package-private-1v1',
    sportType: 'BASKETBALL',
    name: 'Basketball - Private 1v1 Sessions',
    description: 'One-on-one personalized basketball training with focused technical correction and progression.',
    descriptionBullets: [
      'Individual skill assessment and customized plan.',
      'Focused shooting, footwork, and ball-handling correction.',
      'Flexible scheduling based on coach availability.',
    ],
    sessionsCount: 0,
    trackingType: 'SESSIONS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: null,
    isActive: true,
    sortOrder: 40,
  },
  {
    id: 'fallback-package-small-groups',
    sportType: 'BASKETBALL',
    name: 'Basketball - Small Groups',
    description: 'Small-group basketball sessions designed for faster development with close coach attention.',
    descriptionBullets: [
      'Low player-to-coach ratio.',
      'Game-like drills and competitive reps.',
      'Built for friends, siblings, and team clusters.',
    ],
    sessionsCount: 0,
    trackingType: 'SESSIONS',
    pricingType: 'MANUAL',
    currentPriceJod: null,
    timeSlots: null,
    isActive: true,
    sortOrder: 50,
  },
  {
    id: 'fallback-package-gym-a',
    sportType: 'GYMNASTICS',
    name: 'Gymnastics Package A',
    description: 'Beginner gymnastics package focused on mobility, balance, and confidence.',
    descriptionBullets: [
      'Foundational body control and flexibility.',
      'Safe progressions for basic gymnastics skills.',
      'Great entry point for new athletes.',
    ],
    sessionsCount: 12,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: null,
    isActive: true,
    sortOrder: 60,
  },
  {
    id: 'fallback-package-gym-b',
    sportType: 'GYMNASTICS',
    name: 'Gymnastics Package B',
    description: 'Early-intermediate gymnastics package for strength, posture, and coordination.',
    descriptionBullets: [
      'Technique refinement with structured drills.',
      'Improved core stability and movement quality.',
      'Progress tracking through coached milestones.',
    ],
    sessionsCount: 8,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 100,
    timeSlots: null,
    isActive: true,
    sortOrder: 70,
  },
  {
    id: 'fallback-package-gym-c',
    sportType: 'GYMNASTICS',
    name: 'Gymnastics Package C',
    description: 'Extended gymnastics package with higher volume for faster technical development.',
    descriptionBullets: [
      'More sessions for accelerated progress.',
      'Advanced movement combinations.',
      'Consistency-focused development cycle.',
    ],
    sessionsCount: 18,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 140,
    timeSlots: null,
    isActive: true,
    sortOrder: 80,
  },
  {
    id: 'fallback-package-gym-d',
    sportType: 'GYMNASTICS',
    name: 'Gymnastics Package D',
    description: 'Performance-oriented gymnastics package balancing skill work and conditioning.',
    descriptionBullets: [
      'Balanced technical and physical development.',
      'Coach-guided progression and corrections.',
      'Suitable for athletes preparing for higher levels.',
    ],
    sessionsCount: 12,
    trackingType: 'SESSIONS',
    pricingType: 'FIXED',
    currentPriceJod: 120,
    timeSlots: null,
    isActive: true,
    sortOrder: 90,
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
    ssl: /sslmode=require|ssl=true/i.test(connectionString)
      ? { rejectUnauthorized: false }
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
  try {
    const pool = getServerPgPool();
    const result = await pool.query<{
      id: string;
      sportType: string;
      name: string;
      description: string | null;
      descriptionBullets: unknown;
      sessionsCount: number;
      trackingType: string;
      pricingType: string;
      currentPriceJod: number | null;
      timeSlots: unknown;
      isActive: boolean;
      sortOrder: number;
    }>(
      `
      SELECT
        "id",
        "sportType",
        "name",
        "description",
        "descriptionBullets",
        "sessionsCount",
        "trackingType",
        "pricingType",
        "currentPriceJod",
        "timeSlots",
        "isActive",
        "sortOrder"
      FROM "Package"
      WHERE "isActive" = true
      ORDER BY "sortOrder" ASC, "name" ASC
      `,
    );
    const rows = result.rows;
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
  try {
    const pool = getServerPgPool();
    const landingResult = await pool.query<{
      id: string;
      name: string;
      sport: string;
      description: string;
      quote: string | null;
      achievements: unknown;
      imageUrl: string;
      isActive: boolean;
      order: number;
    }>(
      `
      SELECT
        "id",
        "name",
        "sport",
        "description",
        "quote",
        "achievements",
        "imageUrl",
        "isActive",
        "order"
      FROM "LandingCoach"
      WHERE "isActive" = true
      ORDER BY "order" ASC, "createdAt" ASC
      `,
    );
    const landingRows = landingResult.rows;
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

    // Secondary source: portal coaches table (firstName/lastName) when landingCoach is empty.
    const portalResult = await pool.query<{
      id: string;
      firstName: string;
      lastName: string;
      specialty: string | null;
      bio: string | null;
      status: string;
    }>(
      `
      SELECT "id", "firstName", "lastName", "specialty", "bio", "status"
      FROM "Coach"
      WHERE "status" = 'ACTIVE'
      ORDER BY "createdAt" ASC
      `,
    );
    const portalRows = portalResult.rows;
    if (portalRows.length) {
      const mappedFromPortal = portalRows.map((row, index) => ({
        id: row.id,
        name: [row.firstName, row.lastName].filter(Boolean).join(' ').trim(),
        sport: row.specialty || 'Multi-Sport',
        description: row.bio || `${[row.firstName, row.lastName].filter(Boolean).join(' ').trim()} coaching profile.`,
        quote: undefined,
        achievements: [],
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
    const programs = await fetchPackages();
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
    if (stale) return stale;
    const fallback = getLandingFallback();
    const livePrograms = await fetchPackages();
    if (!livePrograms.length) return fallback;
    return {
      ...fallback,
      programs: livePrograms.map((program): LandingProgram => ({
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
    };
  }
}

export async function fetchLandingContent(): Promise<LandingContent> {
  return _fetchLandingContent();
}

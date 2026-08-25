import { neon } from '@neondatabase/serverless';
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
  endAt?: string;
  location?: string;
  description?: string;
  imageUrl?: string;
  slug?: string;
  videoUrl?: string;
  galleryUrls?: string[];
  contentType?: 'GALLERY' | 'VIDEO';
  registrationUrl?: string;
  registrationEnabled?: boolean;
  tournamentOptions?: string[];
  jerseySizes?: string[];
  link?: string;
  highlight?: boolean;
};

const BASKETBALL_SUMMER_CAMP_EVENT: EventResponse = {
  id: 'basketball-summer-camp',
  title: 'Basketball Summer Camp',
  date: '2026-07-01T06:00:00.000Z',
  location: 'Infinity Sports Academy',
  description:
    'Basketball summer camp registration with medical notes, uniform size, transport, media consent, and emergency contact details.',
  imageUrl: '/hero-basketball.jpg',
  slug: 'basketball-summer-camp',
  contentType: 'GALLERY',
  link: '/events/basketball-summer-camp/register',
  registrationUrl: '/events/basketball-summer-camp/register',
  highlight: true,
};

const WARRIORS_ASSISTANT_COACH_EVENT: EventResponse = {
  id: 'warriors-assistant-coach-camp',
  title: 'Warriors Assistant Coach 1-Week Camp',
  date: '2026-07-21T06:00:00.000Z',
  location: 'Infinity Sports Academy',
  imageUrl: '/warriors-assistant-coach-camp.jpg',
  slug: 'warriors-assistant-coach-camp',
  contentType: 'GALLERY',
  link: '/events/warriors-assistant-coach-camp/register',
  registrationUrl: '/events/warriors-assistant-coach-camp/register',
  highlight: true,
};

const INFINITY_3X3_EVENT: EventResponse = {
  id: 'infinity-3x3-championship',
  title: 'Infinity 3x3 Championship',
  date: '2026-10-09T14:00:00.000Z',
  endAt: '2026-10-10T20:00:00.000Z',
  location: 'Infinity Sports Academy · FIBA 3x3 Court',
  description:
    'Register for the Infinity Sports 3x3 Championship. Divisions are available for men, women, boys, and girls.',
  imageUrl: '/hero-basketball.jpg',
  slug: 'infinity-3x3-championship',
  contentType: 'GALLERY',
  registrationEnabled: true,
  tournamentOptions: ['Men', 'Women', 'Boys U18', 'Girls U18', 'Boys U16', 'Girls U16'],
  jerseySizes: ['Youth S', 'Youth M', 'Youth L', 'XS', 'S', 'M', 'L', 'XL', '2XL'],
  highlight: true,
};

function isBasketballSummerCampEvent(event: Pick<EventResponse, 'title' | 'id'>) {
  const normalized = event.title.trim().toLowerCase();
  return (
    event.id === BASKETBALL_SUMMER_CAMP_EVENT.id ||
    normalized === 'basketball summer camp' ||
    (normalized.includes('basketball') && normalized.includes('summer camp'))
  );
}

function isWarriorsAssistantCoachCampEvent(event: Pick<EventResponse, 'title' | 'id'>) {
  const normalized = event.title.trim().toLowerCase();
  return (
    event.id === WARRIORS_ASSISTANT_COACH_EVENT.id ||
    ((normalized.includes('warriors') || normalized.includes('nba')) &&
      normalized.includes('coach') &&
      normalized.includes('camp'))
  );
}

function is3x3RegistrationEvent(event: EventResponse) {
  return (
    event.id === INFINITY_3X3_EVENT.id ||
    event.slug === INFINITY_3X3_EVENT.slug ||
    (event.title.toLowerCase().includes('3x3') && Boolean(event.registrationEnabled))
  );
}

function mergeRequiredSummerCampEvents(events: EventResponse[], include3x3Fallback = false) {
  let hasBasketballCamp = false;
  let hasWarriorsCamp = false;
  let has3x3Event = false;

  const merged = events.map((event) => {
    if (isBasketballSummerCampEvent(event)) {
      hasBasketballCamp = true;
      return {
        ...event,
        slug: BASKETBALL_SUMMER_CAMP_EVENT.slug,
        date: BASKETBALL_SUMMER_CAMP_EVENT.date,
        imageUrl: event.imageUrl || BASKETBALL_SUMMER_CAMP_EVENT.imageUrl,
        link: BASKETBALL_SUMMER_CAMP_EVENT.link,
        registrationUrl: BASKETBALL_SUMMER_CAMP_EVENT.registrationUrl,
        highlight: event.highlight ?? BASKETBALL_SUMMER_CAMP_EVENT.highlight,
      };
    }
    if (isWarriorsAssistantCoachCampEvent(event)) {
      hasWarriorsCamp = true;
      return {
        ...event,
        id: WARRIORS_ASSISTANT_COACH_EVENT.id,
        slug: WARRIORS_ASSISTANT_COACH_EVENT.slug,
        title: WARRIORS_ASSISTANT_COACH_EVENT.title,
        date: WARRIORS_ASSISTANT_COACH_EVENT.date,
        description: event.description || WARRIORS_ASSISTANT_COACH_EVENT.description,
        imageUrl: event.imageUrl || WARRIORS_ASSISTANT_COACH_EVENT.imageUrl,
        link: WARRIORS_ASSISTANT_COACH_EVENT.link,
        registrationUrl: WARRIORS_ASSISTANT_COACH_EVENT.registrationUrl,
        highlight: event.highlight ?? WARRIORS_ASSISTANT_COACH_EVENT.highlight,
      };
    }
    if (is3x3RegistrationEvent(event)) {
      has3x3Event = true;
    }
    return event;
  });

  if (!hasBasketballCamp) merged.push(BASKETBALL_SUMMER_CAMP_EVENT);
  if (!hasWarriorsCamp) merged.push(WARRIORS_ASSISTANT_COACH_EVENT);
  if (!has3x3Event && include3x3Fallback) merged.push(INFINITY_3X3_EVENT);

  return merged.sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());
}

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
  durationMonths: number;
  sessionsCount: number;
  trackingType: string;
  pricingType: string;
  currentPriceJod: number | null;
  timeSlots: unknown;
  isActive: boolean;
  showOnWebsite: boolean;
  sortOrder: number;
};

const FALLBACK_FACILITIES: { id: string; name: string; description: string }[] = [
  { id: 'iba-5x5', name: 'FIBA Approved Court 5x5', description: 'Full-size basketball court meeting FIBA standards for official 5x5 play.' },
  { id: 'fiba-3x3', name: 'FIBA Approved 3x3 Court', description: 'FIBA-approved half-court for official 3x3 basketball.' },
  { id: 'multipurpose-hall', name: 'Multipurpose Hall', description: 'Suitable for Yoga, Pilates, Ballet, Kickboxing, and more.' },
  { id: 'padel-merry', name: 'Padel Court by Merry Sports', description: 'Professional padel court by Merry Sports.' },
  { id: 'volleyball', name: 'Official Volleyball Court', description: 'Full-size official volleyball court.' },
];

const FALLBACK_PACKAGES: PackageResponse[] = ([
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
    id: 'fallback-basketball-men',
    sportType: 'BASKETBALL',
    name: 'Basketball - Men',
    description: 'Basketball sessions for men.',
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
]).map((pkg) => ({
  ...pkg,
  durationMonths: 1,
  showOnWebsite: true,
}));

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

// Cache for 2 minutes so the DB isn't hit on every page load.
// Admin edits appear on the landing page within ~2 minutes.
const WEB_CACHE_TTL_MS = readMsFromEnv('WEB_API_CACHE_TTL_MS', 120_000);
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

function getNeonSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is missing');
  // Neon serverless needs the non-pooler endpoint — replace -pooler if present
  const httpUrl = url.replace('-pooler.', '.');
  return neon(httpUrl);
}

// All individual fetch functions use Neon serverless (pure HTTP, no native deps)

export async function fetchPrograms(): Promise<ProgramResponse[]> {
  if (!canUseDb()) return [];
  if (!(await canAttemptDatabaseQuery())) return [];
  try {
    const sql = getNeonSql();
    const rows = await sql`SELECT "id","name","description","slug","highlight","level" FROM "Program" ORDER BY "order" ASC, "createdAt" ASC`;
    return rows.map((row) => ({
      id: row.id as string, name: row.name as string, description: (row.description as string) ?? '',
      slug: (row.slug as string) ?? undefined, highlight: row.highlight as boolean, level: (row.level as string) ?? undefined,
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
    const sql = getNeonSql();
    const rows = await sql`SELECT "id","sportType","name","description","descriptionBullets","durationMonths","sessionsCount","trackingType","pricingType","currentPriceJod","timeSlots","isActive","showOnWebsite","sortOrder" FROM "Package" WHERE "isActive" = true AND "showOnWebsite" = true ORDER BY "sortOrder" ASC, "name" ASC`;
    if (!rows.length) {
      writeCache('packages', FALLBACK_PACKAGES);
      return FALLBACK_PACKAGES;
    }
    const mapped = rows.map((row) => ({
      id: row.id as string, sportType: row.sportType as string, name: row.name as string,
      description: row.description as string | null,
      descriptionBullets: Array.isArray(row.descriptionBullets) ? (row.descriptionBullets as string[]) : null,
      durationMonths: Math.max(1, Number(row.durationMonths ?? 1) || 1),
      sessionsCount: row.sessionsCount as number, trackingType: row.trackingType as string,
      pricingType: row.pricingType as string, currentPriceJod: row.currentPriceJod as number | null,
      timeSlots: row.timeSlots as unknown, isActive: row.isActive as boolean, showOnWebsite: Boolean(row.showOnWebsite ?? true), sortOrder: row.sortOrder as number,
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
    const sql = getNeonSql();
    const rows = await sql`SELECT "id","name","pricePerMonth","description","features","badge" FROM "Offer" ORDER BY "order" ASC, "createdAt" ASC`;
    return rows.map((row) => ({
      id: row.id as string, name: row.name as string, pricePerMonth: row.pricePerMonth as number,
      description: (row.description as string) ?? '', features: Array.isArray(row.features) ? row.features as string[] : [],
      badge: (row.badge as string) ?? undefined, isFeatured: false, isActive: true, link: undefined,
    }));
  } catch (error) {
    noteDatabaseFailure('fetchOffers', error);
    return [];
  }
}

export async function fetchEvents(): Promise<EventResponse[]> {
  if (!canUseDb()) return mergeRequiredSummerCampEvents([], true);
  if (!(await canAttemptDatabaseQuery())) return mergeRequiredSummerCampEvents([], true);
  try {
    const sql = getNeonSql();
    const rows = await sql`
      SELECT
        "id", "title", "slug", "date", "endAt", "location", "description",
        "imageUrl", "videoUrl", "galleryUrls", "contentType",
        "registrationUrl", "registrationEnabled", "tournamentOptions", "jerseySizes", "highlight"
      FROM "Event"
      ORDER BY "date" ASC
    `;
    const mappedEvents = rows.map((row): EventResponse => ({
      id: row.id as string, title: row.title as string,
      date: typeof row.date === 'string' ? row.date : String(row.date),
      endAt: row.endAt ? (typeof row.endAt === 'string' ? row.endAt : String(row.endAt)) : undefined,
      location: (row.location as string) ?? undefined, description: (row.description as string) ?? undefined,
      imageUrl: (row.imageUrl as string) ?? undefined,
      slug: (row.slug as string) ?? undefined,
      videoUrl: (row.videoUrl as string) ?? undefined,
      galleryUrls: Array.isArray(row.galleryUrls) ? row.galleryUrls as string[] : [],
      contentType: row.contentType === 'VIDEO' ? 'VIDEO' : 'GALLERY',
      registrationUrl: (row.registrationUrl as string) ?? undefined,
      registrationEnabled: Boolean(row.registrationEnabled),
      tournamentOptions: Array.isArray(row.tournamentOptions) ? row.tournamentOptions as string[] : [],
      jerseySizes: Array.isArray(row.jerseySizes) ? row.jerseySizes as string[] : [],
      link: (row.registrationUrl as string) ?? undefined,
      highlight: row.highlight as boolean,
    }));
    const hasConfigured3x3Event = mappedEvents.some(is3x3RegistrationEvent);
    return mergeRequiredSummerCampEvents(
      mappedEvents.filter((event) => event.highlight !== false),
      !hasConfigured3x3Event,
    );
  } catch (error) {
    noteDatabaseFailure('fetchEvents', error);
    return mergeRequiredSummerCampEvents([], true);
  }
}

export async function fetchEventBySlug(slugOrId: string): Promise<EventResponse | null> {
  const events = await fetchEvents();
  return events.find((event) => event.slug === slugOrId || event.id === slugOrId) ?? null;
}

export async function fetchCoaches(): Promise<CoachResponse[]> {
  const fresh = getFreshCache<CoachResponse[]>('coaches');
  if (fresh) return fresh;

  const stale = getStaleCache<CoachResponse[]>('coaches');
  if (!canUseDb()) return stale || FALLBACK_COACHES;
  if (!(await canAttemptDatabaseQuery())) return stale || FALLBACK_COACHES;
  try {
    const sql = getNeonSql();
    const landingRows = await sql`SELECT "id","name","sport","description","quote","achievements","imageUrl","isActive","order" FROM "LandingCoach" WHERE "isActive" = true ORDER BY "order" ASC, "createdAt" ASC`;
    if (landingRows.length) {
      const mapped = landingRows.map((row) => ({
        id: row.id as string, name: row.name as string, sport: row.sport as string,
        description: row.description as string, quote: (row.quote as string) ?? undefined,
        achievements: Array.isArray(row.achievements) ? (row.achievements as string[]) : [],
        imageUrl: row.imageUrl as string, isActive: row.isActive as boolean, order: row.order as number,
      }));
      writeCache('coaches', mapped);
      return mapped;
    }

    const portalRows = await sql`SELECT "id","firstName","lastName","specialty","bio" FROM "Coach" WHERE "status" = 'ACTIVE' ORDER BY "createdAt" ASC`;
    if (portalRows.length) {
      const mappedFromPortal = portalRows.map((row, index) => ({
        id: row.id as string,
        name: [row.firstName, row.lastName].filter(Boolean).join(' ').trim(),
        sport: (row.specialty as string) || 'Multi-Sport',
        description: (row.bio as string) || `${[row.firstName, row.lastName].filter(Boolean).join(' ').trim()} coaching profile.`,
        quote: undefined, achievements: [] as string[], imageUrl: '', isActive: true, order: index + 1,
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
  const fallbackFacilities = FALLBACK_FACILITIES.map((item) => ({ id: item.id, name: item.name, description: item.description }));
  if (!canUseDb()) return fallbackFacilities;
  if (!(await canAttemptDatabaseQuery())) return fallbackFacilities;
  try {
    const sql = getNeonSql();
    const rows = await sql`SELECT "id","name","description","imageUrl" FROM "FacilityHighlight" ORDER BY "order" ASC, "createdAt" ASC`;
    if (rows.length === 0) return fallbackFacilities;
    return rows.map((row) => ({
      id: row.id as string, name: row.name as string, description: (row.description as string) ?? '',
      imageUrl: (row.imageUrl as string) ?? undefined, specs: undefined,
    }));
  } catch (error) {
    noteDatabaseFailure('fetchFacilities', error);
    return fallbackFacilities;
  }
}

export async function fetchAnnouncements(): Promise<AnnouncementResponse[]> {
  if (!canUseDb()) return [];
  if (!(await canAttemptDatabaseQuery())) return [];
  try {
    const sql = getNeonSql();
    const rows = await sql`SELECT "id","title","body","isPinned" FROM "Announcement" ORDER BY "isPinned" DESC, "publishedAt" DESC`;
    return rows.map((row) => ({
      id: row.id as string, title: row.title as string, body: row.body as string, isPinned: row.isPinned as boolean,
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
    const sql = getNeonSql();
    const rows = await sql`SELECT "title","subtitle","primaryCta","primaryUrl","secondaryCta","secondaryUrl","backgroundImageUrl","backgroundVideoUrl" FROM "HeroSection" ORDER BY "updatedAt" DESC LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      title: row.title as string, subtitle: row.subtitle as string,
      primaryCtaLabel: row.primaryCta as string, primaryCtaLink: row.primaryUrl as string,
      secondaryCtaLabel: (row.secondaryCta as string) ?? undefined, secondaryCtaLink: (row.secondaryUrl as string) ?? undefined,
      backgroundImageUrl: (row.backgroundImageUrl as string) ?? undefined, backgroundVideoUrl: (row.backgroundVideoUrl as string) ?? undefined,
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
    const sql = getNeonSql();
    const rows = await sql`SELECT "address","phone","email","contactRecipientEmail","socialLinks" FROM "FooterSettings" ORDER BY "updatedAt" DESC LIMIT 1`;
    const row = rows[0];
    if (!row) return null;
    const socialLinks = Array.isArray(row.socialLinks)
      ? (row.socialLinks as { id?: string; label?: string; href?: string }[]).map((l) => ({
          id: l.id ?? '', label: l.label ?? '', href: l.href ?? '',
        }))
      : [];
    return {
      address: row.address as string, phone: row.phone as string, email: row.email as string,
      contactRecipientEmail: (row.contactRecipientEmail as string) ?? undefined, socialLinks,
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
  if (!(await canAttemptDatabaseQuery())) return stale || getLandingFallback();

  try {
    const fallback = getLandingFallback();
    const sql = getNeonSql();

    // Single HTTP request to Neon — no native binaries, no pg module needed
    const rows = await sql`
      SELECT
        (SELECT COALESCE(json_agg(r ORDER BY r."sortOrder" ASC, r."name" ASC), '[]'::json) FROM (SELECT * FROM "Package" WHERE "isActive" = true AND "showOnWebsite" = true) r) AS packages,
        (SELECT row_to_json(h) FROM (SELECT * FROM "HeroSection" ORDER BY "updatedAt" DESC LIMIT 1) h) AS hero,
        (SELECT COALESCE(json_agg(c ORDER BY c."order" ASC, c."createdAt" ASC), '[]'::json) FROM (SELECT * FROM "LandingCoach" WHERE "isActive" = true) c) AS coaches,
        (SELECT COALESCE(json_agg(o ORDER BY o."order" ASC, o."createdAt" ASC), '[]'::json) FROM (SELECT * FROM "Offer") o) AS offers,
        (SELECT COALESCE(json_agg(e ORDER BY e."date" ASC), '[]'::json) FROM (SELECT * FROM "Event" WHERE "highlight" = true) e) AS events,
        (SELECT COALESCE(json_agg(a ORDER BY a."isPinned" DESC, a."publishedAt" DESC), '[]'::json) FROM (SELECT * FROM "Announcement") a) AS announcements,
        (SELECT COALESCE(json_agg(f ORDER BY f."order" ASC, f."createdAt" ASC), '[]'::json) FROM (SELECT * FROM "FacilityHighlight") f) AS facilities,
        (SELECT row_to_json(fs) FROM (SELECT * FROM "FooterSettings" ORDER BY "updatedAt" DESC LIMIT 1) fs) AS footer
    `;

    const data = rows[0] as Record<string, unknown>;

    // Map packages
    const pkgs = Array.isArray(data.packages) ? data.packages as Record<string, unknown>[] : [];
    const programs = pkgs.length > 0
      ? pkgs.map((row) => mapPackageToProgram({
          id: row.id as string, sportType: row.sportType as string, name: row.name as string,
          description: row.description as string | null,
          descriptionBullets: Array.isArray(row.descriptionBullets) ? row.descriptionBullets as string[] : null,
          durationMonths: Math.max(1, Number(row.durationMonths ?? 1) || 1),
          sessionsCount: row.sessionsCount as number, trackingType: row.trackingType as string,
          pricingType: row.pricingType as string, currentPriceJod: row.currentPriceJod as number | null,
          timeSlots: row.timeSlots as unknown, isActive: row.isActive as boolean, showOnWebsite: Boolean(row.showOnWebsite ?? true), sortOrder: row.sortOrder as number,
        }))
      : fallback.programs;

    // Map hero
    const heroData = data.hero as Record<string, unknown> | null;
    const hero: LandingHero | null = heroData ? {
      title: heroData.title as string, subtitle: heroData.subtitle as string,
      primaryCtaLabel: heroData.primaryCta as string, primaryCtaLink: heroData.primaryUrl as string,
      secondaryCtaLabel: (heroData.secondaryCta as string) ?? undefined,
      secondaryCtaLink: (heroData.secondaryUrl as string) ?? undefined,
      backgroundImageUrl: (heroData.backgroundImageUrl as string) ?? undefined,
      backgroundVideoUrl: (heroData.backgroundVideoUrl as string) ?? undefined,
    } : null;

    // Map offers
    const offerData = Array.isArray(data.offers) ? data.offers as Record<string, unknown>[] : [];
    const offers = offerData.map((row): LandingOffer => ({
      id: row.id as string, name: row.name as string,
      price: (row.badge as string) || `${row.pricePerMonth} JOD/month`,
      description: (row.description as string) ?? '',
      features: Array.isArray(row.features) ? row.features as string[] : [],
      badge: (row.badge as string) ?? undefined, isFeatured: false, isActive: true, link: undefined,
    }));

    // Map events
    const eventData = Array.isArray(data.events) ? data.events as Record<string, unknown>[] : [];
    const events = mergeRequiredSummerCampEvents(eventData.map((row): EventResponse => ({
      id: row.id as string, title: row.title as string,
      date: typeof row.date === 'string' ? row.date : String(row.date),
      endAt: row.endAt ? (typeof row.endAt === 'string' ? row.endAt : String(row.endAt)) : undefined,
      location: (row.location as string) ?? undefined, description: (row.description as string) ?? undefined,
      slug: (row.slug as string) ?? undefined,
      videoUrl: (row.videoUrl as string) ?? undefined,
      galleryUrls: Array.isArray(row.galleryUrls) ? row.galleryUrls as string[] : [],
      contentType: row.contentType === 'VIDEO' ? 'VIDEO' : 'GALLERY',
      registrationUrl: (row.registrationUrl as string) ?? undefined,
      registrationEnabled: Boolean(row.registrationEnabled),
      tournamentOptions: Array.isArray(row.tournamentOptions) ? row.tournamentOptions as string[] : [],
      jerseySizes: Array.isArray(row.jerseySizes) ? row.jerseySizes as string[] : [],
      link: (row.registrationUrl as string) ?? undefined,
      imageUrl: (row.imageUrl as string) ?? undefined,
      highlight: Boolean(row.highlight),
    }))).map((event): LandingEvent => ({
      ...event,
      isActive: true,
    }));

    // Map announcements
    const annData = Array.isArray(data.announcements) ? data.announcements as Record<string, unknown>[] : [];
    const announcements = annData.map((row): LandingAnnouncement => ({
      id: row.id as string, title: row.title as string, message: row.body as string, isPinned: row.isPinned as boolean,
    }));

    // Map facilities
    const facData = Array.isArray(data.facilities) ? data.facilities as Record<string, unknown>[] : [];
    const facilityHighlights = facData.length > 0
      ? facData.map((row): LandingFacilityHighlight => ({
          id: row.id as string, name: row.name as string, description: (row.description as string) ?? '',
          mediaUrl: undefined, badge: undefined,
        }))
      : fallback.facilityHighlights;

    // Map footer
    const footerData = data.footer as Record<string, unknown> | null;
    const footer: LandingFooter | null = footerData ? {
      address: footerData.address as string, phone: footerData.phone as string, email: footerData.email as string,
      contactRecipientEmail: (footerData.contactRecipientEmail as string) ?? undefined,
      socialLinks: Array.isArray(footerData.socialLinks)
        ? (footerData.socialLinks as { id?: string; label?: string; href?: string }[]).map((l) => ({
            id: l.id ?? '', label: l.label ?? '', href: l.href ?? '',
          }))
        : [],
    } : null;

    const result: LandingContent = {
      hero: hero || fallback.hero,
      highlights: fallback.highlights,
      programs,
      offers: offers.length > 0 ? offers : fallback.offers,
      events,
      announcements,
      facilityHighlights,
      footer: footer || fallback.footer,
      updatedAt: new Date().toISOString(),
      updatedBy: 'System',
    };
    writeCache('landingContent', result);
    return result;
  } catch (error) {
    noteDatabaseFailure('fetchLandingContent', error);
    if (stale) return stale;
    return getLandingFallback();
  }
}

export async function fetchLandingContent(): Promise<LandingContent> {
  return _fetchLandingContent();
}

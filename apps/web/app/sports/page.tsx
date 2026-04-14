import Link from 'next/link';
import { fetchPackages } from '../../lib/apiClient';

export const metadata = {
  title: 'Sports & Programs | Infinity Sports',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type PackageItem = Awaited<ReturnType<typeof fetchPackages>>[number];

const SPORT_ORDER = ['VOLLEYBALL', 'BOXING', 'BASKETBALL', 'GYMNASTICS'];

/* Sport-specific SVG icons (athletic silhouettes), accent colors, taglines */
const SPORT_META: Record<string, {
  tagline: string;
  accent: string;
  accentLight: string;
  accentDark: string;
  iconSvg: React.ReactNode;
}> = {
  VOLLEYBALL: {
    tagline: 'Powered by Spikers Academy',
    accent: '#141AFF',
    accentLight: '#141AFF',
    accentDark: '#0A1F8C',
    iconSvg: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" opacity="0.9"/>
        <path d="M32 4C32 4 20 20 20 32C20 44 32 60 32 60" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
        <path d="M4 32C4 32 20 20 32 20C44 20 60 32 60 32" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>
        <path d="M8 16C8 16 24 28 32 32C40 36 56 48 56 48" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
  BASKETBALL: {
    tagline: 'Infinity Sports Basketball Academy',
    accent: '#141AFF',
    accentLight: '#4A7FFF',
    accentDark: '#0A1F8C',
    iconSvg: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" opacity="0.9"/>
        <path d="M32 4V60" stroke="currentColor" strokeWidth="2.5" opacity="0.7"/>
        <path d="M4 32H60" stroke="currentColor" strokeWidth="2.5" opacity="0.7"/>
        <path d="M10 10C20 20 28 28 28 32C28 36 20 44 10 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
        <path d="M54 10C44 20 36 28 36 32C36 36 44 44 54 54" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
  GYMNASTICS: {
    tagline: 'Powered by Phoenix Academy',
    accent: '#60D066',
    accentLight: '#60D066',
    accentDark: '#1A4D3A',
    iconSvg: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <circle cx="32" cy="12" r="6" stroke="currentColor" strokeWidth="2.5" opacity="0.9"/>
        <path d="M32 18V36" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M32 36L20 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M32 36L44 52" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M18 24L32 28L46 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.8"/>
      </svg>
    ),
  },
  BOXING: {
    tagline: 'Train like a champion',
    accent: '#141AFF',
    accentLight: '#141AFF',
    accentDark: '#0A1F8C',
    iconSvg: (
      <svg viewBox="0 0 64 64" fill="none" className="h-full w-full">
        <path d="M16 20C16 14 20 10 28 10H36C42 10 48 14 48 22V34C48 40 44 44 38 44H26C20 44 16 40 16 34V20Z" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.9"/>
        <path d="M24 44V54" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M40 44V54" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M20 54H44" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        <path d="M28 22V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
        <path d="M36 22V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
      </svg>
    ),
  },
};

function normalizeSport(value: string): string {
  return (value || 'OTHER').trim().toUpperCase();
}

function displaySport(value: string): string {
  const normalized = normalizeSport(value);
  if (normalized === 'BASKETBALL') return 'Basketball';
  if (normalized === 'BOXING') return 'Boxing';
  if (normalized === 'GYMNASTICS') return 'Gymnastics';
  if (normalized === 'VOLLEYBALL') return 'Volleyball';
  return value || 'Other';
}

function cleanProgramTitle(name: string, sportType: string): string {
  const sport = displaySport(sportType);
  const withDash = `${sport} - `;
  if (name.startsWith(withDash)) return name.slice(withDash.length).trim();
  if (name.toLowerCase().startsWith(`${sport.toLowerCase()} `)) return name.slice(sport.length).trim();
  return name;
}

function isContactPricing(program: PackageItem): boolean {
  return program.pricingType === 'MANUAL' || program.currentPriceJod == null;
}

function getBullets(program: PackageItem): string[] {
  if (Array.isArray(program.descriptionBullets) && program.descriptionBullets.length > 0) {
    return program.descriptionBullets.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (program.description && program.description.trim().length > 0) {
    return [program.description.trim()];
  }
  return [];
}

function getTimeSlots(program: PackageItem): string[] {
  if (!program.timeSlots) return [];
  if (Array.isArray(program.timeSlots)) {
    return program.timeSlots
      .map((entry) => {
        if (typeof entry === 'string') return entry.trim();
        if (entry && typeof entry === 'object' && 'label' in entry && typeof (entry as { label?: unknown }).label === 'string') {
          return String((entry as { label: string }).label).trim();
        }
        return '';
      })
      .filter(Boolean);
  }
  return [];
}

export default async function SportsPage() {
  const programsData = await fetchPackages();

  const groups = new Map<string, PackageItem[]>();
  for (const program of programsData) {
    const key = normalizeSport(program.sportType);
    const list = groups.get(key) || [];
    list.push(program);
    groups.set(key, list);
  }

  const orderedSports = [
    ...SPORT_ORDER.filter((sport) => groups.has(sport)),
    ...Array.from(groups.keys()).filter((sport) => !SPORT_ORDER.includes(sport)),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-black">
        {/* Dynamic background shapes */}
        <div className="absolute inset-0">
          <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#141AFF]/20 blur-[120px]" />
          <div className="absolute -right-32 top-1/2 h-80 w-80 rounded-full bg-[#60D066]/15 blur-[100px]" />
          <div className="absolute bottom-0 left-1/2 h-64 w-[500px] -translate-x-1/2 rounded-full bg-[#6BA5E8]/10 blur-[80px]" />
          {/* Diagonal grid lines */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 60px)' }} />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 pb-20 pt-36 text-center lg:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-bold uppercase tracking-[0.35em] text-white/70 backdrop-blur-sm">
            <span className="h-2 w-2 rounded-full bg-[#60D066] animate-pulse" />
            Training Programs
          </div>
          <h1 className="mt-8 text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
            Sports &{' '}
            <span className="animate-gradient-text bg-gradient-to-r from-[#141AFF] via-[#6BA5E8] to-[#60D066] bg-clip-text text-transparent">
              Disciplines
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-white/50 sm:text-lg">
            Elite training programs designed by certified coaches. Pick your sport, choose your level, and start your journey.
          </p>

          {/* Sport Quick Nav Pills */}
          {orderedSports.length > 1 && (
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {orderedSports.map((sport) => {
                const meta = SPORT_META[sport];
                return (
                  <a
                    key={sport}
                    href={`#${sport.toLowerCase()}`}
                    className="group inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full text-white/80" style={{ backgroundColor: `${meta?.accent || '#141AFF'}20` }}>
                      <span className="h-5 w-5">{meta?.iconSvg}</span>
                    </span>
                    {displaySport(sport)}
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white/60">{groups.get(sport)?.length || 0}</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Angled bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gray-50 sm:h-12" style={{ clipPath: 'polygon(0 60%, 100% 100%, 100% 100%, 0 100%)' }} />
      </section>

      {/* Sports Sections */}
      {orderedSports.length > 0 ? (
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-20">
          <div className="space-y-16 lg:space-y-24">
            {orderedSports.map((sport, sportIndex) => {
              const sportPrograms = groups.get(sport) || [];
              const meta = SPORT_META[sport] || {
                tagline: '', accent: '#141AFF', accentLight: '#141AFF', accentDark: '#0A1F8C',
                iconSvg: <svg viewBox="0 0 64 64" fill="none" className="h-full w-full"><circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3"/></svg>,
              };
              const isEven = sportIndex % 2 === 0;

              return (
                <section key={sport} id={sport.toLowerCase()} className="scroll-mt-24">
                  {/* Sport Banner */}
                  <div className="relative mb-10 overflow-hidden rounded-3xl bg-brand-black" style={{ minHeight: '180px' }}>
                    {/* Background glow */}
                    <div className="absolute inset-0">
                      <div
                        className="absolute h-full w-1/2 rounded-full blur-[80px] opacity-30"
                        style={{
                          backgroundColor: meta.accent,
                          [isEven ? 'right' : 'left']: '-10%',
                          top: '-30%',
                        }}
                      />
                      {/* Diagonal lines */}
                      <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, white 0px, white 1px, transparent 1px, transparent 40px)' }} />
                    </div>

                    <div className="relative flex flex-col gap-6 p-8 sm:flex-row sm:items-center sm:p-10 lg:p-12">
                      {/* Sport Icon */}
                      <div
                        className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-white/10 p-4 backdrop-blur-sm sm:h-24 sm:w-24"
                        style={{ backgroundColor: `${meta.accent}15`, color: meta.accent }}
                      >
                        {meta.iconSvg}
                      </div>

                      {/* Sport Info */}
                      <div className="flex-1">
                        <h2 className="text-4xl font-black uppercase tracking-wide text-white sm:text-5xl">
                          {displaySport(sport)}
                        </h2>
                        {meta.tagline && (
                          <p className="mt-2 text-sm font-medium tracking-wide text-white/40">{meta.tagline}</p>
                        )}
                      </div>

                      {/* Count badge */}
                      <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-white/5 px-5 py-2.5 backdrop-blur-sm sm:self-center">
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: meta.accent }} />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.accent }} />
                        </span>
                        <span className="text-sm font-bold text-white">
                          {sportPrograms.length} program{sportPrograms.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Program Cards Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {sportPrograms.map((program) => {
                      const bullets = getBullets(program);
                      const slots = getTimeSlots(program);
                      const contactOnly = isContactPricing(program);
                      return (
                        <article
                          key={program.id}
                          className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-card-hover"
                          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
                        >
                          {/* Top accent */}
                          <div className="h-1.5 w-full transition-all duration-500 group-hover:h-2" style={{ background: `linear-gradient(90deg, ${meta.accent}, ${meta.accentLight}, ${meta.accent})`, backgroundSize: '200% 100%' }} />

                          <div className="flex flex-1 flex-col p-6">
                            {/* Header row: title + sport badge */}
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="text-lg font-extrabold text-brand-black transition-colors duration-300 group-hover:text-[#141AFF] sm:text-xl">
                                {cleanProgramTitle(program.name, program.sportType)}
                              </h3>
                              <div
                                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg p-1.5"
                                style={{ backgroundColor: `${meta.accent}10`, color: meta.accent }}
                              >
                                {meta.iconSvg}
                              </div>
                            </div>

                            {/* Description */}
                            {program.description && (
                              <p className="mt-3 text-[13px] leading-relaxed text-gray-500">{program.description}</p>
                            )}

                            {/* Bullets */}
                            {bullets.length > 0 && (
                              <ul className="mt-5 space-y-3">
                                {bullets.slice(0, 4).map((bullet, idx) => (
                                  <li key={`${program.id}-bullet-${idx}`} className="flex items-start gap-3 text-[13px] text-gray-600">
                                    <span
                                      className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md"
                                      style={{ backgroundColor: `${meta.accent}12` }}
                                    >
                                      <svg className="h-3 w-3" style={{ color: meta.accent }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    </span>
                                    <span>{bullet}</span>
                                  </li>
                                ))}
                              </ul>
                            )}

                            {/* Time Slots */}
                            {slots.length > 0 && (
                              <div className="mt-5 flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3.5">
                                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-black">
                                  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">Schedule</p>
                                  {slots.map((slot, idx) => (
                                    <p key={`${program.id}-slot-${idx}`} className="mt-0.5 text-xs font-semibold text-gray-700">{slot}</p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Spacer */}
                            <div className="flex-1" />

                            {/* Price + CTA */}
                            <div className="mt-6 flex items-end justify-between gap-4 border-t border-gray-100 pt-5">
                              <div>
                                {contactOnly ? (
                                  <p className="text-sm font-bold text-gray-400 italic">Contact for pricing</p>
                                ) : (
                                  <>
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-3xl font-black text-brand-black">{program.currentPriceJod}</span>
                                      <span className="text-sm font-bold text-gray-400">JOD</span>
                                    </div>
                                    {program.sessionsCount > 0 && (
                                      <p className="mt-0.5 text-[11px] font-medium text-gray-400">{program.sessionsCount} sessions included</p>
                                    )}
                                  </>
                                )}
                              </div>
                              <Link
                                href={`/packages/register?package=${encodeURIComponent(program.name)}`}
                                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98]"
                                style={{ backgroundColor: meta.accent }}
                              >
                                Register
                                <svg className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                              </Link>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-2xl px-6 py-32 text-center">
          <div className="rounded-2xl border border-gray-100 bg-white p-16 shadow-card">
            <h3 className="text-2xl font-bold text-brand-black">No programs yet</h3>
            <p className="mt-3 text-gray-500">Programs are being set up. Check back soon for our full lineup.</p>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <section className="relative overflow-hidden bg-brand-black">
        <div className="absolute inset-0">
          <div className="absolute -right-20 top-0 h-64 w-64 rounded-full bg-[#141AFF]/20 blur-[80px]" />
          <div className="absolute -left-20 bottom-0 h-48 w-48 rounded-full bg-[#60D066]/15 blur-[60px]" />
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 60px)' }} />
        </div>
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center lg:px-8">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Not sure which program fits?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/50">
            Our team will help you find the right level and schedule. Book a free assessment today.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-sm font-black text-brand-black transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              Book Free Assessment
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-bold text-white/70 transition-all duration-300 hover:border-white/40 hover:text-white"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

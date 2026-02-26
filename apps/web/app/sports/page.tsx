import Link from 'next/link';
import { fetchPackages } from '../../lib/apiClient';

export const metadata = {
  title: 'Sports & Facilities',
};

type PackageItem = Awaited<ReturnType<typeof fetchPackages>>[number];

const SPORT_ORDER = ['BASKETBALL', 'GYMNASTICS', 'VOLLEYBALL'];

function normalizeSport(value: string): string {
  return (value || 'OTHER').trim().toUpperCase();
}

function displaySport(value: string): string {
  const normalized = normalizeSport(value);
  if (normalized === 'BASKETBALL') return 'Basketball';
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

function getPriceLabel(program: PackageItem): string {
  if (program.pricingType === 'MANUAL' || program.currentPriceJod == null) return 'Contact for pricing';
  return `${program.currentPriceJod} JOD`;
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
    <div className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Programs</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">Sports & disciplines</h1>
        <p className="mt-4 text-lg text-gray-600">Programs are managed from Admin and reflected here automatically.</p>
      </div>

      {orderedSports.length > 0 ? (
        <div className="mx-auto mt-16 max-w-7xl space-y-16 px-6 lg:px-8">
          {orderedSports.map((sport) => {
            const sportPrograms = groups.get(sport) || [];
            return (
              <section key={sport} id={sport.toLowerCase()} className="scroll-mt-24">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold text-brand-black">{displaySport(sport)}</h2>
                  <p className="mt-2 text-sm text-gray-600">{sportPrograms.length} program(s)</p>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {sportPrograms.map((program) => {
                    const bullets = getBullets(program);
                    const slots = getTimeSlots(program);
                    return (
                      <article
                        key={program.id}
                        className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
                      >
                        <h3 className="text-2xl font-bold text-brand-black">{cleanProgramTitle(program.name, program.sportType)}</h3>
                        {program.description ? <p className="mt-3 text-sm text-gray-600">{program.description}</p> : null}
                        {bullets.length > 0 ? (
                          <ul className="mt-4 space-y-2 text-sm text-gray-600">
                            {bullets.slice(0, 4).map((bullet, idx) => (
                              <li key={`${program.id}-bullet-${idx}`} className="flex items-start gap-2">
                                <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-green-primary" />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {slots.length > 0 ? (
                          <div className="mt-4 rounded-xl bg-brand-lightBlue/10 p-3 text-xs font-semibold text-brand-blue-primary">
                            {slots.map((slot, idx) => (
                              <p key={`${program.id}-slot-${idx}`}>{slot}</p>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-5 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Price</p>
                            <p className="text-lg font-bold text-brand-black">{getPriceLabel(program)}</p>
                            {program.sessionsCount > 0 ? (
                              <p className="text-xs text-gray-500">{program.sessionsCount} sessions</p>
                            ) : null}
                          </div>
                          <Link
                            href={`/packages/register?package=${encodeURIComponent(program.name)}`}
                            className="rounded-full bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#003DA5]/90"
                          >
                            Register
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mx-auto mt-16 max-w-2xl px-6 text-center">
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-12 shadow-card">
            <h3 className="text-2xl font-bold text-brand-black">No programs yet</h3>
            <p className="mt-3 text-gray-600">Create and activate programs from Admin to show them on this page.</p>
          </div>
        </div>
      )}
    </div>
  );
}


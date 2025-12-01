import Image from 'next/image';
import Link from 'next/link';
import { fetchPrograms, fetchFacilities } from '../../lib/apiClient';

export const metadata = {
  title: 'Sports & Facilities'
};

export default async function SportsPage() {
  const [programsData, facilitiesData] = await Promise.all([fetchPrograms(), fetchFacilities()]);
  
  // Transform programs to match sports structure
  const sports = programsData.map((program) => ({
    id: program.id,
    name: program.name,
    description: program.description || '',
    mediaUrl: undefined, // Can be added to schema later
    featured: program.highlight || false,
    level: program.level || 'multi',
    slug: program.slug || program.name.toLowerCase().replace(/\s+/g, '-'),
  }));
  
  const featuredSports = sports.filter((sport) => sport.featured);
  const additionalSports = sports.filter((sport) => !sport.featured);
  
  // Transform facilities data
  const facilities = facilitiesData.map((facility) => ({
    id: facility.id,
    name: facility.name,
    description: facility.description || '',
    mediaUrl: facility.imageUrl || undefined,
    specs: [], // Not in current schema, can be added later
  }));

  return (
    <div className="bg-white py-24">
      {/* Programs Section */}
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Programs</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">Sports & disciplines</h1>
        <p className="mt-4 text-lg text-gray-600">
          Infinity Sports offers integrated coaching, performance tracking, and competition pathways across seven key disciplines.
        </p>
      </div>

      {/* Basketball Programs & Pricing */}
      <div className="mx-auto mt-16 max-w-5xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-black">Basketball Programs & Pricing</h2>
          <p className="mt-2 text-sm text-gray-600">All basketball programs include 12 sessions over three weeks.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {/* Program 1 - 6-9 years */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <div className="mb-4">
              <span className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold">Age Group</span>
              <h3 className="mt-2 text-xl font-bold text-brand-black">6–9 years – Jumpstarters</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">110 JD</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Schedule:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Monday: 5–6 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Wednesday: 5–6 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Friday: 11–12 AM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Saturday: 4–5 PM
                </li>
              </ul>
            </div>
          </div>

          {/* Program 2 - 10-13 years */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <div className="mb-4">
              <span className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold">Age Group</span>
              <h3 className="mt-2 text-xl font-bold text-brand-black">10–13 years – Fastbreakers</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">120 JD</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Schedule:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Monday: 6–7 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Wednesday: 6–7 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Friday: 12–1 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Saturday: 5–6 PM
                </li>
              </ul>
            </div>
          </div>

          {/* Program 3 - 13-16 years */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <div className="mb-4">
              <span className="text-xs uppercase tracking-[0.3em] text-brand-green-dark font-bold">Age Group</span>
              <h3 className="mt-2 text-xl font-bold text-brand-black">13–16 years – Slam Squads</h3>
            </div>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">130 JD</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-semibold text-gray-700">Schedule:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Monday: 7–8 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Wednesday: 7–8 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Friday: 1–2 PM
                </li>
                <li className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  Saturday: 6–7 PM
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Gymnastics Packages */}
      <div className="mx-auto mt-24 max-w-5xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-black">Gymnastics Packages</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Package A */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <h3 className="text-xl font-bold text-brand-black mb-4">Package A</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">120 JD</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                3 days per week
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                1 hour per session
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                12 hours total
              </li>
            </ul>
          </div>

          {/* Package B */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <h3 className="text-xl font-bold text-brand-black mb-4">Package B</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">100 JD</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                2 days per week
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                1 hour per session
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                8 hours total
              </li>
            </ul>
          </div>

          {/* Package C */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <h3 className="text-xl font-bold text-brand-black mb-4">Package C</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">140 JD</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                3 days per week
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                1.5 hours per session
              </li>
            </ul>
          </div>

          {/* Package D */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <h3 className="text-xl font-bold text-brand-black mb-4">Package D</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-brand-black">120 JD</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                2 days per week
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                1.5 hours per session
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Featured Programs */}
      {featuredSports.length > 0 && (
        <div className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredSports.map((sport) => (
              <div
                key={sport.id}
                className="flex flex-col rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
              >
                {sport.mediaUrl ? (
                  <div className="relative mb-4 h-48 overflow-hidden rounded-xl">
                    <Image
                      src={sport.mediaUrl}
                      alt={sport.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-4 h-48 rounded-xl bg-gradient-to-br from-brand-lightBlue/20 to-brand-green-primary/20" />
                )}
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-brand-lightBlue/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-blue-primary">
                    High Performance
                  </span>
                  <span className="rounded-full bg-brand-green-primary/20 px-3 py-1 text-xs font-semibold text-brand-green-dark">
                    Analytics Enabled
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-brand-black">{sport.name}</h3>
                {sport.description && (
                  <p className="mt-3 text-sm text-gray-600">{sport.description}</p>
                )}
                <Link
                  href={`/sports#${sport.slug}`}
                  className="mt-6 text-sm font-semibold text-brand-blue-primary transition hover:text-brand-green-primary"
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Programs */}
      {additionalSports.length > 0 && (
        <div className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mb-8">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">More Programs</p>
            <h2 className="mt-2 text-3xl font-bold text-brand-black">Additional disciplines & academies</h2>
            <p className="mt-2 text-gray-600">Flexible seasonal clinics, corporate wellness sessions, and youth development bootcamps.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {additionalSports.map((sport) => (
              <div
                key={sport.id}
                className="flex flex-col rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
              >
                {sport.mediaUrl ? (
                  <div className="relative mb-4 h-48 overflow-hidden rounded-xl">
                    <Image
                      src={sport.mediaUrl}
                      alt={sport.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="mb-4 h-48 rounded-xl bg-gradient-to-br from-brand-lightBlue/20 to-brand-green-primary/20" />
                )}
                <h3 className="text-xl font-bold text-brand-black">{sport.name}</h3>
                {sport.description && (
                  <p className="mt-3 text-sm text-gray-600">{sport.description}</p>
                )}
                <p className="mt-4 text-sm text-gray-500">Custom sessions available on request.</p>
                <Link
                  href={`/sports#${sport.slug}`}
                  className="mt-6 text-sm font-semibold text-brand-blue-primary transition hover:text-brand-green-primary"
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Facilities Section */}
      {facilities.length > 0 && (
        <div className="mx-auto mt-24 max-w-7xl px-6 lg:px-8">
          <div className="mb-8 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Facilities</p>
            <h2 className="mt-2 text-3xl font-bold text-brand-black">Purpose-built spaces for every sport</h2>
            <p className="mt-2 text-gray-600">From FIBA-spec arenas to sprung-floor dance studios, our campus is designed to deliver pro-level experiences.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className="flex flex-col rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
              >
                <div className="group relative mb-4 h-48 overflow-hidden rounded-xl">
                  <Image
                    src={facility.mediaUrl ?? 'https://images.unsplash.com/photo-1526401485004-46910ecc8e51'}
                    alt={facility.name}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-hero opacity-20" />
                </div>
                <h3 className="text-xl font-bold text-brand-black">{facility.name}</h3>
                {facility.description && (
                  <p className="mt-3 text-sm text-gray-600">{facility.description}</p>
                )}
                {facility.specs && facility.specs.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-gray-600">
                    {facility.specs.map((spec: string) => (
                      <li key={spec} className="flex items-center gap-2">
                        <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                        {spec}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href="/facilities"
                  className="mt-6 text-sm font-semibold text-brand-blue-primary transition hover:text-brand-green-primary"
                >
                  View details →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


import Image from 'next/image';
import Link from 'next/link';
import { fetchPrograms } from '../../lib/apiClient';
import { getBasketballPackages } from '@infinity/mock-api';
import { BasketballPackageCard } from './BasketballPackageCard';
import { GymnasticsPackageCard } from './GymnasticsPackageCard';
import { VolleyballPackageCard } from './VolleyballPackageCard';

export const dynamic = 'force-static';

export const metadata = {
  title: 'Sports & Facilities'
};

export default async function SportsPage() {
  const [programsData, basketballPackages] = await Promise.all([
    fetchPrograms(),
    Promise.resolve(getBasketballPackages()),
  ]);
  
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

      {/* Basketball Packages */}
      <div className="mx-auto mt-16 max-w-5xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-black">Basketball Packages</h2>
          <p className="mt-1 text-sm font-semibold text-brand-blue-primary">Infinity Sports Basketball Academy</p>
          <p className="mt-2 text-sm text-gray-600">Age-group programmes built on fundamental movement skills, confidence, and teamwork.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {basketballPackages.map((pkg) => (
            <BasketballPackageCard key={pkg.id} pkg={pkg} />
          ))}
        </div>
      </div>

      {/* Gymnastics Programs */}
      <div className="mx-auto mt-24 max-w-5xl px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-black">Gymnastics Programs</h2>
          <p className="mt-1 text-sm font-semibold text-brand-blue-primary">Powered by Phoenix Academy</p>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Age-appropriate programs that build flexibility, balance, strength, and confidence.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <GymnasticsPackageCard
            title="Package A"
            daysHours="3 Days / Week – 1 Hour / Session"
            bullets={['Improve flexibility and balance', 'Learn basic gymnastics movements', 'Build strength and body control']}
            price="120 JOD"
            sessionsNote="12 sessions per month"
            schedule="Sun • Tue • Thu | 5:00–7:00 PM"
          />
          <GymnasticsPackageCard
            title="Package B"
            daysHours="2 Days / Week – 1 Hour / Session"
            bullets={['Basic movement skills', 'Coordination and balance training', 'Fun and active learning environment']}
            price="100 JOD"
            sessionsNote="8 sessions per month"
            schedule="Sun • Tue • Thu | 5:00–7:00 PM"
          />
          <GymnasticsPackageCard
            title="Package C"
            daysHours="3 Days / Week – 1.5 Hours / Session"
            bullets={['Advanced flexibility and strength work', 'Gymnastics routines and techniques', 'Improve discipline and performance']}
            price="140 JOD"
            sessionsNote="18 sessions per month"
            schedule="Sun • Tue • Thu | 5:00–7:00 PM"
          />
          <GymnasticsPackageCard
            title="Package D"
            daysHours="2 Days / Week – 1.5 Hours / Session"
            bullets={['Strength and balance development', 'Skill improvement and routines', 'Focus on technique and control']}
            price="120 JOD"
            sessionsNote="12 sessions per month"
            schedule="Sun • Tue • Thu | 5:00–7:00 PM"
          />
        </div>
      </div>

      {/* Volleyball */}
      <div id="volleyball" className="mx-auto mt-24 max-w-5xl px-6 lg:px-8 scroll-mt-24">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-brand-black">Volleyball</h2>
          <p className="mt-1 text-sm font-semibold text-brand-blue-primary">Powered by Spikers Academy</p>
        </div>
        <VolleyballPackageCard />
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

    </div>
  );
}


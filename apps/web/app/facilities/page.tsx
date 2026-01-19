import Link from 'next/link';
import { fetchFacilities } from '../../lib/apiClient';
import { FacilitiesSection } from '../_components/FacilitiesSection';

export const metadata = {
  title: 'Facilities'
};

export default async function FacilitiesPage() {
  const facilitiesData = await fetchFacilities();
  
  // Transform API data to match UI structure
  const facilities = facilitiesData.map((facility) => ({
    id: facility.id,
    name: facility.name,
    description: facility.description || '',
    imageUrl: facility.imageUrl || undefined,
    specs: [], // Not in current schema, can be added later
  }));

  return (
    <div className="bg-white py-24">
      <div className="mx-auto max-w-5xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Infinity Spaces</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">Our Facility & Venues</h1>
        <p className="mt-4 text-lg text-gray-600">
          Infinity offers multiple premium spaces for training, events, and private sessions.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link href="/contact" className="rounded-xl bg-gradient-button px-8 py-3 font-bold text-white shadow-button transition hover:shadow-button-hover">
            Book a Campus Tour
          </Link>
          <Link href="/#facilities" className="rounded-full border-2 border-brand-lightBlue px-6 py-3 text-sm font-semibold text-brand-blue-primary transition hover:border-brand-green-primary hover:text-brand-green-primary">
            Back to highlights
          </Link>
        </div>
      </div>

      {/* Facilities List */}
      <div className="mx-auto mt-16 max-w-4xl px-6 lg:px-8">
        <div className="rounded-card border border-brand-lightBlue/20 bg-white p-8 shadow-card">
          <h2 className="text-2xl font-bold text-brand-black mb-6">Available Venues</h2>
          <ul className="space-y-3 text-gray-600">
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              Paddle court
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              3x3 basketball court
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              5x5 basketball court
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              <div>
                <span className="font-semibold">Multipurpose hall for private lessons:</span>
                <ul className="mt-2 ml-4 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="block h-1 w-1 rounded-full bg-brand-green-primary" />
                    Boxing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="block h-1 w-1 rounded-full bg-brand-green-primary" />
                    Muay Thai
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="block h-1 w-1 rounded-full bg-brand-green-primary" />
                    MMA
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="block h-1 w-1 rounded-full bg-brand-green-primary" />
                    Ballet
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="block h-1 w-1 rounded-full bg-brand-green-primary" />
                    Yoga
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="block h-1 w-1 rounded-full bg-brand-green-primary" />
                    Pilates
                  </li>
                </ul>
              </div>
            </li>
          </ul>
          <div className="mt-8 pt-6 border-t border-brand-lightBlue/20">
            <h3 className="text-xl font-bold text-brand-black mb-4">Training Center for Youth Competitive Sports:</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                Basketball
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                Volleyball
              </li>
              <li className="flex items-center gap-2">
                <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                Gymnastics
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Facilities Section with Expandable Cards */}
      <FacilitiesSection facilities={facilities} />
    </div>
  );
}



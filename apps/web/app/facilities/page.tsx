import Link from 'next/link';
import { fetchFacilities } from '../../lib/apiClient';
import { FacilitiesSection } from '../_components/FacilitiesSection';

export const metadata = {
  title: 'Facilities'
};

export const dynamic = 'force-dynamic';

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
          <Link href="/contact" className="rounded-xl bg-[#003DA5] px-8 py-3 font-bold text-white shadow-button transition hover:shadow-button-hover hover:bg-[#003DA5]/90">
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
              FIBA approved court 5x5
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              FIBA approved 3x3 court
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              <span>Multipurpose hall suitable for Yoga, Pilates, Ballet, Kickboxing, and more</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              Padel Court by Merry Sports
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              Official Volleyball Court
            </li>
            <li className="flex items-center gap-2">
              <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
              Official Gymnastics Training Facility
            </li>
          </ul>
        </div>
      </div>

      {/* Facilities Section with Expandable Cards */}
      <FacilitiesSection facilities={facilities} />
    </div>
  );
}



import Link from 'next/link';
import { fetchOffers } from '../../lib/apiClient';

export const metadata = {
  title: 'Offers & Memberships'
};

type OfferCard = {
  id: string;
  title: string;
  price: string;
  description: string;
  perks: string[];
  badge?: string;
  isFeatured?: boolean;
  isActive: boolean;
  link: string;
};

export default async function OffersPage() {
  const offersData = await fetchOffers();
  
  // Transform API data to match UI structure
  const offers: OfferCard[] = offersData.map((offer) => ({
    id: offer.id,
    title: offer.name,
    price: offer.pricePerMonth === 0 ? 'Custom' : `JD ${offer.pricePerMonth}/mo`,
    description: offer.description || '',
    perks: offer.features || [],
    badge: offer.badge,
    isFeatured: offer.isFeatured,
    isActive: offer.isActive !== false,
    link: offer.link || '/contact',
  })).filter((offer) => offer.isActive);

  return (
    <div className="bg-white py-24">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Memberships</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">Pick the plan that fuels you</h1>
        <p className="mt-4 text-lg text-gray-600">
          Each offer includes onboarding, assessment, and dynamic programming tailored to your goals.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-7xl gap-6 px-6 md:grid-cols-3 lg:px-8">
        {offers.length > 0 ? (
          offers.map((offer) => (
            <div
              key={offer.id}
              className={`flex flex-col rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover ${offer.isFeatured ? 'ring-2 ring-brand-green-primary/30' : ''}`}
            >
              <div className="flex items-center justify-between text-sm">
                {offer.badge ? (
                  <span className="rounded-full bg-brand-lightBlue/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-blue-primary">{offer.badge}</span>
                ) : (
                  <span className="rounded-full bg-brand-lightBlue/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-blue-primary">Offer</span>
                )}
                <span className="text-xl font-bold text-brand-black">{offer.price}</span>
              </div>
              <h2 className="mt-5 text-2xl font-bold text-brand-black">{offer.title}</h2>
              <p className="mt-2 text-sm text-gray-600">{offer.description}</p>
              <ul className="mt-6 space-y-2 text-sm text-gray-600">
                {offer.perks.map((perk: string) => (
                  <li key={perk} className="flex items-center gap-2">
                    <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                    {perk}
                  </li>
                ))}
              </ul>
              <Link href={offer.link || "/contact"} className="mt-auto rounded-full bg-[#003DA5] px-6 py-3 text-center text-sm font-bold text-white shadow-button transition hover:shadow-button-hover hover:bg-[#003DA5]/90">
                Book a call
              </Link>
            </div>
          ))
        ) : (
          <div className="col-span-3 text-center py-12">
            <p className="text-gray-500">No offers available at the moment. Please check back soon.</p>
          </div>
        )}
      </div>
    </div>
  );
}



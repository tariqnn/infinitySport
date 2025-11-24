import { PageHero } from '../../_components/PageHero';
import { OffersManager } from './OffersManager';

export const metadata = {
  title: 'Offers'
};

export default function OffersPage() {
  return (
    <>
      <PageHero
        eyebrow="Offers"
        title="Membership plans & pricing"
        description="Control the pricing cards and membership story presented on the landing page."
      />
      <OffersManager />
    </>
  );
}


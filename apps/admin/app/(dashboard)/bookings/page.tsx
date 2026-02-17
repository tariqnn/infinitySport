import { PageHero } from '../../_components/PageHero';
import { BookingsManager } from './BookingsManager';

export const metadata = {
  title: 'Bookings'
};

export default function BookingsPage() {
  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Bookings"
        title="Court & Facility Bookings"
        description="Manage all bookings from the landing page and track payment status."
      />
      <BookingsManager />
    </div>
  );
}

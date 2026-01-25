import { PageHero } from '../../_components/PageHero';
import { BookingAvailabilityManager } from './BookingAvailabilityManager';

export const metadata = {
  title: 'Booking Availability'
};

export default function BookingAvailabilityPage() {
  return (
    <>
      <PageHero
        eyebrow="Bookings"
        title="Booking Availability"
        description="Set which recurring time slots are blocked or free for all days. When a static booking (e.g. team training) is cancelled, set the slot to Free so it can be booked by the public."
      />
      <BookingAvailabilityManager />
    </>
  );
}

import { BookingForm } from './BookingForm';
import { cookies } from 'next/headers';
import { normalizeLanguage, tr } from '../../lib/translations';

export const metadata = {
  title: 'Book a Court - Infinity Sport',
  description: 'Book a court at Infinity Sport. Choose your preferred court and time slot.'
};

export default function BookingPage() {
  const lang = normalizeLanguage(cookies().get('infinity-language')?.value);

  return (
    <div className="bg-white py-24">
      {/* Header Section */}
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">{tr(lang, 'booking_kicker')}</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">{tr(lang, 'booking_title')}</h1>
        <p className="mt-4 text-lg text-gray-600">
          {tr(lang, 'booking_subtitle')}
        </p>
      </div>

      {/* Booking Form */}
      <div className="mx-auto mt-16 max-w-3xl px-6 lg:px-8">
        <BookingForm />
      </div>
    </div>
  );
}






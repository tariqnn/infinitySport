export const metadata = {
  title: 'Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-brand-black">Terms of Service</h1>
        <p className="mt-6 text-sm leading-7 text-gray-700">
          By using Infinity Sports services, you agree to provide accurate registration details and follow facility and
          safety rules during sessions, events, and bookings.
        </p>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          Program schedules, coaches, facilities, and pricing may be updated when needed. We will communicate major
          changes through official channels.
        </p>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          For questions related to terms or service conditions, contact us at{' '}
          <a className="font-semibold text-brand-blue-primary" href="mailto:infinitysportsacademyjo@gmail.com">
            infinitysportsacademyjo@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}


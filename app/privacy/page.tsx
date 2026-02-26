export const metadata = {
  title: 'Privacy Policy',
};

export default function PrivacyPage() {
  return (
    <div className="bg-white py-20">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-brand-black">Privacy Policy</h1>
        <p className="mt-6 text-sm leading-7 text-gray-700">
          Infinity Sports collects only the information needed to manage registrations, bookings, and communication
          with members. This may include name, phone number, email, age, and selected program.
        </p>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          We use your data to process requests, confirm schedules, provide support, and improve services. We do not
          sell personal data. Access is limited to authorized staff.
        </p>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          If you want to update or remove your information, contact us at{' '}
          <a className="font-semibold text-brand-blue-primary" href="mailto:infinitysportsacademyjo@gmail.com">
            infinitysportsacademyjo@gmail.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}


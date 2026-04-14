import { fetchLandingContent } from '../../lib/apiClient';
import Map from './Map';
import { ContactFormWrapper } from './ContactFormWrapper';

export const metadata = {
  title: 'Contact'
};

export const dynamic = 'force-dynamic';

export default async function ContactPage() {
  const content = await fetchLandingContent();
  const footer = content.footer;

  return (
    <div className="bg-white py-24">
      {/* Header Section */}
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Contact</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">Let&apos;s shape your Infinity Sports experience</h1>
        <p className="mt-4 text-lg text-gray-600">
          Tell us more about your team, corporate goals, or partnership idea. Our team responds within one business day.
        </p>
      </div>

      {/* Content Grid */}
      <div className="mx-auto mt-16 grid max-w-7xl gap-8 px-6 lg:grid-cols-2 lg:px-8">
        {/* Contact Form Card */}
        <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
          <h2 className="mb-6 text-2xl font-bold text-brand-black">Send a message</h2>
          <ContactFormWrapper />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Visit Campus Card */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">Visit our campus</h2>
            <p className="mb-4 text-sm text-gray-600">
              {footer.address || 'Infinity Sports Campus, Airport Road, Amman — minutes from Queen Alia International Airport.'}
            </p>
            <div className="mt-4 h-80 overflow-hidden rounded-xl">
              <Map />
            </div>
          </div>

          {/* Get in Touch Card */}
          <div className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover">
            <h2 className="mb-4 text-2xl font-bold text-brand-black">Get in touch</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-brand-black">Email</p>
                <a 
                  className="text-brand-blue-primary transition hover:text-brand-green-primary" 
                  href={`mailto:${footer.email || 'hello@infinitysports.jo'}`}
                >
                  {footer.email || 'hello@infinitysports.jo'}
                </a>
              </div>
              <div>
                <p className="font-semibold text-brand-black">Phone</p>
                <a 
                  className="text-brand-blue-primary transition hover:text-brand-green-primary" 
                  href={`tel:${footer.phone?.replace(/\s+/g, '') || '+962790002200'}`}
                >
                  {footer.phone || '+962 7 9000 2200'}
                </a>
              </div>
              <div>
                <p className="font-semibold text-brand-black">Hours</p>
                <p className="text-gray-600">Sunday – Thursday · 7:00 AM – 10:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


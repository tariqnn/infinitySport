import Link from 'next/link';
import Image from 'next/image';
import { fetchLandingContent } from '../../lib/apiClient';

export async function SiteFooter() {
  const content = await fetchLandingContent();
  const footer = content.footer;
  const instagram = footer.socialLinks?.find((l) => l.label.toLowerCase().includes('instagram'))?.href;
  const phoneHref = footer.phone?.replace(/\s+/g, '') || '';

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/infinity-logo.png"
                alt="Infinity Sport Logo"
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
                priority
              />
              <span className="text-xl font-bold text-black">Infinity Sports</span>
            </div>
            <p className="text-sm leading-relaxed text-gray-600">
              Empowering athletes and teams across the region with elite coaching, sport science, and world-class facilities.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Quick Links</h3>
            <nav className="flex flex-col space-y-3">
              <Link href="/sports" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Programs
              </Link>
              <Link href="/events" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Events
              </Link>
              <Link href="/facilities" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Facilities
              </Link>
              <Link href="/coaches" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Coaches
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Legal</h3>
            <nav className="flex flex-col space-y-3">
              <Link href="/privacy" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Terms of Service
              </Link>
              <Link href="/contact" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                Contact Us
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">Get in Touch</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p className="leading-relaxed whitespace-pre-line">{footer.address}</p>
              <p>
                <a href={`mailto:${footer.email}`} className="transition-colors hover:text-brand-blue-primary">
                  {footer.email}
                </a>
              </p>
              <p>
                <a href={phoneHref ? `tel:${phoneHref}` : undefined} className="transition-colors hover:text-brand-blue-primary">
                  {footer.phone}
                </a>
              </p>
              {instagram ? (
                <p>
                  <a href={instagram} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-brand-blue-primary">
                    Instagram
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} Infinity Sports. All rights reserved.</p>
            <p className="text-sm text-gray-500">
              Created by{' '}
              <a
                href="https://creative-networks.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-black transition-colors hover:text-brand-blue-primary"
              >
                Creative Networks
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}


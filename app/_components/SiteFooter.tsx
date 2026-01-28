import Link from 'next/link';
import Image from 'next/image';
import { fetchLandingContent } from '../../lib/apiClient';
import { cookies } from 'next/headers';
import { normalizeLanguage, tr } from '../../lib/translations';

export async function SiteFooter() {
  const content = await fetchLandingContent();
  const footer = content.footer;
  const cookieStore = await cookies();
  const lang = normalizeLanguage(cookieStore.get('infinity-language')?.value);
  const instagram: string | undefined = Array.isArray(footer.socialLinks)
    ? footer.socialLinks.find((l) => l.label?.toLowerCase().includes('instagram'))?.href
    : undefined;
  // Convert phone to international format for tel: link (07 9624 4059 -> +962796244059)
  const phoneHref: string = footer.phone && typeof footer.phone === 'string'
    ? footer.phone.replace(/\s+/g, '').replace(/^07/, '+9627')
    : '+962796244059';

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
              {tr(lang, 'footer_tagline')}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">{tr(lang, 'footer_quick_links')}</h3>
            <nav className="flex flex-col space-y-3">
              <Link href="/sports" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_programs')}
              </Link>
              <Link href="/events" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_events')}
              </Link>
              <Link href="/facilities" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_facilities')}
              </Link>
              <Link href="/coaches" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_coaches')}
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">{tr(lang, 'footer_legal')}</h3>
            <nav className="flex flex-col space-y-3">
              <Link href="/privacy" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_privacy')}
              </Link>
              <Link href="/terms" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_terms')}
              </Link>
              <Link href="/contact" className="text-sm text-gray-600 transition-colors hover:text-brand-blue-primary">
                {tr(lang, 'footer_contact')}
              </Link>
            </nav>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black">{tr(lang, 'footer_get_in_touch')}</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div>
                <p className="font-semibold text-black">
                  {tr(lang, 'footer_tel')} :{' '}
                  <a
                    href={`tel:${phoneHref}`}
                    className="text-brand-blue-primary transition-colors"
                  >
                    {footer.phone || '07 9624 4059'}
                  </a>
                </p>
              </div>
              <div>
                <p className="font-semibold text-black">{tr(lang, 'footer_instagram')}</p>
                <a 
                  href={instagram || 'https://instagram.com/infinity.sports.academy'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-brand-blue-primary transition-colors"
                >
                  Infinity.sports.academy
                </a>
              </div>
              <div>
                <p className="font-semibold text-black">{tr(lang, 'footer_location')}</p>
                <a
                  href="https://maps.app.goo.gl/25mE3pTSF2pnkLz46?g_st=iw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue-primary transition-colors"
                >
                  {footer.address || 'Shemisani, Princess Alia College'}
                </a>
              </div>
              <div>
                <p className="font-semibold text-black">{tr(lang, 'footer_email')}</p>
                <a href={`mailto:${footer.email || 'infinitysportsacademyjo@gmail.com'}`} className="text-brand-blue-primary transition-colors">
                  {footer.email || 'infinitysportsacademyjo@gmail.com'}
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Infinity Sports. {tr(lang, 'footer_rights')}
            </p>
            <p className="text-sm text-gray-500">
              {tr(lang, 'footer_created_by')}{' '}
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


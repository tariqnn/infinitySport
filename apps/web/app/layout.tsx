import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { Cairo } from 'next/font/google';
import { cookies } from 'next/headers';
import { LanguageProvider } from './_components/LanguageProvider';
import { NavbarWithLanguage } from './_components/NavbarWithLanguage';
import { SiteFooter } from './_components/SiteFooter';
import { normalizeLanguage } from '../lib/translations';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap'
});
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap'
});

const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-ar',
  display: 'swap'
});


export const metadata: Metadata = {
  title: {
    default: 'Infinity Sports | High-Performance Sports Campus in Jordan',
    template: '%s | Infinity Sports'
  },
  description: 'Infinity Sports operates Jordan’s leading multi-sport campus with elite coaching, facilities, and development programs.',
  keywords: ['Infinity Sports', 'Jordan sports academy', 'High performance training', 'Padel courts Jordan', 'Basketball academy'],
  openGraph: {
    title: 'Infinity Sports — Elevating Jordanian Athletes',
    description:
      'Discover Infinity Sports: high-performance coaching, elite facilities, and corporate partnerships empowering teams across Jordan.',
    url: 'https://infinitysports.jo',
    siteName: 'Infinity Sports',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc',
        width: 1200,
        height: 630,
        alt: 'Infinity Sports Arena'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Infinity Sports — High-Performance Sports Campus',
    description:
      'Train with national coaches, access world-class facilities, and activate partnerships through Infinity Sports.',
    images: ['https://images.unsplash.com/photo-1546519638-68e109498ffc']
  },
  metadataBase: new URL('https://infinitysports.jo')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = normalizeLanguage(cookies().get('infinity-language')?.value);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} ${cairo.variable} bg-white text-brand-black antialiased`}>
        <LanguageProvider initialLanguage={lang}>
          <NavbarWithLanguage />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </LanguageProvider>
      </body>
    </html>
  );
}

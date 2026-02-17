import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ToastProvider } from './_components/ToastProvider';

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

export const metadata: Metadata = {
  title: {
    default: 'Infinity Sport Admin',
    template: '%s | Infinity Sport Admin'
  },
  description: 'Infinity Sport CMS for the public landing page.',
  metadataBase: new URL('https://admin.infinitysport.jo')
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} app-shell text-[var(--text-primary)]`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

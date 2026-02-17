import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { ReactNode } from 'react';
import { PortalShell } from './_components/PortalShell';

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
    default: 'Infinity Sports Portal',
    template: '%s | Infinity Sports Portal'
  },
  description: 'Employee intranet for Infinity Sports with news, documents, directory, calendar, and finance modules.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} bg-ui-softBg text-ui-textPrimary antialiased`}>
        <PortalShell>{children}</PortalShell>
      </body>
    </html>
  );
}

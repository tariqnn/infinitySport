import type { Metadata } from 'next';
import './globals.css';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import { ReactNode } from 'react';
import Image from 'next/image';
import { PortalSidebar } from './_components/PortalSidebar';

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

function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-ui-border bg-white px-4 shadow-sm md:px-8">
      <div className="flex items-center gap-2">
        <div className="h-1 w-1 rounded-full bg-brand-primaryGreen" />
        <p className="text-sm font-medium text-ui-textMuted">Portal</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="rounded-lg border border-ui-border bg-white px-3 py-1.5 text-sm font-medium text-ui-textPrimary transition hover:bg-ui-softBg">
          Support
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-semibold text-ui-textPrimary">Facility Admin</p>
            <p className="text-xs text-ui-textMuted">Operations</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">
            FA
          </div>
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} ${spaceGrotesk.variable} bg-ui-softBg text-ui-textPrimary antialiased`}>
        <div className="flex min-h-screen">
          <PortalSidebar />
          <div className="flex flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-[1600px]">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}

import Link from 'next/link';
import { PageHero } from '../../_components/PageHero';

export const metadata = {
  title: 'Portal'
};

export default function PortalLinkPage() {
  return (
    <>
      <PageHero
        eyebrow="Operations"
        title="Open Infinity Sport Portal"
        description="Jump into the operational portal for bookings, finance, and staff workflows."
        actions={
          <Link href="http://localhost:3000" target="_blank" className="glow-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold">
            Launch portal
          </Link>
        }
      />
      <div className="glass-card space-y-4 p-6">
        <h3 className="font-display text-2xl font-semibold text-slate-900">Why two platforms?</h3>
        <p className="text-sm text-slate-600">
          The admin website you are using now focuses on the marketing site content (hero, offers, landing modules). The
          operational portal handles member CRM, finance, and booking logistics.
        </p>
        <p className="text-sm text-slate-600">
          Single sign-on, audit logging, and shared navigation are part of the product roadmap. Reach out to the product
          team if you need access or if your role has changed.
        </p>
      </div>
    </>
  );
}


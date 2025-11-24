import { PageHero } from '../../_components/PageHero';
import { AnnouncementsManager } from './AnnouncementsManager';

export const metadata = {
  title: 'Announcements'
};

export default function AnnouncementsPage() {
  return (
    <>
      <PageHero
        eyebrow="Announcements"
        title="Hero marquee banners"
        description="Drive urgency and inform members about launches, scholarships, and major updates."
      />
      <AnnouncementsManager />
    </>
  );
}


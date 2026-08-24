import { PageHero } from '../../_components/PageHero';
import { EventsManager } from './EventsManager';

export const metadata = {
  title: 'Events'
};

export default function EventsPage() {
  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Calendar, media & registrations"
        description="Build public event pages, upload photos or video, configure 3x3 divisions and jersey sizes, and manage every team entry."
      />
      <EventsManager />
    </>
  );
}

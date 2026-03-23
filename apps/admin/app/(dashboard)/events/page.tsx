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
        title="Calendar & showcases"
        description="Events are saved to Firestore (academyEvents) for the Infinity Track app and synced to the website database."
      />
      <EventsManager />
    </>
  );
}

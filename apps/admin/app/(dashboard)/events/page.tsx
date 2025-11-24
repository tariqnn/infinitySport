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
        description="Plan high-energy showcases and keep the landing page in lock-step."
      />
      <EventsManager />
    </>
  );
}

import { fetchEvents } from '../../lib/apiClient';
import { EventsContent } from './EventsContent';

export const metadata = {
  title: 'Events & Tournaments | Infinity Sports'
};

export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const eventsData = await fetchEvents();
  return <EventsContent eventsData={eventsData} />;
}

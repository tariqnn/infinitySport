import { CoachesSection } from '../_components/CoachesSection';
import { fetchCoaches } from '../../lib/apiClient';

export const metadata = {
  title: 'Our Coaching Team | Infinity Sports'
};

export const dynamic = 'force-dynamic';

export default async function CoachesPage() {
  const coaches = await fetchCoaches();
  return <CoachesSection coaches={coaches} />;
}


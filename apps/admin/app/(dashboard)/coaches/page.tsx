import { PageHero } from '../../_components/PageHero';
import { CoachesManager } from './CoachesManager';

export const metadata = {
  title: 'Coaches',
};

export default function CoachesPage() {
  return (
    <>
      <PageHero
        eyebrow="Coaches"
        title="Coaching team profiles"
        description="Manage coaches shown on the landing page, including profile images and bios."
      />
      <CoachesManager />
    </>
  );
}


import { PageHero } from '../../_components/PageHero';
import { FacilitiesManager } from './FacilitiesManager';

export const metadata = {
  title: 'Facilities'
};

export default function FacilitiesPage() {
  return (
    <>
      <PageHero
        eyebrow="Facilities"
        title="Spaces & infrastructure"
        description="Keep the facility carousel aligned with current photography and badges."
      />
      <FacilitiesManager />
    </>
  );
}

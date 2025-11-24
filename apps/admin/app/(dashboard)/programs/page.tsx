import { PageHero } from '../../_components/PageHero';
import { ProgramsManager } from './ProgramsManager';

export const metadata = {
  title: 'Programs'
};

export default function ProgramsPage() {
  return (
    <>
      <PageHero
        eyebrow="Programs"
        title="Elite programs & labs"
        description="Curate the cards that showcase Infinity Sport programs and experiences."
      />
      <ProgramsManager />
    </>
  );
}

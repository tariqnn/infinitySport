import { PageHero } from '../../_components/PageHero';
import { PackagesManager } from './PackagesManager';

export const metadata = {
  title: 'Packages',
};

export default function PackagesPage() {
  return (
    <>
      <PageHero
        eyebrow="Packages"
        title="Sellable packages"
        description="Manage packages shown on the landing and used for Portal registration. Price and sessions are the single source of truth."
      />
      <PackagesManager />
    </>
  );
}

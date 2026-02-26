import { PageHero } from '../../_components/PageHero';
import { PackagesManager } from './PackagesManager';

export const metadata = {
  title: 'Programs',
};

export default function PackagesPage() {
  return (
    <>
      <PageHero
        eyebrow="Programs"
        title="Sellable programs"
        description="Manage programs shown on landing and used for registration. Price and sessions are the single source of truth."
      />
      <PackagesManager />
    </>
  );
}

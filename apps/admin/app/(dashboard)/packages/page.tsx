import { PageHero } from '../../_components/PageHero';
import { PackagesManager } from './PackagesManager';

export const metadata = {
  title: 'Programs & Prices',
};

export default function PackagesPage() {
  return (
    <>
      <PageHero
        eyebrow="Website content"
        title="Programs & Prices"
        description="Add, edit, or remove the sports programs shown on your website. Changes you save here will appear on the website automatically."
      />
      <PackagesManager />
    </>
  );
}

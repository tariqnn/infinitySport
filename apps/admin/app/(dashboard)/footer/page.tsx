import { PageHero } from '../../_components/PageHero';
import { FooterForm } from './FooterForm';

export const metadata = {
  title: 'Footer'
};

export default function FooterPage() {
  return (
    <>
      <PageHero
        eyebrow="Footer"
        title="Contact & finale"
        description="Maintain accurate contact info and social links for the landing page footer."
      />
      <FooterForm />
    </>
  );
}

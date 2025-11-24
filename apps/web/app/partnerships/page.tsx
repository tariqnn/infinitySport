import Link from 'next/link';
import { Badge, Button, Card, Section } from '@infinity/ui';
import { getIntroContent } from '@infinity/mock-api';

export const metadata = {
  title: 'Partnerships & Sponsorships'
};

const benefits = [
  {
    title: 'Brand immersion',
    description: 'Activate your brand within Infinity Arena with LED placements, branded lockers, and athlete storytelling studios.'
  },
  {
    title: 'Community development',
    description: 'Sponsor scholarships, youth development clinics, and community outreach initiatives across Jordan.'
  },
  {
    title: 'Corporate wellness',
    description: 'Unlock private padel leagues, coaching retreats, and performance workshops tailored to corporate teams.'
  }
];

const partnerTiers = [
  {
    tier: 'Elite Partner',
    investment: 'Starting JOD 45K / year',
    points: [
      'Naming rights for flagship facility zone',
      'Dedicated scholarship program',
      'Integrated content production package'
    ]
  },
  {
    tier: 'Performance Partner',
    investment: 'Starting JOD 25K / year',
    points: [
      'Co-branded seasonal competitions',
      'Corporate wellness experiences',
      'Quarterly analytics reporting'
    ]
  },
  {
    tier: 'Community Partner',
    investment: 'Starting JOD 10K / year',
    points: [
      'Community outreach activations',
      'Grassroots program sponsorship',
      'Media amplification across channels'
    ]
  }
];

export default async function PartnershipsPage() {
  const intro = await getIntroContent();

  return (
    <div className="space-y-0">
      <Section
        eyebrow="Partnerships"
        title="Invest in Jordan’s next generation of athletes"
        description="Infinity Sports partners with market leaders to accelerate athlete development, community impact, and innovative sports experiences."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {benefits.map((benefit) => (
            <Card key={benefit.title} title={benefit.title} description={benefit.description}>
              <Badge color="accent">High impact</Badge>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Opportunities"
        title="Co-create with Infinity Sports"
        description="Our partnerships team co-designs campaigns, branded events, and scholarship pathways aligned with your objectives."
        background="light"
      >
        <div className="grid gap-6 md:grid-cols-3">
          {partnerTiers.map((tier) => (
            <Card
              key={tier.tier}
              className="bg-gradient-to-br from-midnight-900 via-midnight-800 to-primary-900"
              title={tier.tier}
              description={tier.investment}
              action={
                <Button asChild variant="ghost">
                  <Link href="/contact">Schedule strategy call</Link>
                </Button>
              }
            >
              <ul className="mt-4 space-y-3 text-sm text-slate-200">
                {tier.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-primary-400" />
                    {point}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Highlights"
        title="Recent partner collaborations"
        description="Our partners accelerate athlete success and community growth."
      >
        <div className="grid gap-6 md:grid-cols-3">
          {intro.highlights.map((highlight) => (
            <Card key={highlight.title} title={highlight.title} description={highlight.description}>
              <p className="mt-4 text-sm text-slate-200">
                Campaign impact reports delivered monthly with measurable ROI.
              </p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Connect"
        title="Partner with Infinity Sports"
        description="Share your objectives and our partnerships team will prepare a tailored roadmap within 72 hours."
      >
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-10 text-center text-white shadow-card backdrop-blur">
          <p className="text-lg text-slate-200">
            Book a discovery session to explore branding, scholarship, and product activation opportunities across our programs.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button asChild>
              <Link href="/contact">Submit partnership brief</Link>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:partners@infinitysports.jo">partners@infinitysports.jo</a>
            </Button>
          </div>
        </div>
      </Section>
    </div>
  );
}


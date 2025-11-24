import Link from 'next/link';

const pillars = [
  {
    title: 'Performance Coaching',
    description: 'Certified coaches running skill sessions, tactical walkthroughs, and phase-based conditioning for every age bracket.',
    bullets: ['NBA + FIBA inspired systems', 'Weekly progress diagnostics', 'Small group intensives']
  },
  {
    title: 'Wellness & Recovery',
    description: 'Mobility labs, breath-work sessions, and physiotherapy add-ons that keep athletes game-ready.',
    bullets: ['Cryo + compression access', 'Performance nutrition plans', 'On-call physio team']
  },
  {
    title: 'Partnership Activations',
    description: 'Corporate offsites, academy takeovers, and branded tournaments that plug into Infinity&apos;s ecosystem.',
    bullets: ['Tailored partnership playbooks', 'Content + media support', 'Dedicated success manager']
  }
];

export const metadata = {
  title: 'What We Offer'
};

export default function OfferingsPage() {
  return (
    <div className="bg-gray-50 py-24">
      <div className="mx-auto max-w-4xl px-6 text-center lg:px-0">
        <p className="text-sm uppercase tracking-[0.3em] text-brand-green-dark">Offerings</p>
        <h1 className="mt-4 text-5xl font-bold text-brand-black">The Infinity advantage</h1>
        <p className="mt-4 text-lg text-gray-600">
          From player pipelines to partner labs, we combine facilities, coaching, and analytics into one seamless experience.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-7xl gap-6 px-6 lg:grid-cols-3 lg:px-8">
        {pillars.map((pillar) => (
          <div
            key={pillar.title}
            className="rounded-card border border-brand-lightBlue/20 bg-white p-6 shadow-card transition duration-500 hover:-translate-y-2 hover:border-brand-green-primary/50 hover:shadow-card-hover"
          >
            <p className="text-xs uppercase tracking-[0.35em] text-brand-green-dark">Pillar</p>
            <h2 className="mt-3 text-2xl font-bold text-brand-black">{pillar.title}</h2>
            <p className="mt-3 text-sm text-gray-600">{pillar.description}</p>
            <ul className="mt-5 space-y-2 text-sm text-gray-600">
              {pillar.bullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2">
                  <span className="block h-1.5 w-1.5 rounded-full bg-brand-green-primary" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-16 max-w-4xl px-6 text-center lg:px-0">
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-button px-8 py-3 text-sm font-bold text-white shadow-button transition hover:shadow-button-hover"
        >
          Start a conversation
        </Link>
      </div>
    </div>
  );
}



'use client';

import { useEffect, useState } from 'react';
import { Card } from '@infinity/ui';
import { PageHero } from '../../_components/PageHero';
import { HeroForm } from './HeroForm';
import { apiClient } from '../../../lib/apiClient';
import type { LandingContent } from '@infinity/types';

export function HeroPageClient() {
  const [content, setContent] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const hero = await apiClient.getHero();
        // Transform to match LandingContent structure
        const transformed: LandingContent = {
          hero: hero ? {
            title: hero.title,
            subtitle: hero.subtitle,
            primaryCtaLabel: hero.primaryCta,
            primaryCtaLink: hero.primaryUrl,
            secondaryCtaLabel: hero.secondaryCta || undefined,
            secondaryCtaLink: hero.secondaryUrl || undefined,
            backgroundImageUrl: hero.backgroundImageUrl || undefined,
            backgroundVideoUrl: undefined,
          } : {
            title: '',
            subtitle: '',
            primaryCtaLabel: '',
            primaryCtaLink: '',
          },
          highlights: [],
          programs: [],
          offers: [],
          events: [],
          announcements: [],
          facilityHighlights: [],
          footer: {
            address: '',
            phone: '',
            email: '',
            socialLinks: [],
          },
          updatedAt: hero?.updatedAt || '',
          updatedBy: hero?.updatedBy || 'System',
        };
        setContent(transformed);
      } catch (error) {
        console.error('Failed to load hero:', error);
        // Set error state to show user-friendly message
        const now = new Date().toISOString();
        setContent({
          hero: {
            title: 'Error loading data',
            subtitle: error instanceof Error ? error.message : 'Failed to connect to API',
            primaryCtaLabel: 'Retry',
            primaryCtaLink: '#',
          },
          highlights: [],
          programs: [],
          offers: [],
          events: [],
          announcements: [],
          facilityHighlights: [],
          footer: {
            address: '',
            phone: '',
            email: '',
            socialLinks: [],
          },
          updatedAt: now,
          updatedBy: 'System',
        });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-lg font-semibold">Loading hero data...</p>
          <p className="text-sm text-gray-500 mt-2">Connecting to API...</p>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="p-6">
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">⚠️ Cannot Connect to API</h3>
          <p className="text-red-700 mb-4">
            Make sure the API server is running. Start it with:
          </p>
          <code className="block bg-white p-3 rounded border border-red-200 text-sm">
            npm run dev:api
          </code>
          <p className="text-sm text-red-600 mt-4">
            Then refresh this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHero
        eyebrow="Hero"
        title="Cinematic hero experience"
        description="Control the opening impression on infinitysport.jo — headlines, CTAs, motion assets, and proof points."
      />
      <div className="space-y-6">
        <Card title="Current hero snapshot" description="Preview the live hero content pulled on the marketing site.">
          <div className="grid gap-4 text-sm text-[var(--text-muted)] md:grid-cols-2">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Headline</p>
              <p>{content.hero.title}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Primary CTA</p>
              <p>
                {content.hero.primaryCtaLabel} — <span className="text-brand-blue">{content.hero.primaryCtaLink}</span>
              </p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Background media</p>
              <p>{content.hero.backgroundVideoUrl || content.hero.backgroundImageUrl || 'Not set'}</p>
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">Highlights</p>
              <ul className="mt-1 space-y-1 text-[var(--text-muted)]">
                {content.highlights.map((highlight) => (
                  <li key={highlight.id}>{highlight.title}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
        <HeroForm content={content} />
      </div>
    </>
  );
}


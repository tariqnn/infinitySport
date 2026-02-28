import type { LandingProgram } from '@infinity/types';
import { fetchLandingContent, fetchPackages, getLandingFallback } from '../lib/apiClient';
import { HomeContent } from './_components/HomeContent';

export const dynamic = 'force-dynamic';

function mapPackagesToPrograms(
  packages: Awaited<ReturnType<typeof fetchPackages>>
): LandingProgram[] {
  return packages
    .filter((pkg) => pkg.isActive)
    .map((pkg) => ({
      id: pkg.id,
      title: pkg.name,
      description: pkg.description?.trim() || 'Program details available on the sports page.',
      sportType: pkg.sportType || 'multi',
      badge: pkg.sportType || undefined,
      link: `/sports#${(pkg.sportType || 'other').toLowerCase().replace(/\s+/g, '-')}`,
      mediaUrl: undefined,
      isFeatured: false,
      isActive: true,
    }));
}

export default async function Home() {
  let content = getLandingFallback();
  try {
    const [contentResult, packagesResult] = await Promise.allSettled([fetchLandingContent(), fetchPackages()]);
    if (contentResult.status === 'fulfilled') {
      content = contentResult.value;
    }

    const hasFallbackPrograms = content.programs.some((p) => p.id.startsWith('fallback-'));
    if ((content.programs.length === 0 || hasFallbackPrograms) && packagesResult.status === 'fulfilled' && packagesResult.value.length > 0) {
      content = {
        ...content,
        programs: mapPackagesToPrograms(packagesResult.value),
      };
    }
  } catch {
    content = getLandingFallback();
  }
  return <HomeContent content={content} />;
}


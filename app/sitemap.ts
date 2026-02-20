import type { MetadataRoute } from 'next';

const baseUrl = 'https://infinitysports.jo';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/sports', '/partnerships', '/events', '/contact'];
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: route === '' ? 1 : 0.8
  }));
}


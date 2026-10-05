import type { MetadataRoute } from 'next';
import { servicePages } from '../src/marketing/data';

/**
 * Public sitemap only — no private workspace/admin URLs.
 * Prefer apex host to match canonical + Search Console property.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://verxor.com';
  const now = new Date();

  const fixed: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${base}/api-partnership`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${base}/child-panels`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  const services: MetadataRoute.Sitemap = servicePages.map((service) => ({
    url: `${base}/services/${service.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  return [...fixed, ...services];
}

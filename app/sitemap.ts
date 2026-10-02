import type { MetadataRoute } from 'next';
import { servicePages } from '../src/marketing/data';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://verxor.com';
  const fixed = ['', '/api-partnership', '/child-panels', '/workspace'];
  return [
    ...fixed.map(path => ({ url: base + path, changeFrequency: 'weekly' as const, priority: path === '' ? 1 : path === '/workspace' ? 0.6 : 0.8 })),
    ...servicePages.map(service => ({ url: base + '/services/' + service.slug, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}

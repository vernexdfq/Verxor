import type { MetadataRoute } from 'next';

/**
 * Public crawling for search engines + major AI / LLM crawlers.
 * Private app surfaces stay blocked.
 */
export default function robots(): MetadataRoute.Robots {
  const disallowPrivate = [
    '/api/',
    '/workspace',
    '/workspace/',
    '/admin',
    '/admin/',
    '/wc',
    '/wc/',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowPrivate,
      },
      // Explicit allow for major AI search / training crawlers on public pages
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'Anthropic-AI',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: disallowPrivate,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: disallowPrivate,
      },
    ],
    sitemap: 'https://verxor.com/sitemap.xml',
    host: 'https://verxor.com',
  };
}

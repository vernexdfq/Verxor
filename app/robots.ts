import type { MetadataRoute } from 'next';

/**
 * Public crawling rules for verxor.com.
 * Private app surfaces (workspace, admin, APIs) stay blocked.
 * Landing + marketing service pages stay open for indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/workspace',
          '/workspace/',
          '/admin',
          '/admin/',
          '/wc',
          '/wc/',
        ],
      },
    ],
    sitemap: 'https://verxor.com/sitemap.xml',
    host: 'https://verxor.com',
  };
}

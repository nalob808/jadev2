import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/components/marketing/JsonLd';

/**
 * Crawl the public site; stay out of the app.
 *
 * The disallowed paths hold personal birth data. They already require a
 * session, so a crawler gets a redirect rather than content — but saying so
 * explicitly keeps those URLs out of search results entirely, which matters
 * because a URL alone can leak that a workspace exists.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/people', '/relationships', '/notes', '/settings', '/api/', '/auth/', '/legacy'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

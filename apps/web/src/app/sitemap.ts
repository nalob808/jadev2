import type { MetadataRoute } from 'next';
import { GRAHAS_LIB, HOUSES, SIGNS_LIB } from '@jade/interpret';
import { SITE_URL } from '@/components/marketing/JsonLd';

/**
 * The public pages, for crawlers.
 *
 * Only the marketing routes. Everything behind sign-in is per-workspace and
 * must never be crawled — listing it here would be an invitation to index
 * pages that require a session and return a redirect, which wastes crawl
 * budget and looks like soft-404s.
 *
 * `lastModified` is the build time, which is the honest answer: these pages
 * are statically generated, so a deploy is exactly when they last changed.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${SITE_URL}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/features`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/accuracy`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${SITE_URL}/learn`, lastModified, changeFrequency: 'monthly', priority: 0.8 },

    // Every reference entry, individually. These are the pages that answer a
    // search like "7th house in vedic astrology", and a crawler will not find
    // them from the index alone at any useful rate.
    ...HOUSES.map((house) => ({
      url: `${SITE_URL}/learn/houses/${house.number}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
    ...SIGNS_LIB.map((sign) => ({
      url: `${SITE_URL}/learn/signs/${sign.name.toLowerCase()}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
    ...GRAHAS_LIB.map((graha) => ({
      url: `${SITE_URL}/learn/grahas/${graha.id.toLowerCase()}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: 0.7,
    })),
  ];
}

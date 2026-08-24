import type { MetadataRoute } from 'next';
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
  ];
}

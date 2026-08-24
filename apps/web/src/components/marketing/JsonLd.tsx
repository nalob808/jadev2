import type { FaqItem } from './FAQ';

export const SITE_URL = 'https://jadeapp.co';

/**
 * Structured data.
 *
 * This is what lets a search result show the price and expand the questions
 * inline rather than a bare blue link. It is also the one place where being
 * wrong is expensive: schema that describes something the page does not
 * actually say is treated as spam, so every value here is generated from the
 * same constants the page renders.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      // The payload is built from our own constants, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export interface TierSchema {
  readonly name: string;
  readonly monthly: number;
  readonly yearly?: number;
}

export function softwareSchema(tiers: readonly TierSchema[] = []): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Jade',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Astrology software',
    operatingSystem: 'Web',
    url: SITE_URL,
    description:
      'Professional Vedic (Jyotiṣa) astrology software with verified classical mathematics: sixteen divisional charts, aṣṭakavarga, yogas, Vimśottarī daśā, transit scanning and relationship analysis.',
    offers:
      tiers.length > 0
        ? tiers.map((tier) => ({
            '@type': 'Offer',
            name: tier.name,
            price: tier.monthly.toFixed(2),
            priceCurrency: 'USD',
            url: `${SITE_URL}/pricing`,
          }))
        : {
            '@type': 'Offer',
            price: '0.00',
            priceCurrency: 'USD',
            url: `${SITE_URL}/pricing`,
            description: 'Free tier: three people, rāśi and navāṁśa, daily transits.',
          },
    featureList: [
      'Sixteen divisional charts (ṣoḍaśavarga)',
      'Aṣṭakavarga with contributor breakdown',
      'Yoga detection with cancellations',
      'Vimśottarī daśā',
      'Transit scanning with retrograde passes',
      'Aṣṭakūṭa and synastry',
      'Anchored study notes',
    ],
  };
}

export function faqSchema(items: readonly FaqItem[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };
}

export function breadcrumbSchema(
  trail: ReadonlyArray<{ name: string; path: string }>,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_URL}${crumb.path}`,
    })),
  };
}

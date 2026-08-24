import type { Metadata } from 'next';
import Link from 'next/link';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { FAQ } from '@/components/marketing/FAQ';
import { JsonLd, breadcrumbSchema, faqSchema, softwareSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Pricing — Jade Vedic astrology software',
  description:
    'Five tiers from free to institute. Unlimited charts from $9/month, the full practice layer at $99/month. One reading a month pays for the year.',
  alternates: { canonical: 'https://jadeapp.co/pricing' },
  openGraph: {
    title: 'Pricing — Jade',
    description: 'Free to start. Unlimited charts from $9/month.',
    url: 'https://jadeapp.co/pricing',
    type: 'website',
  },
};

const TIERS = [
  {
    name: 'Free',
    monthly: 0,
    yearly: 0,
    who: 'Curious, or casting your own chart',
    includes: [
      'Three people',
      'Rāśi and navāṁśa',
      'Today’s transits',
      'Every ayanāṁśa, stated on the chart',
    ],
    cta: 'Start free',
  },
  {
    name: 'Seeker',
    monthly: 9,
    yearly: 79,
    who: 'The astrologically fluent',
    includes: [
      'Unlimited people',
      'All sixteen vargas',
      'Yogas with their cancellations',
      'Vimśottarī daśā',
      'Relationships and synastry',
      'Anchored study notes',
    ],
    cta: 'Start free',
    featured: true,
  },
  {
    name: 'Practitioner',
    monthly: 49,
    yearly: 429,
    who: 'Serious students and part-time readers',
    includes: [
      'Everything in Seeker',
      'Up to 100 clients',
      'Sessions and prep sheets',
      'Reports',
      'Transit alerts',
      'Varṣaphala',
    ],
    cta: 'Start free',
  },
  {
    name: 'Professional',
    monthly: 99,
    yearly: 890,
    who: 'Working astrologers',
    includes: [
      'Everything in Practitioner',
      'Unlimited clients',
      'Branded reports',
      'Client share links',
      'Muhūrta engine',
      'Prediction ledger',
      'API access',
    ],
    cta: 'Start free',
  },
] as const;

/** Features not yet built are named on their tier rather than implied. */
const IN_PROGRESS = [
  'Sessions, prep sheets and branded reports',
  'Varṣaphala (annual charts)',
  'The muhūrta engine and prediction ledger',
];

const PRICING_FAQ = [
  {
    q: 'Do I need a card to start?',
    a: 'No. The free tier needs an email address and nothing else, and it does not expire into a paywall — three people, the rāśi and navāṁśa, and daily transits stay free.',
  },
  {
    q: 'Why is the Professional tier $99?',
    a: 'It replaces a desktop licence that costs $255–700 up front, a separate practice-management subscription, and the hour of manual preparation before every reading. At a typical consultation fee, one reading a month pays for the year.',
  },
  {
    q: 'Can I change tiers later?',
    a: 'Yes, in both directions, and your data does not change when you do. Dropping a tier hides features rather than deleting anything — your people, notes and charts stay exactly where they are.',
  },
  {
    q: 'Is there a discount for annual billing?',
    a: 'Yes — roughly two months free on every paid tier. The first hundred professionals also get a founding-member annual price locked for as long as the subscription stays active.',
  },
];

function Price({ monthly, yearly }: { monthly: number; yearly: number }): React.ReactElement {
  if (monthly === 0) {
    return (
      <p className="font-display text-4xl font-semibold">
        $0
        <span className="ml-1 font-body text-base font-normal text-[var(--ink-faint)]">
          forever
        </span>
      </p>
    );
  }
  return (
    <>
      <p className="font-display text-4xl font-semibold">
        ${monthly}
        <span className="ml-1 font-body text-base font-normal text-[var(--ink-faint)]">/month</span>
      </p>
      <p className="mt-1 font-mono text-[11px] text-[var(--ink-faint)]">or ${yearly}/year</p>
    </>
  );
}

export default function PricingPage() {
  return (
    <>
      <JsonLd data={softwareSchema(TIERS.map((t) => ({ name: t.name, monthly: t.monthly })))} />
      <JsonLd data={faqSchema(PRICING_FAQ)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Pricing', path: '/pricing' },
        ])}
      />

      <section className="mx-auto max-w-6xl px-5 pb-4 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          center
          kicker="Pricing"
          title="Start free. Pay when it saves you an hour."
          as="h1"
          lede="Every tier computes charts the same way — accuracy is not a paid feature. What you pay for is scale, the practice layer, and the tools that let you charge for your work."
        />
      </section>

      <section className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {TIERS.map((tier, index) => (
            <article
              key={tier.name}
              className={`jade-panel jade-rise flex flex-col p-6 ${
                'featured' in tier && tier.featured ? 'jade-panel--marked' : ''
              }`}
              style={{ '--i': index } as React.CSSProperties}
            >
              {'featured' in tier && tier.featured ? (
                <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  Most chosen
                </p>
              ) : null}

              <h2 className="font-display text-2xl font-semibold">{tier.name}</h2>
              <p className="mt-1 text-[13px] leading-snug text-[var(--ink-faint)]">{tier.who}</p>

              <div className="mt-4">
                <Price monthly={tier.monthly} yearly={tier.yearly} />
              </div>

              <ul className="mt-5 grow space-y-2 text-[14px]">
                {tier.includes.map((line) => (
                  <li key={line} className="flex gap-2 text-[var(--ink-muted)]">
                    <span aria-hidden="true" className="mt-[2px] shrink-0 text-[var(--accent)]">
                      ·
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/sign-in"
                className={`mt-6 block border px-4 py-2.5 text-center font-display text-lg tracking-wide transition-colors ${
                  'featured' in tier && tier.featured
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-transparent hover:text-[var(--accent)]'
                    : 'border-[var(--rule-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>

        <div className="jade-panel mt-4 flex flex-wrap items-center gap-4 p-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">Institute</h2>
            <p className="mt-1 max-w-[46ch] text-[14px] text-[var(--ink-muted)]">
              Student seats, teacher review of student readings, and shared chart libraries for
              schools and courses.
            </p>
          </div>
          <p className="font-display text-2xl font-semibold sm:ml-auto">from $300/month</p>
          <Link
            href="/sign-in"
            className="border border-[var(--rule-strong)] px-5 py-2.5 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Get in touch
          </Link>
        </div>

        {/* Saying this plainly costs a little conversion and buys the trust of
            the exact person who would otherwise find out after paying. */}
        <div className="jade-panel mt-4 border-l-2 border-l-[var(--clay)] p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
            Still being built
          </p>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
            These are on the Practitioner and Professional tiers and are not finished yet. They are
            listed because you should know what you would be buying into, not what is ready today:{' '}
            {IN_PROGRESS.join('; ')}. Everything else on this page works now.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl px-5 sm:px-8">
        <SectionHead center kicker="Billing" title="The usual questions" />
        <FAQ items={PRICING_FAQ} />
      </section>

      <div className="px-5 sm:px-8">
        <CallToAction
          title="Three people, free, right now"
          body="Enough to cast your own chart properly and decide whether the rest is worth paying for."
        />
      </div>
    </>
  );
}

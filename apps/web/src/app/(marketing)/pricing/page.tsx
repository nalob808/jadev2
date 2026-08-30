import type { Metadata } from 'next';
import Link from 'next/link';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { FAQ } from '@/components/marketing/FAQ';
import { JsonLd, breadcrumbSchema, faqSchema, softwareSchema } from '@/components/marketing/JsonLd';
import { CAPABILITIES, PLANS, SELF_SERVE, bulletsFor, limitOf } from '@/lib/plans';

/**
 * The tier cards are rendered from `@/lib/plans` — the same table the gate
 * enforces. They were once a local const, which is how a pricing page ends up
 * advertising a tier the product does not actually grant: two lists, edited on
 * different days, by someone who only remembered one of them.
 *
 * Two consequences worth keeping. Bullets marked `built: false` render with a
 * "being built" tag automatically, so an unfinished feature cannot be listed
 * as though it worked. And the "still being built" panel below is derived from
 * the same flags rather than typed by hand.
 */

export const metadata: Metadata = {
  title: 'Pricing — Jade Vedic astrology software',
  description:
    'Five tiers from free to institute. Three people with the full calculator, free forever. Unlimited people and the practice layer from $9/month. One reading a month pays for the year.',
  alternates: { canonical: 'https://jadeapp.co/pricing' },
  openGraph: {
    title: 'Pricing — Jade',
    description: 'Free to start. Unlimited charts from $9/month.',
    url: 'https://jadeapp.co/pricing',
    type: 'website',
  },
};

// (tiers now come from @/lib/plans — see the note above)

/**
 * Named rather than implied — and derived, so this list cannot fall out of
 * step with what the tier cards above are claiming.
 */
const IN_PROGRESS = Object.values(CAPABILITIES)
  .filter((capability) => !capability.built)
  .map((capability) => capability.label);

const PRICING_FAQ = [
  {
    q: 'Do I need a card to start?',
    a: 'No. The free tier needs an email address and nothing else, and it does not expire into a paywall. Three people, and for those three the whole calculator — all sixteen vargas, the yogas, the daśās, aṣṭakavarga and ṣaḍbala. What the paid tiers add is scale and the tools for working on other people, not a better chart.',
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
      <JsonLd data={softwareSchema(PLANS.map((t) => ({ name: t.name, monthly: t.monthly })))} />
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
          {SELF_SERVE.map((tier, index) => {
            const featured = tier.id === 'seeker';
            const people = limitOf(tier, 'people');
            return (
              <article
                key={tier.id}
                className={`jade-panel jade-rise flex flex-col p-6 ${
                  featured ? 'jade-panel--marked' : ''
                }`}
                style={{ '--i': index } as React.CSSProperties}
              >
                {featured ? (
                  <p className="mb-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--accent)]">
                    Most chosen
                  </p>
                ) : null}

                <h2 className="font-display text-2xl font-semibold">{tier.name}</h2>
                <p className="mt-1 text-[13px] leading-snug text-[var(--ink-faint)]">{tier.who}</p>

                <div className="mt-4">
                  <Price monthly={tier.monthly} yearly={tier.yearly} />
                </div>

                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {people === null ? 'Unlimited people' : `${people} people`}
                </p>

                <ul className="mt-3 grow space-y-2 text-[14px]">
                  {bulletsFor(tier).map((bullet) => (
                    <li key={bullet.text} className="flex gap-2 text-[var(--ink-muted)]">
                      <span aria-hidden="true" className="mt-[2px] shrink-0 text-[var(--accent)]">
                        ·
                      </span>
                      <span>
                        {bullet.text}
                        {bullet.built ? null : (
                          <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wider text-[var(--clay)]">
                            being built
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-in"
                  className={`mt-6 block border px-4 py-2.5 text-center font-display text-lg tracking-wide transition-colors ${
                    featured
                      ? 'border-[var(--accent)] bg-[var(--accent)] text-white hover:bg-transparent hover:text-[var(--accent)]'
                      : 'border-[var(--rule-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                  }`}
                >
                  Start free
                </Link>
              </article>
            );
          })}
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

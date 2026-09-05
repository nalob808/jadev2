import type { Metadata } from 'next';
import Link from 'next/link';
import { NorthIndianChart } from '@jade/ui';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { demoChart } from '@/lib/demoChart';
import { FAQ, FAQ_ITEMS } from '@/components/marketing/FAQ';
import { JsonLd, faqSchema, softwareSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Jade — Vedic astrology software for serious practice',
  description:
    'Professional Jyotiṣa software with verified classical mathematics: all sixteen vargas, aṣṭakavarga, yogas, Vimśottarī daśā, transits and relationship analysis. Free to start.',
  alternates: { canonical: 'https://jadeapp.co/' },
  openGraph: {
    title: 'Jade — Vedic astrology software for serious practice',
    description:
      'Verified classical mathematics, a modern interface, and the practice layer. Free to start.',
    url: 'https://jadeapp.co/',
    siteName: 'Jade',
    type: 'website',
  },
};

/** Numbers that are true, and checkable. Vagueness is what the audience distrusts. */
const PROOF = [
  { n: '16', label: 'Divisional charts' },
  { n: '596', label: 'Tests in CI' },
  { n: '11,664', label: 'Kūṭa pairings verified' },
  { n: '9', label: 'Grahas, nodes included' },
];

const PILLARS = [
  {
    kicker: 'The mathematics',
    title: 'Checked against an independent implementation, not against itself',
    body: 'Positions come from Swiss Ephemeris fixtures. Derived techniques — aṣṭakavarga, yogas, kūṭas, ṣaḍbala — are diffed against Jagannātha Hora across seventeen charts, and the disagreements are published rather than smoothed over.',
    href: '/accuracy',
    cta: 'Read the accuracy programme',
  },
  {
    kicker: 'The interface',
    title: 'Fast, legible, and built for a phone as well as a desk',
    body: 'North and South Indian charts drawn as real SVG, the ṣoḍaśavarga contact sheet, the daśā column scrolled to the running period, and a notes layer that attaches to the factor rather than the page.',
    href: '/features',
    cta: 'See what it does',
  },
  {
    kicker: 'The practice',
    title: 'Your people, your relationships, your study log — one place',
    body: 'Unlimited people, historical timezone resolution with the ambiguity flagged rather than hidden, synastry with every rule shown, and watches that tell you when the sky reaches a natal point.',
    href: '/pricing',
    cta: 'Compare the tiers',
  },
];

export default function LandingPage() {
  const { rasi, chart, running } = demoChart();

  return (
    <>
      <JsonLd data={softwareSchema()} />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />

      {/* ---------------------------------------------------------------- hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:pt-20">
        <div className="jade-rise">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Sidereal · Jyotiṣa · Professional
          </p>

          <h1 className="mt-3 font-display text-[clamp(2.6rem,6.2vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.015em]">
            Astrology software that shows its working.
          </h1>

          <p className="mt-5 max-w-[54ch] text-[19px] leading-relaxed text-[var(--ink-muted)]">
            The depth of Kala or Jagannātha Hora, in something built this decade. Every yoga names
            the placements that formed it, every chart records the ayanāṁśa that produced it, and
            nothing is asserted that cannot be decomposed.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
            >
              Start free — no card
            </Link>
            <Link
              href="/accuracy"
              className="border border-[var(--rule-strong)] px-6 py-3 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              How we verify it
            </Link>
          </div>

          <p className="mt-4 font-mono text-[11px] text-[var(--ink-faint)]">
            Free tier: 3 people · all sixteen vargas · yogas · daśās · today’s transits
          </p>
        </div>

        {/* A real chart from the real engine — see lib/demoChart.ts. */}
        <div className="jade-rise" style={{ '--i': 2 } as React.CSSProperties}>
          <figure className="jade-panel jade-panel--marked p-6">
            <div className="flex justify-center">
              <NorthIndianChart varga={rasi} size={340} signLabels="number" />
            </div>
            <figcaption className="mt-5 border-t border-[var(--rule)] pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                Reference chart · 7 Nov 2001 · Ann Arbor
              </p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-faint)]">Ayanāṁśa</dt>
                  <dd>{chart.meta.ayanamsaValue.toFixed(4)}°</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-faint)]">Houses</dt>
                  <dd>Whole sign</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-faint)]">Yogas found</dt>
                  <dd>{chart.yogas.length}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-faint)]">Daśā</dt>
                  <dd className="truncate">{running}</dd>
                </div>
              </dl>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* --------------------------------------------------------------- proof */}
      <section
        aria-label="At a glance"
        className="border-y border-[var(--rule)] bg-[var(--surface)]"
      >
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-[var(--rule)] sm:grid-cols-4">
          {PROOF.map((item) => (
            <div key={item.label} className="bg-[var(--surface)] px-5 py-6 text-center">
              <dt className="sr-only">{item.label}</dt>
              <dd>
                <span className="block font-mono text-[clamp(1.5rem,3.4vw,2rem)] font-medium text-[var(--ink)]">
                  {item.n}
                </span>
                <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                  {item.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ------------------------------------------------------------ the case */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
        <SectionHead
          kicker="Why it exists"
          title="Three things that today live in three different products, or none."
          lede="Correct classical mathematics. An interface built this decade. And the practice layer around them — the client book, the study log, the alerts."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <article
              key={pillar.kicker}
              className="jade-panel jade-panel--interactive jade-rise flex flex-col p-6"
              style={{ '--i': index } as React.CSSProperties}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                {pillar.kicker}
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
                {pillar.title}
              </h3>
              <p className="mt-3 grow text-[15px] leading-relaxed text-[var(--ink-muted)]">
                {pillar.body}
              </p>
              <Link
                href={pillar.href}
                className="mt-5 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] transition-opacity hover:opacity-70"
              >
                {pillar.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ the honest bit */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <div className="jade-panel grid gap-8 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <SectionHead
              kicker="What we will not do"
              title="No compatibility score. No verdict. No prediction of death or disease."
            />
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Aṣṭakūṭa’s total is shown as a footnote to its eight components, never as a headline
              percentage. Maṅgala doṣa arrives with its cancellations already computed beside it,
              because a doṣa reported without them is astrologically dishonest. A test in CI fails
              the build if verdict language appears on a relationship page.
            </p>
          </div>
          <div>
            <SectionHead
              kicker="What we withhold"
              title="Techniques we could not verify are absent, and say so."
            />
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              There is no ṣaḍbala total, because two of its twenty sub-components are not yet
              reconciled and a total is only as good as its weakest part. The East Indian chart
              renders correctly as geometry but its regional sign arrangement could not be
              confirmed, so it does not ship. Two verified chart styles beat three where one is
              invented.
            </p>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- pricing */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <SectionHead
          center
          kicker="Pricing"
          title="Free to start. One reading a month pays for the year."
          lede="At a typical consultation fee, the Professional tier costs less than a single reading — and replaces a desktop licence, a scheduling tool, and the hour of prep before every session."
        />
        <div className="mt-8 flex justify-center">
          <Link
            href="/pricing"
            className="border border-[var(--rule-strong)] px-6 py-3 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            See all five tiers
          </Link>
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-3xl px-5 sm:px-8">
        <SectionHead center kicker="Questions" title="Before you sign up" />
        <FAQ items={FAQ_ITEMS} />
      </section>

      <div className="px-5 sm:px-8">
        <CallToAction />
      </div>
    </>
  );
}

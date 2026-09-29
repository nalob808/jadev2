import type { Metadata } from 'next';
import Link from 'next/link';
import { NorthIndianChart } from '@jade/ui';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { RingDemo } from '@/components/marketing/RingDemo';
import { demoChart, demoRing } from '@/lib/demoChart';
import { FAQ, FAQ_ITEMS } from '@/components/marketing/FAQ';
import { JsonLd, faqSchema, softwareSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Jade — Vedic astrology software for serious practice',
  description:
    'Professional Jyotiṣa software: all sixteen divisional charts, aṣṭakavarga to the kakṣā, a nakṣatra dial with 108 pādas, graphic ephemeris, daśā timeline, transits, relationship analysis and plain-English readings. Checked against Swiss Ephemeris. Free to start.',
  alternates: { canonical: 'https://jadeapp.co/' },
  openGraph: {
    title: 'Jade — Vedic astrology software for serious practice',
    description:
      'Sixteen divisional charts, aṣṭakavarga to the kakṣā, a nakṣatra dial, a daśā timeline and the sky as a sphere. Every figure checked against Swiss Ephemeris. Free to start.',
    url: 'https://jadeapp.co/',
    siteName: 'Jade',
    type: 'website',
  },
};

/**
 * Numbers that are true and checkable.
 *
 * The test count is the one figure here that has to be maintained by hand:
 * `pnpm test` prints it, summed across the six packages. Everything else is
 * either a property of the tradition or comes off the live chart below.
 */
const PROOF = [
  { n: '16', label: 'Divisional charts' },
  { n: '108', label: 'Pādas on the dial' },
  { n: '11,664', label: 'Kūṭa pairings verified' },
  { n: '1,097', label: 'Tests passing' },
];

/**
 * What Jade does, grouped the way somebody works rather than the way the code
 * is organised. Ordered so the first three answer "can it do my job" and the
 * rest answer "what else".
 */
const FEATURES = [
  {
    kicker: 'Charts',
    title: 'Sixteen divisional charts, each seated on its own ascendant',
    points: [
      'The whole ṣoḍaśavarga, D1 through D60, as a contact sheet or one at a time',
      'Vargottama placements flagged where they fall',
      'North and South Indian layouts drawn as real SVG, sharp at any size, and they print',
      'Nine grahas including Rāhu and Ketu, mean or true, stated on every chart',
    ],
  },
  {
    kicker: 'The instrument',
    title: 'One time cursor, and every view moves with it',
    points: [
      'A nakṣatra dial with all 27 nakṣatras and 108 pādas, shaded by tārā from the janma nakṣatra',
      'A graphic ephemeris folded at 13°20′, so a nakṣatra crossing reads as a straight line',
      'Aṣṭakavarga as a radial profile, with the contributing grahas beside it',
      'A zoomable daśā timeline with a Saturn and sarva band running under it',
    ],
  },
  {
    kicker: 'Strength',
    title: 'Aṣṭakavarga down to the kakṣā',
    points: [
      'Bhinnāṣṭakavarga and sarva, with the grahas behind every bindu named',
      'Kakṣā transit scoring, so a transit through a house has a value and a source',
      'Dignity, combustion arcs, and whole-sign dṛṣṭi with the special aspects',
      'Six ṣaḍbala components verified individually, and no invented total',
    ],
  },
  {
    kicker: 'Time',
    title: 'Daśās and transits, with the dates solved for, not sampled',
    points: [
      'Vimśottarī to the depth you choose, in three year-length conventions',
      'Ingresses, stations and crossings located by bisection, so a date is a root',
      'Every pass of a retrograde loop returned and labelled by which pass it is',
      'Watches that fire when the sky reaches a natal point in a chart you keep',
    ],
  },
  {
    kicker: 'The sky',
    title: 'Where everything is tonight, and who it lands on',
    points: [
      'Today’s sky read against every person in your book on one screen',
      'A celestial sphere with 5,080 real stars, where latitude and retrograde loops are geometry',
      'Event search: name several sky conditions, get the windows where all of them hold',
      'The ayanāṁśa drawn as the gap between the equinox and Aśvinī, which is what it is',
    ],
  },
  {
    kicker: 'Reading',
    title: 'The same chart, said in plain English',
    points: [
      'Every house with its sign, its lord, what sits in it and what aspects it, in words',
      'The placements behind each paragraph are one tap away, never hidden',
      'Periods, transits and sade sati described without a verdict attached',
      'Its own address at read.jadeapp.co, for a client to read between sessions',
    ],
  },
  {
    kicker: 'Relationships',
    title: 'Aṣṭakūṭa checked against all 11,664 pairings',
    points: [
      'Eight kūṭas with the rule that produced each one shown beside it',
      'Maṅgala doṣa reported with its classical cancellations already computed',
      'A two-ring overlay wheel, and house overlays read in both directions',
      'A shared daśā timeline with four named convergence rules',
    ],
  },
  {
    kicker: 'Practice',
    title: 'The work that surrounds the chart',
    points: [
      'Your client book, with historical timezone resolution and ambiguity flagged',
      'Notes anchored to a factor, findable from every chart that has the same one',
      'Session prep sheets, follow-ups, and printable reports with or without your notes',
      'Rectification against events that already happened, and JSON export on every person',
    ],
  },
] as const;

export default function LandingPage() {
  const { rasi, chart, running } = demoChart();
  const ring = demoRing();

  return (
    <>
      <JsonLd data={softwareSchema()} />
      <JsonLd data={faqSchema(FAQ_ITEMS)} />

      {/* ---------------------------------------------------------------- hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-14 sm:px-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:pt-20">
        <div className="jade-rise">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Sidereal · Jyotiṣa · for people who practise
          </p>

          <h1 className="mt-3 font-display text-[clamp(2.6rem,6.2vw,4.4rem)] font-semibold leading-[1.02] tracking-[-0.015em]">
            Everything a Jyotiṣī computes, in one place.
          </h1>

          <p className="mt-5 max-w-[56ch] text-[19px] leading-relaxed text-[var(--ink-muted)]">
            Sixteen divisional charts. Aṣṭakavarga down to the kakṣā. A nakṣatra dial with all 108
            pādas, a graphic ephemeris, a zoomable daśā timeline, and the sky as a sphere with real
            stars behind it. Every figure is checked against Swiss Ephemeris before it ships.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/sign-in"
              className="border border-[var(--accent)] bg-[var(--accent)] px-6 py-3 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
            >
              Start free, no card
            </Link>
            <Link
              href="/features"
              className="border border-[var(--rule-strong)] px-6 py-3 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              See everything it does
            </Link>
          </div>

          <p className="mt-4 font-mono text-[11px] text-[var(--ink-faint)]">
            Free: three people, all sixteen vargas, yogas, daśās, today’s transits.
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

      {/* ------------------------------------------------------------ the dial */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
        <SectionHead
          kicker="Take hold of it"
          title="This is the dial itself, drawing a real chart."
          lede="The same component the app uses, computing the same degrees, running on this page."
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="jade-panel jade-panel--marked flex justify-center p-4 sm:p-6">
            <RingDemo data={ring} />
          </div>

          <div className="self-center">
            <p className="text-[15px] leading-relaxed text-[var(--ink-muted)]">
              The inner marks are the reference chart’s natal positions. The outer marks are where
              the sky stands on {ring.transitLabel}. The shading counts the tārās from that chart’s
              janma nakṣatra, so the cells that matter for timing are the ones that look different.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Zoom in and the pādas appear, all 108 of them, at their exact boundaries. Select a
              graha and everything else steps back. In the app, this dial shares one time cursor
              with the ephemeris, the aṣṭakavarga profile and the daśā timeline, so moving the date
              in one place moves it everywhere.
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)]">
              {ring.frameLabel} · ayanāṁśa {ring.ayanamsaValue.toFixed(4)}°
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- the features */}
      <section className="mx-auto max-w-6xl px-5 pt-20 sm:px-8">
        <SectionHead
          kicker="What is inside"
          title="The whole of a practice, not a chart calculator."
          lede="Eight areas, each one built out. Every one of them shows the placements behind what it claims."
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((group, index) => (
            <article
              key={group.kicker}
              className="jade-panel jade-panel--interactive jade-rise flex flex-col p-6"
              style={{ '--i': index % 4 } as React.CSSProperties}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                {group.kicker}
              </p>
              <h3 className="mt-2 font-display text-[1.45rem] font-semibold leading-tight">
                {group.title}
              </h3>
              <ul className="mt-4 flex flex-col gap-2 border-l border-[var(--rule)] pl-4">
                {group.points.map((point) => (
                  <li key={point} className="text-[14px] leading-snug text-[var(--ink-muted)]">
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/features"
            className="border border-[var(--rule-strong)] px-6 py-3 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            The long version
          </Link>
          <Link
            href="/charts"
            className="border border-[var(--rule-strong)] px-6 py-3 font-display text-lg tracking-wide transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            Browse public charts
          </Link>
        </div>
      </section>

      {/* ------------------------------------------------------- verification */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <SectionHead
          kicker="How you know it is right"
          title="Checked against something that was not written here."
          lede="Software that only agrees with itself proves nothing. Jade is measured against an independent implementation, and the places they disagree are published."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="jade-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Positions
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
              Swiss Ephemeris, on every push
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Longitudes are pinned to Swiss Ephemeris fixtures in continuous integration. The
              Lahiri ayanāṁśa fit reproduces it to 0.0002 arcseconds across three centuries. That is
              close enough to be called reproduction, and it is the number the fixtures assert.
            </p>
          </div>

          <div className="jade-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
              Techniques
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
              Diffed against Jagannātha Hora
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Aṣṭakavarga, yogas, kūṭas and ṣaḍbala are compared against an independent
              implementation across seventeen charts. Aṣṭakūṭa’s input space is finite, so all
              11,664 pairings were checked. Four of the eight tables were wrong before that check.
            </p>
          </div>

          <div className="jade-panel p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
              The sky
            </p>
            <h3 className="mt-2 font-display text-2xl font-semibold leading-tight">
              Spica lands where the definition says
            </h3>
            <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Lahiri is defined by Citrā at 180°. Jade’s star frame puts Spica at 179.984°, from a
              catalogue of 5,080 real stars. Look up at Regulus and it is where the sphere says
              Maghā’s yogatārā is.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center">
          <Link
            href="/accuracy"
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            Read the accuracy programme →
          </Link>
        </p>
      </section>

      {/* ------------------------------------------------------ what we refuse */}
      <section className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <div className="jade-panel grid gap-8 p-8 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <SectionHead
              kicker="What Jade will not do"
              title="No compatibility score. No verdict. Nothing about death or disease."
            />
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              Aṣṭakūṭa’s total sits as a footnote to its eight components, never as a headline
              percentage. Maṅgala doṣa arrives with its cancellations already computed beside it,
              because a doṣa reported without them is astrologically dishonest. A test fails the
              build if verdict language reaches a relationship page.
            </p>
          </div>
          <div>
            <SectionHead
              kicker="What Jade withholds"
              title="Techniques that could not be verified are absent, and say so."
            />
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--ink-muted)]">
              There is no ṣaḍbala total, because two of its twenty sub-components are unreconciled
              and a total is only as good as its weakest part. The East Indian chart renders
              correctly as geometry, but its regional sign arrangement could not be confirmed, so it
              does not ship. Two verified chart styles beat three with one invented.
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
          lede="At a typical consultation fee the Professional tier costs less than a single reading, and it replaces a desktop licence, a scheduling tool, and the hour of prep before every session."
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

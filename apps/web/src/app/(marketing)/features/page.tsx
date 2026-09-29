import type { Metadata } from 'next';
import { NorthIndianChart, SouthIndianChart } from '@jade/ui';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { JsonLd, breadcrumbSchema } from '@/components/marketing/JsonLd';
import { demoChart } from '@/lib/demoChart';

export const metadata: Metadata = {
  title: 'Features — divisional charts, aṣṭakavarga, daśās, transits and readings | Jade',
  description:
    'Sixteen vargas on their own ascendants, aṣṭakavarga to the kakṣā, a nakṣatra dial with 108 pādas, a folded graphic ephemeris, a zoomable daśā timeline, a 3D sky with real stars, plain-English readings, and aṣṭakūṭa verified across all 11,664 pairings.',
  alternates: { canonical: 'https://jadeapp.co/features' },
  openGraph: {
    title: 'Features — Jade',
    description: 'What Jade computes, and how it shows its working.',
    url: 'https://jadeapp.co/features',
    type: 'website',
  },
};

const GROUPS = [
  {
    kicker: 'Charts',
    title: 'Divisional charts that are actually divisional',
    body: 'All sixteen vargas of the ṣoḍaśavarga, each seated on its own ascendant instead of the rāśi redrawn sixteen times. That difference is what most software quietly gets wrong. Vargottama placements are flagged. North and South Indian layouts are hand-written SVG, so they stay sharp at any size and print properly.',
    points: [
      'D1 through D60, on their own ascendants',
      'The ṣoḍaśavarga contact sheet at a glance',
      'Whole sign and equal houses, stated explicitly',
      'Nine grahas including Rāhu and Ketu, mean or true',
    ],
  },
  {
    kicker: 'Strength',
    title: 'Aṣṭakavarga that tells you where each bindu came from',
    body: 'Bhinnāṣṭakavarga and the sarva totals, with the contributing grahas named for every bindu, so a claim about a house traces back to the rows that produced it. Dignity, combustion and dṛṣṭi are computed alongside, and the ṣaḍbala components that verify against a reference are exposed individually.',
    points: [
      'BAV and SAV with contributor breakdown',
      'Exaltation, mūlatrikoṇa, friendship, combustion arcs',
      'Whole-sign dṛṣṭi with the special aspects',
      'Six ṣaḍbala components verified exactly, and no invented total',
    ],
  },
  {
    kicker: 'The instrument',
    title: 'Every view of one chart, driven by one time cursor',
    body: 'Move the date once and the nakṣatra dial, the graphic ephemeris, the aṣṭakavarga profile and the daśā timeline all move with it. Select a graha and every view narrows to it. The cursor and the selection live in the address bar, so a reload holds the view and a link carries it to somebody else.',
    points: [
      'A nakṣatra dial: 27 nakṣatras, 108 exact pādas, tārā shading from the janma nakṣatra',
      'A graphic ephemeris folded at 13°20′, where a nakṣatra crossing is a straight line',
      'Aṣṭakavarga as a radial profile, with small multiples for each contributor',
      'A zoomable daśā timeline with a Saturn and sarva band underneath it',
    ],
  },
  {
    kicker: 'The sky',
    title: 'Tonight’s sky, and the geometry a flat wheel cannot hold',
    body: 'A wheel has one number per graha and nowhere to put a second. The sphere view puts the viewer at the centre, the ecliptic as a band, and the grahas riding it at their real latitude, against 5,080 stars from the Yale catalogue. A retrograde loop closes into a loop, because latitude keeps changing while longitude reverses.',
    points: [
      'Today’s sky read against every person you keep, on one screen',
      'Event search: name several conditions, get the windows where all of them hold',
      'The ayanāṁśa drawn as the gap between the equinox and Aśvinī',
      'A positions table with latitude beside every view, so the numbers are readable as text',
    ],
  },
  {
    kicker: 'Reading',
    title: 'Plain English, with the arithmetic still attached',
    body: 'A separate reading surface at read.jadeapp.co says what a chart holds in ordinary words: each house with its sign, its lord, what sits in it and what aspects it. Every paragraph is assembled from computed factors, and the factors sit behind a tap on the paragraph. There is no free-floating prose anywhere in it.',
    points: [
      'Twelve houses, read one card at a time',
      'Periods, slow transits and sade sati described without a verdict',
      'The same workings the technical sheet shows, one tap away',
      'Its own address, so a client can read it without seeing your workbench',
    ],
  },
  {
    kicker: 'Time',
    title: 'Daśās and transits, with the dates solved for, not sampled',
    body: 'Vimśottarī with three year-length conventions. The transit scanner finds ingresses, stations and crossings by bisection, so a date is a root and not the nearest sample. A slow graha crossing one degree three times over a retrograde loop returns all three, each labelled by which pass it is.',
    points: [
      'Vimśottarī daśā, selectable depth',
      'Ingresses, stations and crossings as bisected roots',
      'Every pass of a retrograde loop, named',
      'Watches that fire when the sky reaches a natal point',
    ],
  },
  {
    kicker: 'Relationships',
    title: 'Aṣṭakūṭa verified against every possible pairing',
    body: 'The technique reads two nakṣatras and two pādas, which makes the whole input space enumerable, so all 11,664 pairings were checked against an independent implementation. Four of the eight tables were wrong before that check. Maṅgala doṣa arrives with its cancellations computed beside it.',
    points: [
      'Eight kūṭas with every rule shown',
      'Maṅgala doṣa with classical cancellations',
      'Two-ring overlay wheel and house overlays both ways',
      'A shared daśā timeline with four named convergence rules',
    ],
  },
  {
    kicker: 'Practice',
    title: 'A study log that attaches to the factor, not the page',
    body: 'Write a note against a graha, a house, a yoga or a daśā, and it can be found again from every chart that has the same factor. Ask for everything you have written about Gajakesarī and get it across your whole book. That works because an anchor is a name, not a pointer at one chart.',
    points: [
      'Notes anchored to any computed factor',
      'Full-text search across your whole study log',
      'Session prep sheets, follow-ups, and printable reports with or without your notes',
      'Rectification: test candidate birth times against events that already happened',
      'Historical timezone resolution, ambiguity flagged not hidden',
      'JSON export and hard delete on every person',
    ],
  },
] as const;

export default function FeaturesPage() {
  const { rasi, navamsa } = demoChart();

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Features', path: '/features' },
        ])}
      />

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          kicker="Features"
          title="Everything is decomposable, or it is not printed."
          as="h1"
          lede="Eight areas, each one built out. Jade computes what a classical text specifies and shows the placements behind every claim. Where authorities disagree, both readings ship behind a named option and the disagreement is documented."
        />
      </section>

      {/* Two real charts of the same person, from the real engine. */}
      <section className="mx-auto mt-10 max-w-6xl px-5 sm:px-8">
        <div className="jade-panel grid gap-6 p-6 sm:grid-cols-2 sm:p-8">
          <figure className="text-center">
            <NorthIndianChart varga={rasi} size={300} signLabels="number" />
            <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              D1 rāśi · North Indian
            </figcaption>
          </figure>
          <figure className="text-center">
            <SouthIndianChart varga={navamsa} size={300} signLabels="number" />
            <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              D9 navāṁśa · South Indian · seated on its own ascendant
            </figcaption>
          </figure>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {GROUPS.map((group, index) => (
          <section
            key={group.kicker}
            className="jade-rise mt-16 grid gap-8 border-t border-[var(--rule)] pt-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]"
            style={{ '--i': index } as React.CSSProperties}
          >
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                {group.kicker}
              </p>
              <h2 className="mt-2 font-display text-[clamp(1.6rem,3.2vw,2.2rem)] font-semibold leading-tight">
                {group.title}
              </h2>
              <p className="mt-4 max-w-[60ch] text-[15px] leading-relaxed text-[var(--ink-muted)]">
                {group.body}
              </p>
            </div>

            <ul className="flex flex-col gap-2 self-start border-l border-[var(--rule)] pl-5">
              {group.points.map((point) => (
                <li key={point} className="text-[14px] leading-snug text-[var(--ink-muted)]">
                  {point}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="px-5 sm:px-8">
        <CallToAction />
      </div>
    </>
  );
}

import type { Metadata } from 'next';
import { NorthIndianChart, SouthIndianChart } from '@jade/ui';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { JsonLd, breadcrumbSchema } from '@/components/marketing/JsonLd';
import { demoChart } from '@/lib/demoChart';

export const metadata: Metadata = {
  title: 'Features — divisional charts, aṣṭakavarga, daśās and transits | Jade',
  description:
    'Sixteen vargas re-seated on their own ascendants, aṣṭakavarga with every contributor named, yoga detection with cancellations, Vimśottarī daśā, bisected transit scanning and aṣṭakūṭa verified across all 11,664 pairings.',
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
    body: 'All sixteen vargas of the ṣoḍaśavarga, each re-seated on its own ascendant rather than the rāśi redrawn sixteen times — the difference most software quietly gets wrong. Vargottama placements are flagged. North and South Indian layouts are hand-written SVG, so they stay sharp at any size and print properly.',
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
    body: 'Bhinnāṣṭakavarga and the sarva totals, with the contributing grahas named for every bindu — so a claim about a house can be traced to the rows that produced it. Dignity, combustion and dṛṣṭi are computed alongside, and the ṣaḍbala components that verify against a reference are exposed individually.',
    points: [
      'BAV and SAV with contributor breakdown',
      'Exaltation, mūlatrikoṇa, friendship, combustion arcs',
      'Whole-sign dṛṣṭi with the special aspects',
      'Six ṣaḍbala components verified exactly — and no invented total',
    ],
  },
  {
    kicker: 'Time',
    title: 'Daśās and transits, with the dates bisected rather than sampled',
    body: 'Vimśottarī with three year-length conventions. The transit scanner finds ingresses, stations and crossings by bisection, so a date is a root rather than the nearest sample — and a slow graha crossing a degree three times over a retrograde loop returns all three, labelled by which pass it is.',
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
    body: 'The technique reads two nakṣatras and two pādas, which makes the whole input space enumerable — so all 11,664 pairings were checked against an independent implementation, and four of the eight tables were wrong before that check. Maṅgala doṣa arrives with its cancellations computed beside it.',
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
    body: 'Write a note against a graha, a house, a yoga or a daśā, and it can be found again from every chart that has the same factor. Ask for everything you have written about Gajakesarī and get it across your whole book — possible because an anchor is a name rather than a pointer at one chart.',
    points: [
      'Notes anchored to any computed factor',
      'Full-text search across your whole study log',
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
          lede="Jade computes what a classical text specifies and shows the placements behind every claim. Where authorities disagree, both readings ship behind a named option and the disagreement is documented."
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

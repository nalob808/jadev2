import type { Metadata } from 'next';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { JsonLd, breadcrumbSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'How Jade verifies its mathematics — the accuracy programme',
  description:
    'Positions checked against Swiss Ephemeris, derived techniques diffed against Jagannātha Hora across seventeen charts, aṣṭakūṭa verified across all 11,664 pairings — and the disagreements published rather than hidden.',
  alternates: { canonical: 'https://jadeapp.co/accuracy' },
  openGraph: {
    title: 'The accuracy programme — Jade',
    description:
      'What we verify, how, and the four places our reference implementation turned out to be wrong.',
    url: 'https://jadeapp.co/accuracy',
    type: 'article',
  },
};

/**
 * The page that does the most selling, by not selling.
 *
 * Nobody else in this market publishes what their software gets wrong. For an
 * audience that has been burned by tools which quietly disagree with each
 * other, an honest list of open disagreements is more persuasive than any
 * claim of correctness — and it doubles as engineering discipline, because
 * every line here has to stay true.
 */

const VERIFIED = [
  {
    what: 'Positions and angles',
    against: 'Swiss Ephemeris',
    detail:
      'Golden fixtures regenerated and diffed in continuous integration. Ascendant, midheaven, the nine grahas, nutation and the obliquity all pinned to stated tolerances.',
  },
  {
    what: 'Aṣṭakavarga',
    against: 'Jagannātha Hora',
    detail:
      'Four of the sixty-four benefic rows were wrong on the first pass. Three of them cancelled out — the totals still summed correctly — and only the independent check found them.',
  },
  {
    what: 'Aṣṭakūṭa',
    against: 'All 11,664 pairings',
    detail:
      'The technique reads only two nakṣatras and two pādas, so the entire input space is enumerable. Four of the eight tables were wrong before that check, including seven zero cells in the yoni matrix.',
  },
  {
    what: 'Yogas',
    against: 'Jagannātha Hora',
    detail:
      'Twelve of sixteen agree exactly across the fixture set. The other four are documented divergences with a named option, not silent disagreements.',
  },
  {
    what: 'Transit dates',
    against: 'Swiss Ephemeris',
    detail:
      'Two five-year windows a century apart, with an independent bisection on the reference side. Every event count matched exactly.',
  },
  {
    what: 'Workspace isolation',
    against: 'A live Postgres',
    detail:
      'Row-level security is enabled and forced on every table holding your data, and a probe tries to read across the boundary on every deploy rather than trusting the configuration.',
  },
];

const OPEN = [
  {
    title: 'There is no ṣaḍbala total',
    body: 'Six sources assembled from about twenty sub-components, and authorities differ on at least half. Six components verify exactly against the reference and are exposed individually; ten are not implemented. A total is only as trustworthy as its weakest part, so Jade does not print one.',
  },
  {
    title: 'The East Indian chart is not shipped',
    body: 'It renders correctly as geometry, but the traditional Bengali sign arrangement could not be confirmed against a reference implementation. A plausible guess at a regional convention is exactly what a Bengali astrologer spots in one glance.',
  },
  {
    title: 'Interactive transit times are approximate',
    body: 'The in-browser ephemeris is fast enough to scrub a timeline at sixty frames a second, and its timing error runs from a fraction of a minute for the Moon to about an hour for Saturn near a station. It drives the interface; it does not drive a printed date.',
  },
];

const FOUND_IN_REFERENCE = [
  'Dig bala’s default method returns values above the 60-virūpa ceiling on a third of the sample — up to 99.95.',
  'Pakṣa bala returns −41.45 on one chart and 101.45 on another, both outside the classical range.',
  'Tārā kūṭa never awards full marks, where the classical rule does.',
  'Varṇa kūṭa inverts Śūdra and Vaiśya.',
];

export default function AccuracyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Accuracy', path: '/accuracy' },
        ])}
      />

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          kicker="The accuracy programme"
          title="A wrong degree is the highest-severity bug there is."
          as="h1"
          lede="Every technique in Jade is checked against an implementation that was written by someone else — because software that only agrees with itself proves nothing. Here is what is verified, what is not, and where the check found a mistake."
        />
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">Verified, and against what</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {VERIFIED.map((row, index) => (
            <article
              key={row.what}
              className="jade-panel jade-rise p-5"
              style={{ '--i': index } as React.CSSProperties}
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-display text-xl font-semibold">{row.what}</h3>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--jade)]">
                  vs {row.against}
                </span>
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-muted)]">
                {row.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <SectionHead
          kicker="Open"
          title="What is not verified, and therefore not shipped"
          lede="Absence is a decision. Each of these could have been implemented from a text and left to look right — which is how software ends up confidently wrong."
        />
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          {OPEN.map((item, index) => (
            <article
              key={item.title}
              className="jade-panel jade-rise border-l-2 border-l-[var(--clay)] p-5"
              style={{ '--i': index } as React.CSSProperties}
            >
              <h3 className="font-display text-xl font-semibold leading-snug">{item.title}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--ink-muted)]">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <div className="jade-panel jade-panel--marked p-8 sm:p-10">
          <SectionHead
            kicker="The other direction"
            title="Sometimes the reference was the one that was wrong"
            lede="Verification is not deference. Where the reference implementation disagrees with the classical rule, Jade keeps the classical reading and records why."
          />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {FOUND_IN_REFERENCE.map((line) => (
              <li
                key={line}
                className="border-l border-[var(--rule)] pl-4 text-[14px] leading-relaxed text-[var(--ink-muted)]"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl px-5 text-center sm:px-8">
        <p className="text-[17px] leading-relaxed text-[var(--ink-muted)]">
          Two astrologers disagreeing about ayanāṁśa is normal. Software that hides which one it
          used is unusable. Jade stores the frame, the node type, the house system and the position
          basis with every chart, and shows all four in the interface.
        </p>
      </section>

      <div className="px-5 sm:px-8">
        <CallToAction
          title="Check it against your own software"
          body="Cast a chart you already know well and compare it degree for degree. That is the only test that matters, and it is free."
        />
      </div>
    </>
  );
}

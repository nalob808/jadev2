import type { Metadata } from 'next';
import Link from 'next/link';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Why Jade exists',
  description:
    'Jade was built because the astrology software with real classical depth was written in the 1990s, and everything modern is a horoscope app. The story, and the rules the project holds itself to.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'Why Jade exists',
    description:
      'The software with real depth was written in the 1990s. Everything modern is a horoscope app. So we built the third thing.',
    url: `${SITE_URL}/about`,
    type: 'article',
  },
};

/**
 * The origin story.
 *
 * Written as a specific account rather than a mission statement, because the
 * audience is people who have already been sold to by every astrology app on
 * the store. What earns their attention is a story that shows the author knows
 * the difference between a chart and a horoscope.
 *
 * Every factual claim here is one the accuracy page can back up.
 */

const PRINCIPLES = [
  {
    n: 'One',
    title: 'Accuracy is the product',
    body: 'A wrong degree is the highest-severity bug there is. Every calculation ships with tests against a golden fixture set, and nothing is approximated “for now” — approximation belongs behind an explicit, labelled flag or nowhere.',
  },
  {
    n: 'Two',
    title: 'No silent defaults',
    body: 'Ayanāṁśa, node type, house system and position basis are always explicit, always stored with the chart, and always visible. Two astrologers disagreeing about ayanāṁśa is normal. Software that hides which one it used is unusable.',
  },
  {
    n: 'Three',
    title: 'Nothing is asserted that cannot be decomposed',
    body: 'If we cannot name the yoga, the daśā and the transit that produced a statement, we do not print the statement. Every claim on screen carries the placements that produced it.',
  },
  {
    n: 'Four',
    title: 'Where the authorities disagree, both readings ship',
    body: 'Aṣṭakavarga reduction schools, maṅgala doṣa cancellations, horā in the sapta-vargaja — the texts genuinely differ. Jade implements the variants behind a named option and documents the disagreement instead of picking one quietly.',
  },
  {
    n: 'Five',
    title: 'Never death, disease, or legal outcomes',
    body: 'A hard product rule, enforced in the code and in the terms of service. Astrology can be practised responsibly, and the software should make that the easy path.',
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'About', path: '/about' },
        ])}
      />

      <article className="mx-auto max-w-3xl px-5 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          kicker="Why Jade exists"
          as="h1"
          title="The good software was written in the 1990s."
        />

        <div className="mt-8 flex flex-col gap-5 text-[17px] leading-[1.75] text-[var(--ink-muted)]">
          <p>
            If you practise Jyotiṣa seriously, you already know the trade. The programs with real
            classical depth — the ones that compute ṣoḍaśavarga properly, that know what a śodhya
            piṇḍa is, that will give you a bhinnāṣṭakavarga you can actually defend — were written
            decades ago. They run in a window that has not moved since Windows 98. Several require a
            dongle. One of them still ships on a CD.
          </p>

          <p>
            And everything built since is a horoscope app. Beautiful, fast, works on a phone, and
            wrong in ways that matter: no Rāhu and Ketu, or nodes computed as an afterthought;
            divisional charts that are just the rāśi redrawn with new labels; an ayanāṁśa nobody
            will name. They are not built for you. They are built for someone who wants to be told
            they are a Scorpio.
          </p>

          <p className="border-l-2 border-[var(--accent)] pl-5 text-[var(--ink)]">
            So the choice a working astrologer has is between software that is correct and hostile,
            or software that is pleasant and cannot be trusted. That is a strange thing to have
            accepted for twenty-five years.
          </p>

          <p>
            Jade started because someone close to this project is learning Jyotiṣa properly —
            reading the texts, casting charts by hand first and checking them after — and there was
            nowhere decent to keep the work. Notes in one app. Charts in another. A spreadsheet of
            birth times. Every study session began with fifteen minutes of assembling context that
            should have been sitting there already.
          </p>

          <p>
            The first version was a single HTML file. It got the ascendant right and the nodes
            wrong, which is a good summary of why this is harder than it looks. Rebuilding it
            properly meant deciding, early, that the calculations would be verified against
            something other than our own confidence — and that decision is the whole project.
          </p>

          <p>
            Every technique in Jade is checked against an implementation written by somebody else.
            That check has repaid the effort many times over. Four of the sixty-four aṣṭakavarga
            benefic rows were wrong on the first pass, and three of them cancelled out so cleanly
            that the totals still summed correctly — no test we could have written ourselves would
            have caught them. Four of the eight aṣṭakūṭa tables were wrong before all 11,664
            pairings were enumerated. A transit scanner once returned a perfectly plausible list of
            Saturn ingress dates that were every one of them about two years out.
          </p>

          <p>
            It has also gone the other way. The reference implementation’s default dig bala returns
            values above the 60-virūpa ceiling on a third of our sample. Its tārā kūṭa never awards
            full marks where the classical rule does. Verification is not deference — where the
            reference disagrees with the text, Jade keeps the text and records why.
          </p>

          <p>
            The name is the stone: green, hard, and prized for a durability you cannot see by
            looking. Which is roughly the ambition — that the part you never inspect is the part
            that holds.
          </p>
        </div>
      </article>

      <section className="mx-auto mt-20 max-w-4xl px-5 sm:px-8">
        <SectionHead
          kicker="The rules"
          title="Five things this project will not trade away"
          lede="These are written into the repository as constraints, not aspirations — several are enforced by tests that fail the build."
        />

        <div className="mt-8 flex flex-col">
          {PRINCIPLES.map((rule, index) => (
            <div
              key={rule.n}
              className="jade-rise grid gap-4 border-t border-[var(--rule)] py-6 sm:grid-cols-[6rem_minmax(0,1fr)]"
              style={{ '--i': index } as React.CSSProperties}
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
                {rule.n}
              </p>
              <div>
                <h3 className="font-display text-2xl font-semibold leading-tight">{rule.title}</h3>
                <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-[var(--ink-muted)]">
                  {rule.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-[15px] text-[var(--ink-muted)]">
          The full verification record — what is checked, against what, and what is deliberately not
          shipped — is on{' '}
          <Link href="/accuracy" className="text-[var(--accent)] underline">
            the accuracy page
          </Link>
          .
        </p>
      </section>

      <div className="px-5 sm:px-8">
        <CallToAction
          title="Cast a chart you already know well"
          body="Compare it degree for degree against whatever you use now. That is the only review that counts, and it costs nothing."
        />
      </div>
    </>
  );
}

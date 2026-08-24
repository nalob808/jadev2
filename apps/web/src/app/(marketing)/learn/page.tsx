import type { Metadata } from 'next';
import Link from 'next/link';
import { GRAHAS_LIB, HOUSES, SIGNS_LIB } from '@jade/interpret';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Learn Vedic astrology — houses, signs and grahas',
  description:
    'A plain reference to the twelve bhāvas, the twelve rāśis and the nine grahas, with the classical source named on every entry. The same library Jade composes its readings from.',
  alternates: { canonical: `${SITE_URL}/learn` },
  openGraph: {
    title: 'Learn Vedic astrology — Jade',
    description: 'The twelve houses, twelve signs and nine grahas, with sources named.',
    url: `${SITE_URL}/learn`,
    type: 'website',
  },
};

/**
 * The reference, and the reason readings can be trusted.
 *
 * These pages render the same library `readingFor` composes from. There is one
 * place where "what the 7th house means" is written down, so the lesson and
 * the reading cannot drift apart — and a student who wonders why a reading
 * said something can read the entry it was built from.
 */
export default function LearnIndex() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Learn', path: '/learn' },
        ])}
      />

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          kicker="Reference"
          as="h1"
          title="The pieces a chart is made of."
          lede="Every entry names the classical source it comes from. This is the same library Jade composes its readings out of — so anything a reading says can be traced back to a page you can read."
        />
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">The twelve bhāvas</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
          A house is an area of life. Which sign falls in which house is fixed by the rising sign,
          which is why the ascendant matters more than anything else in the chart.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {HOUSES.map((house, index) => (
            <li
              key={house.number}
              className="jade-rise"
              style={{ '--i': index } as React.CSSProperties}
            >
              <Link
                href={`/learn/houses/${house.number}`}
                className="jade-panel jade-panel--interactive block h-full p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  House {house.number} · {house.plain.split(' / ')[0]}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
                  {house.title}
                </h3>
                <p className="mt-2 text-[13px] leading-snug text-[var(--ink-muted)]">
                  {house.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">The nine grahas</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
          “Planet” is a poor translation. A graha is a seizer — something that takes hold of an area
          of life and acts on it, which is why the two lunar nodes belong in the list.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {GRAHAS_LIB.map((graha, index) => (
            <li
              key={graha.id}
              className="jade-rise"
              style={{ '--i': index } as React.CSSProperties}
            >
              <Link
                href={`/learn/grahas/${graha.id.toLowerCase()}`}
                className="jade-panel jade-panel--interactive block h-full p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  {graha.glyph}&#xFE0E; {graha.plain}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
                  {graha.id}
                </h3>
                <p className="mt-2 text-[13px] leading-snug text-[var(--ink-muted)]">
                  {graha.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">The twelve rāśis</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] text-[var(--ink-muted)]">
          A sign is not a personality. It is the medium a graha acts through — it says how something
          operates, not what a person is like.
        </p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNS_LIB.map((sign, index) => (
            <li
              key={sign.name}
              className="jade-rise"
              style={{ '--i': index } as React.CSSProperties}
            >
              <Link
                href={`/learn/signs/${sign.name.toLowerCase()}`}
                className="jade-panel jade-panel--interactive block h-full p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  {sign.plain} · {sign.modality} {sign.element}
                </p>
                <h3 className="mt-1 font-display text-xl font-semibold leading-tight">
                  {sign.name}
                </h3>
                <p className="mt-2 text-[13px] leading-snug text-[var(--ink-muted)]">
                  {sign.summary}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="px-5 sm:px-8">
        <CallToAction
          title="Read these against your own chart"
          body="Every reading Jade composes shows the placements behind each sentence, and links back to these pages."
        />
      </div>
    </>
  );
}

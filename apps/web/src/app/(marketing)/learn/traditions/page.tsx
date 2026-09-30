import type { Metadata } from 'next';
import Link from 'next/link';
import { PLACES, SOURCES, TRADITIONS } from '@jade/interpret';
import { CallToAction, SectionHead } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

export const metadata: Metadata = {
  title: 'Five traditions of astrology — Hellenistic to Jyotiṣa',
  description:
    'What Hellenistic, Perso-Arabic, medieval Latin, Renaissance and Indian astrologers each made of the same sky, with the authors named and the disagreements left in. The library Jade reads a chart from.',
  alternates: { canonical: `${SITE_URL}/learn/traditions` },
  openGraph: {
    title: 'Five traditions of astrology — Jade',
    description: 'Eighteen centuries of practice, with the disagreements left in.',
    url: `${SITE_URL}/learn/traditions`,
    type: 'website',
  },
};

/**
 * The five voices, as a reference rather than as a reading.
 *
 * The same tables `deepNatalReading` and `deepTransitReading` compose from,
 * which is the point: somebody who reads a passage attributed to Bonatti and
 * wants to know who Bonatti was should not have to leave for Wikipedia and come
 * back. One library, two surfaces — the reading uses it to say something about
 * a person, and these pages let that person check the claim.
 *
 * Marketing group rather than the app, deliberately: this is the material that
 * makes the case for the product without describing the product, and it is the
 * half of Jade that has any business being on the open web.
 */
export default function TraditionsIndex() {
  /* Places the traditions actually name differently. The rest print nothing. */
  const named = PLACES.filter((place) => Object.keys(place.calledIt).length > 0);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Learn', path: '/learn' },
          { name: 'Traditions', path: '/learn/traditions' },
        ])}
      />

      <section className="mx-auto max-w-6xl px-5 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          kicker="Reference"
          as="h1"
          title="Five traditions, one sky."
          lede="Eighteen centuries of astrologers who mostly could not read each other, working on the same problem. They agree about what the twelve places are for and disagree — sharply, and for reasons worth knowing — about what a planet standing in one of them is like to live with."
        />
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-5 sm:px-8">
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRADITIONS.map((tradition, index) => {
            const count = SOURCES.filter((source) => source.tradition === tradition.id).length;
            return (
              <li
                key={tradition.id}
                className="jade-rise"
                style={{ '--i': index } as React.CSSProperties}
              >
                <Link
                  href={`/learn/traditions/${tradition.id}`}
                  className="jade-panel jade-panel--interactive block h-full p-4"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                    {tradition.when}
                  </p>
                  <h2 className="mt-1 font-display text-xl font-semibold leading-tight">
                    {tradition.name}
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] text-[var(--ink-faint)]">
                    {tradition.where}
                  </p>
                  <p className="mt-2 text-[13px] leading-snug text-[var(--ink-muted)]">
                    {tradition.temper}
                  </p>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                    {count} {count === 1 ? 'author' : 'authors'}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* -------------------------------------------------- the same twelve */}
      <section className="mx-auto mt-16 max-w-6xl px-5 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">What they called the places</h2>
        <p className="mt-1 max-w-[64ch] text-[15px] text-[var(--ink-muted)]">
          The twelve divisions are the same in all five. The names are not, and a name is an
          argument — the Greek second place is the Gate of Hades and the Indian second is the house
          of wealth, describing the same arc of sky.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {named.map((place) => (
            <li key={place.place} className="jade-panel p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
                Place {place.place}
              </p>
              <h3 className="mt-0.5 font-display text-lg font-semibold leading-tight">
                {place.topic}
              </h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
                {place.governs}
              </p>
              <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1">
                {Object.entries(place.calledIt).map(([id, name]) => (
                  <div key={id} className="flex flex-wrap items-baseline gap-x-2">
                    <dt className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                      {TRADITIONS.find((one) => one.id === id)?.name ?? id}
                    </dt>
                    <dd className="text-[13.5px]">{name}</dd>
                  </div>
                ))}
              </dl>
              {place.differ ? (
                <p className="mt-2.5 border-l-2 border-[var(--clay)] pl-3 text-[13px] leading-relaxed text-[var(--ink-muted)]">
                  {place.differ}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <div className="px-5 sm:px-8">
        <CallToAction
          title="Read all five against your own chart"
          body="Jade's reading puts every tradition's answer beside the others, with the placements behind each one a tap away."
        />
      </div>
    </>
  );
}

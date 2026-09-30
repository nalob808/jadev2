import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { GRAHA_STANCE, TRADITIONS, sourcesFor, type TraditionId } from '@jade/interpret';
import { SectionHead } from '@/components/marketing/Site';
import { JsonLd, SITE_URL, breadcrumbSchema } from '@/components/marketing/JsonLd';

/** Static at build time: five pages, and they change when the library does. */
export function generateStaticParams(): Array<{ id: string }> {
  return TRADITIONS.map((tradition) => ({ id: tradition.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const tradition = TRADITIONS.find((one) => one.id === id);
  if (!tradition) return {};

  return {
    title: `${tradition.name} astrology — what it made of the planets`,
    description: `${tradition.temper} The authors, what may be quoted from them, and what each planet meant in a nativity.`,
    alternates: { canonical: `${SITE_URL}/learn/traditions/${tradition.id}` },
    openGraph: {
      title: `${tradition.name} astrology — Jade`,
      description: tradition.temper,
      url: `${SITE_URL}/learn/traditions/${tradition.id}`,
      type: 'article',
    },
  };
}

/** The order a reader wants them: the lights, then by weight. */
const ORDER = ['Sun', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Rahu', 'Ketu'];

/**
 * One tradition, at length.
 *
 * Three things, in the order somebody needs them: who these people were, what
 * may honestly be quoted from them, and what they said about each planet.
 *
 * The middle one is unusual on a page like this and it is the most important.
 * Almost every astrology site on the web quotes modern translations of ancient
 * authors as though the age of the original settled the copyright of the
 * English. It does not — Robbins on Ptolemy, Dykes on Bonatti and Santhanam on
 * Parāśara are living works of scholarship — so Jade paraphrases and says so,
 * and this page shows the reader exactly where the line falls rather than
 * leaving them to assume there isn't one.
 */
export default async function TraditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const tradition = TRADITIONS.find((one) => one.id === id);
  if (!tradition) notFound();

  /* Culpeper and the decumbiture material are named on the history page and
     nowhere near a reading — CLAUDE.md #6. */
  const sources = sourcesFor(tradition.id as TraditionId);
  const stances = GRAHA_STANCE[tradition.id as TraditionId];
  const grahas = ORDER.filter((graha) => stances[graha]);

  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: 'Jade', path: '/' },
          { name: 'Learn', path: '/learn' },
          { name: 'Traditions', path: '/learn/traditions' },
          { name: tradition.name, path: `/learn/traditions/${tradition.id}` },
        ])}
      />

      <section className="mx-auto max-w-4xl px-5 pt-14 sm:px-8 lg:pt-20">
        <Link
          href="/learn/traditions"
          className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)] underline underline-offset-4"
        >
          ← all five traditions
        </Link>
        <div className="mt-4">
          <SectionHead
            kicker={`${tradition.when} · ${tradition.where}`}
            as="h1"
            title={tradition.name}
            lede={tradition.temper}
          />
        </div>
      </section>

      {/* ------------------------------------------------------- the authors */}
      <section className="mx-auto mt-12 max-w-4xl px-5 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">Who wrote it down</h2>
        {/*
          The copyright rule, said once.
          
          It was on every card, which meant three identical paragraphs on this
          page and five on another — the same padding the reading layer was
          built to avoid, arriving through the back door. The rule is general,
          so it goes at the top; the cards carry only which side of it they
          fall on.
        */}
        <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
          The authors are long out of copyright. Almost every English text of them is not — a modern
          translation is a living work of scholarship owned by its translator. So Jade paraphrases
          and names the chapter, and quotes directly only where an English text is itself in the
          public domain. Two of the nineteen sources are.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {sources.map((source) => (
            <li key={source.id} className="jade-panel p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="font-display text-xl font-semibold leading-tight">
                  {source.author}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {source.floruit}
                </p>
              </div>
              <p className="mt-0.5 text-[14px] italic text-[var(--ink-muted)]">
                {source.work} · {source.language}
              </p>
              <p className="mt-2 text-[14px] leading-relaxed">{source.why}</p>
              <p
                className={`mt-2 font-mono text-[10px] uppercase tracking-wider ${
                  source.quotable ? 'text-[var(--jade)]' : 'text-[var(--ink-faint)]'
                }`}
              >
                {source.quotable ? 'quotable in English' : 'paraphrase only'}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* -------------------------------------------------------- the planets */}
      <section className="mx-auto mt-16 max-w-4xl px-5 pb-16 sm:px-8">
        <h2 className="font-display text-2xl font-semibold">What each planet meant</h2>
        <p className="mt-1 max-w-[64ch] text-[15px] text-[var(--ink-muted)]">
          Three answers for each: what this tradition took the planet to be, what it takes the
          planet to <em>do</em>, and what it makes of somebody born with it strongly placed. The
          third is the one that differs most between traditions, and the one a reading is built
          from.
        </p>
        <ul className="mt-5 flex flex-col gap-3">
          {grahas.map((graha) => {
            const stance = stances[graha]!;
            return (
              <li key={graha} className="jade-panel p-4">
                <h3 className="font-display text-xl font-semibold leading-tight">{graha}</h3>
                <dl className="mt-2 flex flex-col gap-2">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                      is
                    </dt>
                    <dd className="text-[14.5px] leading-relaxed">{stance.is}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                      does
                    </dt>
                    <dd className="text-[14.5px] leading-relaxed">{stance.acts}</dd>
                  </div>
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--clay)]">
                      in a nativity
                    </dt>
                    <dd className="text-[14.5px] leading-relaxed">{stance.native}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>

        {/*
          The nodes, where a tradition has no doctrine of them. Said rather than
          left as a silently shorter list, because "this tradition has nothing
          to say about Rāhu" is real information about where the doctrine comes
          from — and inventing a Hellenistic Rāhu to fill the gap would be the
          one error a reader cannot check.
        */}
        {grahas.length < ORDER.length ? (
          <p className="mt-4 border border-dashed border-[var(--rule-strong)] p-3 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
            No entry here for Rāhu and Ketu. The lunar nodes are central to Jyotiṣa and present in
            the Arabic material, and the Greek and Latin traditions have no developed doctrine of
            them — so Jade prints nothing rather than inventing one.
          </p>
        ) : null}
      </section>
    </>
  );
}

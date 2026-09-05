import type { Metadata } from 'next';
import Link from 'next/link';
import { figuresBornOn, listPublicFigures, publicFigureTags } from '@jade/db';
import { getDatabase } from '@/lib/db';
import { LIBRARY_LENS } from '@/lib/publicChart';
import { FigureCard } from '@/components/marketing/FigureCard';
import { SectionHead } from '@/components/marketing/Site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Public chart library — Vedic charts of notable people | Jade',
  description:
    'Sidereal birth charts of scientists, writers, musicians and teachers, each showing how well its birth time is attested — and saying so plainly when no time is known.',
  alternates: { canonical: 'https://jadeapp.co/charts' },
};

/**
 * The library index.
 *
 * Three ways in, in the order people actually use them: what happened today,
 * what you can search for, and what you can browse. "Born on this day" leads
 * because it is the only one that answers a question the reader did not have to
 * arrive with.
 */
export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const database = getDatabase();
  const today = new Date();

  const [figures, tags, bornToday] = await Promise.all([
    listPublicFigures(database, q ? { search: q } : {}),
    publicFigureTags(database),
    figuresBornOn(database, today.getUTCMonth() + 1, today.getUTCDate()),
  ]);

  const timed = figures.filter((f) => f.birthTime).length;

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-6 pt-14 sm:px-8 lg:pt-20">
        <SectionHead
          kicker="Public charts"
          title="Charts you can check"
          as="h1"
          lede="Notable people, cast sidereally. Every entry states how well its birth time is attested — and where no time is recorded, Jade draws no ascendant and says why rather than quietly assuming noon."
        />

        <form action="/charts" className="mt-8 flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or what they did…"
            aria-label="Search the chart library"
            className="min-w-0 flex-1 border border-[var(--rule-strong)] bg-[var(--surface)] px-3 py-2.5 text-base"
          />
          <button
            type="submit"
            className="border border-[var(--accent)] bg-[var(--accent)] px-5 py-2.5 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
          >
            Search
          </button>
        </form>

        <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {figures.length} {figures.length === 1 ? 'chart' : 'charts'} · {timed} with an attested
          time · {LIBRARY_LENS.label}
        </p>
      </section>

      {/* ------------------------------------------------- born on this day */}
      {!q && bornToday.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
          <div className="jade-panel jade-panel--marked p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              Born on this day
            </p>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bornToday.slice(0, 6).map((figure) => (
                <FigureCard key={figure.id} figure={figure} />
              ))}
            </ul>
            <p className="mt-3">
              <Link
                href={`/charts/born/${today.getUTCMonth() + 1}/${today.getUTCDate()}`}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
              >
                Everyone born on this date →
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------- the tags */}
      {tags.length > 0 ? (
        <section className="mx-auto max-w-6xl px-5 py-4 sm:px-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Browse by what they did
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {tags.map(({ tag, count }) => (
              <li key={tag}>
                <Link
                  href={`/charts/tag/${encodeURIComponent(tag)}`}
                  className="inline-flex items-baseline gap-1.5 border border-[var(--rule-strong)] px-2.5 py-1 text-[13px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {tag}
                  <span className="font-mono text-[10px] tabular-nums text-[var(--ink-faint)]">
                    {count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------------ everything */}
      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          {q ? `Matching “${q}”` : 'Everyone in the library'}
        </p>
        {figures.length === 0 ? (
          <p className="mt-3 text-[var(--ink-muted)]">
            Nothing matches that.{' '}
            <Link href="/charts" className="text-[var(--accent)] underline underline-offset-2">
              Show everyone
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {figures.map((figure) => (
              <FigureCard key={figure.id} figure={figure} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

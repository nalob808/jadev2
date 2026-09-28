import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listPublicFigures, listSubjects, publicFigureTags } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { LIBRARY_LENS } from '@/lib/publicChart';
import { Kicker, PageHead, Panel, Shell } from '@/components/Shell';

export const metadata = { title: 'Library' };
export const dynamic = 'force-dynamic';

/**
 * The public library, inside the app.
 *
 * `/charts` already existed and is not going anywhere — it is the public,
 * indexable page, written for somebody who arrived from a search result. This
 * page is the same records read for a different purpose: a practitioner wants
 * to put a library chart *underneath one of their own*, and the public page
 * cannot offer that because it has no workspace to overlay onto.
 *
 * So the library word in the menu lands here, in the app's chrome, and the
 * public pages are one marked link away rather than a trapdoor out of the app.
 */

/** Rodden ratings, worst last, so a list can be read for trustworthiness. */
const RODDEN_NOTE: Readonly<Record<string, string>> = {
  AA: 'birth record in hand',
  A: 'from the person or family',
  B: 'biography or autobiography',
  C: 'origin unknown — caution',
  DD: 'sources disagree',
  X: 'no birth time',
  XX: 'birth date itself doubtful',
};

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string }>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { q, tag } = await searchParams;
  const database = getDatabase();
  const [figures, tags, subjects] = await Promise.all([
    listPublicFigures(database, {
      ...(q ? { search: q } : {}),
      ...(tag ? { tag } : {}),
    }),
    publicFigureTags(database),
    listSubjects(database, session.workspaceId),
  ]);

  /*
   * Overlaying needs somebody to overlay onto. The first person with a birth
   * event is offered rather than a picker: /wheel has a picker of its own, and
   * arriving there with one chart already drawn is a better starting point than
   * arriving at a chooser.
   */
  const anchor = subjects.find((record) => record.birthEvent)?.subject;
  const timed = figures.filter((figure) => figure.birthTime !== null).length;

  return (
    <Shell email={session.email}>
      <PageHead
        kicker="Library"
        title="Charts to study"
        lede="Public figures with sourced birth data, rated on the Rodden scale. Overlay one on a chart of your own, or open its public page to read the whole record."
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search the library"
          aria-label="Search the library"
          className="w-full max-w-xs border border-[var(--rule-strong)] bg-transparent px-3 py-1.5 text-sm sm:w-auto"
        />
        {tag ? <input type="hidden" name="tag" value={tag} /> : null}
        <button
          type="submit"
          className="border border-[var(--accent)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
        >
          Search
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          {figures.length} {figures.length === 1 ? 'chart' : 'charts'} · {timed} with an attested
          time · cast in {LIBRARY_LENS.label}
        </span>
      </form>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <Link
          href="/library"
          aria-current={!tag ? 'true' : undefined}
          className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
            !tag ? 'border-[var(--accent)] bg-[var(--accent-wash)]' : 'border-[var(--rule)]'
          }`}
        >
          all
        </Link>
        {tags.map((entry) => (
          <Link
            key={entry.tag}
            href={`/library?tag=${encodeURIComponent(entry.tag)}`}
            aria-current={tag === entry.tag ? 'true' : undefined}
            className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${
              tag === entry.tag
                ? 'border-[var(--accent)] bg-[var(--accent-wash)]'
                : 'border-[var(--rule)]'
            }`}
          >
            {entry.tag} <span className="text-[var(--ink-faint)]">{entry.count}</span>
          </Link>
        ))}
      </div>

      {figures.length === 0 ? (
        <Panel>
          <p className="text-[var(--ink-muted)]">
            Nothing matches that. The library is small on purpose — every record here has a source
            note, and a chart with no attested time is stored as untimed rather than given a noon
            placeholder.
          </p>
        </Panel>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {figures.map((figure) => (
            <li key={figure.slug}>
              <Panel interactive className="h-full">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h2 className="font-display text-xl leading-tight">{figure.displayName}</h2>
                  <span
                    title={RODDEN_NOTE[figure.rodden] ?? figure.rodden}
                    className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]"
                  >
                    {figure.rodden}
                  </span>
                </div>
                <p className="mt-0.5 font-mono text-[10.5px] text-[var(--ink-muted)]">
                  {figure.birthDate}
                  {figure.birthTime ? ` · ${figure.birthTime.slice(0, 5)}` : ' · no time'} ·{' '}
                  {figure.placeName}
                </p>
                <p className="mt-2 line-clamp-3 text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
                  {figure.summary}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
                  {figure.birthTime && anchor ? (
                    <Link
                      href={`/wheel?person=${anchor.id}&figure=${figure.slug}`}
                      className="text-[var(--accent)] hover:underline"
                    >
                      overlay on {anchor.displayName.split(' ')[0]}
                    </Link>
                  ) : null}
                  <Link
                    href={`/charts/${figure.slug}`}
                    className="text-[var(--ink-faint)] hover:text-[var(--ink)]"
                  >
                    public page ↗
                  </Link>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}

      <section className="mt-8 border-t border-[var(--rule)] pt-4">
        <Kicker>Why the ratings are printed</Kicker>
        <p className="mt-1 max-w-[70ch] text-[13.5px] leading-relaxed text-[var(--ink-muted)]">
          A chart is only as good as the minute it was cast from. AA means a birth record was seen;
          X means no time is attested and the chart has no ascendant to read. Jade shows the rating
          beside the name rather than in a footnote, because an untimed chart studied as if it were
          timed teaches the wrong lesson.
        </p>
      </section>
    </Shell>
  );
}

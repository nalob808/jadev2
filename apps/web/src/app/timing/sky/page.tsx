import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  BAND_LABELS,
  dashaChainAt,
  dayQuality,
  jdFromUnixMs,
  panchangaNow,
  siderealLongitudeAt,
  skyNow,
  unixMsFromJd,
  vimshottari,
  type DayBand,
} from '@jade/astro';
import { getSettingsProfile, listSubjects, listUpcomingHits } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock, stamp } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { GlossaryProvider, AutoTerms, T } from '@/components/Glossary';
import { GLOSSARY, glossaryEntry } from '@jade/interpret';

export const dynamic = 'force-dynamic';

/**
 * The book against today's sky.
 *
 * ## The screen this replaces
 *
 * Opening eleven client pages one at a time to see who has something happening.
 * That is the hour a week this is meant to give back — the whole book on one
 * screen, sorted so the people with something on today are at the top, each row
 * a link into their chart.
 *
 * ## Why a band and not a score
 *
 * Each row carries the tārā and candra bala of today's Moon against that
 * person's natal Moon. Those are classical classifications with names, not a
 * rating Jade invented: the ninth tārā is called *vadha* whether or not anything
 * happens, and the band is a restatement of the count. The colours are the same
 * jade/clay pair the rest of the app uses for benefic and malefic — a
 * classification — rather than traffic-light primaries, which would make a
 * verdict out of a muhūrta count (CLAUDE.md #5, #6).
 *
 * ## One sky, computed once
 *
 * The transiting Moon is the same Moon for everybody. It is resolved once here
 * and each row is then pure arithmetic against a cached chart, which is what
 * makes a book-wide screen cheap enough to be the page you leave open.
 */

const BAND_ORDER: Record<DayBand, number> = { difficult: 0, mixed: 1, favourable: 2 };

/**
 * A tārā's glossary id from its name.
 *
 * `TARAS` in the core carries `plain` as an ASCII transliteration — "Kshema",
 * "Ati-mitra" — and the glossary ids are the same words with the punctuation
 * gone. Derived rather than written out as a second table, so the nine entries
 * and the nine tārās cannot drift apart; `glossaryEntry` is checked so a missing
 * one degrades to plain text instead of rendering a dead hover target.
 */
function taraTermId(plain: string): string | null {
  const id = plain.toLowerCase().replace(/[^a-z]/g, '');
  return glossaryEntry(id) ? id : null;
}

const BAND_STYLE: Record<DayBand, { border: string; wash: string; ink: string }> = {
  favourable: {
    border: 'border-l-[var(--band-favourable)]',
    wash: 'bg-[var(--band-favourable-wash)]',
    ink: 'text-[var(--band-favourable)]',
  },
  mixed: {
    border: 'border-l-[var(--band-mixed)]',
    wash: 'bg-[var(--band-mixed-wash)]',
    ink: 'text-[var(--band-mixed)]',
  },
  difficult: {
    border: 'border-l-[var(--band-difficult)]',
    wash: 'bg-[var(--band-difficult-wash)]',
    ink: 'text-[var(--band-difficult)]',
  },
};

export default async function BookSkyPage(): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const database = getDatabase();
  const [clock, subjects, profile] = await Promise.all([
    getClock(session.workspaceId),
    listSubjects(database, session.workspaceId),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
  ]);

  const withCharts = subjects.filter((record) => record.birthEvent);
  if (withCharts.length === 0 || !profile) {
    return (
      <Shell>
        <Kicker>The book today</Kicker>
        <h1 className="mt-1 font-display text-4xl leading-none">Nobody in the book yet</h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          This screen puts every person you hold against today&rsquo;s sky, so you can see who has
          something happening without opening eleven pages.
        </p>
        <Link
          href="/people/new"
          className="mt-4 inline-block border border-[var(--accent)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)]"
        >
          Add someone →
        </Link>
      </Shell>
    );
  }

  const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType });
  const frame = {
    ayanamsa: profile.ayanamsa,
    customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
  };

  /** One Moon for the whole book. */
  const transitMoon = siderealLongitudeAt(provider, 'Moon', clock.nowJd, frame);
  const sky = skyNow(provider, clock.nowJd, frame);
  const panchanga = panchangaNow(provider, clock.nowJd, frame);

  const hits = await listUpcomingHits(database, {
    workspaceId: session.workspaceId,
    fromDate: new Date(clock.nowMs),
    limit: 200,
  });
  const hitsBySubject = new Map<string, typeof hits>();
  for (const hit of hits) {
    const list = hitsBySubject.get(hit.subject.id) ?? [];
    list.push(hit);
    hitsBySubject.set(hit.subject.id, list);
  }

  const rows = await Promise.all(
    withCharts.map(async (record) => {
      const { chart } = await getOrComputeChart(session.workspaceId, record.birthEvent!, profile);
      const birthMs =
        record.birthEvent!.utcDatetime instanceof Date
          ? record.birthEvent!.utcDatetime.getTime()
          : new Date(record.birthEvent!.utcDatetime).getTime();
      const dashas = vimshottari(chart.points.Moon!.longitude, jdFromUnixMs(birthMs), {
        levels: 3,
        yearLength: 'julian',
      });
      return {
        subject: record.subject,
        quality: dayQuality(chart.points.Moon!.longitude, transitMoon),
        chain: dashaChainAt(dashas, clock.nowJd),
        hits: hitsBySubject.get(record.subject.id) ?? [],
      };
    }),
  );

  /**
   * Sorted by what needs attention, not alphabetically.
   *
   * A watch that has fired is the strongest signal on the row — the practitioner
   * asked to be told about exactly that — so those come first. Then the band,
   * difficult end up, because that is the reading a person is most likely to
   * want a word about. Rule 3 of the ADHD brief, applied to an ordering: the
   * screen puts the thing you would have gone looking for at the top.
   */
  rows.sort(
    (a, b) =>
      b.hits.length - a.hits.length ||
      BAND_ORDER[a.quality.band] - BAND_ORDER[b.quality.band] ||
      a.subject.displayName.localeCompare(b.subject.displayName),
  );

  /**
   * Glossary lines for a page with no single chart.
   *
   * Every other surface scopes its terms to one subject's chart. This one is
   * about eleven charts at once, so there is no "in this chart" to say — the
   * definitions stand alone here, which is the honest version rather than
   * picking one person's chart and answering as though it were everybody's.
   */
  const lines: Record<string, readonly string[]> = {};
  for (const entry of GLOSSARY) {
    if (glossaryEntry(entry.id)) lines[entry.id] = [];
  }

  const day = (jd: number): string =>
    clock.format(unixMsFromJd(jd), { day: 'numeric', month: 'short' });

  const counts = rows.reduce<Record<DayBand, number>>(
    (acc, row) => ({ ...acc, [row.quality.band]: acc[row.quality.band] + 1 }),
    { favourable: 0, mixed: 0, difficult: 0 },
  );
  const withHits = rows.filter((row) => row.hits.length > 0).length;

  return (
    <Shell>
      <GlossaryProvider lines={lines} scopes={{}}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <div>
            <Kicker>The book today</Kicker>
            <h1 className="mt-1 font-display text-4xl leading-none">
              {rows.length} {rows.length === 1 ? 'person' : 'people'}, one sky
            </h1>
          </div>
          <Link
            href="/timing"
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            ← the timeline
          </Link>
        </div>

        <p className="mt-1 font-mono text-[11px] text-[var(--ink-faint)]">
          {stamp(clock, clock.nowMs)}
          {clock.assumed ? (
            <>
              {' '}
              ·{' '}
              <Link href="/settings" className="underline underline-offset-2">
                no time zone set — dates are UTC
              </Link>
            </>
          ) : null}
        </p>

        {/* ---------------------------------------------------- today's sky */}
        <Panel className="mt-5">
          <Kicker>The sky itself</Kicker>
          <p className="mt-1.5 text-[14px] leading-relaxed">
            <T id="tithi">Tithi</T> {panchanga.tithi.name} · <T id="nakshatra">nakṣatra</T>{' '}
            {panchanga.nakshatra.name} · <T id="vara">vāra</T>{' '}
            {panchanga.vara?.name ?? 'no sunrise at this latitude today'} ·{' '}
            <T id="karana">karaṇa</T> {panchanga.karana.name}
          </p>
          <p className="mt-1.5 font-mono text-[11px] leading-relaxed text-[var(--ink-muted)]">
            {sky
              .map(
                (position) =>
                  `${position.id} ${position.degreesInSign.toFixed(1)}° ${position.sign}${
                    position.retrograde ? ' ℞' : ''
                  }`,
              )
              .join(' · ')}
          </p>
        </Panel>

        {/* -------------------------------------------------------- the counts */}
        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
          {withHits > 0 ? (
            <span className="text-[var(--accent)]">{withHits} with a watch that has fired</span>
          ) : (
            <span>no watches fired</span>
          )}
          <span className={BAND_STYLE.difficult.ink}>{counts.difficult} difficult</span>
          <span className={BAND_STYLE.mixed.ink}>{counts.mixed} mixed</span>
          <span className={BAND_STYLE.favourable.ink}>{counts.favourable} favourable</span>
        </p>

        {/* ---------------------------------------------------------- the book */}
        <ul className="mt-3 flex flex-col gap-2">
          {rows.map((row) => {
            const style = BAND_STYLE[row.quality.band];
            const taraId = taraTermId(row.quality.tara.plain);
            return (
              <li
                key={row.subject.id}
                className={`border border-l-2 border-[var(--rule)] ${style.border}`}
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
                  <Link
                    href={`/people/${row.subject.id}`}
                    className="font-display text-xl leading-none underline decoration-[var(--rule-strong)] underline-offset-4"
                  >
                    {row.subject.displayName}
                  </Link>

                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] ${style.ink}`}
                  >
                    {BAND_LABELS[row.quality.band]}
                  </span>

                  {/* The named classifications behind the band, so it is a
                      restatement rather than an opinion. */}
                  <span className="font-mono text-[10.5px] text-[var(--ink-faint)]">
                    {taraId ? (
                      <T id={taraId} plainTrigger>
                        {row.quality.tara.name}
                      </T>
                    ) : (
                      row.quality.tara.name
                    )}{' '}
                    <T id="tarabala" plainTrigger>
                      tārā
                    </T>{' '}
                    ·{' '}
                    <T id="candrabala" plainTrigger>
                      candra bala
                    </T>{' '}
                    {row.quality.candra.house} from the Moon
                  </span>

                  <span className="ml-auto font-mono text-[10.5px] text-[var(--ink-faint)]">
                    {row.chain.map((period) => period.lord).join(' › ')}
                  </span>
                </div>

                {row.hits.length > 0 ? (
                  <ul
                    className={`flex flex-col gap-1 border-t border-[var(--rule)] p-3 ${style.wash}`}
                  >
                    {row.hits.slice(0, 4).map((hit) => (
                      <li key={hit.id} className="text-[13px] leading-snug">
                        <span className="font-mono text-[10.5px] text-[var(--ink-faint)]">
                          {day(jdFromUnixMs(new Date(hit.occursAt).getTime()))}
                        </span>{' '}
                        <AutoTerms>{hit.title}</AutoTerms>
                      </li>
                    ))}
                    {row.hits.length > 4 ? (
                      <li className="font-mono text-[10px] text-[var(--ink-faint)]">
                        and {row.hits.length - 4} more
                      </li>
                    ) : null}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="mt-6 border-t border-[var(--rule)] pt-3 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
          Tārā and candra bala are counted from each person&rsquo;s natal Moon to today&rsquo;s — a
          classification with a classical name, not a rating. The band restates the count and adds
          nothing to it. Rows are ordered by what asked for your attention: fired watches first,
          then the difficult end of the band.
        </p>
      </GlossaryProvider>
    </Shell>
  );
}

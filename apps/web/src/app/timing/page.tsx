import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  jdFromUnixMs,
  timingSeries,
  unixMsFromJd,
  vimshottari,
  type PointId,
  type TimingEvent,
  type TimingSegment,
} from '@jade/astro';
import { getSettingsProfile, listSubjects } from '@jade/db';
import { TimingStrip } from '@jade/ui';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getClock } from '@/lib/clock';
import { getOrComputeChart } from '@/lib/chart';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { GlossaryProvider, AutoTerms, T } from '@/components/Glossary';
import { glossaryContextFor } from '@jade/interpret';

export const dynamic = 'force-dynamic';

/**
 * Timing: the daśā clock crossed with the sky.
 *
 * ## What this page is for
 *
 * The person page answers "what is this chart". This one answers "when". A
 * practitioner planning a consultation wants to know which periods in the next
 * decade have slow transits landing on the points that matter, and — the part
 * no list of transits gives you — which of those periods are *ruled* by the
 * graha doing the transiting. That coincidence is the classical reason to look
 * twice at a date, and until now Jade held both halves and never joined them.
 *
 * ## The window is a choice, and it costs something
 *
 * Every event here is a bisected root, not a sample: the scanner walks the
 * window with a comb fine enough to catch a retrograde loop and then bisects to
 * the crossing. That is why the dates are trustworthy and also why a forty-year
 * window is real work. So the span is picked explicitly and the page says what
 * it cost — rather than quietly defaulting to something small enough to feel
 * fast and leaving the reader to wonder why Saturn's next pass is missing.
 */

const SPANS: readonly { readonly key: string; readonly label: string; readonly years: number }[] = [
  { key: '12', label: '12 years', years: 12 },
  { key: '20', label: '20 years', years: 20 },
  { key: '30', label: '30 years', years: 30 },
];

/**
 * The bodies offered, and why the list is short.
 *
 * Jupiter and Saturn are the grahas whose arrival is worth a date on a
 * calendar. Rāhu and Ketu move slowly enough to belong here too. Mars is over a
 * natal degree in days, and adding it to a thirty-year window produces several
 * hundred contacts — a timeline that flags everything flags nothing. It is
 * offered, clearly, as a choice the reader makes rather than a default.
 */
const BODY_SETS: Readonly<Record<string, { label: string; bodies: readonly PointId[] }>> = {
  slow: { label: 'Jupiter & Saturn', bodies: ['Jupiter', 'Saturn'] },
  nodes: { label: '+ Rāhu & Ketu', bodies: ['Jupiter', 'Saturn', 'Rahu', 'Ketu'] },
  mars: { label: '+ Mars', bodies: ['Jupiter', 'Saturn', 'Rahu', 'Ketu', 'Mars'] },
};

const KIND_LABEL: Record<TimingEvent['kind'], string> = {
  contact: 'reaches',
  ingress: 'enters',
  station: 'turns',
};

export default async function TimingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const params = await searchParams;
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

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
        <Kicker>Timing</Kicker>
        <h1 className="mt-1 font-display text-4xl leading-none">Nothing to time yet</h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          This page crosses a person&rsquo;s daśā periods with the transits arriving on their chart.
          It needs a person with a birth time first.
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

  const requestedId = one('person');
  const current = withCharts.find((record) => record.subject.id === requestedId) ?? withCharts[0]!;

  const spanKey = one('span') ?? '12';
  const span = SPANS.find((candidate) => candidate.key === spanKey) ?? SPANS[0]!;
  const bodyKey = one('bodies') ?? 'slow';
  const bodySet = BODY_SETS[bodyKey] ?? BODY_SETS.slow!;

  const { chart } = await getOrComputeChart(session.workspaceId, current.birthEvent!, profile);

  const birthMs =
    current.birthEvent!.utcDatetime instanceof Date
      ? current.birthEvent!.utcDatetime.getTime()
      : new Date(current.birthEvent!.utcDatetime).getTime();
  const birthJd = jdFromUnixMs(birthMs);
  /** Stated, never defaulted — CLAUDE.md #3. */
  const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, {
    levels: 3,
    yearLength: 'julian',
  });

  /**
   * The window opens two years back.
   *
   * A transit that arrived last year is still the thing a client is living
   * through, and a timeline that begins today makes the present look like a
   * beginning. Two years is about one Saturn sign.
   */
  const fromJd = clock.nowJd - 730;
  const toJd = clock.nowJd + span.years * 365.25;

  /**
   * The reference provider, with the profile's node type.
   *
   * These dates are printed, so they come from the reference class rather than
   * the interactive one the scrubber uses — see `docs/07-accuracy.md` and the
   * note in `lib/transitRing.ts`.
   */
  const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType });

  const startedAt = Date.now();
  const series = timingSeries(
    provider,
    {
      ayanamsa: profile.ayanamsa,
      customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
    },
    { fromJd, toJd },
    {
      ascendantSign: chart.houses.ascendantSign,
      longitudeOf: Object.fromEntries(
        Object.entries(chart.points).map(([id, point]) => [id, point.longitude]),
      ),
    },
    dashas,
    { bodies: bodySet.bodies },
  );
  const elapsedMs = Date.now() - startedAt;

  const glossary = glossaryContextFor({
    chart,
    dasha: dashas,
    nowJd: clock.nowJd,
    subject: current.subject.displayName,
  });

  const day = (jd: number): string =>
    clock.format(unixMsFromJd(jd), { day: 'numeric', month: 'short', year: 'numeric' });
  const year = (jd: number): string => clock.format(unixMsFromJd(jd), { year: 'numeric' });

  /** Grouped under the mahādaśā, because an undifferentiated list of 60 rows is a wall. */
  const groups: { lord: string; segments: TimingSegment[] }[] = [];
  for (const segment of series.segments) {
    const lord = segment.lords[0] ?? '—';
    const last = groups[groups.length - 1];
    if (last && last.lord === lord) last.segments.push(segment);
    else groups.push({ lord, segments: [segment] });
  }

  const running = series.segments.find(
    (segment) => clock.nowJd >= segment.fromJd && clock.nowJd < segment.toJd,
  );

  const link = (next: Record<string, string>): string => {
    const query = new URLSearchParams({
      person: current.subject.id,
      span: spanKey,
      bodies: bodyKey,
      ...next,
    });
    return `/timing?${query.toString()}`;
  };

  return (
    <Shell>
      <GlossaryProvider lines={glossary.lines} scopes={{}}>
        <Kicker>Timing</Kicker>
        <h1 className="mt-1 font-display text-4xl leading-none">
          {current.subject.displayName} &middot; {span.label}
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          Every <T id="antardasha">antardaśā</T> in the window, with the slow transits that land
          inside it. A period is marked when the transiting graha is also one of its own{' '}
          <T id="dasha">daśā</T> lords — the classical reason to read a date twice.
        </p>

        {/* Every surface is a way in. The three timing screens answer one
            question each and each names the other two. */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link
            href={`/timing/search?person=${current.subject.id}`}
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            Search for a window →
          </Link>
          <Link
            href="/timing/sky"
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            The whole book today →
          </Link>
          <Link
            href={`/people/${current.subject.id}`}
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            {current.subject.displayName}&rsquo;s chart →
          </Link>
        </div>

        {/* ------------------------------------------------------- controls */}
        <div className="mt-5 flex flex-col gap-3 border-y border-[var(--rule)] py-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Person
            </span>
            {withCharts.map((record) => (
              <Link
                key={record.subject.id}
                href={link({ person: record.subject.id })}
                aria-current={record.subject.id === current.subject.id ? 'true' : undefined}
                className={
                  record.subject.id === current.subject.id
                    ? 'border-b-2 border-[var(--accent)] text-[14px]'
                    : 'text-[14px] text-[var(--ink-muted)] underline decoration-[var(--rule-strong)] underline-offset-4'
                }
              >
                {record.subject.displayName}
              </Link>
            ))}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Span
            </span>
            {SPANS.map((candidate) => (
              <Link
                key={candidate.key}
                href={link({ span: candidate.key })}
                aria-current={candidate.key === spanKey ? 'true' : undefined}
                className={
                  candidate.key === spanKey
                    ? 'border-b-2 border-[var(--accent)] font-mono text-[11px]'
                    : 'font-mono text-[11px] text-[var(--ink-muted)] underline decoration-[var(--rule-strong)] underline-offset-4'
                }
              >
                {candidate.label}
              </Link>
            ))}
            <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Scanning
            </span>
            {Object.entries(BODY_SETS).map(([key, set]) => (
              <Link
                key={key}
                href={link({ bodies: key })}
                aria-current={key === bodyKey ? 'true' : undefined}
                className={
                  key === bodyKey
                    ? 'border-b-2 border-[var(--accent)] font-mono text-[11px]'
                    : 'font-mono text-[11px] text-[var(--ink-muted)] underline decoration-[var(--rule-strong)] underline-offset-4'
                }
              >
                {set.label}
              </Link>
            ))}
          </div>
        </div>

        {/* ---------------------------------------------------- the overview */}
        <Panel className="mt-5">
          <TimingStrip
            segments={series.segments}
            fromJd={fromJd}
            toJd={toJd}
            nowJd={clock.nowJd}
            formatJd={year}
          />
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            <span>
              <span className="mr-1 inline-block h-2 w-2 bg-[var(--accent)] align-middle" />
              events counted
            </span>
            <span>
              <span className="mr-1 inline-block h-2 w-2 bg-[var(--clay)] align-middle" />a lord of
              the period is transiting
            </span>
            <span>{series.events.length} events total</span>
            <span>{series.segments.length} periods</span>
          </p>
        </Panel>

        {/* -------------------------------------------------- what is running */}
        {running ? (
          <Panel className="mt-5">
            <Kicker>Running now</Kicker>
            <p className="mt-1 font-display text-2xl leading-none">{running.lords.join(' › ')}</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--ink-faint)]">
              {day(running.fromJd)} — {day(running.toJd)} ·{' '}
              {running.eventCount === 0
                ? 'no slow transit inside this period'
                : `${running.eventCount} event${running.eventCount === 1 ? '' : 's'}`}
              {running.lordEvents.length > 0
                ? ` · ${running.lordEvents.length} by a lord of the period`
                : ''}
            </p>
          </Panel>
        ) : null}

        {/* ------------------------------------------------------ the periods */}
        {groups.map((group) => {
          const total = group.segments.reduce((sum, segment) => sum + segment.eventCount, 0);
          return (
            <section key={`${group.lord}-${group.segments[0]!.fromJd}`} className="mt-7">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 border-b-2 border-[var(--ink)] pb-1">
                <h2 className="font-display text-2xl leading-none">
                  <T id={`graha-${group.lord.toLowerCase()}`} plainTrigger>
                    {group.lord}
                  </T>{' '}
                  <span className="text-[var(--ink-faint)]">
                    <T id="mahadasha" plainTrigger>
                      mahādaśā
                    </T>
                  </span>
                </h2>
                {/* Counts on everything: a heading that does not say what is
                    under it gets opened repeatedly or never. */}
                <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  {group.segments.length} periods · {total} event{total === 1 ? '' : 's'}
                </p>
              </div>

              <ul className="mt-2 flex flex-col">
                {group.segments.map((segment) => {
                  const isNow = running?.fromJd === segment.fromJd;
                  return (
                    <li
                      key={segment.fromJd}
                      className={`border-t border-[var(--rule)] py-2.5 ${
                        isNow ? 'border-l-2 border-l-[var(--jade)] pl-2.5' : ''
                      }`}
                    >
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                        <span className="font-display text-lg leading-none">
                          {segment.lords.slice(1).join(' › ') || segment.lords[0]}
                        </span>
                        <span className="font-mono text-[10.5px] text-[var(--ink-faint)]">
                          {day(segment.fromJd)} — {day(segment.toJd)}
                          {segment.clipped ? ' (clipped to the window)' : ''}
                        </span>
                        {isNow ? (
                          <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--jade)]">
                            now
                          </span>
                        ) : null}
                        <span className="ml-auto font-mono text-[10.5px] text-[var(--ink-faint)]">
                          {segment.eventCount === 0 ? 'quiet' : `${segment.eventCount}`}
                        </span>
                      </div>

                      {segment.events.length > 0 ? (
                        <ul className="mt-1.5 flex flex-col gap-1.5">
                          {segment.events.map((event) => {
                            const byLord = segment.lords.includes(
                              event.transiting as (typeof segment.lords)[number],
                            );
                            return (
                              <li
                                key={`${event.kind}-${event.transiting}-${event.jdUt}`}
                                className={`border-l-2 pl-2.5 ${
                                  byLord ? 'border-[var(--clay)]' : 'border-[var(--accent-soft)]'
                                }`}
                              >
                                <p className="text-[13.5px] leading-snug">
                                  <AutoTerms>{event.headline}</AutoTerms>
                                  <span className="ml-2 font-mono text-[10.5px] text-[var(--ink-faint)]">
                                    {day(event.jdUt)}
                                  </span>
                                  {byLord ? (
                                    <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[0.1em] text-[var(--clay)]">
                                      lord of this period
                                    </span>
                                  ) : null}
                                </p>
                                {/* Constitution #5: the factors travel with the
                                    claim, beside it rather than behind a
                                    disclosure nobody opens. */}
                                <p className="font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
                                  {event.factors.join(' · ')}
                                </p>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}

        {/* --------------------------------------------------- what this cost */}
        <p className="mt-8 border-t border-[var(--rule)] pt-3 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
          {series.scanned.join(', ')} scanned across {span.label} — {KIND_LABEL.contact} a natal
          point, {KIND_LABEL.ingress} a sign, {KIND_LABEL.station} station. Each date is a bisected
          root from the reference ephemeris, not a sampled approximation; this window took{' '}
          {(elapsedMs / 1000).toFixed(1)}s to scan. Transits by faster grahas are real and are left
          out on purpose — at this scale they would outnumber everything else.
        </p>
      </GlossaryProvider>
    </Shell>
  );
}

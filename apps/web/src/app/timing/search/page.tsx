import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  describeClause,
  eventSearch,
  jdFromUnixMs,
  unixMsFromJd,
  vimshottari,
  type EventClause,
} from '@jade/astro';
import { getSettingsProfile, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { GlossaryProvider, AutoTerms } from '@/components/Glossary';
import { glossaryContextFor } from '@jade/interpret';
import {
  PRESETS,
  SCANNABLE_BODIES,
  SIGN_OPTIONS,
  TARGETS,
  clausesFromForm,
  parseClauses,
  serialiseClause,
} from '@/lib/eventQuery';

export const dynamic = 'force-dynamic';

/**
 * Event search: the compound question, answered.
 *
 * ## Why this is a form and not an app
 *
 * The whole query lives in the URL, so the page is a plain server-rendered
 * `GET` form. No client bundle, no hydration, and every search is a link.
 * Submitting navigates, which means the back button walks your searches — the
 * behaviour a search tool should have and rarely does.
 *
 * ## Two clause slots, not nine
 *
 * The builder offers two. Not because more would be hard, but because a
 * practitioner's real compound questions are pairs — a transit and a period, two
 * transits — and a page of nine empty dropdowns is a blank stare rather than a
 * tool. The presets cover the patterns worth having as one click, and running
 * one shows exactly how its clauses were built, so the builder teaches itself.
 * The URL accepts any number of `c=` clauses for anyone who wants more.
 */

const SPANS: readonly { readonly key: string; readonly label: string; readonly years: number }[] = [
  { key: '10', label: '10 years', years: 10 },
  { key: '25', label: '25 years', years: 25 },
  { key: '50', label: '50 years', years: 50 },
];

const KINDS = [
  { value: 'contact', label: 'reaches natal…' },
  { value: 'ingress', label: 'enters sign…' },
  { value: 'station', label: 'stations' },
  { value: 'lord', label: 'is a running daśā lord' },
] as const;

const selectClass =
  'border border-[var(--rule)] bg-[var(--surface)] px-1.5 py-1 font-mono text-[11px]';

export default async function EventSearchPage({
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
        <Kicker>Event search</Kicker>
        <h1 className="mt-1 font-display text-4xl leading-none">Nothing to search yet</h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          Event search finds the windows where several conditions hold at once for one
          person&rsquo;s chart. It needs a person with a birth time first.
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

  const current =
    withCharts.find((record) => record.subject.id === one('person')) ?? withCharts[0]!;
  const spanKey = one('span') ?? '25';
  const span = SPANS.find((candidate) => candidate.key === spanKey) ?? SPANS[1]!;

  const withinRaw = Number.parseInt(one('within') ?? '30', 10);
  const withinDays = Number.isFinite(withinRaw) ? Math.max(0, Math.min(withinRaw, 3650)) : 30;

  const presetKey = one('preset');
  const preset = PRESETS.find((candidate) => candidate.key === presetKey);

  /**
   * A preset supplies the clauses when one is named and no clause was given
   * explicitly, so a preset link is short and editing the form afterwards takes
   * over cleanly rather than fighting it.
   */
  const explicit = parseClauses(params.c);
  const fromForm = clausesFromForm(params);
  const built = explicit.length > 0 ? explicit : fromForm;
  const clauses: EventClause[] = built.length > 0 ? built : [...(preset?.clauses ?? [])];
  const tolerance = built.length > 0 ? withinDays : (preset?.withinDays ?? withinDays);

  let body: React.ReactElement;
  /** Empty until a chart is cast — an unrun search has no chart to explain terms against. */
  let glossary: { lines: Readonly<Record<string, readonly string[]>> } = { lines: {} };

  if (clauses.length === 0) {
    body = (
      <Panel className="mt-6">
        <p className="text-[14.5px] leading-relaxed text-[var(--ink-muted)]">
          Pick a question above, or build one below. A search with one condition returns that
          condition&rsquo;s own dates; with two it returns only the windows where both hold, which
          is the part worth having.
        </p>
      </Panel>
    );
  } else {
    const { chart } = await getOrComputeChart(session.workspaceId, current.birthEvent!, profile);
    const birthMs =
      current.birthEvent!.utcDatetime instanceof Date
        ? current.birthEvent!.utcDatetime.getTime()
        : new Date(current.birthEvent!.utcDatetime).getTime();
    const birthJd = jdFromUnixMs(birthMs);
    const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, {
      levels: 3,
      yearLength: 'julian',
    });

    glossary = glossaryContextFor({
      chart,
      dasha: dashas,
      nowJd: clock.nowJd,
      subject: current.subject.displayName,
    });

    const provider = new AstronomyEngineProvider({ nodeType: profile.nodeType });
    const window = { fromJd: clock.nowJd, toJd: clock.nowJd + span.years * 365.25 };

    const startedAt = Date.now();
    const result = eventSearch(
      provider,
      {
        ayanamsa: profile.ayanamsa,
        customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
      },
      window,
      {
        ascendantSign: chart.houses.ascendantSign,
        longitudeOf: Object.fromEntries(
          Object.entries(chart.points).map(([id, point]) => [id, point.longitude]),
        ),
      },
      { clauses, withinDays: tolerance },
      dashas,
    );
    const elapsedMs = Date.now() - startedAt;

    const day = (jd: number): string =>
      clock.format(unixMsFromJd(jd), { day: 'numeric', month: 'short', year: 'numeric' });

    const emptyClause = result.clauseMatchCounts.findIndex((count) => count === 0);

    body = (
      <>
        {/* --------------------------------------------- the query, echoed back */}
        <Panel className="mt-6">
          <Kicker>The question</Kicker>
          <ul className="mt-1.5 flex flex-col gap-1">
            {clauses.map((clause, index) => (
              <li key={serialiseClause(clause)} className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {index === 0 ? 'where' : 'and'}
                </span>
                <span className="text-[14.5px]">
                  <AutoTerms>{describeClause(clause)}</AutoTerms>
                </span>
                <span className="font-mono text-[10px] text-[var(--ink-faint)]">
                  {result.clauseMatchCounts[index]}{' '}
                  {result.clauseMatchCounts[index] === 1 ? 'match' : 'matches'}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
            within {tolerance} days of each other · next {span.label} · {result.windows.length}{' '}
            window{result.windows.length === 1 ? '' : 's'}
          </p>
          {preset && built.length === 0 ? (
            <p className="mt-2 border-l-2 border-[var(--accent-soft)] pl-2.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
              {preset.note}
            </p>
          ) : null}
        </Panel>

        {/* ------------------------------------------------------ the windows */}
        {result.windows.length === 0 ? (
          <Panel className="mt-5">
            <p className="text-[14.5px] leading-relaxed">
              {emptyClause >= 0 ? (
                <>
                  Nothing matched <strong>{describeClause(clauses[emptyClause]!)}</strong> in the
                  next {span.label}, so no window can exist. Try a longer span, or drop that
                  condition.
                </>
              ) : (
                <>
                  Every condition happens in the next {span.label}, but never within {tolerance}{' '}
                  days of the others. Widen the tolerance or lengthen the span.
                </>
              )}
            </p>
          </Panel>
        ) : (
          <ol className="mt-5 flex flex-col gap-3">
            {result.windows.map((found, index) => (
              <li
                key={`${found.fromJd}-${index}`}
                className="border-l-2 border-[var(--accent)] bg-[var(--surface)] p-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-display text-xl leading-none">
                    {day(found.fromJd)} — {day(found.toJd)}
                  </p>
                  {/* The ranking is arithmetic and says so. Not a severity. */}
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                    {found.spreadDays === 0
                      ? 'single condition'
                      : `${found.spreadDays.toFixed(0)} days apart`}
                  </p>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {found.matches.map((match) => (
                    <li
                      key={`${match.headline}-${match.fromJd}`}
                      className="border-l-2 border-[var(--rule-strong)] pl-2.5"
                    >
                      <p className="text-[13.5px] leading-snug">
                        <AutoTerms>{match.headline}</AutoTerms>
                        <span className="ml-2 font-mono text-[10.5px] text-[var(--ink-faint)]">
                          {match.jdUt !== null
                            ? day(match.jdUt)
                            : `${day(match.fromJd)} — ${day(match.toJd)}`}
                        </span>
                      </p>
                      {/* Constitution #5: the factors beside the claim. */}
                      <p className="font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
                        {match.factors.join(' · ')}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}

        <p className="mt-6 border-t border-[var(--rule)] pt-3 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
          Windows are ranked by how few days separate their conditions — arithmetic, not importance.
          Jade does not rate a window. Each date is a bisected root from the reference ephemeris;
          this search took {(elapsedMs / 1000).toFixed(1)}s.
        </p>
      </>
    );
  }

  return (
    <Shell>
      <GlossaryProvider lines={glossary.lines} scopes={{}}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <div>
            <Kicker>Event search</Kicker>
            <h1 className="mt-1 font-display text-4xl leading-none">When do these line up?</h1>
          </div>
          <Link
            href={`/timing?person=${current.subject.id}`}
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
          >
            ← the timeline
          </Link>
        </div>

        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          Searching {current.subject.displayName}&rsquo;s chart.
        </p>

        {/* ------------------------------------------------------- the presets */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {PRESETS.map((candidate) => (
            <Link
              key={candidate.key}
              href={`/timing/search?person=${current.subject.id}&span=${spanKey}&preset=${candidate.key}`}
              aria-current={candidate.key === presetKey && built.length === 0 ? 'true' : undefined}
              className={`border px-2.5 py-1.5 text-[12.5px] leading-tight ${
                candidate.key === presetKey && built.length === 0
                  ? 'border-[var(--accent)] bg-[var(--accent-wash)]'
                  : 'border-[var(--rule)] hover:border-[var(--accent)]'
              }`}
            >
              {candidate.label}
            </Link>
          ))}
        </div>

        {/* ------------------------------------------------------- the builder */}
        <form method="get" action="/timing/search" className="mt-5 border border-[var(--rule)] p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Or build one
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                Person
              </span>
              <select name="person" defaultValue={current.subject.id} className={selectClass}>
                {withCharts.map((record) => (
                  <option key={record.subject.id} value={record.subject.id}>
                    {record.subject.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                Next
              </span>
              <select name="span" defaultValue={spanKey} className={selectClass}>
                {SPANS.map((candidate) => (
                  <option key={candidate.key} value={candidate.key}>
                    {candidate.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                Within
              </span>
              <input
                type="number"
                name="within"
                min={0}
                max={3650}
                defaultValue={tolerance}
                className={`${selectClass} w-20`}
              />
              <span className="font-mono text-[10px] text-[var(--ink-faint)]">days</span>
            </label>
          </div>

          {[0, 1].map((slot) => {
            const existing = clauses[slot];
            return (
              <div key={slot} className="mt-2 flex flex-wrap items-center gap-2">
                <span className="w-12 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  {slot === 0 ? 'where' : 'and'}
                </span>
                <select
                  name={`body${slot}`}
                  defaultValue={
                    existing && existing.kind !== 'lord'
                      ? existing.body
                      : existing && existing.kind === 'lord'
                        ? existing.lord
                        : slot === 0
                          ? 'Saturn'
                          : ''
                  }
                  className={selectClass}
                >
                  <option value="">— nothing —</option>
                  {SCANNABLE_BODIES.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
                <select
                  name={`kind${slot}`}
                  defaultValue={existing?.kind ?? 'contact'}
                  className={selectClass}
                >
                  {KINDS.map((kind) => (
                    <option key={kind.value} value={kind.value}>
                      {kind.label}
                    </option>
                  ))}
                </select>
                <select
                  name={`arg${slot}`}
                  defaultValue={
                    existing?.kind === 'contact'
                      ? existing.target
                      : existing?.kind === 'ingress' && existing.sign !== undefined
                        ? String(existing.sign)
                        : ''
                  }
                  aria-label={`What the ${slot === 0 ? 'first' : 'second'} condition applies to`}
                  className={selectClass}
                >
                  <option value="">— any / not needed —</option>
                  {TARGETS.map((id) => (
                    <option key={`t-${id}`} value={id}>
                      natal {id}
                    </option>
                  ))}
                  {SIGN_OPTIONS.map((sign) => (
                    <option key={`s-${sign.value}`} value={sign.value}>
                      sign: {sign.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}

          <button
            type="submit"
            className="mt-3 border border-[var(--accent)] bg-[var(--accent)] px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-[var(--paper)]"
          >
            Search
          </button>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
            A row with no body is ignored, so one condition is a valid search. Conditions are also
            accepted directly in the URL as <code>c=contact:Saturn:Moon</code>, any number of them.
          </p>
        </form>

        {body}
      </GlossaryProvider>
    </Shell>
  );
}

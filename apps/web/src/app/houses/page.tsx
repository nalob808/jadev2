import Link from 'next/link';
import { redirect } from 'next/navigation';
import { compareHouse, houseSignification, summariseComparison } from '@jade/interpret';
import { getSettingsProfile, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { AutoTerms, GlossaryProvider, T } from '@/components/Glossary';
import { GLOSSARY, glossaryEntry } from '@jade/interpret';

export const dynamic = 'force-dynamic';

/**
 * One house, across several charts.
 *
 * ## The thing people do and software does not support
 *
 * "We really like looking at people's houses and comparing them." Every program
 * will show you one chart at a time and leave you to hold the other three in
 * your head. This holds one question — the seventh, say — and answers it for
 * everybody at once.
 *
 * ## What it refuses to do
 *
 * It does not say whose seventh is better. The summary counts what is shared and
 * what differs — who has the same sign, which grahas turn up in whose, whose
 * house is empty, where each lord went — and stops. The entire value of putting
 * four charts side by side is that the practitioner sees the pattern; a tool that
 * announced a winner would be doing the one part it has no business doing.
 */

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

export default async function HouseComparisonPage({
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
  const [subjects, profile] = await Promise.all([
    listSubjects(database, session.workspaceId),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
  ]);

  const withCharts = subjects.filter((record) => record.birthEvent);

  if (withCharts.length < 2 || !profile) {
    return (
      <Shell email={session.email}>
        <Kicker>Compare houses</Kicker>
        <h1 className="mt-1 font-display text-4xl leading-none">
          {withCharts.length === 0 ? 'Nobody to compare yet' : 'One chart is not a comparison'}
        </h1>
        <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          This screen holds one house — the seventh, say — and shows it across everyone you hold at
          once. It needs at least two people with birth times.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/people/new"
            className="border border-[var(--accent)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--accent)]"
          >
            Add someone →
          </Link>
          {withCharts[0] ? (
            <Link
              href={`/people/${withCharts[0].subject.id}/houses`}
              className="border border-[var(--rule)] px-4 py-2 font-mono text-[11px] uppercase tracking-wider text-[var(--ink-muted)]"
            >
              Read {withCharts[0].subject.displayName}&rsquo;s houses →
            </Link>
          ) : null}
        </div>
      </Shell>
    );
  }

  const houseRaw = Number.parseInt(one('house') ?? '7', 10);
  const house = Number.isInteger(houseRaw) && houseRaw >= 1 && houseRaw <= 12 ? houseRaw : 7;

  /**
   * Who is in the comparison.
   *
   * `with` names the person the comparison was launched from, so arriving here
   * from their card keeps them first. Repeated `who` params select a subset;
   * absent, everybody is in, because the useful default for "compare" is
   * everything you hold.
   */
  const pinned = one('with');
  const selectedRaw = params.who;
  const selected = new Set(
    selectedRaw === undefined ? [] : Array.isArray(selectedRaw) ? selectedRaw : [selectedRaw],
  );
  const chosen =
    selected.size > 0 ? withCharts.filter((record) => selected.has(record.subject.id)) : withCharts;

  const ordered = pinned
    ? [
        ...chosen.filter((record) => record.subject.id === pinned),
        ...chosen.filter((record) => record.subject.id !== pinned),
      ]
    : chosen;

  const charts = await Promise.all(
    ordered.map(async (record) => ({
      id: record.subject.id,
      name: record.subject.displayName,
      chart: (await getOrComputeChart(session.workspaceId, record.birthEvent!, profile)).chart,
    })),
  );

  const rows = compareHouse(house, charts);
  const summary = summariseComparison(house, rows);
  const signification = houseSignification(house)!;

  /**
   * Definitions without a chart to scope them to.
   *
   * Every other surface answers "what does this mean *here*". This one is about
   * several charts at once, so there is no single "here" — the definitions stand
   * alone, which is honest, rather than picking one person's chart and answering
   * as though it spoke for everybody.
   */
  const lines: Record<string, readonly string[]> = {};
  for (const entry of GLOSSARY) if (glossaryEntry(entry.id)) lines[entry.id] = [];

  const linkFor = (nextHouse: number): string => {
    const query = new URLSearchParams({ house: String(nextHouse) });
    if (pinned) query.set('with', pinned);
    for (const id of selected) query.append('who', id);
    return `/houses?${query.toString()}`;
  };

  return (
    <Shell email={session.email}>
      <GlossaryProvider lines={lines} scopes={{}}>
        <Kicker>Compare houses</Kicker>
        <h1 className="mt-1 font-display text-4xl leading-none">
          The {ORDINALS[house - 1]} across {rows.length} {rows.length === 1 ? 'chart' : 'charts'}
        </h1>
        <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-[var(--ink-muted)]">
          <T id={`house-${house}`}>{signification.title}</T> — {signification.summary}
        </p>

        {/* ---------------------------------------------------- which house */}
        <div className="mt-4 border-y border-[var(--rule)] py-3">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Which house
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ORDINALS.map((label, index) => (
              <Link
                key={label}
                href={linkFor(index + 1)}
                aria-current={index + 1 === house ? 'true' : undefined}
                className={`border px-2.5 py-1 font-mono text-[10.5px] ${
                  index + 1 === house
                    ? 'border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent)]'
                    : 'border-[var(--rule)] text-[var(--ink-muted)] hover:border-[var(--accent)]'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {/* ------------------------------------------------- what is shared */}
        <Panel className="mt-5">
          <Kicker>What they share, and where they part</Kicker>
          <dl className="mt-2 flex flex-col gap-2 text-[14px]">
            <div>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Sign on the house
              </dt>
              <dd className="leading-relaxed">
                {summary.signs.map((group, index) => (
                  <span key={group.sign}>
                    {index > 0 ? ' · ' : ''}
                    <T id={`sign-${group.sign.toLowerCase()}`} plainTrigger>
                      {group.sign}
                    </T>{' '}
                    <span className="text-[var(--ink-muted)]">({group.names.join(', ')})</span>
                  </span>
                ))}
              </dd>
            </div>

            <div>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Grahas in it
              </dt>
              <dd className="leading-relaxed">
                {summary.occupants.length === 0 ? (
                  <span className="text-[var(--ink-muted)]">
                    Nobody has anything in this house.
                  </span>
                ) : (
                  summary.occupants.map((group, index) => (
                    <span key={group.graha}>
                      {index > 0 ? ' · ' : ''}
                      <T id={`graha-${group.graha.toLowerCase()}`} plainTrigger>
                        {group.graha}
                      </T>{' '}
                      <span className="text-[var(--ink-muted)]">({group.names.join(', ')})</span>
                    </span>
                  ))
                )}
              </dd>
            </div>

            {summary.empty.length > 0 ? (
              <div>
                <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                  Empty for
                </dt>
                <dd className="leading-relaxed text-[var(--ink-muted)]">
                  {summary.empty.join(', ')} — read through the lord instead, which is normal rather
                  than a lack.
                </dd>
              </div>
            ) : null}

            <div>
              <dt className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                Where the lord went
              </dt>
              <dd className="leading-relaxed">
                {summary.lordDestinations.map((destination, index) => (
                  <span key={destination.name}>
                    {index > 0 ? ' · ' : ''}
                    {destination.name}: {destination.lord} → {ORDINALS[destination.inHouse - 1]}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
            Counts and placements only. Jade does not say whose house is stronger — that is the
            judgement you are here to make.
          </p>
        </Panel>

        {/* ------------------------------------------------------- the charts */}
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {rows.map((row) => (
            <section
              key={row.subjectId}
              className="border border-[var(--rule)] bg-[var(--surface)] p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-[var(--rule)] pb-2">
                <h2 className="font-display text-xl leading-none">{row.name}</h2>
                <Link
                  href={`/people/${row.subjectId}/houses?h=${house}`}
                  className="font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
                >
                  all twelve →
                </Link>
              </div>

              <p className="mt-2 text-[13.5px] leading-relaxed">
                <T id={`sign-${row.reading.sign.toLowerCase()}`} plainTrigger>
                  {row.reading.sign}
                </T>{' '}
                on the house · lord{' '}
                <T id={`graha-${row.reading.lord.lord.toLowerCase()}`} plainTrigger>
                  {row.reading.lord.lord}
                </T>{' '}
                in the {ORDINALS[row.reading.lord.inHouse - 1]}
              </p>

              <p className="mt-1 text-[13.5px] leading-relaxed">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  in it ·{' '}
                </span>
                {row.reading.occupants.length === 0
                  ? 'empty'
                  : row.reading.occupants
                      .map(
                        (occupant) =>
                          `${occupant.graha}${occupant.dignity ? ` (${occupant.dignity.replace('_', ' ')})` : ''}${occupant.retrograde ? ' ℞' : ''}`,
                      )
                      .join(', ')}
              </p>

              <p className="mt-1 text-[13.5px] leading-relaxed">
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  aspected by ·{' '}
                </span>
                {row.reading.aspects.length === 0
                  ? 'nothing'
                  : row.reading.aspects
                      .map(
                        (aspect) =>
                          `${aspect.graha} (${ORDINALS[aspect.distance - 1]}${aspect.special ? ', special' : ''})`,
                      )
                      .join(', ')}
              </p>

              {/* The first statement only. The full reading is one click away,
                  and four full readings side by side is a wall rather than a
                  comparison. */}
              {row.reading.statements[0] ? (
                <p className="mt-2 border-l-2 border-[var(--accent-soft)] pl-2.5 text-[13.5px] leading-relaxed">
                  <AutoTerms>{row.reading.statements[0].text}</AutoTerms>
                </p>
              ) : null}
            </section>
          ))}
        </div>

        {/* ------------------------------------------------------ who is in it */}
        {withCharts.length > 2 ? (
          <section className="mt-6 border-t border-[var(--rule)] pt-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              Who is in the comparison
            </p>
            <form method="get" action="/houses" className="mt-2">
              <input type="hidden" name="house" value={house} />
              {pinned ? <input type="hidden" name="with" value={pinned} /> : null}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {withCharts.map((record) => (
                  <label
                    key={record.subject.id}
                    className="flex items-center gap-1.5 text-[13.5px]"
                  >
                    <input
                      type="checkbox"
                      name="who"
                      value={record.subject.id}
                      defaultChecked={selected.size === 0 || selected.has(record.subject.id)}
                    />
                    {record.subject.displayName}
                  </label>
                ))}
              </div>
              <button
                type="submit"
                className="mt-2 border border-[var(--accent)] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-[var(--accent)]"
              >
                Update
              </button>
            </form>
          </section>
        ) : null}
      </GlossaryProvider>
    </Shell>
  );
}

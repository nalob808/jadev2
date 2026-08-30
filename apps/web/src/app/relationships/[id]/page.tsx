import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getRelationship, getSettingsProfile, getSubject } from '@jade/db';
import {
  ashtakuta,
  AstronomyEngineProvider,
  buildVargaChart,
  compareMangala,
  convergences,
  jdFromUnixMs,
  POINT_DISPLAY_ORDER,
  sharedTimeline,
  SIGNS,
  synastry,
  transitContacts,
  unixMsFromJd,
  vimshottari,
  type ComputedChart,
  type Graha,
  type MatchSubject,
} from '@jade/astro';
import { SYNASTRY_PREAMBLE, synastryReadingFor } from '@jade/interpret';
import {
  ConvergenceTimeline,
  KutaTable,
  MangalaCard,
  NorthIndianChart,
  OverlayGrid,
  OverlayWheel,
} from '@jade/ui';
import { getSession } from '@/lib/auth';
import { requireCapability } from '@/lib/entitlements';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { removeRelationship } from '@/app/actions';
import { Reading } from '@/components/Reading';
import { Kicker, Panel, Shell } from '@/components/Shell';

export const dynamic = 'force-dynamic';

/** The Moon's nakṣatra and pāda — the whole of what aṣṭakūṭa reads. */
function matchSubjectOf(chart: ComputedChart): MatchSubject {
  const moon = chart.points.Moon!;
  return { nakshatra: moon.nakshatra.index, pada: moon.nakshatra.pada };
}

/** The classical grahas, as the wheel wants them: sign plus degree in sign. */
function wheelPlacements(
  chart: ComputedChart,
): { id: string; signIndex: number; degreesInSign: number }[] {
  const out: { id: string; signIndex: number; degreesInSign: number }[] = [];
  for (const id of POINT_DISPLAY_ORDER) {
    if (id === 'Ascendant' || id === 'Midheaven') continue;
    const p = chart.points[id];
    if (p) out.push({ id, signIndex: p.signIndex, degreesInSign: p.degreesInSign });
  }
  return out;
}

/** A sign name from its index, for the chart captions. */
function signLabel(index: number): string {
  return SIGNS[((index % 12) + 12) % 12]!;
}

function signMapOf(chart: ComputedChart): Record<Graha, number> {
  const out: Record<string, number> = {};
  for (const id of POINT_DISPLAY_ORDER) {
    const point = chart.points[id];
    if (point) out[id] = point.signIndex;
  }
  return out as Record<Graha, number>;
}

export default async function RelationshipPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  // Enforced here, not by hiding the link. Typing this URL lands on the
  // wall, which is the only version of a gate that is actually a gate.
  await requireCapability(session.workspaceId, 'relationships');

  const { id } = await params;
  const db = getDatabase();
  const pair = await getRelationship(db, { workspaceId: session.workspaceId, id });
  if (!pair) notFound();

  const [recordA, recordB, profile] = await Promise.all([
    getSubject(db, session.workspaceId, pair.subjectAId),
    getSubject(db, session.workspaceId, pair.subjectBId),
    getSettingsProfile(db, session.workspaceId, session.settingsProfileId),
  ]);
  if (!recordA?.birthEvent || !recordB?.birthEvent || !profile) notFound();

  const [chartA, chartB] = await Promise.all([
    getOrComputeChart(session.workspaceId, recordA.birthEvent, profile),
    getOrComputeChart(session.workspaceId, recordB.birthEvent, profile),
  ]);

  const nameA = recordA.subject.displayName;
  const nameB = recordB.subject.displayName;

  const kutas = ashtakuta(matchSubjectOf(chartA.chart), matchSubjectOf(chartB.chart));

  const mangalaA = {
    ascendantSign: chartA.chart.houses.ascendantSign,
    signOf: signMapOf(chartA.chart),
  };
  const mangalaB = {
    ascendantSign: chartB.chart.houses.ascendantSign,
    signOf: signMapOf(chartB.chart),
  };
  const mangala = compareMangala(mangalaA, mangalaB);
  const overlays = synastry(mangalaA, mangalaB);

  // Both Vimśottarī trees on one axis, and the windows where a named rule fires.
  const birthJd = (event: { utcDatetime: Date | string }): number =>
    jdFromUnixMs(
      event.utcDatetime instanceof Date
        ? event.utcDatetime.getTime()
        : new Date(event.utcDatetime).getTime(),
    );
  const dashaA = vimshottari(chartA.chart.points.Moon!.longitude, birthJd(recordA.birthEvent), {
    levels: 2,
  });
  const dashaB = vimshottari(chartB.chart.points.Moon!.longitude, birthJd(recordB.birthEvent), {
    levels: 2,
  });
  const clock = await getClock(session.workspaceId);
  const nowJd = clock.nowJd;
  // The axis is labelled in the reader's own calendar. A January boundary read
  // in UTC puts a period in the wrong year for anyone west of Greenwich.
  const yearOf = (jdUt: number): string => clock.format(unixMsFromJd(jdUt), { year: 'numeric' });
  // A reading looks at the years around now, not the whole hundred-year
  // overlap. The core will return all of it; the page asks for the part a
  // consultation actually uses.
  const segments = sharedTimeline(dashaA, dashaB, {
    level: 2,
    fromJd: nowJd - 5 * 365.25,
    toJd: nowJd + 20 * 365.25,
  });
  const meetings = convergences(segments, mangalaA, mangalaB, { a: nameA, b: nameB });

  // The transit half: Jupiter and Saturn arriving on the points a pair is read
  // by. Scanned over the next four years — far enough to plan around, near
  // enough that the dates still mean something.
  const longitudeMapOf = (chart: ComputedChart): Record<Graha, number> => {
    const out: Record<string, number> = {};
    for (const id of POINT_DISPLAY_ORDER) {
      const p = chart.points[id];
      if (p) out[id] = p.longitude;
    }
    return out as Record<Graha, number>;
  };
  const contacts = transitContacts(
    new AstronomyEngineProvider({ nodeType: profile.nodeType }),
    {
      ayanamsa: profile.ayanamsa,
      customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
    },
    { fromJd: nowJd, toJd: nowJd + 4 * 365.25 },
    {
      a: {
        ascendantSign: chartA.chart.houses.ascendantSign,
        longitudeOf: longitudeMapOf(chartA.chart),
      },
      b: {
        ascendantSign: chartB.chart.houses.ascendantSign,
        longitudeOf: longitudeMapOf(chartB.chart),
      },
    },
    { a: nameA, b: nameB },
  );

  // The prose half. Composed from the same overlays, kūṭas and doṣa the panels
  // below render — one computation, read two ways, so the words and the tables
  // can never disagree.
  const reading = synastryReadingFor({
    chartA: chartA.chart,
    chartB: chartB.chart,
    nameA,
    nameB,
    overlays,
    kutas,
    mangala,
  });

  const born = (record: typeof recordA): string =>
    record.birthEvent ? record.birthEvent.localDatetime.replace('T', ' ').slice(0, 16) : '';

  return (
    <Shell email={session.email}>
      {/* ------------------------------------------------------------ the pair */}
      <div className="jade-rise">
        <Kicker>Relationship · {pair.kind}</Kicker>
        <h1 className="font-display text-[2.8rem] font-semibold leading-[1.05]">
          <Link href={`/people/${recordA.subject.id}`} className="hover:underline">
            {nameA}
          </Link>
          <span className="text-[var(--ink-faint)]"> &amp; </span>
          <Link href={`/people/${recordB.subject.id}`} className="hover:underline">
            {nameB}
          </Link>
        </h1>
        <p className="mt-3 max-w-[74ch] text-[15px] leading-relaxed text-[var(--ink-muted)]">
          {SYNASTRY_PREAMBLE}
        </p>
        <p className="mt-3">
          <Link
            className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
            href={`/relationships/${pair.id}/report`}
          >
            Printable report →
          </Link>
        </p>
      </div>

      {/*
        Both charts, side by side, before any analysis of them. A synastry page
        that opens with a score has already told the reader what to think; one
        that opens with the two charts asks them to look first.
      */}
      <div className="mt-8 grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
        {(
          [
            [recordA, chartA, nameA],
            [recordB, chartB, nameB],
          ] as const
        ).map(([record, computed, name]) => (
          <div
            key={record.subject.id}
            className="flex flex-col items-center bg-[var(--surface)] p-5"
          >
            <p className="font-display text-xl font-semibold text-[var(--ink)]">{name}</p>
            <p className="mb-3 font-mono text-[10px] text-[var(--ink-faint)]">
              {born(record)} · {record.birthEvent?.placeName}
            </p>
            <NorthIndianChart varga={buildVargaChart(computed.chart, 'D1')} size={230} />
            <p className="mt-3 text-center font-mono text-[10px] leading-relaxed text-[var(--ink-muted)]">
              {signLabel(computed.chart.houses.ascendantSign)} rising ·{' '}
              {computed.chart.points.Moon!.sign} Moon
              <br />
              {computed.chart.points.Moon!.nakshatra.name} pāda{' '}
              {computed.chart.points.Moon!.nakshatra.pada}
            </p>
          </div>
        ))}
      </div>

      {/* ---------------------------------------------------------- the reading */}
      <section className="mt-10">
        <div className="mb-4 border-b border-[var(--rule)] pb-2">
          <Kicker>Read against each other</Kicker>
          <h2 className="font-display text-2xl font-semibold">What these two charts do together</h2>
        </div>
        <Reading sections={reading} subjectId={recordA.subject.id} />
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Panel>
          <p className="font-display text-2xl">Aṣṭakūṭa</p>
          <p className="mb-4 mt-1 text-sm text-[var(--ink-muted)]">
            Read from {nameA}&rsquo;s Moon in {chartA.chart.points.Moon!.nakshatra.name} and {nameB}
            &rsquo;s in {chartB.chart.points.Moon!.nakshatra.name} — and from nothing else in either
            chart. The reading above says what that does and does not cover.
          </p>
          <KutaTable result={kutas} />
        </Panel>

        <Panel>
          <p className="font-display text-2xl">Maṅgala doṣa</p>
          <p className="mb-4 mt-1 text-sm text-[var(--ink-muted)]">
            Cancellations first, because a doṣa handed over bare is not a finding.
          </p>
          <MangalaCard comparison={mangala} nameA={nameA} nameB={nameB} />
        </Panel>
      </div>

      <Panel className="mt-8">
        <p className="font-display text-2xl">The overlay</p>
        <p className="mb-4 mt-1 text-sm text-[var(--ink-muted)]">
          Both charts on one round, laid on {nameA}&rsquo;s houses.
        </p>
        <div className="flex justify-center">
          <OverlayWheel
            ascendantSign={chartA.chart.houses.ascendantSign}
            a={wheelPlacements(chartA.chart)}
            b={wheelPlacements(chartB.chart)}
            labelA={nameA}
            labelB={nameB}
          />
        </div>
      </Panel>

      <Panel className="mt-8">
        <p className="font-display text-2xl">Shared timeline</p>
        <p className="mb-4 mt-1 text-sm text-[var(--ink-muted)]">
          Both Vimśottarī daśās on one axis, from five years back to twenty ahead, then the slow
          transits arriving over the next four. Every entry below names the rule or the contact that
          produced it — nothing is highlighted for a reason the page will not tell you.
        </p>
        <ConvergenceTimeline
          segments={segments}
          convergences={meetings}
          contacts={contacts}
          labelA={nameA}
          labelB={nameB}
          formatJd={yearOf}
          nowJd={nowJd}
        />
      </Panel>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel>
          <OverlayGrid
            overlays={overlays.aInB}
            title={`${nameA} in ${nameB}’s houses`}
            caption={`Where ${nameA}’s grahas land on ${nameB}’s chart.`}
          />
        </Panel>
        <Panel>
          <OverlayGrid
            overlays={overlays.bInA}
            title={`${nameB} in ${nameA}’s houses`}
            caption={`Where ${nameB}’s grahas land on ${nameA}’s chart.`}
          />
        </Panel>
      </div>

      {overlays.conjunctions.length > 0 ? (
        <Panel className="mt-8">
          <p className="font-display text-2xl">Shared signs</p>
          <p className="mb-4 mt-1 max-w-[70ch] text-sm text-[var(--ink-muted)]">
            The plainest contact there is, and the first thing to look at. Both grahas are inside
            the same thirty degrees — there is no orb to argue about and no aspect doctrine to agree
            on first.
          </p>
          <ul className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-2">
            {overlays.conjunctions.map((c) => (
              <li
                key={`${c.a}-${c.b}-${c.sign}`}
                className="flex items-baseline gap-2 bg-[var(--surface)] px-3 py-2 text-sm"
              >
                <span className="font-display text-lg text-[var(--accent)]">{c.sign}</span>
                <span className="text-[var(--ink-muted)]">
                  {nameA}&rsquo;s {c.a} · {nameB}&rsquo;s {c.b}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel className="mt-8">
        <p className="font-display text-2xl">Dṛṣṭi between the charts</p>
        <p className="mb-4 mt-1 max-w-[74ch] text-sm text-[var(--ink-muted)]">
          Whole-sign glances, not orbs. Every graha looks at the seventh from itself; Mars adds the
          fourth and eighth, Jupiter the fifth and ninth, Saturn the third and tenth. A glance is
          directional — the graha doing the looking is not necessarily looked back at, which is why
          these are two lists rather than one.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {(
            [
              [overlays.aOnB, nameA, nameB],
              [overlays.bOnA, nameB, nameA],
            ] as const
          ).map(([glances, from, to]) => (
            <div key={from}>
              <p className="mb-2 border-b border-[var(--rule)] pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                {from} looking at {to}
              </p>
              {glances.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">
                  Nothing of {from}&rsquo;s casts a glance into {to}&rsquo;s chart.
                </p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {glances.slice(0, 14).map((d) => (
                    <li
                      key={`${d.from}-${d.to}-${d.aspectHouse}`}
                      className="border-l-2 pl-2.5 leading-snug"
                      style={{
                        // The special dṛṣṭis are the ones worth reading first,
                        // so they are the ones marked.
                        borderColor: d.aspectHouse === 7 ? 'var(--rule)' : 'var(--accent)',
                      }}
                    >
                      <span className="text-[var(--ink-muted)]">{d.description}</span>
                      {d.aspectHouse !== 7 ? (
                        <span className="ml-1.5 font-mono text-[9.5px] uppercase tracking-wider text-[var(--accent)]">
                          special
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <form action={removeRelationship} className="mt-10">
        <input type="hidden" name="id" value={pair.id} />
        <button type="submit" className="font-mono text-[11px] text-[var(--ink-muted)] underline">
          unpair — this removes the relationship, not either person
        </button>
      </form>
    </Shell>
  );
}

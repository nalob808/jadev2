import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getRelationship, getSettingsProfile, getSubject } from '@jade/db';
import {
  ashtakuta,
  AstronomyEngineProvider,
  compareMangala,
  convergences,
  jdFromUnixMs,
  POINT_DISPLAY_ORDER,
  sharedTimeline,
  synastry,
  transitContacts,
  vimshottari,
  type ComputedChart,
  type Graha,
  type MatchSubject,
} from '@jade/astro';
import { ConvergenceTimeline, KutaTable, MangalaCard, OverlayGrid, OverlayWheel } from '@jade/ui';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { removeRelationship } from '@/app/actions';
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

/** Julian Day to a year, for the timeline axis. The core never reads a clock. */
function yearOf(jdUt: number): string {
  return String(new Date((jdUt - 2440587.5) * 86400000).getUTCFullYear());
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
  const nowJd = jdFromUnixMs(Date.now());
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

  return (
    <Shell email={session.email}>
      <Kicker>Relationship</Kicker>
      <div className="flex flex-wrap items-baseline gap-4">
        <h1 className="font-display text-4xl">
          <Link href={`/people/${recordA.subject.id}`} className="hover:underline">
            {nameA}
          </Link>
          <span className="text-[var(--ink-muted)]"> &amp; </span>
          <Link href={`/people/${recordB.subject.id}`} className="hover:underline">
            {nameB}
          </Link>
        </h1>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          {pair.kind}
        </span>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <Panel>
          <p className="font-display text-2xl">Aṣṭakūṭa</p>
          <p className="mb-4 mt-1 text-sm text-[var(--ink-muted)]">
            Read from {nameA}&rsquo;s Moon in {chartA.chart.points.Moon!.nakshatra.name} and {nameB}
            &rsquo;s in {chartB.chart.points.Moon!.nakshatra.name}.
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
          <p className="mb-3 mt-1 text-sm text-[var(--ink-muted)]">
            The plainest contact there is, and the first thing to look at.
          </p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {overlays.conjunctions.map((c) => (
              <li key={`${c.a}-${c.b}-${c.sign}`}>
                {nameA}&rsquo;s {c.a} with {nameB}&rsquo;s {c.b} in {c.sign}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel className="mt-8">
        <p className="font-display text-2xl">Dṛṣṭi between the charts</p>
        <p className="mb-3 mt-1 text-sm text-[var(--ink-muted)]">
          Whole-sign glances, not orbs. Every graha looks at the 7th from itself; Mars, Jupiter and
          Saturn have their own extra sight.
        </p>
        <div className="grid gap-6 sm:grid-cols-2 text-sm">
          <ul className="flex flex-col gap-1">
            {overlays.aOnB.slice(0, 14).map((d) => (
              <li key={`${d.from}-${d.to}-${d.aspectHouse}`}>{d.description}</li>
            ))}
          </ul>
          <ul className="flex flex-col gap-1">
            {overlays.bOnA.slice(0, 14).map((d) => (
              <li key={`${d.from}-${d.to}-${d.aspectHouse}`}>{d.description}</li>
            ))}
          </ul>
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

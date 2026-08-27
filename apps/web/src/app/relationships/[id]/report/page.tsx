import { notFound, redirect } from 'next/navigation';
import { getRelationship, getSettingsProfile, getSubject } from '@jade/db';
import {
  ashtakuta,
  buildVargaChart,
  compareMangala,
  convergences,
  jdFromUnixMs,
  POINT_DISPLAY_ORDER,
  sharedTimeline,
  synastry,
  unixMsFromJd,
  vimshottari,
  type ComputedChart,
  type Graha,
  type MatchSubject,
} from '@jade/astro';
import { SYNASTRY_PREAMBLE, synastryReadingFor } from '@jade/interpret';
import { KutaTable, MangalaCard, NorthIndianChart, OverlayGrid, OverlayWheel } from '@jade/ui';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Reading } from '@/components/Reading';
import { ReportSection, ReportShell } from '@/components/Report';

export const dynamic = 'force-dynamic';

/**
 * The relationship report.
 *
 * The same material as the screen, ordered for paper: both charts first, then
 * the composed reading, then the screening tests with their components, then
 * the overlays. The preamble is printed at the top rather than buried, because
 * a printed compatibility report is exactly the artefact that gets read years
 * later by someone who was not in the room — and what it does not claim needs
 * to survive that journey.
 */

function matchSubjectOf(chart: ComputedChart): MatchSubject {
  const moon = chart.points.Moon!;
  return { nakshatra: moon.nakshatra.index, pada: moon.nakshatra.pada };
}

function signMapOf(chart: ComputedChart): Record<Graha, number> {
  const out: Record<string, number> = {};
  for (const id of POINT_DISPLAY_ORDER) {
    const point = chart.points[id];
    if (point) out[id] = point.signIndex;
  }
  return out as Record<Graha, number>;
}

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

export default async function RelationshipReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const clock = await getClock(session.workspaceId);
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

  const reading = synastryReadingFor({
    chartA: chartA.chart,
    chartB: chartB.chart,
    nameA,
    nameB,
    overlays,
    kutas,
    mangala,
  });

  // The shared timeline, over the window a consultation actually uses.
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
  const segments = sharedTimeline(dashaA, dashaB, {
    level: 2,
    fromJd: clock.nowJd,
    toJd: clock.nowJd + 10 * 365.25,
  });
  const meetings = convergences(segments, mangalaA, mangalaB, { a: nameA, b: nameB });

  const born = (record: typeof recordA): string =>
    record.birthEvent ? record.birthEvent.localDatetime.replace('T', ' ').slice(0, 16) : '';

  return (
    <ReportShell
      kicker={`relationship report · ${pair.kind}`}
      title={`${nameA} & ${nameB}`}
      meta={{
        lens: `${profile.ayanamsa} ayanāṁśa · ${profile.nodeType} nodes · ${profile.houseSystem.replace(
          '_',
          ' ',
        )} houses`,
        generated: clock.format(clock.nowMs, { day: 'numeric', month: 'long', year: 'numeric' }),
        backHref: `/relationships/${pair.id}`,
        backLabel: 'Back to the relationship',
      }}
    >
      <p className="mb-5 border-l-2 border-[var(--accent)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
        {SYNASTRY_PREAMBLE}
      </p>

      {/* ------------------------------------------------------- both charts */}
      <ReportSection
        title="The two charts"
        note="Printed before any analysis of them, so the reader can look first."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {(
            [
              [recordA, chartA, nameA],
              [recordB, chartB, nameB],
            ] as const
          ).map(([record, computed, name]) => (
            <div key={record.subject.id} className="jade-print-block flex flex-col items-center">
              <p className="font-display text-lg font-semibold">{name}</p>
              <p className="mb-2 font-mono text-[9px] text-[var(--ink-faint)]">
                {born(record)} · {record.birthEvent?.placeName}
              </p>
              <NorthIndianChart varga={buildVargaChart(computed.chart, 'D1')} size={230} />
              <p className="mt-2 text-center font-mono text-[9.5px] leading-relaxed text-[var(--ink-muted)]">
                {computed.chart.points.Moon!.sign} Moon ·{' '}
                {computed.chart.points.Moon!.nakshatra.name} pāda{' '}
                {computed.chart.points.Moon!.nakshatra.pada}
              </p>
            </div>
          ))}
        </div>
      </ReportSection>

      {/* ----------------------------------------------------------- reading */}
      <ReportSection
        title="What these two charts do together"
        note="Composed from the same overlays, kūṭas and doṣa printed further down — one computation read two ways, so the words and the tables cannot disagree."
        breakBefore
      >
        <Reading sections={reading} subjectId={recordA.subject.id} />
      </ReportSection>

      {/* ------------------------------------------------------------- kūṭas */}
      <ReportSection
        title="Aṣṭakūṭa"
        note={`Read from ${nameA}'s Moon in ${chartA.chart.points.Moon!.nakshatra.name} and ${nameB}'s in ${
          chartB.chart.points.Moon!.nakshatra.name
        } — and from nothing else in either chart.`}
        breakBefore
      >
        <KutaTable result={kutas} />
      </ReportSection>

      <ReportSection
        title="Maṅgala doṣa"
        note="Cancellations first, because a doṣa handed over bare is not a finding."
      >
        <MangalaCard comparison={mangala} nameA={nameA} nameB={nameB} />
      </ReportSection>

      {/* ---------------------------------------------------------- overlays */}
      <ReportSection
        title="The overlay"
        note={`Both charts on one round, laid on ${nameA}'s houses.`}
        breakBefore
      >
        <div className="flex justify-center">
          <OverlayWheel
            ascendantSign={chartA.chart.houses.ascendantSign}
            a={wheelPlacements(chartA.chart)}
            b={wheelPlacements(chartB.chart)}
            labelA={nameA}
            labelB={nameB}
          />
        </div>
      </ReportSection>

      <ReportSection title="Houses, both directions">
        <div className="grid gap-5 sm:grid-cols-2">
          <OverlayGrid
            overlays={overlays.aInB}
            title={`${nameA} in ${nameB}'s houses`}
            caption={`Where ${nameA}'s grahas land on ${nameB}'s chart.`}
          />
          <OverlayGrid
            overlays={overlays.bInA}
            title={`${nameB} in ${nameA}'s houses`}
            caption={`Where ${nameB}'s grahas land on ${nameA}'s chart.`}
          />
        </div>
      </ReportSection>

      {/* --------------------------------------------------------- timeline */}
      {meetings.length > 0 ? (
        <ReportSection
          title="Where the two daśās meet"
          note="The next ten years. Every entry names the rule that flagged it — nothing is highlighted for a reason this page will not give."
          breakBefore
        >
          <ul className="flex flex-col gap-2.5">
            {meetings.slice(0, 12).map((meeting, index) => (
              <li
                key={`${meeting.rule}-${meeting.subject}-${meeting.startJd}-${index}`}
                data-convergence={meeting.rule}
                className="jade-print-block border-l-2 border-[var(--accent)] pl-3"
              >
                <p className="font-mono text-[9px] uppercase tracking-wider text-[var(--accent)]">
                  {meeting.rule} ·{' '}
                  {clock.format(unixMsFromJd(meeting.startJd), {
                    month: 'short',
                    year: 'numeric',
                  })}
                  {' – '}
                  {clock.format(unixMsFromJd(meeting.endJd), { month: 'short', year: 'numeric' })}
                </p>
                <p className="text-[12px] font-medium leading-snug">{meeting.name}</p>
                {/*
                  The factors are the whole point of a flagged band. A heading
                  with no reasons under it is the thing the screen version was
                  built to avoid, and paper is where it would be least
                  checkable.
                */}
                <ul className="mt-0.5 flex flex-col gap-0.5">
                  {meeting.factors.map((factor) => (
                    <li key={factor} className="text-[11px] leading-snug text-[var(--ink-muted)]">
                      {factor}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </ReportSection>
      ) : null}
    </ReportShell>
  );
}

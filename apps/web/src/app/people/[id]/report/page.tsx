import { notFound, redirect } from 'next/navigation';
import { getSettingsProfile, getSubject, listNotes } from '@jade/db';
import {
  buildVargaChart,
  dashaChainAt,
  jdFromUnixMs,
  POINT_DISPLAY_ORDER,
  SIGNS,
  unixMsFromJd,
  vimshottari,
  type VargaId,
} from '@jade/astro';
import { formatOffset, offsetWarning, TIME_ACCURACY_MINUTES } from '@jade/atlas';
import { housesForChart, readingFor } from '@jade/interpret';
import { DashaColumn, GLYPHS, NorthIndianChart, SouthIndianChart, VargaGrid } from '@jade/ui';
import { getSession } from '@/lib/auth';
import { requireCapability } from '@/lib/entitlements';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Reading, HouseTable } from '@/components/Reading';
import { ReportSection, ReportShell } from '@/components/Report';

export const dynamic = 'force-dynamic';

/**
 * The chart report — the thing a practitioner prints and hands over.
 *
 * Two variants, chosen by a query parameter rather than by two routes, because
 * they are the same document and only differ by whether the practitioner's own
 * notes travel with it:
 *
 *   /people/[id]/report            the chart, for a client
 *   /people/[id]/report?notes=1    the same plus every note on this person
 *
 * That distinction matters more than it looks. Notes are where an astrologer
 * writes what they actually think, including the parts they would not say to
 * the person in the room, so they are off by default and the printed page says
 * out loud when they are included.
 */

const VARGAS_IN_REPORT: readonly VargaId[] = ['D1', 'D9', 'D10', 'D12', 'D30', 'D60'];

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

export default async function ChartReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notes?: string; style?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');
  // Enforced here, not by hiding the link. Typing this URL lands on the
  // wall, which is the only version of a gate that is actually a gate.
  await requireCapability(session.workspaceId, 'reports');

  const { id } = await params;
  const query = await searchParams;
  const withNotes = query.notes === '1';
  const style = query.style === 'south' ? 'south' : 'north';

  const database = getDatabase();
  const record = await getSubject(database, session.workspaceId, id);
  if (!record?.birthEvent) notFound();
  const { subject, birthEvent } = record;

  const profile = await getSettingsProfile(
    database,
    session.workspaceId,
    session.settingsProfileId,
  );
  if (!profile) notFound();

  const clock = await getClock(session.workspaceId);
  const { chart } = await getOrComputeChart(session.workspaceId, birthEvent, profile);

  const birthJd = jdFromUnixMs(
    birthEvent.utcDatetime instanceof Date
      ? birthEvent.utcDatetime.getTime()
      : new Date(birthEvent.utcDatetime).getTime(),
  );
  const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, { levels: 3 });
  const runningChain = dashaChainAt(dashas, clock.nowJd);
  const reading = readingFor(chart, { dasha: dashas.periods, nowJd: clock.nowJd });
  const houseRows = housesForChart(chart);
  const notes = withNotes
    ? await listNotes(database, session.workspaceId, { subjectId: subject.id })
    : [];

  const ChartComponent = style === 'south' ? SouthIndianChart : NorthIndianChart;

  // The birth record's own caveats travel onto the paper. A printed chart that
  // hides an ambiguous birth time is worse than one that never had it.
  const warning = offsetWarning({
    offsetMinutes: birthEvent.utcOffsetMinutes,
    source: birthEvent.offsetSource,
    ambiguous: birthEvent.offsetAmbiguous,
    confidence: birthEvent.offsetAmbiguous ? 'best-effort' : 'high',
    note: (birthEvent.offsetNote ?? undefined) as undefined,
    zoneId: birthEvent.timezoneId,
  });
  const uncertaintyMinutes = TIME_ACCURACY_MINUTES[birthEvent.timeAccuracy];

  return (
    <ReportShell
      kicker={withNotes ? 'chart report · with notes' : 'chart report'}
      title={subject.displayName}
      subtitle={`${birthEvent.localDatetime.replace('T', ' ').slice(0, 16)} · ${formatOffset(
        birthEvent.utcOffsetMinutes,
      )} · ${birthEvent.placeName}`}
      meta={{
        lens: `${profile.ayanamsa} ayanāṁśa · ${profile.nodeType} nodes · ${profile.houseSystem.replace(
          '_',
          ' ',
        )} houses · ${profile.positionBasis} positions`,
        generated: clock.format(clock.nowMs, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        backHref: `/people/${subject.id}`,
        backLabel: `Back to ${subject.displayName}`,
      }}
    >
      {warning ? (
        <p className="mb-4 border-l-2 border-[var(--clay)] bg-[var(--surface)] px-3 py-2 text-[12px] leading-snug">
          {warning}
        </p>
      ) : null}

      {withNotes ? (
        <p className="mb-4 border-l-2 border-[var(--clay)] px-3 py-2 text-[12px] leading-snug">
          <strong>This copy includes private practice notes.</strong> {notes.length} note
          {notes.length === 1 ? '' : 's'} written against this chart are printed at the end.
        </p>
      ) : null}

      {/* ------------------------------------------------------ chart + table */}
      <ReportSection
        title="The chart"
        note={`Cast for the moment above, in the frame named at the top of this page. Time accuracy on record: ${
          uncertaintyMinutes === null
            ? 'unknown'
            : `±${uncertaintyMinutes} minute${uncertaintyMinutes === 1 ? '' : 's'}`
        }.`}
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="jade-print-block shrink-0">
            <ChartComponent varga={buildVargaChart(chart, 'D1')} size={280} />
          </div>

          <div className="min-w-[16rem] flex-1 overflow-x-auto">
            <table aria-label="Graha positions" className="w-full text-[11.5px]">
              <thead>
                <tr className="border-b border-[var(--rule-strong)] text-left">
                  <th className="py-1 pr-2 font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                    Graha
                  </th>
                  <th className="py-1 pr-2 font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                    Position
                  </th>
                  <th className="py-1 pr-2 font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                    Nakṣatra
                  </th>
                  <th className="py-1 pr-2 font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                    Hse
                  </th>
                  <th className="py-1 font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                    Dignity
                  </th>
                </tr>
              </thead>
              <tbody>
                {POINT_DISPLAY_ORDER.filter((pid) => chart.points[pid]).map((pid) => {
                  const point = chart.points[pid]!;
                  return (
                    <tr key={pid} className="border-b border-[var(--rule)]">
                      <td className="py-1 pr-2 whitespace-nowrap">
                        <span className="text-[var(--accent)]">{GLYPHS[pid] ?? ''}</span> {pid}
                      </td>
                      <td className="py-1 pr-2 font-mono tabular-nums">
                        {degrees(point.degreesInSign)} {point.sign}
                        {point.retrograde ? ' ℞' : ''}
                      </td>
                      <td className="py-1 pr-2 text-[var(--ink-muted)]">
                        {point.nakshatra.name} · {point.nakshatra.pada}
                      </td>
                      <td className="py-1 pr-2 font-mono tabular-nums">{point.house}</td>
                      <td className="py-1 text-[var(--ink-muted)]">
                        {(chart.dignity[pid] ?? '').replace('_', ' ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </ReportSection>

      {/* ------------------------------------------------------------ houses */}
      <ReportSection
        title="The twelve houses"
        note="Whole-sign from the rising sign, with each house's lord and what occupies it."
      >
        <HouseTable rows={houseRows} />
      </ReportSection>

      {/* ------------------------------------------------------------- vargas */}
      <ReportSection
        title="Divisional charts"
        note="Each varga re-seated on its own ascendant rather than the rāśi chart redrawn — which is what makes a divisional readable on its own terms."
        breakBefore
      >
        <VargaGrid chart={chart} style={style} only={VARGAS_IN_REPORT} cellSize={150} />
      </ReportSection>

      {/* ------------------------------------------------------ ashtakavarga */}
      <ReportSection
        title="Sarvāṣṭakavarga"
        note="Bindus per sign, totalling 337 across the twelve. A count of how many contributors marked each sign benefic — a density, not a verdict on what a transit through it will bring."
      >
        <table aria-label="Sarvāṣṭakavarga bindus" className="w-full text-[11.5px]">
          <thead>
            <tr className="border-b border-[var(--rule-strong)] text-left">
              <th className="py-1 pr-2 font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]">
                Sign
              </th>
              {SIGNS.map((sign) => (
                <th
                  key={sign}
                  className="py-1 pr-1 text-center font-mono text-[8.5px] uppercase tracking-wider text-[var(--ink-faint)]"
                >
                  {sign.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--rule)]">
              <td className="py-1.5 pr-2 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-faint)]">
                Bindus
              </td>
              {chart.ashtakavarga.sarva.map((bindus, index) => (
                <td
                  key={SIGNS[index]}
                  className="py-1.5 pr-1 text-center font-mono tabular-nums font-medium"
                >
                  {bindus}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-[var(--ink-muted)]">
          Strongest by count: {chart.ashtakavarga.strongestSigns.slice(0, 4).join(', ')}.
        </p>
      </ReportSection>

      {/* -------------------------------------------------------------- daśā */}
      <ReportSection
        title="Vimśottarī daśā"
        note={`Running now: ${runningChain.map((p) => p.lord).join(' → ')}. Computed from the Moon at ${degrees(
          chart.points.Moon!.degreesInSign,
        )} ${chart.points.Moon!.sign}, in ${chart.points.Moon!.nakshatra.name}.`}
        breakBefore
      >
        <DashaColumn dashas={dashas} atJdUt={clock.nowJd} levels={2} />
      </ReportSection>

      {/* ----------------------------------------------------------- reading */}
      <ReportSection
        title="What this chart says, and why"
        note="Every sentence below is composed from computed placements, and every one prints the placements beside it. Nothing here is pre-written prose."
        breakBefore
      >
        <Reading sections={reading} subjectId={subject.id} />
      </ReportSection>

      {/* ------------------------------------------------------------- notes */}
      {withNotes && notes.length > 0 ? (
        <ReportSection
          title="Practice notes"
          note="Written by the practitioner against this chart. Anchored to factors by name, so a note on a graha stays findable from every other chart that has one."
          breakBefore
        >
          <ul className="flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id} className="jade-print-block border-l-2 border-[var(--rule)] pl-3">
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed">{note.body}</p>
                <p className="mt-1 font-mono text-[9px] tracking-wide text-[var(--ink-faint)]">
                  {note.anchorLabel ? `${note.anchorLabel} · ` : ''}
                  {clock.format(new Date(note.createdAt).getTime(), {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                  {note.tags.length ? ` · ${note.tags.join(', ')}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </ReportSection>
      ) : null}

      {/* Provenance, so the sheet can be reproduced exactly. */}
      <p className="mt-8 font-mono text-[9px] leading-relaxed text-[var(--ink-faint)]">
        Chart computed at JD {chart.meta.jdUt.toFixed(6)} UT · ayanāṁśa{' '}
        {chart.meta.ayanamsaValue.toFixed(6)}° · engine {chart.meta.astroVersion} ·{' '}
        {chart.meta.provider} · precision class {chart.meta.precisionClass} · sunrise{' '}
        {chart.sunrise ? clock.format(unixMsFromJd(chart.sunrise), { timeStyle: 'short' }) : '—'}
      </p>
    </ReportShell>
  );
}

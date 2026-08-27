import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSettingsProfile, getSubject, listNotes } from '@jade/db';
import {
  availableAnchors,
  buildVargaChart,
  signsAspectedBy,
  dashaChainAt,
  formatSignPosition,
  jdFromUnixMs,
  POINT_DISPLAY_ORDER,
  SIGNS,
  VARGA_IDS,
  VARGA_NAMES,
  vimshottari,
  type VargaId,
} from '@jade/astro';
import { formatOffset, offsetWarning, TIME_ACCURACY_MINUTES } from '@jade/atlas';
import {
  DashaColumn,
  GLYPHS,
  NorthIndianChart,
  PanchangaCard,
  SouthIndianChart,
  VargaGrid,
  Wheel,
} from '@jade/ui';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { removePerson } from '@/app/actions';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { housesForChart, readingFor } from '@jade/interpret';
import { HouseTable, Reading } from '@/components/Reading';
import { NoteCard } from '@/components/NoteCard';
import { NoteComposer } from '@/components/NoteComposer';

export const dynamic = 'force-dynamic';

// East Indian and the Western wheel are deliberately absent — see
// docs/05-phases.md. Shipping a Bengali layout I could not verify against a
// reference would undermine the one claim this product rests on.
type Style = 'north' | 'south';
const STYLES: ReadonlyArray<{ id: Style; label: string }> = [
  { id: 'north', label: 'North' },
  { id: 'south', label: 'South' },
];

export default async function PersonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    style?: string;
    varga?: string;
    view?: string;
    noteError?: string;
    saved?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const query = await searchParams;
  const style: Style = STYLES.some((s) => s.id === query.style) ? (query.style as Style) : 'north';
  const vargaId: VargaId = (VARGA_IDS as readonly string[]).includes(query.varga ?? '')
    ? (query.varga as VargaId)
    : 'D1';
  const showAllVargas = query.view === 'vargas';

  const record = await getSubject(getDatabase(), session.workspaceId, id);
  if (!record) notFound();
  const { subject, birthEvent } = record;
  if (!birthEvent) notFound();

  const profile = await getSettingsProfile(
    getDatabase(),
    session.workspaceId,
    session.settingsProfileId,
  );
  if (!profile) notFound();

  const { chart, cacheHit } = await getOrComputeChart(session.workspaceId, birthEvent, profile);
  const varga = buildVargaChart(chart, vargaId);

  const birthJd = jdFromUnixMs(
    birthEvent.utcDatetime instanceof Date
      ? birthEvent.utcDatetime.getTime()
      : new Date(birthEvent.utcDatetime).getTime(),
  );
  const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, { levels: 3 });
  // "Now" is passed explicitly rather than read inside the core.
  const nowJd = jdFromUnixMs(Date.now());
  const runningChain = dashaChainAt(dashas, nowJd);

  // Anchors come from this chart and this daśā, so the picker offers exactly
  // the factors on screen rather than a generic vocabulary.
  const anchors = availableAnchors(chart, dashas.periods);

  // The reading is composed from this chart's own factors — see
  // packages/interpret. Nothing here is pre-written prose.
  const reading = readingFor(chart, { dasha: dashas.periods, nowJd });
  const houseRows = housesForChart(chart);

  // The wheel draws from real longitudes rather than sign buckets, so it needs
  // the points themselves rather than the varga projection the square charts
  // use.
  const wheelPoints = POINT_DISPLAY_ORDER.filter((id) => chart.points[id]).map((id) => {
    const point = chart.points[id]!;
    return {
      id,
      longitude: point.longitude,
      signIndex: point.signIndex,
      degreesInSign: point.degreesInSign,
      house: point.house,
      retrograde: point.retrograde,
      nakshatra: point.nakshatra.name,
      dignity: chart.dignity[id] ?? null,
    };
  });

  const wheelAspects = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const)
    .filter((id) => chart.points[id])
    .flatMap((id) => signsAspectedBy(id, chart.points[id]!.signIndex));
  const notes = await listNotes(getDatabase(), session.workspaceId, { subjectId: subject.id });

  const uncertaintyMinutes = TIME_ACCURACY_MINUTES[birthEvent.timeAccuracy];
  const warning = offsetWarning({
    offsetMinutes: birthEvent.utcOffsetMinutes,
    source: birthEvent.offsetSource,
    ambiguous: birthEvent.offsetAmbiguous,
    confidence: birthEvent.offsetAmbiguous ? 'best-effort' : 'high',
    note: (birthEvent.offsetNote ?? undefined) as undefined,
    zoneId: birthEvent.timezoneId,
  });

  const base = `/people/${subject.id}`;
  const link = (patch: Record<string, string>): string => {
    const next = new URLSearchParams({
      style,
      varga: vargaId,
      ...(showAllVargas ? { view: 'vargas' } : {}),
    });
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    return `${base}?${next.toString()}`;
  };

  const ChartComponent = style === 'south' ? SouthIndianChart : NorthIndianChart;

  return (
    <Shell email={session.email}>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Kicker>{subject.relationship.replace('_', ' ')}</Kicker>
          <h1 className="font-display text-4xl">{subject.displayName}</h1>
          <p className="font-mono text-[11px] text-[var(--ink-muted)]">
            {birthEvent.localDatetime.replace('T', ' ').slice(0, 16)} ·{' '}
            {formatOffset(birthEvent.utcOffsetMinutes)} · {birthEvent.placeName}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <Link
            className="border border-[var(--accent)] px-2.5 py-1 uppercase tracking-wider text-[var(--accent)] no-underline transition-colors hover:bg-[var(--accent)] hover:text-white"
            href={`${base}/edit`}
          >
            edit
          </Link>
          <a className="underline" href={`/api/people/${subject.id}/export`}>
            export
          </a>
          <form action={removePerson}>
            <input type="hidden" name="id" value={subject.id} />
            <button type="submit" className="underline">
              remove
            </button>
          </form>
        </div>
      </div>

      {query.saved ? (
        <p className="mb-5 border-l-2 border-[var(--jade)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--jade)]">
          Saved. The chart below was recast from the corrected details.
        </p>
      ) : null}

      {warning ? (
        <p className="mb-5 border-l-2 border-[var(--clay,#9E5B3A)] bg-[var(--surface)] px-4 py-3 text-sm">
          {warning}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[auto_1fr]">
        <Panel className="flex flex-col items-center">
          <div className="mb-3 flex w-full items-center justify-between gap-3">
            <Kicker>
              {vargaId} · {VARGA_NAMES[vargaId]}
            </Kicker>
            <nav className="flex gap-1 font-mono text-[10px] uppercase tracking-wider">
              {STYLES.map((option) => (
                <Link
                  key={option.id}
                  href={link({ style: option.id })}
                  className={`border px-2 py-0.5 ${
                    option.id === style
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--rule)] text-[var(--ink-muted)]'
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </nav>
          </div>

          <ChartComponent varga={varga} size={300} />

          <nav className="mt-4 flex w-full flex-wrap gap-1 font-mono text-[10px]">
            {(['D1', 'D9', 'D10', 'D12', 'D30', 'D60'] as const).map((id) => (
              <Link
                key={id}
                href={link({ varga: id })}
                className={`border px-1.5 py-0.5 ${
                  id === vargaId
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-[var(--rule)] text-[var(--ink-muted)]'
                }`}
              >
                {id}
              </Link>
            ))}
            <Link
              href={link({ view: showAllVargas ? '' : 'vargas' })}
              className="ml-auto border border-[var(--rule)] px-1.5 py-0.5 text-[var(--ink-muted)]"
            >
              {showAllVargas ? 'hide all 16' : 'all 16'}
            </Link>
          </nav>
        </Panel>

        <Panel>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <Kicker>Sidereal positions</Kicker>
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
              {chart.meta.ayanamsaMode} {chart.meta.ayanamsaValue.toFixed(4)}° ·{' '}
              {cacheHit ? 'cached' : 'computed'}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table aria-label="Graha positions" className="w-full text-[13px] sm:text-sm">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)]">
                  <th className="pb-2">Graha</th>
                  <th className="pb-2">Position</th>
                  <th className="hidden pb-2 sm:table-cell">Nakṣatra</th>
                  <th className="hidden pb-2 sm:table-cell">House</th>
                  <th className="hidden pb-2 md:table-cell">Dignity</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {POINT_DISPLAY_ORDER.map((pointId) => chart.points[pointId])
                  .filter((point) => point !== undefined)
                  .map((point) => (
                    <tr key={point.id} className="border-t border-[var(--rule)] align-top">
                      <td className="py-1.5 pr-3">
                        <span className="whitespace-nowrap">
                          {GLYPHS[point.id as keyof typeof GLYPHS]} {point.id}
                          {point.retrograde ? ' ℞' : ''}
                        </span>
                        <span className="block text-[10px] text-[var(--ink-muted)] sm:hidden">
                          H{point.house} · {point.nakshatra.name} · {point.nakshatra.pada}
                          {formatDignity(chart.dignity[point.id], chart.combustion[point.id])
                            ? ` · ${formatDignity(chart.dignity[point.id], chart.combustion[point.id])}`
                            : ''}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 whitespace-nowrap">
                        {formatSignPosition(point.longitude, SIGNS)}
                      </td>
                      <td className="hidden py-1.5 pr-3 sm:table-cell">
                        {point.nakshatra.name}
                        <span className="text-[var(--ink-muted)]"> · {point.nakshatra.pada}</span>
                      </td>
                      <td className="hidden py-1.5 pr-3 sm:table-cell">{point.house}</td>
                      <td className="hidden py-1.5 md:table-cell">
                        {formatDignity(chart.dignity[point.id], chart.combustion[point.id])}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {chart.vargottama.length > 0 ? (
            <p className="mt-4 text-sm text-[var(--ink-muted)]">
              Vargottama: {chart.vargottama.join(', ')}
            </p>
          ) : null}
          {uncertaintyMinutes > 0 ? (
            <p className="mt-3 text-xs text-[var(--ink-muted)]">
              Birth time given as ±{uncertaintyMinutes} minutes, which moves the ascendant by
              roughly {(uncertaintyMinutes / 4).toFixed(0)}°. Everything house-dependent inherits
              that.
            </p>
          ) : null}
        </Panel>
      </div>

      {showAllVargas ? (
        <Panel className="mt-5">
          <Kicker>Ṣoḍaśavarga — all sixteen, each on its own ascendant</Kicker>
          <div className="mt-4">
            <VargaGrid chart={chart} style={style === 'south' ? 'south' : 'north'} cellSize={128} />
          </div>
        </Panel>
      ) : null}

      <Panel className="mt-5">
        <Kicker>Pañcāṅga at birth</Kicker>
        <div className="mt-3">
          <PanchangaCard
            panchanga={chart.panchanga}
            sunrise={chart.sunrise}
            sunset={chart.sunset}
            formatJd={(jd) => formatLocalClock(jd, birthEvent.utcOffsetMinutes)}
          />
        </div>
      </Panel>

      <Panel className="mt-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <Kicker>Daśā</Kicker>
          <span className="font-mono text-[10px] text-[var(--ink-muted)]">
            running now: {runningChain.map((period) => period.lord).join(' › ')}
          </span>
        </div>
        <DashaColumn dashas={dashas} atJdUt={nowJd} levels={3} />
      </Panel>

      <section className="mt-8">
        <div className="mb-3">
          <Kicker>The wheel</Kicker>
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Every degree, and what aspects what
          </h2>
          <p className="mt-1 max-w-[64ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
            Drawn from longitudes rather than sign buckets — the square charts say Mars is in
            Scorpio, this says where in Scorpio. Toggle the layers; click a graha to isolate its
            dṛṣṭi.
          </p>
        </div>
        <Panel>
          <div className="flex justify-center">
            <div className="w-full max-w-[560px]">
              <Wheel
                points={wheelPoints}
                aspects={wheelAspects}
                ascendant={chart.points.Ascendant!.longitude}
                ascendantSign={chart.houses.ascendantSign}
                title={`${subject.displayName} — circular chart`}
              />
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <Kicker>Reading</Kicker>
            <h2 className="font-display text-3xl font-semibold leading-tight">
              What this chart says, and why
            </h2>
          </div>
          <Link
            href="/learn"
            className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
          >
            Reference →
          </Link>
        </div>
        <p className="mb-5 max-w-[64ch] text-[14px] leading-relaxed text-[var(--ink-muted)]">
          Every statement below carries the placements it was composed from. Nothing is asserted
          that cannot be traced back to a factor in this chart.
        </p>
        <Reading sections={reading} subjectId={subject.id} />
      </section>

      <section className="mt-8">
        <div className="mb-3">
          <Kicker>The twelve houses</Kicker>
          <h2 className="font-display text-3xl font-semibold leading-tight">
            What sits in each area of life
          </h2>
        </div>
        <HouseTable rows={houseRows} />
      </section>

      <section id="notes" className="mt-8">
        <div className="mb-3 flex items-baseline justify-between gap-4">
          <Kicker>Notes</Kicker>
          <Link
            href={`/notes?q=&anchorKind=`}
            className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
          >
            All notes →
          </Link>
        </div>

        <div className="flex flex-col gap-3">
          {/* Keyed on the newest note — see the note on /notes. */}
          <NoteComposer
            key={notes[0]?.id ?? 'empty'}
            subjectId={subject.id}
            anchors={anchors}
            returnTo={base}
            error={query.noteError || undefined}
          />
          {notes.map((note, index) => (
            <NoteCard
              key={`${note.id}:${new Date(note.updatedAt).getTime()}`}
              note={note}
              index={index}
              returnTo={base}
            />
          ))}
        </div>
      </section>
    </Shell>
  );
}

/** Julian Day to a local wall clock, using the birth event's own offset. */
function formatLocalClock(jdUt: number, offsetMinutes: number): string {
  const utcMs = (jdUt - 2440587.5) * 86400000;
  const local = new Date(utcMs + offsetMinutes * 60000);
  return `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`;
}

const DIGNITY_LABELS: Record<string, string> = {
  exalted: 'exalted',
  moolatrikona: 'mūlatrikoṇa',
  own: 'own sign',
  friend: 'friend',
  neutral: 'neutral',
  enemy: 'enemy',
  debilitated: 'debilitated',
};

function formatDignity(
  dignity: string | null | undefined,
  combustion: { combust: boolean; cazimi: boolean } | null | undefined,
): string {
  const parts: string[] = [];
  if (dignity) parts.push(DIGNITY_LABELS[dignity] ?? dignity);
  if (combustion?.cazimi) parts.push('cazimi');
  else if (combustion?.combust) parts.push('combust');
  return parts.join(' · ');
}

import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ASPECTS,
  POINT_DISPLAY_ORDER,
  findAspects,
  jdFromUnixMs,
  signsAspectedBy,
  unixMsFromJd,
  vimshottari,
  type AspectPoint,
  type ComputedChart,
} from '@jade/astro';
import type { WheelDegreeAspect } from '@jade/ui';
import { getSettingsProfile, listNotes, listPublicFigures, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { LIBRARY_LENS, castFigure } from '@/lib/publicChart';
import { buildFocusIndex } from '@/lib/focusIndex';
import { buildScopeIndex, glossaryContextFor } from '@jade/interpret';
import { GlossaryProvider } from '@/components/Glossary';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { WheelWorkspace } from '@/components/WheelWorkspace';
import { ChartStackPanels, type StackEntry } from '@/components/ChartStackPanels';
import { ChartMenu, type MenuPerson } from '@/components/ChartMenu';
import { bhavaOverlayFor } from '@/lib/houseSystems';
import { SpacetimeNavigator } from '@/components/SpacetimeNavigator';
import { aspectSettingsOrDefaults } from '@/lib/aspectForm';
import { parseStack, serialiseStack, stackFromLegacy, type Layer } from '@/lib/chartStack';

export const dynamic = 'force-dynamic';

/**
 * The wheel, given a room of its own.
 *
 * Until now the wheel was a figure part-way down a person's page, below the
 * positions table and above the reading. It is the thing an astrologer
 * actually looks at, so it gets the screen — with the people to switch between
 * on one side and everything about the selected graha on the other.
 *
 * The chart, the yogas and the focus index are all built here, on the server,
 * and handed down. Selecting a graha then costs nothing and does not require
 * shipping the yoga engine to a phone.
 */

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

/** "1994-03-11T07:45" → "11 Mar 1994". Never parsed as an instant. */
function born(localDatetime: string | null | undefined): string {
  if (!localDatetime) return 'no birth data';
  const [date] = localDatetime.split('T');
  const [year, month, day] = (date ?? '').split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1] ?? month} ${year}`;
}

const ACCURACY_CAVEAT: Record<string, string | null> = {
  exact: null,
  min5: 'The birth time is good to about five minutes, so the lagna degree carries that much doubt.',
  min30:
    'The birth time is good to about half an hour. The rising sign is probably right; the lagna degree is not to be leaned on.',
  hour2:
    'The birth time is uncertain by a couple of hours, which is long enough for the lagna to have changed sign. Read the houses with that in mind.',
  unknown:
    'No birth time was recorded, so noon stands in. The houses below are a placeholder rather than a reading — rectify before trusting them.',
};

function wheelPointsFor(chart: Awaited<ReturnType<typeof getOrComputeChart>>['chart']) {
  return POINT_DISPLAY_ORDER.filter((id) => chart.points[id]).map((id) => {
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
}

export default async function WheelPage({
  searchParams,
}: {
  searchParams: Promise<{
    person?: string;
    overlay?: string;
    figure?: string;
    stack?: string;
    t?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const {
    person: personParam,
    overlay: overlayParam,
    figure: figureParam,
    stack: stackParam,
    t: transitParam,
  } = await searchParams;
  const database = getDatabase();
  const clock = await getClock(session.workspaceId);

  const [people, profile, figures] = await Promise.all([
    listSubjects(database, session.workspaceId),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
    /*
     * The library, as a read path only.
     *
     * Phase 13 put public figures in their own table with no workspace column
     * precisely so the two could never be joined, and that stands: nothing here
     * writes a client into `public_figures`, and a figure loaded onto this wheel
     * is never added to the practice's own people or counted against the plan.
     */
    listPublicFigures(database, {}),
  ]);

  /*
   * Only timed figures can ride the outer ring.
   *
   * An untimed chart has no ascendant and therefore no houses — the library is
   * scrupulous about this and shows a day's range of positions instead. Putting
   * one on a wheel would require inventing a birth time, so those are filtered
   * out here rather than offered and then refused.
   */
  const overlayableFigures = figures.filter((figure) => figure.birthTime !== null);

  const withCharts = people.filter((row) => row.birthEvent);

  if (withCharts.length === 0 || !profile) {
    return (
      <Shell email={session.email}>
        <Kicker>The wheel</Kicker>
        <h1 className="mb-6 font-display text-4xl">Nobody to draw yet</h1>
        <Panel>
          <p className="text-[var(--ink-muted)]">
            The wheel needs somebody with birth data.{' '}
            <Link href="/people/new" className="text-[var(--accent)] underline underline-offset-2">
              Add a person
            </Link>{' '}
            and they appear here.
          </p>
        </Panel>
      </Shell>
    );
  }

  /*
   * What is on the wheel, from the inside out.
   *
   * `?stack=` is the parameter now. The three old ones still work — they are in
   * bookmarks, in the library's overlay links, and in anything anyone has
   * shared — so an old link is read as the stack it describes rather than
   * redirected away. See `lib/chartStack.ts`.
   */
  const requested =
    parseStack(stackParam).length > 0
      ? parseStack(stackParam)
      : stackFromLegacy({ person: personParam, overlay: overlayParam, figure: figureParam });

  /* Only layers that resolve to something this workspace actually holds. */
  const resolved = requested.filter((layer) =>
    layer.kind === 'person'
      ? withCharts.some((row) => row.subject.id === layer.id)
      : layer.kind === 'figure'
        ? overlayableFigures.some((figure) => figure.slug === layer.slug)
        : true,
  );

  /*
   * Ring one has to be one of your own people.
   *
   * The innermost chart sets the houses, the daśās, the notes and the focus
   * panel, all of which are read from a workspace subject. A library figure can
   * ride an outer ring; putting one underneath would mean casting a stranger's
   * chart as the frame for your own reading, which is a different feature.
   */
  const baseLayer = resolved.find(
    (layer): layer is Layer & { kind: 'person' } => layer.kind === 'person',
  );
  const current =
    (baseLayer ? withCharts.find((row) => row.subject.id === baseLayer.id) : undefined) ??
    withCharts.find((row) => row.subject.relationship === 'self') ??
    withCharts[0]!;

  /* The rings after the base, in the order the stack asks for. */
  const outerLayers = resolved.filter(
    (layer) => !(layer.kind === 'person' && layer.id === current.subject.id),
  );

  const overlayLayer = outerLayers.find(
    (layer) => layer.kind === 'person' || layer.kind === 'figure',
  );
  const overlay =
    overlayLayer?.kind === 'person'
      ? (withCharts.find((row) => row.subject.id === overlayLayer.id) ?? null)
      : null;
  const overlayFigure =
    overlayLayer?.kind === 'figure'
      ? (overlayableFigures.find((candidate) => candidate.slug === overlayLayer.slug) ?? null)
      : null;
  const figureCast = overlayFigure ? castFigure(overlayFigure) : null;

  const { chart } = await getOrComputeChart(session.workspaceId, current.birthEvent!, profile);
  const overlayChart = overlay
    ? (await getOrComputeChart(session.workspaceId, overlay.birthEvent!, profile)).chart
    : figureCast?.kind === 'timed'
      ? figureCast.chart
      : null;

  /**
   * The library is cast in its own fixed lens, and that has to be said.
   *
   * Every figure in `public_figures` is computed with Lahiri and mean nodes so
   * the published charts are stable and citable. A workspace set to true nodes
   * would therefore be looking at an inner ring in one frame and an outer ring
   * in another, with Rāhu up to about 1.7° apart between them — and nothing on
   * screen to say so. Jade states the mismatch rather than silently
   * reconciling or silently ignoring it (CLAUDE.md #3).
   */
  const lensMismatch =
    overlayFigure && profile.nodeType !== LIBRARY_LENS.nodeType
      ? `${overlayFigure.displayName} is drawn in the library's fixed lens — ${LIBRARY_LENS.label}. This workspace uses ${profile.nodeType} nodes, so the two rings do not share a frame.`
      : null;

  const birthMs =
    current.birthEvent!.utcDatetime instanceof Date
      ? current.birthEvent!.utcDatetime.getTime()
      : new Date(current.birthEvent!.utcDatetime).getTime();
  /** Stated, not defaulted, and shared with the browser-side scrubber. */
  const YEAR_LENGTH = 'julian' as const;
  const birthJd = jdFromUnixMs(birthMs);
  const dashas = vimshottari(chart.points.Moon!.longitude, birthJd, {
    levels: 3,
    yearLength: YEAR_LENGTH,
  });

  const notes = await listNotes(database, session.workspaceId, { subjectId: current.subject.id });

  const facts = buildFocusIndex(chart, {
    yogas: chart.yogas,
    dasha: dashas,
    nowJd: clock.nowJd,
    notes,
  });

  /**
   * The glossary's live half. Computed here rather than in the browser so a
   * tooltip costs nothing to open — and so the chart maths stays on the
   * server, where the rest of it already is.
   */
  const glossary = glossaryContextFor({
    chart,
    dasha: dashas,
    nowJd: clock.nowJd,
    subject: current.subject.displayName,
  });
  const scopes = buildScopeIndex(chart, { dasha: dashas, nowJd: clock.nowJd });

  const aspects = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const)
    .filter((id) => chart.points[id])
    .flatMap((id) => signsAspectedBy(id, chart.points[id]!.signIndex));

  /**
   * The second aspect engine, computed over the whole stack.
   *
   * Server-side, because a synastry line needs both charts and the server has
   * them both already — and because these are the same longitudes the wheel is
   * drawn from, so the lines and the glyphs cannot disagree.
   *
   * Angles carry no speed. The ascendant moves about 360° a day, so calling one
   * of its aspects "applying" would be arithmetically true and practically
   * meaningless; the engine's no-speed path handles it by widening the orb and
   * declining to claim a direction.
   */
  const aspectRing = (cast: ComputedChart): AspectPoint[] =>
    POINT_DISPLAY_ORDER.filter((id) => cast.points[id]).map((id) => {
      const point = cast.points[id]!;
      const angle = id === 'Ascendant' || id === 'Midheaven';
      return angle
        ? { id, longitude: point.longitude }
        : { id, longitude: point.longitude, speed: point.speed };
    });

  const aspectRings = [aspectRing(chart), ...(overlayChart ? [aspectRing(overlayChart)] : [])];
  const aspectSettings = aspectSettingsOrDefaults(profile.aspectSettings);
  /*
   * Which aspects are switched on, by name.
   *
   * A count would be shorter and would say nothing: two practitioners both
   * running "five aspects" can be running different five. The lens line has to
   * name the rule the lines were drawn by, the same way it names the ayanāṁśa.
   */
  const aspectsOn = ASPECTS.filter((definition) => aspectSettings[definition.id]?.on).map(
    (definition) => definition.name.toLowerCase(),
  );
  const longitudeOf = aspectRings.map(
    (ring) => new Map(ring.map((point) => [point.id, point.longitude])),
  );

  const degreeAspects: WheelDegreeAspect[] = findAspects(aspectRings, aspectSettings).flatMap(
    (found) => {
      const from = longitudeOf[found.fromRing]?.get(found.from);
      const to = longitudeOf[found.toRing]?.get(found.to);
      if (from === undefined || to === undefined) return [];
      return [
        {
          from: found.from,
          to: found.to,
          fromLongitude: from,
          toLongitude: to,
          glyph: found.glyph,
          name: found.name,
          quality: found.quality,
          orb: found.orb,
          applying: found.applying,
          fromRing: found.fromRing,
          toRing: found.toRing,
        },
      ];
    },
  );

  const bhava = bhavaOverlayFor(
    chart.houses.system,
    chart.points.Ascendant!.longitude,
    chart.points.Midheaven!.longitude,
  );

  const roster: MenuPerson[] = withCharts.map((row) => ({
    id: row.subject.id,
    name: row.subject.displayName,
    born: born(row.birthEvent?.localDatetime),
  }));

  /*
   * The panels beside the wheel, inner ring first.
   *
   * Built here because every value on them — the birth line, the Rodden rating,
   * the date a moment stands for — is already resolved on the server, and
   * sending the whole subject record to the browser to re-derive it would be
   * both slower and a leak of birth data the panel does not show.
   */
  const stackLayers: Layer[] = [
    { kind: 'person', id: current.subject.id },
    ...(overlay ? ([{ kind: 'person', id: overlay.subject.id }] as Layer[]) : []),
    ...(overlayFigure ? ([{ kind: 'figure', slug: overlayFigure.slug }] as Layer[]) : []),
  ];

  const transitOffset = Number(transitParam);
  const showsTransits = transitParam !== undefined && Number.isFinite(transitOffset);
  const transitDate = showsTransits
    ? new Date(unixMsFromJd(clock.nowJd + transitOffset)).toISOString().slice(0, 10)
    : null;

  const entries: StackEntry[] = [
    {
      key: `p:${current.subject.id}`,
      kind: 'person',
      title: current.subject.displayName,
      role: 'Natal',
      line: `${current.birthEvent!.localDatetime.replace('T', ' ').slice(0, 16)} · ${current.birthEvent!.placeName}`,
      href: `/people/${current.subject.id}`,
    },
    ...(overlay
      ? [
          {
            key: `p:${overlay.subject.id}`,
            kind: 'person' as const,
            title: overlay.subject.displayName,
            role: 'Second chart',
            line: `${overlay.birthEvent!.localDatetime.replace('T', ' ').slice(0, 16)} · ${overlay.birthEvent!.placeName}`,
            href: `/people/${overlay.subject.id}`,
          },
        ]
      : []),
    ...(overlayFigure
      ? [
          {
            key: `f:${overlayFigure.slug}`,
            kind: 'figure' as const,
            title: overlayFigure.displayName,
            role: 'Library',
            line: `${overlayFigure.birthDate} · ${overlayFigure.placeName}`,
            rating: overlayFigure.rodden,
            href: `/charts/${overlayFigure.slug}`,
          },
        ]
      : []),
    /*
     * The sky only gets a card when the sky is actually on the wheel.
     *
     * An overlaid chart owns the outer ring, and the wheel has one. Listing
     * transits anyway would put a ring on the panel that is nowhere in the
     * drawing — the note under the wheel says why it is off instead.
     */
    ...(transitDate && !overlayChart
      ? [
          {
            key: `t:${transitOffset}`,
            kind: 'moment' as const,
            title: transitOffset === 0 ? 'Today' : transitDate,
            role: 'Transits',
            line: `Sky at ${transitDate}`,
            pinned: true,
          },
        ]
      : []),
  ];

  return (
    <Shell
      email={session.email}
      width="wide"
      subject={{
        id: current.subject.id,
        name: current.subject.displayName,
        kicker: 'The wheel',
      }}
    >
      <GlossaryProvider lines={glossary.lines} scopes={scopes}>
        {/*
          One column of controls, then the wheel.

          Everything that decides what is drawn — the rings in order, the menu
          that adds one, the date the sky is read at — is in the left column, so
          the wheel and the panel that explains it own the rest of the width.
          The wheel comes first in source order so that on a phone, where the
          columns stack, the chart is the thing under the heading rather than a
          screen of choosers.
        */}
        <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="order-2 flex flex-col gap-4 lg:order-1">
            <ChartStackPanels entries={entries} stack={serialiseStack(stackLayers)} />
            <ChartMenu
              people={roster}
              figures={overlayableFigures.map((figure) => ({
                slug: figure.slug,
                name: figure.displayName,
                born: figure.birthDate,
                rodden: figure.rodden,
              }))}
              stack={serialiseStack(stackLayers)}
              /*
               * Whether the sky is *drawn*, not whether `?t=` is in the URL. An
               * overlaid chart owns the only outer ring, so a link carrying
               * both would otherwise have the menu counting a ring the wheel
               * never draws — and reporting three of two.
               */
              transitsOn={showsTransits && !overlayChart}
            />
            <SpacetimeNavigator
              todayIso={new Date(unixMsFromJd(clock.nowJd)).toISOString().slice(0, 10)}
              offsetDays={showsTransits ? transitOffset : 0}
            />
          </div>
          <div className="order-1 min-w-0 lg:order-2">
            <WheelWorkspace
              points={wheelPointsFor(chart)}
              aspects={aspects}
              degreeAspects={degreeAspects}
              overlayPoints={overlayChart ? wheelPointsFor(overlayChart) : []}
              overlayName={overlay?.subject.displayName ?? overlayFigure?.displayName ?? null}
              /*
               * The dashed bhāva ring. In whole sign it is Śrīpati beside the
               * rāśi chart; in any other system it is the chart's own cusps,
               * which no longer sit on the sign boundaries.
               */
              houseCusps={chart.houses.cusps}
              bhavaCusps={bhava?.cusps}
              bhavaLabel={bhava?.label}
              lensMismatch={lensMismatch}
              ascendant={chart.points.Ascendant!.longitude}
              ascendantSign={chart.houses.ascendantSign}
              sarva={chart.ashtakavarga.sarva}
              facts={facts}
              /*
               * The lens says which engine drew the lines, not only which zodiac
               * cast the chart. An aspect line whose rule is unstated is the same
               * failure as an unstated ayanāṁśa — CLAUDE.md #3.
               */
              /*
               * `chart.houses.system`, not the profile's: a chart drawn above
               * the polar circle may not be in the system that was asked for,
               * and the line under the wheel is where that has to be said.
               */
              houseNote={chart.houses.note}
              lens={`${profile.ayanamsa} ayanāṁśa · ${chart.houses.system.replace('_', ' ')} houses · ${profile.nodeType} nodes · whole-sign dṛṣṭi${
                aspectsOn.length > 0 ? ` · by degree: ${aspectsOn.join(', ')}` : ''
              }`}
              timeCaveat={ACCURACY_CAVEAT[current.birthEvent!.timeAccuracy] ?? null}
              transitFrame={{
                ayanamsa: profile.ayanamsa,
                customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
                nodeType: profile.nodeType,
              }}
              scrubberNatal={{
                moonLongitude: chart.points.Moon!.longitude,
                birthJd,
                yearLength: YEAR_LENGTH,
              }}
              todayJd={clock.nowJd}
            />
          </div>
        </div>
      </GlossaryProvider>
    </Shell>
  );
}

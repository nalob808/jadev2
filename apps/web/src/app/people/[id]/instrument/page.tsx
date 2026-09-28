import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  AstronomyEngineProvider,
  POINT_DISPLAY_ORDER,
  jdFromUnixMs,
  kakshaTransitSeries,
  sarvaByContributor,
  signsAspectedBy,
} from '@jade/astro';
import { getSettingsProfile, getSubject, listLifeEvents } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { saturnBand } from '@/lib/saturnBand';
import { Kicker, Shell } from '@/components/Shell';
import { InstrumentWorkspace } from '@/components/InstrumentWorkspace';

export const dynamic = 'force-dynamic';

/**
 * The instrument: every view of one chart, driven by one time cursor and one
 * selection (see `lib/instrument.tsx`).
 *
 * The chart is computed here, on the server, from the stored birth event and
 * the workspace's settings profile — the same `getOrComputeChart` every other
 * page uses, so a degree on this screen is the degree on the chart page. The
 * browser computes only what moves: transits, from the pure core.
 */
export default async function InstrumentPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const database = getDatabase();
  const record = await getSubject(database, session.workspaceId, id);
  if (!record) notFound();
  const { subject, birthEvent } = record;
  if (!birthEvent) notFound();

  const [profile, clock, lifeEvents] = await Promise.all([
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
    getClock(session.workspaceId),
    listLifeEvents(database, session.workspaceId, subject.id),
  ]);
  if (!profile) notFound();

  const { chart } = await getOrComputeChart(session.workspaceId, birthEvent, profile);

  const birthJd = jdFromUnixMs(
    birthEvent.utcDatetime instanceof Date
      ? birthEvent.utcDatetime.getTime()
      : new Date(birthEvent.utcDatetime).getTime(),
  );
  /** Stated, not defaulted (CLAUDE.md #3) — and shown beside the timeline. */
  const YEAR_LENGTH = 'julian' as const;

  /** The daśā timeline's context band — see `lib/saturnBand.ts`. */
  const band = saturnBand(
    birthJd,
    {
      ayanamsa: profile.ayanamsa,
      customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
      nodeType: profile.nodeType,
    },
    chart.ashtakavarga.sarva,
  );

  /**
   * The kakṣā band: Saturn and Jupiter through their 3°45′ divisions, from a
   * year back to three years ahead of today, each cell judged in the graha's
   * own bhinnāṣṭakavarga. Bisected edges; see `transits/kakshaTransit.ts`.
   */
  const kakshaWindow = { fromJd: clock.nowJd - 365, toJd: clock.nowJd + 3 * 365 };
  const kakshaProvider = new AstronomyEngineProvider({ nodeType: profile.nodeType });
  const kakshaRows = (['Saturn', 'Jupiter'] as const).map((subject) => ({
    subject,
    segments: kakshaTransitSeries(
      kakshaProvider,
      subject,
      kakshaWindow,
      {
        ayanamsa: profile.ayanamsa,
        customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
      },
      chart.ashtakavarga,
    ),
  }));

  /**
   * Life events, pinned to the timeline. The brief asks for dated notes, but
   * `notes` has no event date — only `life_events` records when something
   * happened, and with what precision — so that is the table read here.
   */
  const events = lifeEvents
    .filter((event) => event.enabled)
    .map((event) => ({
      id: event.id,
      jd: jdFromUnixMs(Date.parse(`${event.occurredOn}T00:00:00Z`)),
      label: event.kind.replace(/_/g, ' '),
      detail: event.note ?? undefined,
      precision: event.precision as 'day' | 'month' | 'year',
    }))
    .filter((event) => Number.isFinite(event.jd));

  const points = POINT_DISPLAY_ORDER.filter((pointId) => chart.points[pointId]).map((pointId) => {
    const point = chart.points[pointId]!;
    return {
      id: pointId,
      longitude: point.longitude,
      signIndex: point.signIndex,
      degreesInSign: point.degreesInSign,
      house: point.house,
      retrograde: point.retrograde,
      nakshatra: point.nakshatra.name,
      dignity: chart.dignity[pointId] ?? null,
    };
  });

  const aspects = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const)
    .filter((graha) => chart.points[graha])
    .flatMap((graha) => signsAspectedBy(graha, chart.points[graha]!.signIndex));

  return (
    <Shell email={session.email}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>The instrument</Kicker>
          <h1 className="font-display text-4xl">{subject.displayName}</h1>
        </div>
        <Link
          href={`/people/${subject.id}`}
          className="border border-[var(--rule-strong)] px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Full chart page
        </Link>
      </div>

      <InstrumentWorkspace
        todayJd={clock.nowJd}
        natal={{
          points,
          aspects,
          ascendant: chart.points.Ascendant!.longitude,
          ascendantSign: chart.houses.ascendantSign,
          sarva: chart.ashtakavarga.sarva,
          moonLongitude: chart.points.Moon!.longitude,
          birthJd,
          yearLength: YEAR_LENGTH,
        }}
        saturnBand={band}
        bySource={sarvaByContributor(chart.ashtakavarga)}
        kakshaRows={kakshaRows}
        kakshaWindow={kakshaWindow}
        events={events}
        frame={{
          ayanamsa: profile.ayanamsa,
          customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
          nodeType: profile.nodeType,
        }}
        settingsLabel={`${profile.ayanamsa} ayanāṁśa · ${chart.houses.system.replace('_', ' ')} houses · ${profile.nodeType} nodes · Vimśottarī ${YEAR_LENGTH} year`}
      />
    </Shell>
  );
}

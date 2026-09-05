import Link from 'next/link';
import { redirect } from 'next/navigation';
import { POINT_DISPLAY_ORDER, jdFromUnixMs, signsAspectedBy, vimshottari } from '@jade/astro';
import { getSettingsProfile, listNotes, listSubjects } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { buildFocusIndex } from '@/lib/focusIndex';
import { glossaryContextFor } from '@jade/interpret';
import { GlossaryProvider } from '@/components/Glossary';
import { Kicker, Panel, Shell } from '@/components/Shell';
import { WheelWorkspace, type WorkspacePerson } from '@/components/WheelWorkspace';

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
  searchParams: Promise<{ person?: string; overlay?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { person: personParam, overlay: overlayParam } = await searchParams;
  const database = getDatabase();
  const clock = await getClock(session.workspaceId);

  const [people, profile] = await Promise.all([
    listSubjects(database, session.workspaceId),
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
  ]);

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

  const current =
    withCharts.find((row) => row.subject.id === personParam) ??
    withCharts.find((row) => row.subject.relationship === 'self') ??
    withCharts[0]!;

  const overlay =
    overlayParam && overlayParam !== current.subject.id
      ? (withCharts.find((row) => row.subject.id === overlayParam) ?? null)
      : null;

  const { chart } = await getOrComputeChart(session.workspaceId, current.birthEvent!, profile);
  const overlayChart = overlay
    ? (await getOrComputeChart(session.workspaceId, overlay.birthEvent!, profile)).chart
    : null;

  const birthMs =
    current.birthEvent!.utcDatetime instanceof Date
      ? current.birthEvent!.utcDatetime.getTime()
      : new Date(current.birthEvent!.utcDatetime).getTime();
  const dashas = vimshottari(chart.points.Moon!.longitude, jdFromUnixMs(birthMs), { levels: 3 });

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

  const aspects = (['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const)
    .filter((id) => chart.points[id])
    .flatMap((id) => signsAspectedBy(id, chart.points[id]!.signIndex));

  const roster: WorkspacePerson[] = withCharts.map((row) => ({
    id: row.subject.id,
    name: row.subject.displayName,
    born: born(row.birthEvent?.localDatetime),
  }));

  return (
    <Shell email={session.email}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Kicker>The wheel</Kicker>
          <h1 className="font-display text-4xl">{current.subject.displayName}</h1>
        </div>
        <Link
          href={`/people/${current.subject.id}`}
          className="border border-[var(--rule-strong)] px-3 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Full chart page
        </Link>
      </div>

      <GlossaryProvider lines={glossary.lines}>
        <WheelWorkspace
          people={roster}
          currentId={current.subject.id}
          overlayId={overlay?.subject.id ?? null}
          points={wheelPointsFor(chart)}
          aspects={aspects}
          overlayPoints={overlayChart ? wheelPointsFor(overlayChart) : []}
          overlayName={overlay?.subject.displayName ?? null}
          ascendant={chart.points.Ascendant!.longitude}
          ascendantSign={chart.houses.ascendantSign}
          sarva={chart.ashtakavarga.sarva}
          facts={facts}
          lens={`${profile.ayanamsa} ayanāṁśa · ${chart.houses.system.replace('_', ' ')} houses · ${profile.nodeType} nodes`}
          timeCaveat={ACCURACY_CAVEAT[current.birthEvent!.timeAccuracy] ?? null}
        />
      </GlossaryProvider>
    </Shell>
  );
}

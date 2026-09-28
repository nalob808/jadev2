import { notFound, redirect } from 'next/navigation';
import { POINT_DISPLAY_ORDER } from '@jade/astro';
import { getSettingsProfile, getSubject } from '@jade/db';
import { getSession } from '@/lib/auth';
import { getClock } from '@/lib/clock';
import { getDatabase } from '@/lib/db';
import { getOrComputeChart } from '@/lib/chart';
import { Shell } from '@/components/Shell';
import { SphereLens } from '@/components/SphereLens';

export const dynamic = 'force-dynamic';

/**
 * The Sphere lens: the sky at one moment as a 3D sphere, for turning toward a
 * client — "this is where Saturn actually is tonight". A presentation surface,
 * not an analysis one; see docs/10-sphere-spike.md for why, and
 * docs/briefs/17-sphere-to-production.md for how it shipped.
 *
 * The chart comes from the same `getOrComputeChart` as every other lens, in the
 * workspace's own settings — the sphere's stars and grahas are cast in the
 * ayanāṁśa and node type the rest of the app uses, and the page says which.
 * three.js loads only on this route (see `SphereLens`).
 */
export default async function SpherePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  const { id } = await params;
  const database = getDatabase();
  const record = await getSubject(database, session.workspaceId, id);
  if (!record) notFound();
  const { subject, birthEvent } = record;
  if (!birthEvent) notFound();

  const [profile, clock] = await Promise.all([
    getSettingsProfile(database, session.workspaceId, session.settingsProfileId),
    getClock(session.workspaceId),
  ]);
  if (!profile) notFound();

  const { chart } = await getOrComputeChart(session.workspaceId, birthEvent, profile);

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

  return (
    <Shell
      email={session.email}
      subject={{ id: subject.id, name: subject.displayName, kicker: 'The sphere' }}
    >
      <SphereLens
        subjectId={subject.id}
        todayJd={clock.nowJd}
        natal={{
          points,
          ascendant: chart.points.Ascendant!.longitude,
          ascendantSign: chart.houses.ascendantSign,
        }}
        frame={{
          ayanamsa: profile.ayanamsa,
          customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
          nodeType: profile.nodeType,
        }}
        settingsLabel={`${profile.ayanamsa} ayanāṁśa · ${chart.houses.system.replace('_', ' ')} houses · ${profile.nodeType} nodes`}
      />
    </Shell>
  );
}

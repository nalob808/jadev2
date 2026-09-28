import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { POINT_DISPLAY_ORDER, jdFromUnixMs } from '@jade/astro';
import { demoChart } from '@/lib/demoChart';
import { SphereSpike } from '@/components/SphereSpike';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Sphere spike',
  robots: { index: false, follow: false },
};

/**
 * SPIKE — the 3D celestial sphere beside the 2D wheel, for one judgement:
 * does the sphere teach something the wheel does not? See
 * docs/10-sphere-spike.md.
 *
 * Deliberately outside the app shell and off in production. It uses only the
 * public reference chart (the same one the marketing hero draws and the
 * accuracy suite pins), so it touches no workspace, no subject and no birth
 * data. Set JADE_SPIKES=1 to show it on a deployed preview.
 */
export default function SphereSpikePage(): React.ReactElement {
  if (process.env.NODE_ENV === 'production' && process.env.JADE_SPIKES !== '1') notFound();

  const { chart } = demoChart();
  const points = POINT_DISPLAY_ORDER.filter((id) => chart.points[id]).map((id) => {
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

  return (
    <SphereSpike
      natalPoints={points}
      ascendant={chart.points.Ascendant!.longitude}
      ascendantSign={chart.houses.ascendantSign}
      // The page's clock, handed down: the core and the components have none.
      todayJd={jdFromUnixMs(Date.now())}
    />
  );
}

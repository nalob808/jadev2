import { AstronomyEngineProvider, computeChart, ASTRO_VERSION } from '@jade/astro';
import { schemaStatus } from '@jade/db';
import { getDatabase } from '@/lib/db';

/**
 * Liveness, a calculation self-check, and — the one that matters in practice —
 * whether the database schema matches the code that just deployed.
 *
 * A Vercel deploy never touches the database, so a missing migration produces a
 * green build, a green health check, and a site that throws on every signed-in
 * page. This endpoint is the difference between finding that out from a
 * monitor and finding it out from a user.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  const provider = new AstronomyEngineProvider();
  const chart = computeChart(provider, {
    jdUt: 2451545.0,
    location: { latitude: 0, longitude: 0 },
  });
  const sane = chart.points.Sun!.longitude > 0 && chart.points.Sun!.longitude < 360;

  let schema;
  try {
    schema = await schemaStatus(getDatabase());
  } catch (error) {
    schema = { state: 'unknown' as const, detail: (error as Error).message };
  }

  const ok = sane && schema.state !== 'behind';
  return Response.json(
    {
      ok,
      astroVersion: ASTRO_VERSION,
      provider: provider.id,
      precisionClass: provider.precisionClass,
      schema,
    },
    { status: ok ? 200 : 503 },
  );
}

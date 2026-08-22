import { AstronomyEngineProvider, computeChart, ASTRO_VERSION } from '@jade/astro';

/** Liveness plus a calculation self-check — if the ephemeris is broken, say so. */
export async function GET() {
  const provider = new AstronomyEngineProvider();
  const chart = computeChart(provider, {
    jdUt: 2451545.0,
    location: { latitude: 0, longitude: 0 },
  });
  const sane = chart.points.Sun!.longitude > 0 && chart.points.Sun!.longitude < 360;
  return Response.json(
    {
      ok: sane,
      astroVersion: ASTRO_VERSION,
      provider: provider.id,
      precisionClass: provider.precisionClass,
    },
    { status: sane ? 200 : 503 },
  );
}

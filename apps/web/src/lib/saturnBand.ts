import {
  AstronomyEngineProvider,
  sarvaTransitSeries,
  type AyanamsaMode,
  type SarvaTransitSegment,
} from '@jade/astro';

/**
 * Saturn's sign across a lifetime, scored by the natal sarva — the daśā
 * timeline's context band — memoised per chart and frame.
 *
 * A 120-year ingress scan is about 11,000 ephemeris calls: roughly 400 ms,
 * which is fine once and poor on every visit. The result depends on nothing
 * but the birth moment, the frame and the sarva, all of which are in the key,
 * so a cached value can never belong to a different chart or settings profile.
 *
 * The 4-day comb (the scanner's default for Saturn is 2) can miss only a
 * retrograde dip into a sign lasting under four days, which is below a pixel
 * on the band at every zoom the timeline offers. The band is context for the
 * eye; dates Jade states come from the timing screens, not from here.
 */

const CACHE = new Map<string, readonly SarvaTransitSegment[]>();
const CACHE_LIMIT = 256;
const LIFETIME_DAYS = 120 * 365.25;

export function saturnBand(
  birthJd: number,
  frame: {
    readonly ayanamsa: AyanamsaMode;
    readonly customAyanamsaAtJ2000?: number;
    readonly nodeType: 'mean' | 'true';
  },
  sarva: readonly number[],
): readonly SarvaTransitSegment[] {
  const key = [
    birthJd,
    frame.ayanamsa,
    frame.customAyanamsaAtJ2000 ?? '',
    frame.nodeType,
    sarva.join(','),
  ].join('|');
  const hit = CACHE.get(key);
  if (hit) return hit;

  const series = sarvaTransitSeries(
    new AstronomyEngineProvider({ nodeType: frame.nodeType }),
    'Saturn',
    { fromJd: birthJd, toJd: birthJd + LIFETIME_DAYS },
    { ayanamsa: frame.ayanamsa, customAyanamsaAtJ2000: frame.customAyanamsaAtJ2000 },
    sarva,
    { stepDays: 4, toleranceDays: 0.01 },
  );

  if (CACHE.size >= CACHE_LIMIT) CACHE.delete(CACHE.keys().next().value!);
  CACHE.set(key, series);
  return series;
}

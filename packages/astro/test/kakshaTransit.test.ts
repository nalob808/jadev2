import { describe, expect, it } from 'vitest';
import {
  ashtakavarga,
  KAKSHA_SPAN,
  kakshaTransit,
  type SignPlacement,
} from '../src/ashtakavarga.js';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { siderealLongitudeAt, type SiderealFrame } from '../src/transits/scan.js';
import { kakshaTransitSeries } from '../src/transits/kakshaTransit.js';

/**
 * The kakṣā band's time series. The per-longitude judgement (`kakshaTransit`)
 * is held to the JHora-verified BAV sources in `ashtakavarga.test.ts`; here the
 * question is whether the series is a faithful, bisected partition of time.
 */

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: SiderealFrame = { ayanamsa: 'lahiri' };
const PLACEMENT: SignPlacement = {
  Sun: 8,
  Moon: 3,
  Mars: 0,
  Mercury: 8,
  Jupiter: 2,
  Venus: 9,
  Saturn: 10,
  Ascendant: 5,
};
const RESULT = ashtakavarga(PLACEMENT);
// 2023-01-01 to 2025-01-01: Saturn in Aquarius with its 2023 and 2024 stations.
const WINDOW = { fromJd: 2_459_945.5, toJd: 2_460_676.5 };

describe('kakshaTransitSeries', () => {
  const series = kakshaTransitSeries(provider, 'Saturn', WINDOW, frame, RESULT);

  it('partitions the window with no gap and no overlap', () => {
    expect(series[0]!.fromJd).toBe(WINDOW.fromJd);
    expect(series[series.length - 1]!.toJd).toBe(WINDOW.toJd);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i]!.fromJd).toBe(series[i - 1]!.toJd);
      expect(series[i]!.toJd).toBeGreaterThan(series[i]!.fromJd);
    }
  });

  it('names the kakṣā actually occupied, and its BAV flag', () => {
    for (const segment of series) {
      const mid = (segment.fromJd + segment.toJd) / 2;
      const expected = kakshaTransit(
        'Saturn',
        siderealLongitudeAt(provider, 'Saturn', mid, frame),
        RESULT,
      );
      expect([segment.signIndex, segment.kakshaIndex]).toEqual([
        expected.signIndex,
        expected.kakshaIndex,
      ]);
      expect(segment.lord).toBe(expected.lord);
      expect(segment.hasBindu).toBe(expected.hasBindu);
    }
  });

  it('bisects each edge onto a 3°45′ boundary', () => {
    for (const segment of series.slice(1)) {
      const longitude = siderealLongitudeAt(provider, 'Saturn', segment.fromJd, frame);
      const offset = longitude / KAKSHA_SPAN - Math.round(longitude / KAKSHA_SPAN);
      // Saturn moves ~0.13°/day; a 1e-4 day tolerance is ~1e-5 degrees.
      expect(Math.abs(offset * KAKSHA_SPAN)).toBeLessThan(1e-3);
    }
  });

  it('keeps the retrograde loop: some kakṣā is entered more than once', () => {
    const keys = series.map((s) => `${s.signIndex}.${s.kakshaIndex}`);
    expect(new Set(keys).size).toBeLessThan(keys.length);
  });
});

describe('sarvaByContributor', () => {
  it('sums back to the sarva, sign by sign', async () => {
    const { sarvaByContributor, AV_CONTRIBUTORS } = await import('../src/ashtakavarga.js');
    const bySource = sarvaByContributor(RESULT);
    for (let sign = 0; sign < 12; sign += 1) {
      const total = AV_CONTRIBUTORS.reduce((sum, c) => sum + bySource[c][sign]!, 0);
      expect(total).toBe(RESULT.sarva[sign]);
    }
    // No contributor can give one sign more bindus than there are graha tables.
    for (const c of AV_CONTRIBUTORS) expect(Math.max(...bySource[c])).toBeLessThanOrEqual(7);
  });
});

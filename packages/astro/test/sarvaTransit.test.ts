import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { siderealLongitudeAt, type SiderealFrame } from '../src/transits/scan.js';
import { sarvaTransitSeries } from '../src/transits/sarvaTransit.js';

/**
 * The daśā timeline's context band: a transiting graha's sign over time, each
 * stretch scored by the natal sarva. The edges are `findIngresses`, which is
 * already held to Swiss Ephemeris in `transits.test.ts`; what is asserted here
 * is that the series is a faithful partition of the window built from them.
 */

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: SiderealFrame = { ayanamsa: 'lahiri' };
// Any twelve distinct numbers, so a wrong sign cannot carry the right count.
const SARVA = [30, 25, 28, 22, 33, 19, 31, 27, 24, 35, 26, 37];
// 2020-01-01 to 2035-01-01 — Saturn's Capricorn/Aquarius/Pisces years,
// including the 2020 and 2022–23 retrograde re-entries.
const WINDOW = { fromJd: 2_458_849.5, toJd: 2_464_328.5 };

describe('sarvaTransitSeries', () => {
  const series = sarvaTransitSeries(provider, 'Saturn', WINDOW, frame, SARVA);

  it('partitions the window with no gap and no overlap', () => {
    expect(series.length).toBeGreaterThan(3);
    expect(series[0]!.fromJd).toBe(WINDOW.fromJd);
    expect(series[series.length - 1]!.toJd).toBe(WINDOW.toJd);
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i]!.fromJd).toBe(series[i - 1]!.toJd);
    }
  });

  it('names the sign actually occupied, and its bindus', () => {
    for (const segment of series) {
      const mid = (segment.fromJd + segment.toJd) / 2;
      const sign = Math.floor(siderealLongitudeAt(provider, 'Saturn', mid, frame) / 30);
      expect(segment.signIndex).toBe(sign);
      expect(segment.bindus).toBe(SARVA[sign]);
    }
  });

  it('keeps retrograde re-entries as segments of their own', () => {
    expect(series.some((segment) => segment.enteredRetrograde)).toBe(true);
  });

  it('refuses a sarva that is not twelve signs', () => {
    expect(() => sarvaTransitSeries(provider, 'Saturn', WINDOW, frame, [1, 2, 3])).toThrow();
  });
});

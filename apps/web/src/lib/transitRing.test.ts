import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  jdFromUnixMs,
  siderealLongitudeAt,
} from '@jade/astro';
import { transitRing, type RingFrame } from './transitRing.js';

/**
 * The transit ring the scrubber draws.
 *
 * This runs in the browser, which means it is the one piece of calculation in
 * Jade that no server test would otherwise cover. Three things have to hold and
 * all three have been wrong in this codebase before:
 *
 *  - the ring agrees with the core, rather than being a second implementation
 *    that drifts;
 *  - the Sun and Moon are never retrograde (the bug that put an "R" beside the
 *    Sun lived in exactly this sort of derived position list);
 *  - houses are counted from the *natal* ascendant, because the question is
 *    which of this person's houses a transit is crossing.
 */

const frame: RingFrame = { ayanamsa: 'lahiri', nodeType: 'mean' };

/** A fixed instant, so the assertions are reproducible. No clock here. */
const JD = jdFromUnixMs(Date.UTC(2026, 8, 25, 12, 0, 0));

const reference = new AstronomyEngineProvider({ nodeType: 'mean' });
const natal = computeChart(reference, {
  jdUt: 2451545.0,
  location: { latitude: 21.3069, longitude: -157.8583 },
});

describe('the transit ring', () => {
  const ring = transitRing(JD, frame, natal.houses.ascendantSign);

  it('returns the nine moving bodies and no angles', () => {
    expect(ring.map((point) => point.id)).toEqual([
      'Sun',
      'Moon',
      'Mars',
      'Mercury',
      'Jupiter',
      'Venus',
      'Saturn',
      'Rahu',
      'Ketu',
    ]);
  });

  it('agrees with the core about where each body is', () => {
    for (const point of ring) {
      const expected = siderealLongitudeAt(reference, point.id as 'Sun', JD, {
        ayanamsa: 'lahiri',
      });
      expect(point.longitude, point.id).toBeCloseTo(expected, 9);
      expect(point.signIndex, point.id).toBe(Math.floor(expected / 30));
      expect(point.degreesInSign, point.id).toBeCloseTo(expected - point.signIndex * 30, 9);
      expect(point.longitude, point.id).toBeGreaterThanOrEqual(0);
      expect(point.longitude, point.id).toBeLessThan(360);
    }
  });

  it('never reports the Sun or the Moon retrograde', () => {
    expect(ring.find((point) => point.id === 'Sun')!.retrograde).toBe(false);
    expect(ring.find((point) => point.id === 'Moon')!.retrograde).toBe(false);
  });

  it('reports the mean nodes retrograde, because they are', () => {
    expect(ring.find((point) => point.id === 'Rahu')!.retrograde).toBe(true);
    expect(ring.find((point) => point.id === 'Ketu')!.retrograde).toBe(true);
  });

  it('counts houses from the natal ascendant, not from the transit', () => {
    for (const point of ring) {
      const expected = ((point.signIndex - natal.houses.ascendantSign + 12) % 12) + 1;
      expect(point.house, point.id).toBe(expected);
      expect(point.house).toBeGreaterThanOrEqual(1);
      expect(point.house).toBeLessThanOrEqual(12);
    }
  });

  it('moves the slow bodies by about the right amount over a year', () => {
    const later = transitRing(JD + 365.25, frame, natal.houses.ascendantSign);
    const saturnNow = ring.find((point) => point.id === 'Saturn')!.longitude;
    const saturnThen = later.find((point) => point.id === 'Saturn')!.longitude;
    // Saturn covers roughly 12° of zodiac a year. Wrapped, because the pair can
    // straddle 0° Aries.
    const moved = ((saturnThen - saturnNow + 540) % 360) - 180;
    expect(moved).toBeGreaterThan(8);
    expect(moved).toBeLessThan(16);
  });

  it('is a pure function of its arguments', () => {
    const again = transitRing(JD, frame, natal.houses.ascendantSign);
    expect(again).toEqual(ring);
  });

  /**
   * The scrubber refuses an ayanāṁśa Jade has not fitted, loudly.
   *
   * `AyanamsaMode` declares eight modes and only `lahiri` has a fitted
   * polynomial; the rest throw. That is a real gap, and this test pins the
   * behaviour rather than papering over it: the failure has to stay a thrown
   * error, because the alternative — falling back to Lahiri — would draw a ring
   * in the wrong zodiac under a label saying otherwise, which is the exact
   * silent default the constitution forbids (#3).
   *
   * When the remaining fits land, this test should start failing. That is the
   * signal to delete it.
   */
  it('throws rather than substituting a zodiac it cannot compute', () => {
    expect(() =>
      transitRing(JD, { ...frame, ayanamsa: 'raman' }, natal.houses.ascendantSign),
    ).toThrow(/not yet fitted/i);
  });
});

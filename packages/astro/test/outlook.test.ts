import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { panchangaNow, skyNow, skyOutlook } from '../src/outlook.js';
import type { SiderealFrame } from '../src/transits/scan.js';

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: SiderealFrame = { ayanamsa: 'lahiri' };

// A fixed date, because the whole point of this module is that "now" is an
// argument. A test that used a clock would drift and fail on some future day.
const FROM = 2460000.5; // 2023-02-24

const outlook = skyOutlook(provider, FROM, frame, { days: 7 });

describe('skyOutlook', () => {
  it('returns one row per day', () => {
    expect(outlook.days).toHaveLength(7);
    expect(outlook.days.map((d) => d.offset)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('every day names a real sign and nakṣatra', () => {
    for (const day of outlook.days) {
      expect(day.moonSign.length).toBeGreaterThan(2);
      expect(day.moonSignIndex).toBeGreaterThanOrEqual(0);
      expect(day.moonSignIndex).toBeLessThan(12);
      expect(day.moonNakshatra.length).toBeGreaterThan(2);
      expect(day.tithi.index).toBeGreaterThanOrEqual(1);
      expect(day.tithi.index).toBeLessThanOrEqual(30);
    }
  });

  // The Moon covers a sign in about 2.3 days, so a week must contain changes.
  it('flags the days the Moon changes sign', () => {
    const changes = outlook.days.filter((d) => d.moonChangesSign).length;
    expect(changes).toBeGreaterThanOrEqual(2);
    expect(changes).toBeLessThanOrEqual(4);
  });

  it('the Moon actually moves through the week', () => {
    const signs = new Set(outlook.days.map((d) => d.moonSignIndex));
    expect(signs.size).toBeGreaterThan(2);
  });

  it('events are exact instants inside the window, sorted', () => {
    for (const list of [outlook.ingresses, outlook.stations]) {
      for (const event of list) {
        expect(event.jdUt).toBeGreaterThanOrEqual(outlook.window.fromJd);
        expect(event.jdUt).toBeLessThanOrEqual(outlook.window.toJd);
      }
      const times = list.map((e) => e.jdUt);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  // Reporting the Moon's ingresses beside Saturn's would bury the one that
  // matters under the one that happens every other day.
  it('does not report Moon ingresses among the slow events', () => {
    expect(outlook.ingresses.some((i) => i.body === 'Moon')).toBe(false);
  });

  it('clamps an absurd window rather than scanning forever', () => {
    expect(skyOutlook(provider, FROM, frame, { days: 9999 }).days.length).toBe(31);
    expect(skyOutlook(provider, FROM, frame, { days: 0 }).days.length).toBe(1);
  });

  it('is deterministic for the same moment', () => {
    const again = skyOutlook(provider, FROM, frame, { days: 7 });
    expect(again.days.map((d) => d.moonNakshatra)).toEqual(
      outlook.days.map((d) => d.moonNakshatra),
    );
  });
});

describe('skyNow', () => {
  const sky = skyNow(provider, FROM, frame);

  it('places all nine grahas', () => {
    expect(sky).toHaveLength(9);
    expect(sky.map((p) => p.id)).toContain('Rahu');
    expect(sky.map((p) => p.id)).toContain('Ketu');
  });

  it('degrees stay inside their sign', () => {
    for (const point of sky) {
      expect(point.degreesInSign).toBeGreaterThanOrEqual(0);
      expect(point.degreesInSign).toBeLessThan(30);
      expect(point.longitude).toBeGreaterThanOrEqual(0);
      expect(point.longitude).toBeLessThan(360);
    }
  });

  // The nodes are always retrograde by construction, never by measurement.
  it('always marks the nodes retrograde', () => {
    expect(sky.find((p) => p.id === 'Rahu')!.retrograde).toBe(true);
    expect(sky.find((p) => p.id === 'Ketu')!.retrograde).toBe(true);
  });

  it('puts Rāhu and Ketu exactly opposite', () => {
    const rahu = sky.find((p) => p.id === 'Rahu')!.longitude;
    const ketu = sky.find((p) => p.id === 'Ketu')!.longitude;
    const separation = (((ketu - rahu) % 360) + 360) % 360;
    expect(Math.abs(separation - 180)).toBeLessThan(0.001);
  });
});

describe('panchangaNow', () => {
  it('gives the five limbs without needing a chart', () => {
    const p = panchangaNow(provider, FROM, frame);
    expect(p.tithi.name.length).toBeGreaterThan(2);
    expect(p.nakshatra.name.length).toBeGreaterThan(2);
    expect(p.yoga.name.length).toBeGreaterThan(2);
    expect(p.karana.name.length).toBeGreaterThan(2);
    expect(p.elongation).toBeGreaterThanOrEqual(0);
    expect(p.elongation).toBeLessThan(360);
  });

  it('returns a null vāra rather than guessing when sunrise is unknown', () => {
    expect(panchangaNow(provider, FROM, frame, null).vara).toBeNull();
  });
});

/**
 * Sampling at the reader's local midnight rather than at midnight UT.
 *
 * `packages/astro` has no zone database and must not grow one — non-negotiable
 * #2. So the caller resolves the midnights and hands them over, and what is
 * tested here is that the window honours them exactly, including days that are
 * not 24 hours long.
 */
describe('skyOutlook with explicit day starts', () => {
  // Seven local midnights in Honolulu, which is UTC−10 all year: 10:00Z.
  const HAWAII_MIDNIGHTS = Array.from({ length: 7 }, (_, i) => FROM + 10 / 24 + i);

  const zoned = skyOutlook(provider, FROM, frame, { dayStartsJd: HAWAII_MIDNIGHTS });

  it('samples exactly where it was told to', () => {
    expect(zoned.days.map((d) => d.jdUt)).toEqual([...HAWAII_MIDNIGHTS]);
    expect(zoned.days).toHaveLength(7);
  });

  it('takes its length from the array rather than from `days`', () => {
    const three = skyOutlook(provider, FROM, frame, {
      days: 7,
      dayStartsJd: HAWAII_MIDNIGHTS.slice(0, 3),
    });
    expect(three.days).toHaveLength(3);
  });

  it('reports a different sky than the UT-midnight window', () => {
    // Ten hours of Moon motion is about 5°, so at least one row must differ.
    // If this ever passes trivially the two windows are the same window.
    const differing = zoned.days.filter(
      (d, i) => Math.abs(d.moonLongitude - outlook.days[i]!.moonLongitude) > 1,
    );
    expect(differing.length).toBeGreaterThan(0);
  });

  it('measures each day against the next start, not a fixed 24 hours', () => {
    // A 25-hour day, as a fall-back gives. The change flags for the first row
    // must be computed over the real span.
    const uneven = [FROM, FROM + 25 / 24, FROM + 2];
    const result = skyOutlook(provider, FROM, frame, { dayStartsJd: uneven });
    expect(result.days.map((d) => d.jdUt)).toEqual(uneven);
    expect(result.window.toJd).toBeCloseTo(FROM + 3, 9);
  });

  it('covers the last sampled day in the event window', () => {
    // An ingress on the final day must not fall outside the scan range.
    expect(zoned.window.toJd).toBeGreaterThan(zoned.days[6]!.jdUt);
  });
});

describe('DayOutlook carries what personal techniques need', () => {
  it('exposes the Moon longitude, not just its label', () => {
    for (const day of outlook.days) {
      expect(day.moonLongitude).toBeGreaterThanOrEqual(0);
      expect(day.moonLongitude).toBeLessThan(360);
      // The label must actually describe the number it sits beside.
      expect(day.moonSignIndex).toBe(Math.floor(day.moonLongitude / 30));
    }
  });

  it('says when the Moon crosses a nakṣatra boundary during the day', () => {
    // The Moon covers about 13° a day and a nakṣatra is 13°20′, so over a
    // week this must happen most days — and the successor must be named.
    const crossing = outlook.days.filter((d) => d.moonChangesNakshatra);
    expect(crossing.length).toBeGreaterThan(3);
    for (const day of crossing) {
      expect(day.moonNakshatraNext).not.toBe(day.moonNakshatra);
      expect(day.moonNakshatraNext.length).toBeGreaterThan(2);
    }
    for (const day of outlook.days.filter((d) => !d.moonChangesNakshatra)) {
      expect(day.moonNakshatraNext).toBe(day.moonNakshatra);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatCoordinates,
  formatOffset,
  localMeanTimeOffset,
  manualOffset,
  normalizePlaceQuery,
  offsetWarning,
  rankPlaces,
  resolveOffset,
  toUtcMillis,
  type Place,
} from '../src/index.js';

/**
 * Time is where astrology software quietly fails. Every case below is a real
 * situation a birth certificate can produce, and each one has a defined,
 * visible answer rather than a silent guess.
 */

describe('ordinary times resolve cleanly', () => {
  it('India, which has never observed daylight saving', () => {
    const r = resolveOffset(
      { year: 1987, month: 6, day: 21, hour: 10, minute: 10 },
      'Asia/Kolkata',
    );
    expect(r.offsetMinutes).toBe(330);
    expect(r.ambiguous).toBe(false);
    expect(r.confidence).toBe('high');
    expect(r.source).toBe('tzdb');
  });

  it('Nepal, on a 45-minute offset', () => {
    const r = resolveOffset({ year: 2001, month: 4, day: 2, hour: 8, minute: 0 }, 'Asia/Kathmandu');
    expect(r.offsetMinutes).toBe(345);
    expect(r.ambiguous).toBe(false);
  });

  it('the v0 reference chart — Ann Arbor, 7 Nov 2001, 10:32 EST', () => {
    const local = { year: 2001, month: 11, day: 7, hour: 10, minute: 32 };
    const r = resolveOffset(local, 'America/Detroit');
    expect(r.offsetMinutes).toBe(-300);
    expect(r.ambiguous).toBe(false);
    // The instant the whole test suite in @jade/astro is pinned to.
    expect(toUtcMillis(local, r.offsetMinutes)).toBe(Date.UTC(2001, 10, 7, 15, 32));
  });

  it('summer time resolves to the daylight offset', () => {
    const r = resolveOffset(
      { year: 2023, month: 7, day: 1, hour: 12, minute: 0 },
      'America/New_York',
    );
    expect(r.offsetMinutes).toBe(-240);
    expect(r.ambiguous).toBe(false);
  });
});

describe('the hour that happens twice', () => {
  it('US fall-back: 01:30 on 5 Nov 2023 occurred in both EDT and EST', () => {
    const r = resolveOffset(
      { year: 2023, month: 11, day: 5, hour: 1, minute: 30 },
      'America/New_York',
    );
    expect(r.ambiguous).toBe(true);
    expect(r.note).toBe('dst-fall-back');
    // First occurrence wins, matching every other package.
    expect(r.offsetMinutes).toBe(-240);
    expect(r.alternativeOffsetMinutes).toBe(-300);
    expect(offsetWarning(r)).toContain('happened twice');
  });

  it('UK fall-back: 01:30 on 29 Oct 2023', () => {
    const r = resolveOffset(
      { year: 2023, month: 10, day: 29, hour: 1, minute: 30 },
      'Europe/London',
    );
    expect(r.ambiguous).toBe(true);
    expect(r.note).toBe('dst-fall-back');
    expect(r.offsetMinutes).toBe(60);
    expect(r.alternativeOffsetMinutes).toBe(0);
  });

  it('one minute either side of the repeated hour is not ambiguous', () => {
    const before = resolveOffset(
      { year: 2023, month: 11, day: 5, hour: 0, minute: 30 },
      'America/New_York',
    );
    const after = resolveOffset(
      { year: 2023, month: 11, day: 5, hour: 2, minute: 30 },
      'America/New_York',
    );
    expect(before.ambiguous).toBe(false);
    expect(after.ambiguous).toBe(false);
    expect(before.offsetMinutes).toBe(-240);
    expect(after.offsetMinutes).toBe(-300);
  });
});

describe('the hour that never happened', () => {
  it('US spring-forward: 02:30 on 12 Mar 2023 does not exist', () => {
    const r = resolveOffset(
      { year: 2023, month: 3, day: 12, hour: 2, minute: 30 },
      'America/New_York',
    );
    expect(r.ambiguous).toBe(true);
    expect(r.note).toBe('dst-gap');
    expect(offsetWarning(r)).toContain('never occurred');
    // Still yields a usable instant rather than throwing.
    expect(
      Number.isFinite(
        toUtcMillis({ year: 2023, month: 3, day: 12, hour: 2, minute: 30 }, r.offsetMinutes),
      ),
    ).toBe(true);
  });

  it('01:30 and 03:30 that morning are both fine', () => {
    expect(
      resolveOffset({ year: 2023, month: 3, day: 12, hour: 1, minute: 30 }, 'America/New_York')
        .ambiguous,
    ).toBe(false);
    expect(
      resolveOffset({ year: 2023, month: 3, day: 12, hour: 3, minute: 30 }, 'America/New_York')
        .ambiguous,
    ).toBe(false);
  });
});

describe('old dates are flagged, not hidden', () => {
  it('pre-1970 is best-effort, per IANA itself', () => {
    const r = resolveOffset(
      { year: 1955, month: 4, day: 12, hour: 6, minute: 15 },
      'America/Chicago',
    );
    expect(r.confidence).toBe('best-effort');
    expect(r.note).toBe('pre-1970');
    expect(r.ambiguous).toBe(false); // informational, not a blocker
    expect(offsetWarning(r)).toContain('best-effort');
  });

  it('pre-standard-time gets the stronger note', () => {
    const r = resolveOffset({ year: 1881, month: 4, day: 3, hour: 13, minute: 0 }, 'Europe/London');
    expect(r.confidence).toBe('best-effort');
    expect(r.note).toBe('pre-standard-time');
  });

  it('modern dates carry no note at all', () => {
    const r = resolveOffset({ year: 2010, month: 1, day: 1, hour: 12, minute: 0 }, 'Asia/Tokyo');
    expect(r.note).toBeUndefined();
    expect(r.confidence).toBe('high');
  });
});

describe('the escape hatches', () => {
  it('Local Mean Time is four minutes per degree', () => {
    expect(localMeanTimeOffset(0).offsetMinutes).toBe(0);
    expect(localMeanTimeOffset(72.8777).offsetMinutes).toBe(292);
    expect(localMeanTimeOffset(-83.743).offsetMinutes).toBe(-335);
    expect(localMeanTimeOffset(10).source).toBe('lmt');
  });

  it('a manual offset is trusted without comment', () => {
    const r = manualOffset(-330);
    expect(r).toMatchObject({ offsetMinutes: -330, source: 'manual', ambiguous: false });
    expect(offsetWarning(r)).toBe('');
  });

  it('rejects a zone that does not exist rather than defaulting to UTC', () => {
    expect(() =>
      resolveOffset({ year: 2000, month: 1, day: 1, hour: 0, minute: 0 }, 'Mars/Olympus'),
    ).toThrow(/not a valid IANA time zone/);
  });
});

describe('formatting the way a chart reads', () => {
  it('offsets', () => {
    expect(formatOffset(330)).toBe('+05:30');
    expect(formatOffset(-300)).toBe('-05:00');
    expect(formatOffset(0)).toBe('+00:00');
    expect(formatOffset(345)).toBe('+05:45');
  });

  it('coordinates', () => {
    expect(formatCoordinates(19.076, 72.8777)).toBe('19°05′N 72°53′E');
    expect(formatCoordinates(-33.8688, 151.2093)).toBe('33°52′S 151°13′E');
    expect(formatCoordinates(42.2808, -83.743)).toBe('42°17′N 83°45′W');
  });
});

describe('place search', () => {
  const places: Place[] = [
    {
      id: '1',
      name: 'Springfield',
      countryCode: 'US',
      admin1: 'IL',
      latitude: 39.8,
      longitude: -89.6,
      timezoneId: 'America/Chicago',
      population: 116250,
    },
    {
      id: '2',
      name: 'Springfield',
      countryCode: 'US',
      admin1: 'MA',
      latitude: 42.1,
      longitude: -72.6,
      timezoneId: 'America/New_York',
      population: 155929,
    },
    {
      id: '3',
      name: 'São Paulo',
      countryCode: 'BR',
      latitude: -23.5,
      longitude: -46.6,
      timezoneId: 'America/Sao_Paulo',
      population: 10021295,
    },
    {
      id: '4',
      name: 'Springs',
      countryCode: 'ZA',
      latitude: -26.2,
      longitude: 28.4,
      timezoneId: 'Africa/Johannesburg',
      population: 156000,
    },
  ];

  it('folds diacritics and case', () => {
    expect(normalizePlaceQuery('São Paulo')).toBe('sao paulo');
    expect(normalizePlaceQuery('  ST. PETERSBURG ')).toBe('st petersburg');
    expect(rankPlaces(places, 'sao paulo')[0]!.id).toBe('3');
  });

  it('exact beats prefix, and population breaks the tie', () => {
    const results = rankPlaces(places, 'Springfield');
    expect(results.map((p) => p.id)).toEqual(['2', '1']);
  });

  it('a prefix match never loses to a bigger substring match', () => {
    const results = rankPlaces(places, 'spring');
    expect(
      results
        .map((p) => p.id)
        .slice(0, 3)
        .sort(),
    ).toEqual(['1', '2', '4']);
  });

  it('returns nothing rather than guessing', () => {
    expect(rankPlaces(places, 'zzzz')).toEqual([]);
  });
});

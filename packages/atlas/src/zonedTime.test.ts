import { describe, expect, it } from 'vitest';
import {
  UnknownZoneError,
  addZonedDays,
  formatZoned,
  isValidZone,
  startOfZonedDay,
  zoneAbbreviation,
  zoneCityLabel,
  zoneOffsetAt,
  zonedCivil,
  zonedDayDifference,
} from './zonedTime.js';

/**
 * These tests are mostly about one bug: computing "today" in the server's zone
 * rather than the reader's. Hawaii is the sharpest case in the codebase — it
 * is ten hours behind UTC and does not observe daylight saving, so the failure
 * is a clean, permanent ten-hour window rather than an intermittent one.
 */

// 2026-08-25T04:00:00Z — 6pm on the 24th in Honolulu.
const EVENING_IN_HAWAII = Date.UTC(2026, 7, 25, 4, 0, 0);

describe('zoneOffsetAt', () => {
  it('reads Hawaii at ten hours behind, year round', () => {
    expect(zoneOffsetAt('Pacific/Honolulu', Date.UTC(2026, 0, 15))).toBe(-600);
    expect(zoneOffsetAt('Pacific/Honolulu', Date.UTC(2026, 6, 15))).toBe(-600);
  });

  it('follows daylight saving where it is observed', () => {
    expect(zoneOffsetAt('America/New_York', Date.UTC(2026, 0, 15))).toBe(-300);
    expect(zoneOffsetAt('America/New_York', Date.UTC(2026, 6, 15))).toBe(-240);
  });

  it('handles a half-hour zone', () => {
    expect(zoneOffsetAt('Asia/Kolkata', EVENING_IN_HAWAII)).toBe(330);
  });

  it('refuses a zone it does not know rather than falling back', () => {
    expect(() => zoneOffsetAt('Pacific/Atlantis', EVENING_IN_HAWAII)).toThrow(UnknownZoneError);
  });
});

describe('startOfZonedDay', () => {
  it('is the local midnight, not the UT one', () => {
    const start = startOfZonedDay(EVENING_IN_HAWAII, 'Pacific/Honolulu');
    // Midnight on the 24th in Honolulu is 10:00Z on the 24th.
    expect(start).toBe(Date.UTC(2026, 7, 24, 10, 0, 0));
  });

  it('puts the reader on the day they are actually living', () => {
    // This is the bug, stated as a test. At this instant it is the 25th in
    // UTC and still the 24th in Honolulu.
    expect(zonedCivil(EVENING_IN_HAWAII, 'UTC').day).toBe(25);
    expect(zonedCivil(EVENING_IN_HAWAII, 'Pacific/Honolulu').day).toBe(24);
  });

  it('is idempotent', () => {
    const once = startOfZonedDay(EVENING_IN_HAWAII, 'Asia/Tokyo');
    expect(startOfZonedDay(once, 'Asia/Tokyo')).toBe(once);
  });
});

describe('addZonedDays', () => {
  it('lands on local midnight across a spring-forward boundary', () => {
    // US clocks went forward at 2am on 2026-03-08, so that local day is 23
    // hours long. Adding a fixed 86,400,000ms to its midnight overshoots into
    // 01:00 the next morning — which is exactly the drift this guards.
    const before = startOfZonedDay(Date.UTC(2026, 2, 8, 18), 'America/New_York');
    const after = addZonedDays(before, 'America/New_York', 1);
    const civil = zonedCivil(after, 'America/New_York');
    expect([civil.month, civil.day, civil.hour]).toEqual([3, 9, 0]);
    expect(after - before).toBe(23 * 3_600_000);
    expect(zonedCivil(before + 86_400_000, 'America/New_York').hour).toBe(1);
  });

  it('lands on local midnight across a fall-back boundary', () => {
    // Clocks went back at 2am on 2026-11-01: a 25-hour local day.
    const before = startOfZonedDay(Date.UTC(2026, 10, 1, 12), 'America/New_York');
    const after = addZonedDays(before, 'America/New_York', 1);
    const civil = zonedCivil(after, 'America/New_York');
    expect([civil.month, civil.day, civil.hour]).toEqual([11, 2, 0]);
    expect(after - before).toBe(25 * 3_600_000);
  });

  it('walks a week without drifting off midnight', () => {
    let cursor = startOfZonedDay(EVENING_IN_HAWAII, 'Pacific/Honolulu');
    for (let i = 0; i < 7; i += 1) {
      expect(zonedCivil(cursor, 'Pacific/Honolulu').hour, `day ${i}`).toBe(0);
      cursor = addZonedDays(cursor, 'Pacific/Honolulu', 1);
    }
  });
});

describe('zonedDayDifference', () => {
  it('counts calendar days in the reader zone, not elapsed hours', () => {
    const monday6pm = EVENING_IN_HAWAII;
    const tuesday1am = monday6pm + 7 * 3_600_000;
    // Seven hours apart, but a different local day.
    expect(zonedDayDifference(monday6pm, tuesday1am, 'Pacific/Honolulu')).toBe(1);
    // In UTC both instants are already the 25th.
    expect(zonedDayDifference(monday6pm, tuesday1am, 'UTC')).toBe(0);
  });

  it('is zero for the same day and negative going backwards', () => {
    expect(zonedDayDifference(EVENING_IN_HAWAII, EVENING_IN_HAWAII, 'UTC')).toBe(0);
    const yesterday = addZonedDays(EVENING_IN_HAWAII, 'UTC', -1);
    expect(zonedDayDifference(EVENING_IN_HAWAII, yesterday, 'UTC')).toBe(-1);
  });
});

describe('formatZoned', () => {
  it('formats in the requested zone regardless of the ambient one', () => {
    const opts = { weekday: 'long', month: 'long', day: 'numeric' } as const;
    expect(formatZoned(EVENING_IN_HAWAII, 'Pacific/Honolulu', opts)).toBe('Monday, August 24');
    expect(formatZoned(EVENING_IN_HAWAII, 'UTC', opts)).toBe('Tuesday, August 25');
  });

  it('cannot have its zone overridden by the options object', () => {
    const sneaky = { timeZone: 'UTC' } as Intl.DateTimeFormatOptions;
    expect(formatZoned(EVENING_IN_HAWAII, 'Pacific/Honolulu', sneaky as never)).toContain('8/24');
  });
});

describe('labels', () => {
  it('names the zone the way a reader would recognise it', () => {
    expect(zoneAbbreviation('Pacific/Honolulu', EVENING_IN_HAWAII)).toBe('HST');
    expect(zoneCityLabel('America/Los_Angeles')).toBe('Los Angeles');
    expect(zoneCityLabel('UTC')).toBe('UTC');
  });

  it('validates', () => {
    expect(isValidZone('Pacific/Honolulu')).toBe(true);
    expect(isValidZone('Middle/Earth')).toBe(false);
  });
});

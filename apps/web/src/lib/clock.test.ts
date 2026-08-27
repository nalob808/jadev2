import { describe, expect, it } from 'vitest';
import { FALLBACK_ZONE, makeClock, stamp } from './clock.js';

/**
 * The bug this module exists to kill, stated as tests.
 *
 * A reader in Hawaii at 6pm on Monday. In UTC it is already Tuesday, and every
 * date the app rendered came out a day ahead — including which day the daily
 * reading was composed for.
 */
const MONDAY_6PM_HAWAII = Date.UTC(2026, 7, 24, 4 + 24, 0, 0); // 2026-08-25T04:00Z

describe('makeClock', () => {
  it('renders the reader’s day, not the server’s', () => {
    const hawaii = makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII);
    const server = makeClock('UTC', MONDAY_6PM_HAWAII);

    expect(hawaii.format(MONDAY_6PM_HAWAII, { weekday: 'long' })).toBe('Monday');
    expect(server.format(MONDAY_6PM_HAWAII, { weekday: 'long' })).toBe('Tuesday');
  });

  it('labels the zone so a date is never bare', () => {
    expect(makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII).abbreviation).toBe('HST');
    expect(makeClock('Asia/Kolkata', MONDAY_6PM_HAWAII).abbreviation).toBe('GMT+5:30');
    expect(stamp(makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII), MONDAY_6PM_HAWAII)).toBe(
      'Monday, August 24, 2026 · HST',
    );
  });

  it('falls back to UTC and admits it, rather than guessing a zone', () => {
    for (const bad of [null, '', 'Middle/Earth']) {
      const clock = makeClock(bad, MONDAY_6PM_HAWAII);
      expect(clock.zoneId).toBe(FALLBACK_ZONE);
      expect(clock.assumed, `"${bad}" should be flagged as assumed`).toBe(true);
    }
    expect(makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII).assumed).toBe(false);
  });

  it('reads the clock once and carries the instant', () => {
    const clock = makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII);
    expect(clock.nowMs).toBe(MONDAY_6PM_HAWAII);
    // Julian Day of 2026-08-25T04:00Z.
    expect(clock.nowJd).toBeCloseTo(2461277.6666667, 5);
  });
});

describe('dayLabel', () => {
  const clock = makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII);

  it('names today, tomorrow and yesterday by the reader’s calendar', () => {
    expect(clock.dayLabel(MONDAY_6PM_HAWAII)).toBe('Today');
    expect(clock.dayLabel(clock.addDays(MONDAY_6PM_HAWAII, 1))).toBe('Tomorrow');
    expect(clock.dayLabel(clock.addDays(MONDAY_6PM_HAWAII, -1))).toBe('Yesterday');
    expect(clock.dayLabel(clock.addDays(MONDAY_6PM_HAWAII, 3))).toBe('Thursday');
  });

  it('rolls over at local midnight, not at midnight UT', () => {
    // 8am the same Monday morning in Honolulu — ten hours before "now", and
    // unambiguously the same day the reader is living in.
    const mondayMorning = MONDAY_6PM_HAWAII - 10 * 3_600_000;
    expect(clock.dayLabel(mondayMorning)).toBe('Today');

    // The old behaviour, kept as a test so the regression is legible: a server
    // formatting in UTC has already rolled over to Tuesday, so it files the
    // reader's own Monday morning under yesterday.
    expect(makeClock('UTC', MONDAY_6PM_HAWAII).dayLabel(mondayMorning)).toBe('Yesterday');
  });

  it('keeps a late local evening on today’s side of the line', () => {
    // 11pm Monday in Honolulu is already 09:00 Tuesday in UTC.
    const lateMonday = MONDAY_6PM_HAWAII + 5 * 3_600_000;
    expect(clock.dayLabel(lateMonday)).toBe('Today');
    expect(clock.format(lateMonday, { weekday: 'long', day: 'numeric' })).toBe('24 Monday');
  });
});

describe('dayStartsJd', () => {
  it('starts at the reader’s midnight', () => {
    const clock = makeClock('Pacific/Honolulu', MONDAY_6PM_HAWAII);
    const [first] = clock.dayStartsJd(7);
    // Midnight Monday in Honolulu is 10:00Z, a Julian Day ending in .916…
    expect(first).toBeCloseTo(2461276.9166667, 5);
  });

  it('returns one entry per day, strictly increasing', () => {
    const days = makeClock('America/New_York', MONDAY_6PM_HAWAII).dayStartsJd(7);
    expect(days).toHaveLength(7);
    for (let i = 1; i < days.length; i += 1) {
      expect(days[i]!).toBeGreaterThan(days[i - 1]!);
    }
  });

  it('stays on local midnight across a daylight-saving change', () => {
    // The week containing 2026-11-01, when US clocks go back.
    const clock = makeClock('America/New_York', Date.UTC(2026, 9, 30, 12));
    const starts = clock.dayStartsJd(7);
    const gaps = starts.slice(1).map((jd, i) => Math.round((jd - starts[i]!) * 24));
    // Six gaps, one of which is the 25-hour day. Adding a fixed day would
    // give seven 24s and silently drift the samples an hour off midnight.
    expect(gaps).toEqual([24, 24, 25, 24, 24, 24]);
  });
});

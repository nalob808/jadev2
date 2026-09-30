import { describe, expect, it } from 'vitest';
import { daysBetween, isRealDate, isoOf, readableDate, stepDate } from './spacetime';

describe('stepping the moment', () => {
  it('steps days and weeks', () => {
    expect(stepDate('2026-09-29', 1, 'day')).toBe('2026-09-30');
    expect(stepDate('2026-09-29', -1, 'day')).toBe('2026-09-28');
    expect(stepDate('2026-09-29', 2, 'week')).toBe('2026-10-13');
  });

  it('steps calendar months, not thirty days', () => {
    expect(stepDate('2026-01-15', 1, 'month')).toBe('2026-02-15');
    expect(stepDate('2026-01-15', 3, 'month')).toBe('2026-04-15');
    expect(stepDate('2026-12-15', 1, 'month')).toBe('2027-01-15');
    expect(stepDate('2026-01-15', -1, 'month')).toBe('2025-12-15');
  });

  /*
   * One month on from 31 January is 28 February. Without the clamp it rolls to
   * 3 March, and stepping forward then back no longer comes home — the kind of
   * bug somebody meets once and stops trusting the control.
   */
  it('clamps to the end of a shorter month', () => {
    expect(stepDate('2026-01-31', 1, 'month')).toBe('2026-02-28');
    expect(stepDate('2026-03-31', -1, 'month')).toBe('2026-02-28');
    expect(stepDate('2026-05-31', 1, 'month')).toBe('2026-06-30');
  });

  it('knows which Februaries have twenty-nine days', () => {
    expect(stepDate('2024-01-31', 1, 'month')).toBe('2024-02-29');
    expect(stepDate('2024-02-29', 1, 'year')).toBe('2025-02-28');
    expect(stepDate('2100-01-31', 1, 'month')).toBe('2100-02-28'); // not a leap year
  });

  it('steps years', () => {
    expect(stepDate('2026-09-29', 1, 'year')).toBe('2027-09-29');
    expect(stepDate('2026-09-29', -10, 'year')).toBe('2016-09-29');
  });

  it('does nothing on a zero step', () => {
    for (const unit of ['day', 'week', 'month', 'year'] as const) {
      expect(stepDate('2026-09-29', 0, unit), unit).toBe('2026-09-29');
    }
  });
});

describe('turning dates into the offset the URL carries', () => {
  it('counts whole days', () => {
    expect(daysBetween('2026-09-29', '2026-09-30')).toBe(1);
    expect(daysBetween('2026-09-29', '2026-09-29')).toBe(0);
    expect(daysBetween('2026-09-30', '2026-09-29')).toBe(-1);
  });

  it('counts across a month and a leap day', () => {
    expect(daysBetween('2026-01-31', '2026-02-28')).toBe(28);
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });

  /* Stepping a month and converting to days must land on the same date. */
  it('round-trips a month step through the offset', () => {
    const today = '2026-09-29';
    const target = stepDate(today, 1, 'month');
    expect(isoOf(Date.parse(`${today}T00:00:00Z`) + daysBetween(today, target) * 86_400_000)).toBe(
      target,
    );
  });
});

describe('saying where it landed', () => {
  it('writes a date in words', () => {
    expect(readableDate('2026-09-29')).toBe('29 September 2026');
    expect(readableDate('2027-01-01')).toBe('1 January 2027');
  });

  it('knows a real date from a plausible one', () => {
    expect(isRealDate('2026-09-29')).toBe(true);
    expect(isRealDate('2024-02-29')).toBe(true);
    expect(isRealDate('2026-02-30')).toBe(false);
    expect(isRealDate('2026-13-01')).toBe(false);
    expect(isRealDate('29-09-2026')).toBe(false);
    expect(isRealDate('')).toBe(false);
  });
});

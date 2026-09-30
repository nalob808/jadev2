/**
 * Moving the transit moment by calendar steps.
 *
 * The wheel already has a slider covering ten years either way, which is good
 * for sweeping and bad for arriving: "take me to next March" is not a gesture.
 * This is the other control — step by a whole number of days, weeks, months or
 * years, or type a date.
 *
 * Everything here is pure and works in dates, then converts to the day offset
 * the URL carries (`?t=`), because calendar arithmetic is not day arithmetic. A
 * month is 28 to 31 days and a year is 365 or 366, so "one month on from 31
 * January" has to be computed on the calendar and turned into days afterwards,
 * not approximated as +30.
 */

export type StepUnit = 'day' | 'week' | 'month' | 'year';

export const STEP_UNITS: readonly StepUnit[] = ['day', 'week', 'month', 'year'];

const DAY_MS = 86_400_000;

/** `YYYY-MM-DD` for a UTC millisecond stamp. */
export function isoOf(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Midnight UTC on an ISO date, as milliseconds. */
export function msOf(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

/**
 * Add whole calendar steps to a date.
 *
 * Month and year steps clamp to the end of the target month, which is the
 * convention every calendar uses: one month on from 31 January is 28 February,
 * not 3 March. Without the clamp, stepping forward then back would not return
 * you to where you started, and a stepper that does not come home is a bug
 * somebody notices a month later.
 */
export function stepDate(iso: string, amount: number, unit: StepUnit): string {
  const start = new Date(msOf(iso));
  if (unit === 'day') return isoOf(start.getTime() + amount * DAY_MS);
  if (unit === 'week') return isoOf(start.getTime() + amount * 7 * DAY_MS);

  const months = unit === 'month' ? amount : amount * 12;
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth() + months;
  const day = start.getUTCDate();

  const target = new Date(Date.UTC(year, month, 1));
  /* Day 0 of the following month is the last day of this one. */
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return isoOf(target.getTime());
}

/** Whole days from one date to another, which is what `?t=` carries. */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((msOf(toIso) - msOf(fromIso)) / DAY_MS);
}

/** A date written in words, for the control to say where it has landed. */
export function readableDate(iso: string): string {
  const date = new Date(msOf(iso));
  const month = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ][date.getUTCMonth()];
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

/** `YYYY-MM-DD`, and a date that exists — 2026-02-30 parses and is not a day. */
export function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const ms = msOf(iso);
  return !Number.isNaN(ms) && isoOf(ms) === iso;
}

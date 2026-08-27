import { DateTime, IANAZone } from 'luxon';

/**
 * Civil time in a named zone.
 *
 * `timezone.ts` above answers the birth-record question: given a wall clock
 * reading and a place, what instant was that? This module answers the opposite
 * and much more mundane question the app asks on every page: given an instant,
 * what does the clock say *where the reader is standing*?
 *
 * It exists because the alternative is `toLocaleDateString(undefined, …)`,
 * which on a server component reads the *server's* zone. In development that
 * is the developer's laptop and everything looks right. In production it is
 * UTC, and for a reader in Hawaii the dashboard calls it Tuesday from 2pm
 * Monday onward — the date is wrong for ten hours of every day, the "today"
 * row of a week strip is tomorrow's, and a daily reading is computed for a day
 * the reader has not reached yet.
 *
 * That class of bug does not announce itself. It looks like a rendering
 * quirk and it is actually the whole page being computed for the wrong day, so
 * every function here takes its zone explicitly and none of them fall back to
 * the ambient one.
 */

/** A zone Jade could not make sense of. Callers show the reader, never guess. */
export class UnknownZoneError extends Error {
  constructor(public readonly zoneId: string) {
    super(`'${zoneId}' is not a valid IANA time zone`);
    this.name = 'UnknownZoneError';
  }
}

export function isValidZone(zoneId: string): boolean {
  return IANAZone.isValidZone(zoneId);
}

function zoned(unixMs: number, zoneId: string): DateTime {
  if (!isValidZone(zoneId)) throw new UnknownZoneError(zoneId);
  return DateTime.fromMillis(unixMs, { zone: zoneId });
}

/** Offset from UTC in minutes at a given instant, honouring DST. */
export function zoneOffsetAt(zoneId: string, unixMs: number): number {
  return zoned(unixMs, zoneId).offset;
}

/**
 * The instant local midnight began, for the day containing `unixMs`.
 *
 * This is the number the whole dashboard hinges on. `Math.floor(jd - 0.5) +
 * 0.5` gives midnight *UT*, which is a different day for most of the planet
 * for part of every day.
 */
export function startOfZonedDay(unixMs: number, zoneId: string): number {
  return zoned(unixMs, zoneId).startOf('day').toMillis();
}

/**
 * Add whole days in the reader's zone.
 *
 * Not `+ n * 86_400_000`. Across a daylight-saving boundary a day is 23 or 25
 * hours long, and adding fixed milliseconds drifts the week strip an hour off
 * local midnight — which quietly moves a sample across a tithi boundary and
 * changes what the row says.
 */
export function addZonedDays(unixMs: number, zoneId: string, days: number): number {
  return zoned(unixMs, zoneId).plus({ days }).toMillis();
}

/** Whole days between the local midnights containing each instant. */
export function zonedDayDifference(fromMs: number, toMs: number, zoneId: string): number {
  const from = zoned(startOfZonedDay(fromMs, zoneId), zoneId);
  const to = zoned(startOfZonedDay(toMs, zoneId), zoneId);
  return Math.round(to.diff(from, 'days').days);
}

export interface ZonedCivil {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** 1 = Monday, 7 = Sunday, as ISO counts them. */
  readonly weekday: number;
  readonly offsetMinutes: number;
  readonly zoneId: string;
}

export function zonedCivil(unixMs: number, zoneId: string): ZonedCivil {
  const dt = zoned(unixMs, zoneId);
  return {
    year: dt.year,
    month: dt.month,
    day: dt.day,
    hour: dt.hour,
    minute: dt.minute,
    second: dt.second,
    weekday: dt.weekday,
    offsetMinutes: dt.offset,
    zoneId,
  };
}

/**
 * Format an instant in a zone.
 *
 * `Intl.DateTimeFormat` options, with `timeZone` forced — passing the zone
 * rather than relying on the ambient one is the entire point, so it is not
 * overridable from `options`.
 */
export function formatZoned(
  unixMs: number,
  zoneId: string,
  options: Omit<Intl.DateTimeFormatOptions, 'timeZone'> = {},
  locale = 'en-US',
): string {
  if (!isValidZone(zoneId)) throw new UnknownZoneError(zoneId);
  return new Intl.DateTimeFormat(locale, { ...options, timeZone: zoneId }).format(new Date(unixMs));
}

/**
 * The short zone name a reader recognises — "HST", "GMT+5:30".
 *
 * Shown wherever a date is, because a time with no zone on it is the thing
 * that makes people mistrust software like this.
 */
export function zoneAbbreviation(zoneId: string, unixMs: number): string {
  const dt = zoned(unixMs, zoneId);
  return dt.toFormat('ZZZZ');
}

/** "Pacific/Honolulu" → "Honolulu". For a settings label. */
export function zoneCityLabel(zoneId: string): string {
  const tail = zoneId.split('/').pop() ?? zoneId;
  return tail.replace(/_/g, ' ');
}

/**
 * Every zone the runtime knows, for a settings picker.
 *
 * `Intl.supportedValuesOf` is Node 18+ and present in every browser Jade
 * targets, but it is still feature-detected — a settings page that throws is a
 * worse outcome than a shorter list.
 */
export function availableZones(): readonly string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
  if (typeof intl.supportedValuesOf === 'function') {
    try {
      return intl.supportedValuesOf('timeZone');
    } catch {
      /* fall through */
    }
  }
  return FALLBACK_ZONES;
}

/** A short list that covers most readers when the runtime will not enumerate. */
export const FALLBACK_ZONES: readonly string[] = [
  'Pacific/Honolulu',
  'America/Anchorage',
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Lagos',
  'Africa/Nairobi',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Kathmandu',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

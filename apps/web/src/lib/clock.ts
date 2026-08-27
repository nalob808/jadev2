import {
  addZonedDays,
  formatZoned,
  isValidZone,
  startOfZonedDay,
  zoneAbbreviation,
  zoneCityLabel,
  zonedDayDifference,
} from '@jade/atlas';
import { jdFromUnixMs } from '@jade/astro';
import { getHomeZone } from '@jade/db';
import { getDatabase } from './db.js';

/**
 * The practice's wall clock.
 *
 * Every date this app renders used to go through `toLocaleDateString(undefined,
 * …)`, which reads the *server's* zone. On a laptop that is the developer's own
 * zone and everything looks right; on Vercel it is UTC. For a reader in Hawaii
 * that meant the header called it Tuesday from 2pm Monday onward, the "Today"
 * column of the week strip was tomorrow's row, and the daily reading was
 * composed for a day they had not reached — ten hours out of every twenty-four,
 * permanently, with nothing on screen to suggest anything was wrong.
 *
 * So no page formats a date directly any more. A page resolves a `Clock` once,
 * from the workspace's stored zone, and every date on it goes through that.
 *
 * When no zone has been set the clock is UTC and `assumed` is true, and the UI
 * says so with a link to fix it. That is the same rule the astrology settings
 * follow: an unset value is a question, not licence to pick a plausible one.
 */

export const FALLBACK_ZONE = 'UTC';

export interface Clock {
  readonly zoneId: string;
  /** True when nobody has chosen a zone and this is the UTC fallback. */
  readonly assumed: boolean;
  /** The instant this clock was read, in milliseconds. Read exactly once. */
  readonly nowMs: number;
  /** Julian Day of `nowMs`. */
  readonly nowJd: number;
  /** "HST", "GMT+5:30" — shown beside dates so a time is never bare. */
  readonly abbreviation: string;
  /** "Honolulu" — for a settings label. */
  readonly cityLabel: string;

  format(unixMs: number, options?: Omit<Intl.DateTimeFormatOptions, 'timeZone'>): string;
  /** Milliseconds at the start of the local day containing `unixMs`. */
  startOfDay(unixMs: number): number;
  /** DST-safe day arithmetic — a local day is not always 24 hours. */
  addDays(unixMs: number, days: number): number;
  /** Whole local days from today. 0 is today, 1 tomorrow, −1 yesterday. */
  daysFromToday(unixMs: number): number;
  /** 'Today' / 'Tomorrow' / 'Yesterday' / a weekday name. */
  dayLabel(unixMs: number): string;
  /** Julian Day of the local midnights starting today, for the week strip. */
  dayStartsJd(count: number): number[];
}

export function makeClock(zoneId: string | null, nowMs: number): Clock {
  const assumed = !zoneId || !isValidZone(zoneId);
  const zone = assumed ? FALLBACK_ZONE : zoneId!;

  const clock: Clock = {
    zoneId: zone,
    assumed,
    nowMs,
    nowJd: jdFromUnixMs(nowMs),
    abbreviation: zoneAbbreviation(zone, nowMs),
    cityLabel: zoneCityLabel(zone),

    format: (unixMs, options = {}) => formatZoned(unixMs, zone, options),
    startOfDay: (unixMs) => startOfZonedDay(unixMs, zone),
    addDays: (unixMs, days) => addZonedDays(unixMs, zone, days),
    daysFromToday: (unixMs) => zonedDayDifference(nowMs, unixMs, zone),

    dayLabel: (unixMs) => {
      const delta = zonedDayDifference(nowMs, unixMs, zone);
      if (delta === 0) return 'Today';
      if (delta === 1) return 'Tomorrow';
      if (delta === -1) return 'Yesterday';
      return formatZoned(unixMs, zone, { weekday: 'long' });
    },

    dayStartsJd: (count) => {
      // Walked one local midnight at a time rather than by adding whole days
      // to the first, so a 23- or 25-hour daylight-saving day does not push
      // every later sample an hour off midnight.
      const out: number[] = [];
      let cursor = startOfZonedDay(nowMs, zone);
      for (let i = 0; i < count; i += 1) {
        out.push(jdFromUnixMs(cursor));
        cursor = addZonedDays(cursor, zone, 1);
      }
      return out;
    },
  };

  return clock;
}

/**
 * The clock for the signed-in workspace.
 *
 * `nowMs` is taken here, once per page, and carried on the returned object —
 * which is what keeps a page from reading the clock in six places and
 * rendering six subtly different moments. Everything downstream is a pure
 * function of it.
 */
export async function getClock(workspaceId: string, nowMs = Date.now()): Promise<Clock> {
  const zoneId = await getHomeZone(getDatabase(), workspaceId);
  return makeClock(zoneId, nowMs);
}

/** A date and its zone, for the one line under a heading. */
export function stamp(clock: Clock, unixMs: number): string {
  return `${clock.format(unixMs, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })} · ${clock.abbreviation}`;
}

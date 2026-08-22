import { IANAZone } from 'luxon';
import type { LocalDateTime, ResolvedOffset } from './types.js';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

/**
 * IANA's own documentation states that pre-1970 data is best-effort and is
 * known to be wrong for many locations. That is precisely the era most birth
 * charts fall in, so Jade surfaces it rather than pretending otherwise.
 */
export const TZDB_GUARANTEED_FROM_YEAR = 1970;

/**
 * Standard time was adopted region by region through the late 1800s. Before
 * that, clocks ran on local mean time and any zone answer is a reconstruction.
 */
export const STANDARD_TIME_ERA_FROM_YEAR = 1884;

function wallClockAsUtcMs(local: LocalDateTime): number {
  return Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second ?? 0,
  );
}

/**
 * Resolve a wall-clock time in a named zone to a UTC offset.
 *
 * The algorithm is the standard two-candidate check, and it is worth spelling
 * out because getting it wrong is the most common bug in astrology software:
 *
 *  1. Take the wall time as if it were UTC.
 *  2. Read the zone's offset a day either side. Those are the only two
 *     offsets that can apply.
 *  3. A candidate offset `o` is self-consistent when the instant it implies
 *     (`wall - o`) is itself in offset `o`.
 *  4. Two self-consistent candidates means the clock read that time twice —
 *     a daylight-saving fall-back. One means an ordinary time. Zero means the
 *     clocks jumped over it and the time never existed.
 *
 * Nothing here guesses silently: cases 2 and 4 come back with `ambiguous:
 * true` and a note the UI turns into a "check this" badge.
 */
export function resolveOffset(local: LocalDateTime, zoneId: string): ResolvedOffset {
  const zone = IANAZone.create(zoneId);
  if (!zone.isValid) {
    throw new Error(`resolveOffset: '${zoneId}' is not a valid IANA time zone`);
  }

  const wall = wallClockAsUtcMs(local);
  const dayBefore = zone.offset(wall - MS_PER_DAY);
  const dayAfter = zone.offset(wall + MS_PER_DAY);

  const candidates = dayBefore === dayAfter ? [dayBefore] : [dayBefore, dayAfter];
  const selfConsistent = candidates.filter(
    (offset) => zone.offset(wall - offset * MS_PER_MINUTE) === offset,
  );

  const confidence =
    local.year < TZDB_GUARANTEED_FROM_YEAR ? ('best-effort' as const) : ('high' as const);
  const eraNote =
    local.year < STANDARD_TIME_ERA_FROM_YEAR
      ? ('pre-standard-time' as const)
      : local.year < TZDB_GUARANTEED_FROM_YEAR
        ? ('pre-1970' as const)
        : undefined;

  // Two valid readings: the clock showed this time twice. Convention across
  // every major package is to take the first (pre-transition) occurrence,
  // which is the larger offset. We take it too — and say so.
  if (selfConsistent.length === 2) {
    const earlier = Math.max(selfConsistent[0]!, selfConsistent[1]!);
    const later = Math.min(selfConsistent[0]!, selfConsistent[1]!);
    return {
      offsetMinutes: earlier,
      alternativeOffsetMinutes: later,
      source: 'tzdb',
      ambiguous: true,
      confidence,
      note: 'dst-fall-back',
      zoneId,
    };
  }

  // No valid reading: the clocks sprang forward over this wall time. Resolve
  // by carrying the pre-transition offset, which lands just after the jump,
  // and flag it.
  if (selfConsistent.length === 0) {
    const instant = wall - dayBefore * MS_PER_MINUTE;
    return {
      offsetMinutes: zone.offset(instant),
      alternativeOffsetMinutes: dayAfter,
      source: 'tzdb',
      ambiguous: true,
      confidence,
      note: 'dst-gap',
      zoneId,
    };
  }

  const result: ResolvedOffset = {
    offsetMinutes: selfConsistent[0]!,
    source: 'tzdb',
    ambiguous: false,
    confidence,
    zoneId,
  };
  return eraNote ? { ...result, note: eraNote } : result;
}

/**
 * Local Mean Time — the sun-based clock every place ran on before standard
 * time, at four minutes per degree of longitude. For a nineteenth-century
 * birth this is often closer to the truth than any zone name.
 */
export function localMeanTimeOffset(longitude: number, zoneId = 'LMT'): ResolvedOffset {
  return {
    offsetMinutes: Math.round(longitude * 4),
    source: 'lmt',
    ambiguous: false,
    confidence: 'best-effort',
    note: 'pre-standard-time',
    zoneId,
  };
}

/** An offset the user typed in themselves. Trusted, never second-guessed. */
export function manualOffset(offsetMinutes: number, zoneId = 'manual'): ResolvedOffset {
  return { offsetMinutes, source: 'manual', ambiguous: false, confidence: 'high', zoneId };
}

/** The UTC instant a local time refers to, given a resolved offset. */
export function toUtcMillis(local: LocalDateTime, offsetMinutes: number): number {
  return wallClockAsUtcMs(local) - offsetMinutes * MS_PER_MINUTE;
}

/** "+05:30", "−08:00" — the form astrologers write on a chart. */
export function formatOffset(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const total = Math.abs(offsetMinutes);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** One sentence for the UI badge. Empty string when there is nothing to say. */
export function offsetWarning(resolved: ResolvedOffset): string {
  switch (resolved.note) {
    case 'dst-fall-back':
      return `The clocks went back that night, so this time happened twice. Jade used ${formatOffset(
        resolved.offsetMinutes,
      )}; the other reading is ${formatOffset(resolved.alternativeOffsetMinutes ?? 0)}.`;
    case 'dst-gap':
      return `The clocks sprang forward over this time, so it never occurred as written. Jade resolved it to ${formatOffset(
        resolved.offsetMinutes,
      )} — worth checking the birth record.`;
    case 'pre-1970':
      return 'Time zone data before 1970 is best-effort and is wrong for some places. Worth confirming against the birth record.';
    case 'pre-standard-time':
      return resolved.source === 'lmt'
        ? 'Using Local Mean Time from the longitude, as clocks ran before standard time.'
        : 'This predates standard time in most regions; Local Mean Time may be more faithful.';
    default:
      return '';
  }
}

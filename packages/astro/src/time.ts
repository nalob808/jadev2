/**
 * Time conversions. Nothing here reads the clock — every function takes its
 * instant as an argument. See CLAUDE.md, non-negotiable #2.
 */

export const J2000 = 2451545.0;
export const JULIAN_CENTURY_DAYS = 36525;

/** Julian Day from a UTC instant expressed as milliseconds since the epoch. */
export function jdFromUnixMs(unixMs: number): number {
  return unixMs / 86400000 + 2440587.5;
}

export function unixMsFromJd(jd: number): number {
  return (jd - 2440587.5) * 86400000;
}

/**
 * Julian Day (UT) from a civil date and a UTC offset in minutes.
 * `offsetMinutes` is what the clock on the wall was ahead of UTC — the sign
 * convention astrologers use on a birth certificate (IST = +330).
 */
export function jdFromCivil(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  offsetMinutes: number,
): number {
  const dayFraction = (hour * 3600 + minute * 60 + second) / 86400 - offsetMinutes / 1440;
  return gregorianToJd(year, month, day) + dayFraction;
}

/** Gregorian calendar date at 00:00 UT to Julian Day. Meeus ch. 7. */
export function gregorianToJd(year: number, month: number, day: number): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

export interface CivilDate {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Inverse of gregorianToJd, including the time of day. Meeus ch. 7. */
export function jdToCivilUtc(jd: number): CivilDate {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayWithFraction = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayWithFraction);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  let rest = (dayWithFraction - day) * 24;
  const hour = Math.floor(rest);
  rest = (rest - hour) * 60;
  const minute = Math.floor(rest);
  const second = (rest - minute) * 60;
  return { year, month, day, hour, minute, second };
}

/** Julian centuries of TT from J2000. */
export function centuriesFromJ2000(jdTt: number): number {
  return (jdTt - J2000) / JULIAN_CENTURY_DAYS;
}

/**
 * ΔT = TT − UT, in seconds. Espenak & Meeus polynomial set, which is what
 * NASA publishes and what most astrology software agrees with to well under a
 * second for modern dates.
 *
 * The swisseph provider uses Swiss Ephemeris's own ΔT instead; this exists so
 * the astronomy-engine provider is self-contained.
 */
export function deltaTSeconds(jdUt: number): number {
  const { year, month } = jdToCivilUtc(jdUt);
  const y = year + (month - 0.5) / 12;

  if (y < 1600) {
    // Coarse historical fallback; Jade flags pre-1600 charts as low confidence.
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (y < 1700) {
    const t = y - 1600;
    return 120 - 0.9808 * t - 0.01532 * t * t + (t * t * t) / 7129;
  }
  if (y < 1800) {
    const t = y - 1700;
    return (
      8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t * t * t - (t * t * t * t) / 1174000
    );
  }
  if (y < 1860) {
    const t = y - 1800;
    return (
      13.72 -
      0.332447 * t +
      0.0068612 * t * t +
      0.0041116 * t ** 3 -
      0.00037436 * t ** 4 +
      0.0000121272 * t ** 5 -
      0.0000001699 * t ** 6 +
      0.000000000875 * t ** 7
    );
  }
  if (y < 1900) {
    const t = y - 1860;
    return (
      7.62 +
      0.5737 * t -
      0.251754 * t * t +
      0.01680668 * t ** 3 -
      0.0004473624 * t ** 4 +
      t ** 5 / 233174
    );
  }
  if (y < 1920) {
    const t = y - 1900;
    return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4;
  }
  if (y < 1941) {
    const t = y - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t * t + 0.0020936 * t ** 3;
  }
  if (y < 1961) {
    const t = y - 1950;
    return 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  }
  if (y < 1986) {
    const t = y - 1975;
    return 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  }
  if (y < 2005) {
    const t = y - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t * t +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (y < 2050) {
    const t = y - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t * t;
  }
  if (y < 2150) {
    const u = (y - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }
  const u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}

/** Terrestrial Time Julian Day from a UT Julian Day. */
export function jdTtFromJdUt(jdUt: number): number {
  return jdUt + deltaTSeconds(jdUt) / 86400;
}

/** Angle helpers. Every angle in Jade is degrees unless the name says otherwise. */

export const DEG = Math.PI / 180;
export const ARCSEC = 1 / 3600;

/** Normalise to [0, 360). */
export function norm360(x: number): number {
  const r = x % 360;
  return r < 0 ? r + 360 : r;
}

/** Signed difference in (-180, 180]. Use this for every angular comparison. */
export function wrap180(x: number): number {
  const r = norm360(x);
  return r > 180 ? r - 360 : r;
}

/** Shortest absolute separation between two longitudes, in [0, 180]. */
export function separation(a: number, b: number): number {
  return Math.abs(wrap180(a - b));
}

export function sinDeg(x: number): number {
  return Math.sin(x * DEG);
}

export function cosDeg(x: number): number {
  return Math.cos(x * DEG);
}

export function tanDeg(x: number): number {
  return Math.tan(x * DEG);
}

export function atan2Deg(y: number, x: number): number {
  return Math.atan2(y, x) / DEG;
}

export interface Dms {
  readonly deg: number;
  readonly min: number;
  readonly sec: number;
}

export function toDms(x: number): Dms {
  const a = Math.abs(x);
  let deg = Math.floor(a);
  let min = Math.floor((a - deg) * 60);
  let sec = ((a - deg) * 60 - min) * 60;
  if (sec >= 59.9995) {
    sec = 0;
    min += 1;
  }
  if (min >= 60) {
    min = 0;
    deg += 1;
  }
  return { deg: Math.sign(x) < 0 ? -deg : deg, min, sec };
}

/** "12°34'56" — the format every astrologer expects. */
export function formatDms(x: number, secondDecimals = 0): string {
  const { deg, min, sec } = toDms(x);
  return `${deg}°${String(min).padStart(2, '0')}′${sec.toFixed(secondDecimals).padStart(secondDecimals ? 3 + secondDecimals : 2, '0')}″`;
}

/** Position within a sign, as astrologers write it: 12°34' Leo. */
export function formatSignPosition(longitude: number, signNames: readonly string[]): string {
  const l = norm360(longitude);
  const signIndex = Math.floor(l / 30);
  const { deg, min } = toDms(l - signIndex * 30);
  return `${deg}°${String(min).padStart(2, '0')}′ ${signNames[signIndex]}`;
}

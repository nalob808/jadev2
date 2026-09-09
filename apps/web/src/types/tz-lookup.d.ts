/**
 * `tz-lookup` ships no types.
 *
 * It resolves a coordinate to the IANA zone that governs it, offline, against
 * bundled boundary data — which is what `/api/timezone` needs so that nobody
 * has to type "Pacific/Honolulu" from memory.
 */
declare module 'tz-lookup' {
  /** The IANA zone governing a coordinate. Throws for an invalid one. */
  export default function tzlookup(latitude: number, longitude: number): string;
}

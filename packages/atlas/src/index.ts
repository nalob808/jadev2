/**
 * Phase 2: GeoNames place search and historical timezone resolution.
 *
 * The contract this package must honour (docs/01-architecture.md, "Atlas and
 * time"): resolution never guesses silently.
 */
export interface ResolvedOffset {
  readonly offsetMinutes: number;
  readonly source: 'tzdb' | 'manual' | 'lmt';
  /** True when the civil time is ambiguous — a DST fall-back hour, wartime
   * double DST, or a pre-standard-time date the tz database does not cover
   * reliably. The UI must show a "verify this time" badge, never a guess. */
  readonly ambiguous: boolean;
}

export type TimeAccuracy = 'exact' | 'min5' | 'min30' | 'hour2' | 'unknown';

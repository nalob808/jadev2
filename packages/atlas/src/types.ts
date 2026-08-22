/** How precisely the birth time is known. Drives the confidence band on the ascendant. */
export type TimeAccuracy = 'exact' | 'min5' | 'min30' | 'hour2' | 'unknown';

/** Minutes of uncertainty each accuracy level implies, for the UI's confidence band. */
export const TIME_ACCURACY_MINUTES: Record<TimeAccuracy, number> = {
  exact: 0,
  min5: 5,
  min30: 30,
  hour2: 120,
  unknown: 720,
};

/** Where a UTC offset came from. Always stored alongside the offset itself. */
export type OffsetSource = 'tzdb' | 'manual' | 'lmt';

/**
 * Why a resolved offset needs the user's eyes.
 *
 *  - `dst-fall-back`   the wall time happened twice; we picked the first.
 *  - `dst-gap`         the wall time never happened; clocks jumped over it.
 *  - `pre-1970`        IANA's own data is best-effort before 1970.
 *  - `pre-standard-time` before the region adopted standard time at all.
 */
export type OffsetNote = 'dst-fall-back' | 'dst-gap' | 'pre-1970' | 'pre-standard-time';

export interface ResolvedOffset {
  /** Minutes ahead of UTC. IST is +330. */
  readonly offsetMinutes: number;
  readonly source: OffsetSource;
  /**
   * True only when the civil time is genuinely undecidable from the clock
   * alone — the user must confirm. Never set merely because the date is old;
   * that is `confidence`.
   */
  readonly ambiguous: boolean;
  /** 'best-effort' means the zone database itself does not guarantee this. */
  readonly confidence: 'high' | 'best-effort';
  readonly note?: OffsetNote;
  /** The other plausible offset when `ambiguous` — what the UI offers as the alternative. */
  readonly alternativeOffsetMinutes?: number;
  readonly zoneId: string;
}

/** A civil date and time exactly as written on a birth certificate. */
export interface LocalDateTime {
  readonly year: number;
  /** 1–12. */
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second?: number;
}

export interface Place {
  readonly id: string;
  readonly geonameId?: number;
  readonly name: string;
  readonly admin1?: string;
  readonly countryCode: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly elevationM?: number;
  readonly timezoneId: string;
  readonly population?: number;
}

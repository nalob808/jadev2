import type { EphemerisProvider } from '../ephemeris/provider.js';
import {
  KAKSHA_SPAN,
  kakshaTransit,
  type AshtakavargaResult,
  type AvContributor,
  type AvSubject,
} from '../ashtakavarga.js';
import { siderealLongitudeAt, type ScanWindow, type SiderealFrame } from './scan.js';

/**
 * A slow graha's passage through the kakṣās, as a time series.
 *
 * Each sign divides into eight kakṣās of 3°45′, each owned by one aṣṭakavarga
 * contributor (`KAKSHA_LORDS`). A transit is favourable while the graha sits in
 * a kakṣā whose lord gave a bindu to that sign in the graha's *own*
 * bhinnāṣṭakavarga. This is the finest-grained transit timing the technique
 * offers, and until now only Jagannātha Hora graphed it.
 *
 * Segment edges are bisected, not sampled: the absolute kakṣā index
 * (0–95 around the zodiac) is stepped coarsely and every change is narrowed to
 * `toleranceDays`. A retrograde graha re-crosses a boundary and each crossing
 * is its own edge — a band that smoothed a station away would claim months in
 * the wrong kakṣā.
 */

export interface KakshaSegment {
  readonly subject: AvSubject;
  readonly fromJd: number;
  readonly toJd: number;
  readonly signIndex: number;
  /** 0–7 inside the sign. */
  readonly kakshaIndex: number;
  readonly lord: AvContributor;
  /** Whether the lord gave this sign a bindu in the subject's own BAV. */
  readonly hasBindu: boolean;
}

export interface KakshaScanOptions {
  /** Coarse step. Must be shorter than the quickest kakṣā passage. */
  readonly stepDays?: number;
  readonly toleranceDays?: number;
}

/**
 * Coarse steps per graha. A kakṣā is 3.75°; Mars at its fastest (about 0.8°/day)
 * crosses one in under five days, so its comb is half a day. Jupiter and
 * Saturn never exceed about 0.25°/day and 0.13°/day.
 */
const DEFAULT_STEP: Record<AvSubject, number> = {
  Sun: 0.5,
  Moon: 0.05,
  Mars: 0.5,
  Mercury: 0.25,
  Jupiter: 2,
  Venus: 0.25,
  Saturn: 3,
};

export function kakshaTransitSeries(
  provider: EphemerisProvider,
  subject: AvSubject,
  window: ScanWindow,
  frame: SiderealFrame,
  result: AshtakavargaResult,
  options: KakshaScanOptions = {},
): KakshaSegment[] {
  if (!(window.toJd > window.fromJd)) throw new Error('kakshaTransitSeries: empty window');
  const step = options.stepDays ?? DEFAULT_STEP[subject];
  const tolerance = options.toleranceDays ?? 1e-4;

  const longitudeAt = (jd: number): number => siderealLongitudeAt(provider, subject, jd, frame);
  const cellAt = (jd: number): number => Math.floor(longitudeAt(jd) / KAKSHA_SPAN) % 96;

  const out: KakshaSegment[] = [];
  let fromJd = window.fromJd;
  let cell = cellAt(fromJd);

  const push = (toJd: number): void => {
    const position = kakshaTransit(subject, cell * KAKSHA_SPAN + KAKSHA_SPAN / 2, result);
    out.push({
      subject,
      fromJd,
      toJd,
      signIndex: position.signIndex,
      kakshaIndex: position.kakshaIndex,
      lord: position.lord,
      hasBindu: position.hasBindu,
    });
  };

  // Walk forward. Each pass either advances a whole step inside one cell or
  // consumes exactly one boundary, so the loop always terminates.
  let t = fromJd;
  while (t < window.toJd) {
    const u = Math.min(t + step, window.toJd);
    if (cellAt(u) === cell) {
      t = u;
      continue;
    }
    // `low` is always still in `cell`, `high` never is.
    let low = t;
    let high = u;
    for (let i = 0; i < 200 && high - low > tolerance; i += 1) {
      const mid = (low + high) / 2;
      if (cellAt(mid) === cell) low = mid;
      else high = mid;
    }
    push(high);
    fromJd = high;
    cell = cellAt(high);
    t = high;
  }
  push(window.toJd);
  return out;
}

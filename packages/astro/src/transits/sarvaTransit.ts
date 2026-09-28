import type { EphemerisProvider } from '../ephemeris/provider.js';
import { SIGNS, type PointId } from '../types.js';
import {
  findIngresses,
  siderealLongitudeAt,
  type ScanOptions,
  type ScanWindow,
  type SiderealFrame,
} from './scan.js';

/**
 * A transiting graha's sign over time, scored by the natal sarvāṣṭakavarga.
 *
 * The oldest aṣṭakavarga rule of transit: a graha passing through a sign with
 * many sarva bindus does well there, and through a sign with few does poorly.
 * This is the context band under the daśā timeline — it lets a reader see a
 * daśā change coincide with Saturn entering a 19-bindu sign.
 *
 * Every segment carries the sign and the count that produced it, so anything
 * drawn from it names its factors (CLAUDE.md #5). Segment edges are bisected
 * ingresses from `findIngresses`, never samples, and retrograde re-entries
 * produce their own segments rather than being smoothed away.
 */

export interface SarvaTransitSegment {
  readonly body: PointId;
  readonly fromJd: number;
  readonly toJd: number;
  /** 0–11, the sign occupied throughout the segment. */
  readonly signIndex: number;
  readonly sign: string;
  /** Natal sarva bindus in that sign. */
  readonly bindus: number;
  /** True when the segment began with a retrograde re-entry. */
  readonly enteredRetrograde: boolean;
}

export function sarvaTransitSeries(
  provider: EphemerisProvider,
  body: PointId,
  window: ScanWindow,
  frame: SiderealFrame,
  sarva: readonly number[],
  options: ScanOptions = {},
): SarvaTransitSegment[] {
  if (sarva.length !== 12) throw new Error('sarvaTransitSeries: sarva must have twelve entries');
  if (!(window.toJd > window.fromJd)) throw new Error('sarvaTransitSeries: empty window');

  const ingresses = findIngresses(provider, body, window, frame, options);
  const out: SarvaTransitSegment[] = [];
  let fromJd = window.fromJd;
  let signIndex = Math.floor(siderealLongitudeAt(provider, body, window.fromJd, frame) / 30);
  let enteredRetrograde = false;

  const push = (toJd: number): void => {
    out.push({
      body,
      fromJd,
      toJd,
      signIndex,
      sign: SIGNS[signIndex]!,
      bindus: sarva[signIndex]!,
      enteredRetrograde,
    });
  };

  for (const ingress of ingresses) {
    push(ingress.jdUt);
    fromJd = ingress.jdUt;
    signIndex = ingress.signIndex;
    enteredRetrograde = ingress.retrograde;
  }
  push(window.toJd);
  return out;
}

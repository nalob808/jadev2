import type { Graha, PointId } from './types.js';
import { modalityOfSign } from './types.js';

/**
 * Dṛṣṭi — Vedic aspect.
 *
 * Not the Western degree aspect. A graha aspects whole HOUSES counted from
 * where it sits, and the pattern is asymmetric: Mars strikes forward and back
 * unevenly, Jupiter blesses the trines, Saturn reaches the 3rd and 10th.
 * Everything aspects the 7th.
 *
 * Confusing this with degree-based aspects is the most common way a Western
 * chart engine produces Vedic-looking output that no Jyotiṣī recognises.
 */

/** Houses aspected, counted from the graha's own house as 1. */
export const GRAHA_DRISHTI: Record<Graha, readonly number[]> = {
  Sun: [7],
  Moon: [7],
  Mercury: [7],
  Venus: [7],
  Mars: [4, 7, 8],
  Jupiter: [5, 7, 9],
  Saturn: [3, 7, 10],
  // Rāhu and Ketu aspecting 5, 7 and 9 is widely taught and not in BPHS.
  // Included because most software and most practitioners use it; switch it
  // off with the `includeNodes` option rather than editing this table.
  Rahu: [5, 7, 9],
  Ketu: [5, 7, 9],
};

/**
 * Partial aspect strength for the non-full houses, in the Parāśarī quarters.
 * The 7th is always full; the rest carry three quarters, a half or a quarter
 * depending on the graha.
 */
export const DRISHTI_STRENGTH: Record<Graha, Readonly<Record<number, number>>> = {
  Sun: { 7: 1 },
  Moon: { 7: 1 },
  Mercury: { 7: 1 },
  Venus: { 7: 1 },
  Mars: { 4: 1, 7: 1, 8: 1 },
  Jupiter: { 5: 1, 7: 1, 9: 1 },
  Saturn: { 3: 1, 7: 1, 10: 1 },
  Rahu: { 5: 1, 7: 1, 9: 1 },
  Ketu: { 5: 1, 7: 1, 9: 1 },
};

export interface Aspect {
  readonly from: PointId;
  readonly toSign: number;
  /** Houses counted from the aspecting graha, 1-based. */
  readonly distance: number;
  readonly strength: number;
}

export interface DrishtiOptions {
  /** Include the nodes' 5/7/9 aspect. Off by default: it is not in BPHS. */
  readonly includeNodes?: boolean;
}

/** Every sign a graha aspects, given the sign it occupies. */
export function signsAspectedBy(
  graha: Graha,
  fromSign: number,
  options: DrishtiOptions = {},
): Aspect[] {
  if ((graha === 'Rahu' || graha === 'Ketu') && !options.includeNodes) return [];
  const distances = GRAHA_DRISHTI[graha];
  return distances.map((distance) => ({
    from: graha,
    toSign: (fromSign + distance - 1) % 12,
    distance,
    strength: DRISHTI_STRENGTH[graha][distance] ?? 1,
  }));
}

/**
 * Rāśi dṛṣṭi (Jaimini): signs aspect signs, regardless of what occupies them.
 * Movable signs aspect the fixed signs except the adjacent one; fixed aspect
 * movable except the adjacent; dual signs aspect the other dual signs.
 */
export function signsAspectedBySign(fromSign: number): number[] {
  const modality = modalityOfSign(fromSign);
  const targets: number[] = [];
  for (let sign = 0; sign < 12; sign += 1) {
    if (sign === fromSign) continue;
    const other = modalityOfSign(sign);
    if (modality === 'dual') {
      if (other === 'dual') targets.push(sign);
      continue;
    }
    const wanted = modality === 'movable' ? 'fixed' : 'movable';
    if (other !== wanted) continue;
    // The adjacent sign of the other modality is excluded.
    const gap = (((sign - fromSign) % 12) + 12) % 12;
    if (gap === 1 || gap === 11) continue;
    targets.push(sign);
  }
  return targets;
}

/** Which grahas aspect a given sign. */
export function aspectsOnSign(
  placements: ReadonlyArray<{ pointId: PointId; signIndex: number }>,
  targetSign: number,
  options: DrishtiOptions = {},
): Aspect[] {
  const found: Aspect[] = [];
  for (const { pointId, signIndex } of placements) {
    if (!(pointId in GRAHA_DRISHTI)) continue;
    for (const aspect of signsAspectedBy(pointId as Graha, signIndex, options)) {
      if (aspect.toSign === targetSign) found.push(aspect);
    }
  }
  return found;
}

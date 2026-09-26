import type { PointId } from './types.js';

/**
 * Apparent motion, and the one thing it must never say.
 *
 * ## Why this is its own module
 *
 * `retrograde` used to be computed in two places as the sign of a finite
 * difference, which is correct for the five star-planets and admits an
 * impossible answer for everything else. A chart once printed an "R" beside
 * the Sun. The guard went into `computeChart`, and then the transit ring was
 * built on `skyNow`, which had its own copy of the rule and its own gap.
 *
 * Two copies of a safety rule is one copy, so the rule lives here and both
 * callers import it. Anything else that grows a `retrograde` field imports it
 * too, and a test asserts the impossible cases across every fixture.
 */

/**
 * Points whose longitude never decreases.
 *
 * The Sun and Moon are always direct as seen from Earth. The Ascendant and
 * Midheaven are not bodies at all — they are functions of the Earth's
 * rotation, and they advance monotonically by construction. A negative speed
 * for any of these is a provider artefact or a units mistake, never
 * astronomy, and it must not be representable in the output.
 */
export const NEVER_RETROGRADE: ReadonlySet<string> = new Set<string>([
  'Sun',
  'Moon',
  'Ascendant',
  'Midheaven',
]);

/**
 * The lunar nodes, which are always retrograde in the mean formulation.
 *
 * The *true* node does briefly turn direct, which is why this is a statement
 * about the mean node and `retrogradeFrom` takes the speed rather than
 * assuming. Callers using true nodes get the answer the provider gives.
 */
export const ALWAYS_RETROGRADE: ReadonlySet<string> = new Set<string>(['Rahu', 'Ketu']);

/**
 * Whether a point is retrograde, given the provider's longitude speed.
 *
 * `nodeType` matters: with mean nodes Rāhu and Ketu are retrograde by
 * definition and the speed is a formality; with true nodes they genuinely turn,
 * and reporting them as always retrograde would be a lie of the same kind as
 * the retrograde Sun. So the node answer follows the speed unless the caller
 * says the nodes are mean.
 */
export function retrogradeFrom(
  id: PointId | string,
  speed: number,
  nodeType: 'mean' | 'true' = 'mean',
): boolean {
  if (NEVER_RETROGRADE.has(id)) return false;
  if (ALWAYS_RETROGRADE.has(id) && nodeType === 'mean') return true;
  return speed < 0;
}

import {
  AstronomyEngineProvider,
  houseFrom,
  skyNow,
  type AyanamsaMode,
  type PointId,
} from '@jade/astro';
import type { WheelPoint } from '@jade/ui';

/**
 * The transiting sky at an arbitrary moment, as an outer ring for the wheel.
 *
 * ## Why this runs in the browser
 *
 * The scrubber has to answer within one animation frame while a finger is
 * dragging, and a round trip per frame is not a slower version of that — it is
 * a different feature. `packages/astro` has no database, no network and no
 * clock inside its functions (CLAUDE.md #2), which is the only reason the same
 * code that computes a stored chart on the server can compute this ring here.
 * That constraint has been quietly paying for itself since Phase 1; this is
 * where it cashes out.
 *
 * ## What this is allowed to be used for
 *
 * `AstronomyEngineProvider` is precision class `interactive`, not `reference`.
 * Verified against Swiss Ephemeris, its position error expressed as a time runs
 * from about 0.15 minutes for the Moon to 65 for Saturn near a station. That is
 * far inside a wheel's drawing resolution and nowhere near good enough to print.
 *
 * So: this ring drives the screen and nothing else. It is never saved, never
 * printed, and never the source of a date Jade states. Anything that needs a
 * date recomputes it server-side from the reference provider — see
 * `docs/07-accuracy.md`.
 */

export interface RingFrame {
  /** Never defaulted silently — CLAUDE.md #3. Comes from the settings profile. */
  readonly ayanamsa: AyanamsaMode;
  readonly customAyanamsaAtJ2000?: number;
  readonly nodeType: 'mean' | 'true';
}

/**
 * The nine bodies that move.
 *
 * The outers are deliberately absent. They are in the chart when the profile
 * asks for them, but a transit ring is read for timing, and Uranus, Neptune and
 * Pluto have no classical timing technique attached — putting them on the
 * scrubber would add three moving marks that no reading downstream uses.
 */
const TRANSIT_BODIES: readonly PointId[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];

/**
 * One provider per node type, built once.
 *
 * The provider is stateless but not free to construct, and the scrubber asks
 * for positions sixty times a second. There are exactly two possible instances.
 */
const PROVIDERS = new Map<string, AstronomyEngineProvider>();

function providerFor(nodeType: 'mean' | 'true'): AstronomyEngineProvider {
  const existing = PROVIDERS.get(nodeType);
  if (existing) return existing;
  const made = new AstronomyEngineProvider({ nodeType });
  PROVIDERS.set(nodeType, made);
  return made;
}

/**
 * Transiting positions at `jdUt`, seated in the natal chart's houses.
 *
 * The house each transit falls in is counted from the *natal* ascendant sign,
 * because that is the question being asked: not where Saturn is in the sky, but
 * which of this person's houses it is crossing. The natal ring never moves.
 */
export function transitRing(
  jdUt: number,
  frame: RingFrame,
  natalAscendantSign: number,
): WheelPoint[] {
  const provider = providerFor(frame.nodeType);
  const sky = skyNow(
    provider,
    jdUt,
    { ayanamsa: frame.ayanamsa, customAyanamsaAtJ2000: frame.customAyanamsaAtJ2000 },
    TRANSIT_BODIES,
    frame.nodeType,
  );
  return sky.map((position) => ({
    id: position.id,
    longitude: position.longitude,
    signIndex: position.signIndex,
    degreesInSign: position.degreesInSign,
    house: houseFrom(natalAscendantSign, position.signIndex),
    retrograde: position.retrograde,
    nakshatra: position.nakshatra,
  }));
}

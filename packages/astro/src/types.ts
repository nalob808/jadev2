import type { AyanamsaMode } from './sidereal/ayanamsa.js';

/** The nine grahas plus the modern outers and the two calculated angles. */
export const GRAHAS = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
] as const;

export const OUTERS = ['Uranus', 'Neptune', 'Pluto'] as const;
export const ANGLES = ['Ascendant', 'Midheaven'] as const;

export type Graha = (typeof GRAHAS)[number];
export type Outer = (typeof OUTERS)[number];
export type Angle = (typeof ANGLES)[number];
export type PointId = Graha | Outer | Angle;

/**
 * The order a chart is read in: the nine grahas first, in their classical
 * sequence, then the modern outers, then the angles.
 *
 * Never iterate a chart's `points` object for display. It survives a round
 * trip through Postgres `jsonb`, which does not preserve key order, so a
 * cached chart comes back shuffled while a freshly computed one looks fine —
 * a difference that only appears once caching starts working.
 */
export const POINT_DISPLAY_ORDER: readonly PointId[] = [...GRAHAS, ...OUTERS, ...ANGLES];

export type NodeType = 'mean' | 'true';

/**
 * Where a graha *appears* versus where it *is*.
 *
 * `apparent` applies light-time, annual aberration and gravitational
 * deflection — the astronomical standard, what Swiss Ephemeris returns by
 * default, and what most Jyotiṣa software uses.
 *
 * `true` is the geometric position at that instant, uncorrected. Jagannātha
 * Hora computes charts this way (Swiss Ephemeris `SEFLG_TRUEPOS`), so a
 * practitioner reconciling Jade against JHora will find them disagreeing until
 * this matches their setting. Measured across the golden fixtures, worst case:
 *
 *     Moon 0.75″   Sun 20.8″   Saturn 27.1″   Jupiter 29.2″
 *     Mars 38.0″   Venus 44.8″   Mercury 55.3″
 *
 * Just under an arcminute at the extreme. Signs, houses, nakṣatras and vargas
 * are unaffected; a degree printed to the minute can differ by one, and an
 * astrologer checking Jade against the tool they already trust will notice.
 *
 * Jade defaults to `apparent` and says so, rather than picking silently.
 *
 * `true` is **not implemented on the astronomy-engine provider** and throws
 * there. Reaching it geometrically — differencing heliocentric vectors —
 * lands within 0.35″ on the Sun but drifts past 20″ on the outer planets, and
 * `GeoMoon` is not a geometric position at all. A basis that is wrong by
 * roughly the amount it exists to correct is worse than no basis. It belongs
 * on the swisseph provider, where it is one flag; see `docs/07-accuracy.md`.
 */
export type PositionBasis = 'apparent' | 'true';

export type HouseSystem = 'whole_sign' | 'equal' | 'sripati' | 'placidus';

export const SIGNS = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
] as const;
export type Sign = (typeof SIGNS)[number];

/** Movable (cara), fixed (sthira), dual (dvisvabhāva) — needed by half the vargas. */
export type Modality = 'movable' | 'fixed' | 'dual';
export function modalityOfSign(signIndex: number): Modality {
  const m = signIndex % 3;
  return m === 0 ? 'movable' : m === 1 ? 'fixed' : 'dual';
}

/** Fire, earth, air, water — Aries is fire and it cycles. */
export type Element = 'fire' | 'earth' | 'air' | 'water';
export function elementOfSign(signIndex: number): Element {
  return (['fire', 'earth', 'air', 'water'] as const)[signIndex % 4]!;
}

export interface GeoLocation {
  /** Degrees north, negative south. */
  readonly latitude: number;
  /** Degrees east, negative west. */
  readonly longitude: number;
  /** Metres above sea level. Affects the ascendant by well under an arcsecond. */
  readonly elevation?: number;
}

export interface Nakshatra {
  readonly index: number;
  readonly name: string;
  readonly pada: number;
  readonly lord: Graha;
  /** Degrees travelled into the nakṣatra. */
  readonly degreesInto: number;
}

export interface PointPosition {
  readonly id: PointId;
  /** Sidereal ecliptic longitude, degrees, [0, 360). */
  readonly longitude: number;
  /** Tropical (apparent, true equinox of date) longitude, kept for cross-checks. */
  readonly tropicalLongitude: number;
  /** Ecliptic latitude, degrees. Zero for the angles. */
  readonly latitude: number;
  /** Longitude speed, degrees per day. Negative means retrograde. */
  readonly speed: number;
  readonly retrograde: boolean;
  readonly signIndex: number;
  readonly sign: Sign;
  readonly degreesInSign: number;
  readonly nakshatra: Nakshatra;
  readonly house: number;
}

export interface ChartSettings {
  readonly ayanamsa: AyanamsaMode;
  readonly customAyanamsaAtJ2000?: number;
  readonly nodeType: NodeType;
  readonly houseSystem: HouseSystem;
  readonly positionBasis: PositionBasis;
  readonly includeOuters: boolean;
}

export const DEFAULT_SETTINGS: ChartSettings = {
  ayanamsa: 'lahiri',
  nodeType: 'mean',
  houseSystem: 'whole_sign',
  positionBasis: 'apparent',
  includeOuters: false,
};

export interface BirthMoment {
  /** Julian Day in Universal Time. The one true input. */
  readonly jdUt: number;
  readonly location: GeoLocation;
}

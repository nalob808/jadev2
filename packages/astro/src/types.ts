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

export type NodeType = 'mean' | 'true';

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
  readonly includeOuters: boolean;
}

export const DEFAULT_SETTINGS: ChartSettings = {
  ayanamsa: 'lahiri',
  nodeType: 'mean',
  houseSystem: 'whole_sign',
  includeOuters: false,
};

export interface BirthMoment {
  /** Julian Day in Universal Time. The one true input. */
  readonly jdUt: number;
  readonly location: GeoLocation;
}

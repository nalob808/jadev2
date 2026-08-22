import type { Graha, Nakshatra } from './types.js';
import { norm360 } from './angles.js';

export const NAKSHATRA_NAMES = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
] as const;

/**
 * Nakṣatra lords in Vimśottarī order, repeating every nine nakṣatras.
 * This ordering is what makes the daśā start from the Moon's nakṣatra.
 */
export const VIMSHOTTARI_LORDS: readonly Graha[] = [
  'Ketu',
  'Venus',
  'Sun',
  'Moon',
  'Mars',
  'Rahu',
  'Jupiter',
  'Saturn',
  'Mercury',
];

export const NAKSHATRA_SPAN = 360 / 27; // 13°20′
export const PADA_SPAN = NAKSHATRA_SPAN / 4; // 3°20′

export function nakshatraOf(siderealLongitude: number): Nakshatra {
  const l = norm360(siderealLongitude);
  const index = Math.floor(l / NAKSHATRA_SPAN);
  const degreesInto = l - index * NAKSHATRA_SPAN;
  return {
    index,
    name: NAKSHATRA_NAMES[index]!,
    pada: Math.floor(degreesInto / PADA_SPAN) + 1,
    lord: VIMSHOTTARI_LORDS[index % 9]!,
    degreesInto,
  };
}

import { norm360 } from './angles.js';
import { nakshatraOf } from './nakshatra.js';
import type { Nakshatra } from './types.js';

/**
 * Pañcāṅga — the five limbs of the Vedic calendar.
 *
 * Every one of them is a pure function of the Sun's and Moon's sidereal
 * longitudes, except vāra, which is a function of sunrise. That exception
 * matters: the Vedic day begins at sunrise, not midnight, so a birth at 4am
 * belongs to the PREVIOUS weekday. Software that reads the civil date gets
 * this wrong for everyone born before dawn.
 */

export const TITHI_NAMES = [
  'Pratipada',
  'Dvitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dvadashi',
  'Trayodashi',
  'Chaturdashi',
] as const;

export const YOGA_NAMES = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shula',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyan',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
] as const;

/** The seven repeating karaṇas. Vishti is Bhadrā, the one to avoid. */
export const MOVABLE_KARANAS = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti',
] as const;

/** The four fixed karaṇas: one at the start of the lunar month, three at the end. */
export const FIXED_KARANAS = ['Kimstughna', 'Shakuni', 'Chatushpada', 'Naga'] as const;

export const VARA_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** Weekday lords, in the order the vāras run. */
export const VARA_LORDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const;

export type Paksha = 'shukla' | 'krishna';

export interface Tithi {
  /** 1–30 across the whole lunar month. */
  readonly index: number;
  /** 1–15 within the pakṣa, which is how it is spoken. */
  readonly inPaksha: number;
  readonly name: string;
  readonly paksha: Paksha;
  /** How far through this tithi the Moon has travelled, 0–1. */
  readonly elapsed: number;
}

export interface NityaYoga {
  readonly index: number;
  readonly name: string;
  readonly elapsed: number;
}

export interface Karana {
  /** 1–60 across the lunar month. */
  readonly index: number;
  readonly name: string;
  readonly isFixed: boolean;
  readonly elapsed: number;
}

export interface Vara {
  readonly index: number;
  readonly name: string;
  readonly lord: string;
  /**
   * True when the instant falls before sunrise, so the vāra is the previous
   * civil day's. Surfaced rather than hidden: it is the single most common
   * silent error in pañcāṅga software.
   */
  readonly beforeSunrise: boolean;
}

export interface Panchanga {
  readonly tithi: Tithi;
  readonly nakshatra: Nakshatra;
  readonly yoga: NityaYoga;
  readonly karana: Karana;
  readonly vara: Vara | null;
  /** Moon minus Sun, normalised. The quantity tithi and karaṇa are cut from. */
  readonly elongation: number;
}

/** Tithi: the Moon gaining 12° on the Sun. */
export function tithiOf(sunLongitude: number, moonLongitude: number): Tithi {
  const elongation = norm360(moonLongitude - sunLongitude);
  const zeroBased = Math.floor(elongation / 12);
  const index = zeroBased + 1;
  const paksha: Paksha = index <= 15 ? 'shukla' : 'krishna';
  const inPaksha = index <= 15 ? index : index - 15;
  const name =
    inPaksha === 15 ? (paksha === 'shukla' ? 'Purnima' : 'Amavasya') : TITHI_NAMES[inPaksha - 1]!;
  return { index, inPaksha, name, paksha, elapsed: (elongation % 12) / 12 };
}

/** Nitya yoga: Sun plus Moon, cut into the same 27 divisions as the nakṣatras. */
export function nityaYogaOf(sunLongitude: number, moonLongitude: number): NityaYoga {
  const total = norm360(sunLongitude + moonLongitude);
  const span = 360 / 27;
  const zeroBased = Math.floor(total / span);
  return {
    index: zeroBased + 1,
    name: YOGA_NAMES[zeroBased]!,
    elapsed: (total % span) / span,
  };
}

/**
 * Karaṇa: half a tithi, so sixty to the lunar month.
 *
 * The sequence is not a simple cycle. Kiṁstughna opens the month, then the
 * seven movable karaṇas repeat eight times, then Śakuni, Catuṣpāda and Nāga
 * close it. 1 + 56 + 3 = 60.
 */
export function karanaOf(sunLongitude: number, moonLongitude: number): Karana {
  const elongation = norm360(moonLongitude - sunLongitude);
  const zeroBased = Math.floor(elongation / 6);
  const elapsed = (elongation % 6) / 6;
  const index = zeroBased + 1;

  if (zeroBased === 0) return { index, name: 'Kimstughna', isFixed: true, elapsed };
  if (zeroBased >= 57) {
    return { index, name: FIXED_KARANAS[zeroBased - 56]!, isFixed: true, elapsed };
  }
  return { index, name: MOVABLE_KARANAS[(zeroBased - 1) % 7]!, isFixed: false, elapsed };
}

/**
 * Vāra, from sunrise rather than midnight.
 *
 * `sunriseJdUt` is the sunrise of the civil day the instant falls in. When the
 * instant precedes it, the Vedic day is still the previous one.
 */
export function varaOf(jdUt: number, sunriseJdUt: number | null): Vara | null {
  if (sunriseJdUt === null) return null;
  const beforeSunrise = jdUt < sunriseJdUt;
  const civilWeekday = Math.floor(jdUt + 1.5) % 7;
  const index = beforeSunrise ? (civilWeekday + 6) % 7 : civilWeekday;
  return {
    index,
    name: VARA_NAMES[index]!,
    lord: VARA_LORDS[index]!,
    beforeSunrise,
  };
}

export function panchangaOf(
  sunLongitude: number,
  moonLongitude: number,
  jdUt: number,
  sunriseJdUt: number | null,
): Panchanga {
  return {
    tithi: tithiOf(sunLongitude, moonLongitude),
    nakshatra: nakshatraOf(moonLongitude),
    yoga: nityaYogaOf(sunLongitude, moonLongitude),
    karana: karanaOf(sunLongitude, moonLongitude),
    vara: varaOf(jdUt, sunriseJdUt),
    elongation: norm360(moonLongitude - sunLongitude),
  };
}

import { nakshatraOf } from './nakshatra.js';
import { SIGNS } from './types.js';

/**
 * How a day stands relative to one person's natal Moon.
 *
 * This exists because a dashboard wants to colour a week, and colouring a week
 * is one step away from printing a fortune. The way through is to use
 * techniques where the *classical texts themselves* assign favourability, name
 * them, and show the components — rather than inventing a score.
 *
 * Two are used, and they are the two every muhūrta text reaches for first:
 *
 * **Tārā bala** counts nakṣatras from the natal Moon's to the transit Moon's,
 * in a nine-fold cycle repeating three times across the twenty-seven. Each
 * position has a name and a stated character; five are favourable, three are
 * not, and the first is mixed. This is not a modern invention and it is not a
 * weighting anyone chose here.
 *
 * **Candra bala** counts signs from the natal Moon to the transiting Moon.
 * The 4th, 8th and 12th are the difficult ones; 1, 3, 6, 7, 10 and 11 are
 * favourable; the rest are middling.
 *
 * What this deliberately does not do: predict anything, produce a number, or
 * combine the two into a weighted score. A day is green when both agree it is
 * favourable, red when both agree it is not, and amber otherwise — and the
 * components are always returned so the colour can be argued with.
 */

export type DayBand = 'favourable' | 'mixed' | 'difficult';

/**
 * The nine tārās, in order from the janma nakṣatra.
 *
 * `favourable` is the classical assignment, not a judgement made here. Janma
 * is marked mixed because the texts genuinely differ on it — auspicious for
 * some undertakings, avoided for others.
 */
export const TARAS = [
  { index: 1, name: 'Janma', plain: 'Janma', meaning: 'birth star', band: 'mixed' },
  { index: 2, name: 'Sampat', plain: 'Sampat', meaning: 'wealth', band: 'favourable' },
  { index: 3, name: 'Vipat', plain: 'Vipat', meaning: 'danger', band: 'difficult' },
  { index: 4, name: 'Kṣema', plain: 'Kshema', meaning: 'wellbeing', band: 'favourable' },
  { index: 5, name: 'Pratyari', plain: 'Pratyari', meaning: 'obstacle', band: 'difficult' },
  { index: 6, name: 'Sādhaka', plain: 'Sadhaka', meaning: 'accomplishment', band: 'favourable' },
  { index: 7, name: 'Vadha', plain: 'Vadha', meaning: 'obstruction', band: 'difficult' },
  { index: 8, name: 'Mitra', plain: 'Mitra', meaning: 'friend', band: 'favourable' },
  { index: 9, name: 'Ati-mitra', plain: 'Ati-mitra', meaning: 'close friend', band: 'favourable' },
] as const satisfies ReadonlyArray<{
  index: number;
  name: string;
  plain: string;
  meaning: string;
  band: DayBand;
}>;

/** Houses from the natal Moon that the texts count favourable for candra bala. */
const CANDRA_FAVOURABLE = [1, 3, 6, 7, 10, 11];
/** The three the texts single out as difficult. */
const CANDRA_DIFFICULT = [4, 8, 12];

export interface TaraBala {
  /** 1–9, counted from the janma nakṣatra. */
  readonly index: number;
  readonly name: string;
  readonly plain: string;
  readonly meaning: string;
  readonly band: DayBand;
  /** Which of the three nine-fold cycles, 1–3. Some texts weight these. */
  readonly cycle: number;
  readonly fromNakshatra: string;
  readonly toNakshatra: string;
}

export interface CandraBala {
  /** House from the natal Moon, 1–12. */
  readonly house: number;
  readonly band: DayBand;
  readonly fromSign: string;
  readonly toSign: string;
}

export interface DayQuality {
  readonly band: DayBand;
  readonly tara: TaraBala;
  readonly candra: CandraBala;
  /**
   * The named rules that produced the band. Never empty — the colour must
   * always be arguable.
   */
  readonly factors: readonly string[];
}

/**
 * Tārā bala for a moment.
 *
 * Counting is inclusive from the janma nakṣatra, which is why a transit Moon
 * in the birth nakṣatra gives 1 rather than 0 — the janma tārā is the first of
 * the nine, not the absence of one.
 */
export function taraBala(natalMoonLongitude: number, transitMoonLongitude: number): TaraBala {
  const from = nakshatraOf(natalMoonLongitude);
  const to = nakshatraOf(transitMoonLongitude);
  const steps = (((to.index - from.index) % 27) + 27) % 27;
  const index = (steps % 9) + 1;
  const entry = TARAS[index - 1]!;
  return {
    index,
    name: entry.name,
    plain: entry.plain,
    meaning: entry.meaning,
    band: entry.band,
    cycle: Math.floor(steps / 9) + 1,
    fromNakshatra: from.name,
    toNakshatra: to.name,
  };
}

/** Candra bala: the transiting Moon's house counted from the natal Moon's sign. */
export function candraBala(natalMoonLongitude: number, transitMoonLongitude: number): CandraBala {
  const fromSign = Math.floor((((natalMoonLongitude % 360) + 360) % 360) / 30);
  const toSign = Math.floor((((transitMoonLongitude % 360) + 360) % 360) / 30);
  const house = ((((toSign - fromSign) % 12) + 12) % 12) + 1;
  return {
    house,
    band: CANDRA_FAVOURABLE.includes(house)
      ? 'favourable'
      : CANDRA_DIFFICULT.includes(house)
        ? 'difficult'
        : 'mixed',
    fromSign: SIGNS[fromSign]!,
    toSign: SIGNS[toSign]!,
  };
}

/**
 * Combine the two into one band.
 *
 * Deliberately not a score. Green requires both to agree, red requires both to
 * agree, and everything else is amber — which means amber is the common case,
 * and that is correct. Most days are not remarkable, and a colouring that
 * calls half the week green has stopped carrying information.
 */
export function dayQuality(natalMoonLongitude: number, transitMoonLongitude: number): DayQuality {
  const tara = taraBala(natalMoonLongitude, transitMoonLongitude);
  const candra = candraBala(natalMoonLongitude, transitMoonLongitude);

  const band: DayBand =
    tara.band === 'favourable' && candra.band === 'favourable'
      ? 'favourable'
      : tara.band === 'difficult' && candra.band === 'difficult'
        ? 'difficult'
        : 'mixed';

  return {
    band,
    tara,
    candra,
    factors: [
      `Tārā bala ${tara.index} of 9 — ${tara.name}, "${tara.meaning}", counted from ${tara.fromNakshatra} to ${tara.toNakshatra}`,
      `Candra bala — the Moon is in the ${candra.house}${ordinalSuffix(candra.house)} from your natal Moon (${candra.fromSign} to ${candra.toSign})`,
    ],
  };
}

function ordinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

export const BAND_LABELS: Record<DayBand, string> = {
  favourable: 'Both counts favourable',
  mixed: 'The two counts disagree',
  difficult: 'Both counts difficult',
};

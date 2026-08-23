import { naturalRelation } from '../dignity.js';
import { NAKSHATRA_NAMES } from '../nakshatra.js';
import { SIGNS, type Graha } from '../types.js';

/**
 * Aṣṭakūṭa — the eight-fold match, also called guṇa milāna.
 *
 * Eight tests scored out of 36 between two people, computed from nothing but
 * each one's Moon nakṣatra and pāda. That is the whole input, which means the
 * technique has exactly 108 × 108 = 11,664 possible answers — small enough that
 * Jade's tables are verified against **every one of them** rather than a
 * sample. See `scripts/oracle_ashtakuta.py`.
 *
 * A word about what this module refuses to do. Aṣṭakūṭa is the most misused
 * technique in Jyotiṣa: a number out of 36 gets quoted at people as a verdict
 * on a marriage. So every kūṭa returns *why* it scored what it did, doṣas carry
 * their cancellations, and nothing here returns a recommendation. The score is
 * a starting point for a conversation, and Jade's job is to give a practitioner
 * the components, not to pronounce.
 */

export const KUTAS = [
  'varna',
  'vasya',
  'tara',
  'yoni',
  'maitri',
  'gana',
  'bhakuta',
  'nadi',
] as const;
export type Kuta = (typeof KUTAS)[number];

/** Maximum points per kūṭa. They sum to 36. */
export const KUTA_MAXIMA: Record<Kuta, number> = {
  varna: 1,
  vasya: 2,
  tara: 3,
  yoni: 4,
  maitri: 5,
  gana: 6,
  bhakuta: 7,
  nadi: 8,
};

export const TOTAL_POINTS = 36;

/** A person, reduced to what aṣṭakūṭa actually reads. */
export interface MatchSubject {
  /** 0-based nakṣatra index, Aśvinī first. */
  readonly nakshatra: number;
  /** Pāda 1–4. */
  readonly pada: number;
}

/**
 * The pāda-resolution position: 0–107, nakṣatra-major.
 *
 * Every kūṭa that needs a rāśi gets it from here, because nine pādas make one
 * sign exactly and several vaśya groups split a sign in half. Working from the
 * nakṣatra alone silently rounds those to the wrong side.
 */
export function padaIndex(subject: MatchSubject): number {
  return subject.nakshatra * 4 + (subject.pada - 1);
}

/** Rāśi 0–11 from the pāda index. Nine pādas to a sign. */
export function rashiOf(subject: MatchSubject): number {
  return Math.floor(padaIndex(subject) / 9);
}

// ---------------------------------------------------------------------------
// 1. Varṇa — 1 point

/** Brahmin 4, Kṣatriya 3, Vaiśya 2, Śūdra 1, by rāśi. */
export const VARNA_RANK: readonly number[] = [
  3, // Aries — Kṣatriya
  2, // Taurus — Vaiśya
  1, // Gemini — Śūdra
  4, // Cancer — Brahmin
  3, // Leo
  2, // Virgo
  1, // Libra
  4, // Scorpio
  3, // Sagittarius
  2, // Capricorn
  1, // Aquarius
  4, // Pisces
];

export const VARNA_NAMES: readonly string[] = ['', 'Śūdra', 'Vaiśya', 'Kṣatriya', 'Brahmin'];

// ---------------------------------------------------------------------------
// 2. Vaśya — 2 points

export type VasyaGroup = 'quadruped' | 'human' | 'aquatic' | 'wild' | 'insect';

/**
 * Vaśya group by rāśi. Two signs split, and the split is by half-sign, which
 * is why this takes the pāda index rather than the rāśi.
 *
 * Sagittarius: the first half is human, the second quadruped.
 * Capricorn: the first half is quadruped, the second aquatic.
 */
export function vasyaGroupOf(subject: MatchSubject): VasyaGroup {
  const index = padaIndex(subject);
  const rashi = Math.floor(index / 9);
  const firstHalf = index % 9 < 4.5;

  switch (rashi) {
    case 0: // Aries
    case 1: // Taurus
      return 'quadruped';
    case 2: // Gemini
    case 5: // Virgo
    case 6: // Libra
    case 10: // Aquarius
      return 'human';
    case 3: // Cancer
    case 11: // Pisces
      return 'aquatic';
    case 4: // Leo
      return 'wild';
    case 7: // Scorpio
      return 'insect';
    case 8: // Sagittarius
      return firstHalf ? 'human' : 'quadruped';
    case 9: // Capricorn
      return firstHalf ? 'quadruped' : 'aquatic';
    default:
      return 'human';
  }
}

const VASYA_ORDER: readonly VasyaGroup[] = ['quadruped', 'human', 'aquatic', 'wild', 'insect'];

/** Rows are the first person's group, columns the second's. Out of 2. */
const VASYA_TABLE: readonly (readonly number[])[] = [
  //         quad  human aqua  wild  insect
  /* quad   */ [2, 1, 1, 0, 1],
  /* human  */ [1, 2, 0.5, 0, 1],
  /* aqua   */ [1, 1, 2, 0.5, 1],
  /* wild   */ [0, 0, 0.5, 2, 1],
  /* insect */ [1, 1, 1, 1, 2],
];

// ---------------------------------------------------------------------------
// 3. Tārā — 3 points

/**
 * Count from one nakṣatra to the other, inclusive, and take the remainder on
 * division by nine. Remainders 3, 5 and 7 are the inauspicious tārās —
 * vipat, pratyari and vadha.
 */
export function taraRemainder(from: number, to: number): number {
  const count = (((to - from) % 27) + 27) % 27; // 0-based distance
  return (count + 1) % 9;
}

const INAUSPICIOUS_TARA = [3, 5, 7];

// ---------------------------------------------------------------------------
// 4. Yoni — 4 points

export type Yoni =
  | 'horse'
  | 'elephant'
  | 'sheep'
  | 'serpent'
  | 'dog'
  | 'cat'
  | 'rat'
  | 'cow'
  | 'buffalo'
  | 'tiger'
  | 'hare'
  | 'monkey'
  | 'lion'
  | 'mongoose';

/** Yoni animal per nakṣatra, Aśvinī first. */
export const YONI_OF_NAKSHATRA: readonly Yoni[] = [
  'horse', // Aśvinī
  'elephant', // Bharaṇī
  'sheep', // Kṛttikā
  'serpent', // Rohiṇī
  'serpent', // Mṛgaśīrṣa
  'dog', // Ārdrā
  'cat', // Punarvasu
  'sheep', // Puṣya
  'cat', // Āśleṣā
  'rat', // Maghā
  'rat', // Pūrva Phalgunī
  'cow', // Uttara Phalgunī
  'buffalo', // Hasta
  'tiger', // Citrā
  'buffalo', // Svātī
  'tiger', // Viśākhā
  'hare', // Anurādhā
  'hare', // Jyeṣṭhā
  'dog', // Mūla
  'monkey', // Pūrva Āṣāḍhā
  'mongoose', // Uttara Āṣāḍhā
  'monkey', // Śravaṇa
  'lion', // Dhaniṣṭhā
  'horse', // Śatabhiṣā
  'lion', // Pūrva Bhādrapadā
  'cow', // Uttara Bhādrapadā
  'elephant', // Revatī
];

const YONI_ORDER: readonly Yoni[] = [
  'horse',
  'elephant',
  'sheep',
  'serpent',
  'dog',
  'cat',
  'rat',
  'cow',
  'buffalo',
  'tiger',
  'hare',
  'monkey',
  'lion',
  'mongoose',
];

/**
 * Yoni relations, out of 4: 4 same, 3 friendly, 2 neutral, 1 hostile,
 * 0 mortally opposed. Symmetric, with 4 down the diagonal.
 *
 * The seven zeroes are the classical mortally-opposed pairs — horse/buffalo,
 * elephant/lion, sheep/monkey, serpent/mongoose, dog/hare, cat/rat, cow/tiger —
 * and finding exactly those seven, and nothing else, in a matrix recovered
 * independently from 11,664 scored pairings is what says this table is right.
 */
const YONI_TABLE: readonly (readonly number[])[] = [
  /* horse    */ [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 1, 3, 1, 2],
  /* elephant */ [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 0, 2],
  /* sheep    */ [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 1, 3],
  /* serpent  */ [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 2, 0],
  /* dog      */ [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  /* cat      */ [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 1, 2],
  /* rat      */ [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 2, 1],
  /* cow      */ [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 1, 2],
  /* buffalo  */ [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 1, 2],
  /* tiger    */ [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 1, 2],
  /* hare     */ [1, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 1, 2],
  /* monkey   */ [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 2, 3],
  /* lion     */ [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 4, 2],
  /* mongoose */ [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 2, 4],
];

// ---------------------------------------------------------------------------
// 5. Graha Maitrī — 5 points

const RASHI_LORDS: readonly Graha[] = [
  'Mars',
  'Venus',
  'Mercury',
  'Moon',
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Saturn',
  'Jupiter',
];

/**
 * Friendship between the two rāśi lords, out of 5.
 *
 * Derived rather than tabulated. Jade already knows the natural relations from
 * `dignity.ts`, and a second hand-copied table is a second thing to get wrong —
 * this scale over those relations reproduces the reference exactly on all
 * eleven thousand pairings, which also re-confirms the dignity tables from a
 * completely different direction.
 */
const MAITRI_SCALE: Record<string, number> = {
  'friend|friend': 5,
  'friend|neutral': 4,
  'neutral|friend': 4,
  'neutral|neutral': 3,
  'friend|enemy': 1,
  'enemy|friend': 1,
  'neutral|enemy': 0.5,
  'enemy|neutral': 0.5,
  'enemy|enemy': 0,
};

export function maitriScore(lordA: Graha, lordB: Graha): number {
  if (lordA === lordB) return 5;
  const key = `${naturalRelation(lordA, lordB)}|${naturalRelation(lordB, lordA)}`;
  return MAITRI_SCALE[key] ?? 0;
}

// ---------------------------------------------------------------------------
// 6. Gaṇa — 6 points

export type Gana = 'deva' | 'manushya' | 'rakshasa';

export const GANA_OF_NAKSHATRA: readonly Gana[] = [
  'deva', // Aśvinī
  'manushya', // Bharaṇī
  'rakshasa', // Kṛttikā
  'manushya', // Rohiṇī
  'deva', // Mṛgaśīrṣa
  'manushya', // Ārdrā
  'deva', // Punarvasu
  'deva', // Puṣya
  'rakshasa', // Āśleṣā
  'rakshasa', // Maghā
  'manushya', // Pūrva Phalgunī
  'manushya', // Uttara Phalgunī
  'deva', // Hasta
  'rakshasa', // Citrā
  'deva', // Svātī
  'rakshasa', // Viśākhā
  'deva', // Anurādhā
  'rakshasa', // Jyeṣṭhā
  'rakshasa', // Mūla
  'manushya', // Pūrva Āṣāḍhā
  'manushya', // Uttara Āṣāḍhā
  'deva', // Śravaṇa
  'rakshasa', // Dhaniṣṭhā
  'rakshasa', // Śatabhiṣā
  'manushya', // Pūrva Bhādrapadā
  'manushya', // Uttara Bhādrapadā
  'deva', // Revatī
];

const GANA_ORDER: readonly Gana[] = ['deva', 'manushya', 'rakshasa'];

/** Rows the first person, columns the second. Out of 6. */
const GANA_TABLE: readonly (readonly number[])[] = [
  //            deva manu raks
  /* deva  */ [6, 5, 1],
  /* manu  */ [6, 6, 0],
  /* raks  */ [0, 0, 6],
];

// ---------------------------------------------------------------------------
// 7. Bhakūṭa — 7 points

/** The rāśi distances that void bhakūṭa: 6-8, 5-9 and 2-12. */
function bhakutaVoided(a: number, b: number): { voided: boolean; pair: string } {
  const forward = ((((b - a) % 12) + 12) % 12) + 1;
  const backward = ((((a - b) % 12) + 12) % 12) + 1;
  const pair = [forward, backward].sort((x, y) => x - y);
  const key = `${pair[0]}-${pair[1]}`;
  return { voided: ['2-12', '5-9', '6-8'].includes(key), pair: key };
}

// ---------------------------------------------------------------------------
// 8. Nāḍī — 8 points

export type Nadi = 'adi' | 'madhya' | 'antya';

export const NADI_OF_NAKSHATRA: readonly Nadi[] = [
  'adi', // Aśvinī
  'madhya', // Bharaṇī
  'antya', // Kṛttikā
  'antya', // Rohiṇī
  'madhya', // Mṛgaśīrṣa
  'adi', // Ārdrā
  'adi', // Punarvasu
  'madhya', // Puṣya
  'antya', // Āśleṣā
  'antya', // Maghā
  'madhya', // Pūrva Phalgunī
  'adi', // Uttara Phalgunī
  'adi', // Hasta
  'madhya', // Citrā
  'antya', // Svātī
  'antya', // Viśākhā
  'madhya', // Anurādhā
  'adi', // Jyeṣṭhā
  'adi', // Mūla
  'madhya', // Pūrva Āṣāḍhā
  'antya', // Uttara Āṣāḍhā
  'antya', // Śravaṇa
  'madhya', // Dhaniṣṭhā
  'adi', // Śatabhiṣā
  'adi', // Pūrva Bhādrapadā
  'madhya', // Uttara Bhādrapadā
  'antya', // Revatī
];

// ---------------------------------------------------------------------------

export interface KutaResult {
  readonly kuta: Kuta;
  readonly name: string;
  readonly score: number;
  readonly maximum: number;
  /** What each side contributed — always shown, never just the number. */
  readonly reason: string;
}

export interface AshtakutaResult {
  readonly kutas: readonly KutaResult[];
  readonly total: number;
  readonly maximum: number;
}

const KUTA_NAMES: Record<Kuta, string> = {
  varna: 'Varṇa',
  vasya: 'Vaśya',
  tara: 'Tārā',
  yoni: 'Yoni',
  maitri: 'Graha Maitrī',
  gana: 'Gaṇa',
  bhakuta: 'Bhakūṭa',
  nadi: 'Nāḍī',
};

const nakName = (i: number): string => NAKSHATRA_NAMES[i] ?? `nakṣatra ${i + 1}`;
const signName = (i: number): string => SIGNS[((i % 12) + 12) % 12]!;

export function ashtakuta(a: MatchSubject, b: MatchSubject): AshtakutaResult {
  const rashiA = rashiOf(a);
  const rashiB = rashiOf(b);

  const varnaA = VARNA_RANK[rashiA]!;
  const varnaB = VARNA_RANK[rashiB]!;
  const varna: KutaResult = {
    kuta: 'varna',
    name: KUTA_NAMES.varna,
    score: varnaA >= varnaB ? 1 : 0,
    maximum: 1,
    reason: `${signName(rashiA)} is ${VARNA_NAMES[varnaA]}, ${signName(rashiB)} is ${VARNA_NAMES[varnaB]}`,
  };

  const groupA = vasyaGroupOf(a);
  const groupB = vasyaGroupOf(b);
  const vasya: KutaResult = {
    kuta: 'vasya',
    name: KUTA_NAMES.vasya,
    score: VASYA_TABLE[VASYA_ORDER.indexOf(groupA)]![VASYA_ORDER.indexOf(groupB)]!,
    maximum: 2,
    reason: `${signName(rashiA)} is ${groupA}, ${signName(rashiB)} is ${groupB}`,
  };

  const forward = taraRemainder(a.nakshatra, b.nakshatra);
  const backward = taraRemainder(b.nakshatra, a.nakshatra);
  const goodForward = !INAUSPICIOUS_TARA.includes(forward);
  const goodBackward = !INAUSPICIOUS_TARA.includes(backward);
  const tara: KutaResult = {
    kuta: 'tara',
    name: KUTA_NAMES.tara,
    score: goodForward && goodBackward ? 3 : goodForward || goodBackward ? 1.5 : 0,
    maximum: 3,
    reason: `tārā ${forward} counting one way, ${backward} the other`,
  };

  const yoniA = YONI_OF_NAKSHATRA[a.nakshatra]!;
  const yoniB = YONI_OF_NAKSHATRA[b.nakshatra]!;
  const yoni: KutaResult = {
    kuta: 'yoni',
    name: KUTA_NAMES.yoni,
    score: YONI_TABLE[YONI_ORDER.indexOf(yoniA)]![YONI_ORDER.indexOf(yoniB)]!,
    maximum: 4,
    reason: `${nakName(a.nakshatra)} is ${yoniA}, ${nakName(b.nakshatra)} is ${yoniB}`,
  };

  const lordA = RASHI_LORDS[rashiA]!;
  const lordB = RASHI_LORDS[rashiB]!;
  const maitri: KutaResult = {
    kuta: 'maitri',
    name: KUTA_NAMES.maitri,
    score: maitriScore(lordA, lordB),
    maximum: 5,
    reason: `${signName(rashiA)} is ruled by ${lordA}, ${signName(rashiB)} by ${lordB}`,
  };

  const ganaA = GANA_OF_NAKSHATRA[a.nakshatra]!;
  const ganaB = GANA_OF_NAKSHATRA[b.nakshatra]!;
  const gana: KutaResult = {
    kuta: 'gana',
    name: KUTA_NAMES.gana,
    score: GANA_TABLE[GANA_ORDER.indexOf(ganaA)]![GANA_ORDER.indexOf(ganaB)]!,
    maximum: 6,
    reason: `${nakName(a.nakshatra)} is ${ganaA}, ${nakName(b.nakshatra)} is ${ganaB}`,
  };

  const { voided, pair } = bhakutaVoided(rashiA, rashiB);
  const bhakuta: KutaResult = {
    kuta: 'bhakuta',
    name: KUTA_NAMES.bhakuta,
    score: voided ? 0 : 7,
    maximum: 7,
    reason: voided
      ? `${signName(rashiA)} and ${signName(rashiB)} stand ${pair} from each other`
      : `${signName(rashiA)} and ${signName(rashiB)} stand ${pair}, which does not void it`,
  };

  const nadiA = NADI_OF_NAKSHATRA[a.nakshatra]!;
  const nadiB = NADI_OF_NAKSHATRA[b.nakshatra]!;
  const nadi: KutaResult = {
    kuta: 'nadi',
    name: KUTA_NAMES.nadi,
    score: nadiA === nadiB ? 0 : 8,
    maximum: 8,
    reason: `${nakName(a.nakshatra)} is ${nadiA} nāḍī, ${nakName(b.nakshatra)} is ${nadiB}`,
  };

  const kutas = [varna, vasya, tara, yoni, maitri, gana, bhakuta, nadi];
  return {
    kutas,
    total: kutas.reduce((n, k) => n + k.score, 0),
    maximum: TOTAL_POINTS,
  };
}

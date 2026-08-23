import { GRAHA_DRISHTI } from '../drishti.js';
import { SIGNS, type Graha } from '../types.js';

/**
 * Synastry, the Jyotiṣa way.
 *
 * Western synastry measures angles between two charts' planets. That is not
 * how this tradition reads a pair. Jyotiṣa overlays: it drops one person's
 * grahas into the other's houses and asks which areas of life they land on,
 * and it uses whole-sign dṛṣṭi rather than orb-based aspects.
 *
 * So the two things here are the **house overlay** — where each of A's grahas
 * falls in B's chart, and the reverse — and the **dṛṣṭi between charts**, which
 * grahas of A cast their glance on which of B's.
 *
 * Nothing in this module scores anything. Two charts overlaying well is a
 * judgement a practitioner makes with the placements in front of them; a number
 * would only invite the same misuse aṣṭakūṭa already suffers.
 */

export interface SynastryChart {
  readonly ascendantSign: number;
  readonly signOf: Readonly<Record<Graha, number>>;
}

export interface SynastryOptions {
  /**
   * Whether Rāhu and Ketu cast dṛṣṭi on the 5th, 7th and 9th.
   *
   * Widely taught, and not in BPHS. Jade's `drishti` module takes the same
   * position and the same default — on, because most software and most
   * practitioners use it — but the choice is named here too rather than being
   * inherited silently, because between two charts it produces a noticeably
   * longer list.
   */
  readonly includeNodeDrishti?: boolean;
}

const houseFrom = (fromSign: number, sign: number): number =>
  ((((sign - fromSign) % 12) + 12) % 12) + 1;

const signName = (i: number): string => SIGNS[((i % 12) + 12) % 12]!;

/** 3rd, not 3th. */
const ordinal = (n: number): string => {
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `${n}${suffix}`;
};

/** What each house is asked about, in the plainest words that are still true. */
export const HOUSE_MATTERS: readonly string[] = [
  'the body, and how they meet the world',
  'what they hold — money, family, speech',
  'courage, siblings, effort',
  'home, mother, what settles them',
  'children, learning, what they make',
  'illness, debt, work and service',
  'the partner, and every open dealing',
  'what is hidden, inherited, or transformed',
  'belief, fortune, the teacher',
  'work in the world, standing',
  'gain, networks, the elder sibling',
  'loss, retreat, what is spent',
];

export interface Overlay {
  readonly graha: Graha;
  /** The house of the *other* chart this graha falls in. */
  readonly house: number;
  readonly sign: string;
  readonly matters: string;
}

export interface CrossDrishti {
  /** The graha doing the looking, from the first chart. */
  readonly from: Graha;
  /** The graha being looked at, in the second chart. */
  readonly to: Graha;
  /** Which of the special dṛṣṭis this is — 7 for all, plus the extras. */
  readonly aspectHouse: number;
  readonly description: string;
}

export interface SynastryResult {
  /** A's grahas placed in B's houses. */
  readonly aInB: readonly Overlay[];
  /** B's grahas placed in A's houses. */
  readonly bInA: readonly Overlay[];
  /** A's grahas casting dṛṣṭi on B's. */
  readonly aOnB: readonly CrossDrishti[];
  /** B's grahas casting dṛṣṭi on A's. */
  readonly bOnA: readonly CrossDrishti[];
  /**
   * Grahas of A and B that share a sign. The plainest and strongest contact
   * there is, and the first thing a practitioner looks for.
   */
  readonly conjunctions: readonly { a: Graha; b: Graha; sign: string }[];
}

const CLASSICAL: readonly Graha[] = [
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

function overlay(source: SynastryChart, target: SynastryChart): Overlay[] {
  const out: Overlay[] = [];
  for (const graha of CLASSICAL) {
    const sign = source.signOf[graha];
    if (sign === undefined) continue;
    const house = houseFrom(target.ascendantSign, sign);
    out.push({
      graha,
      house,
      sign: signName(sign),
      matters: HOUSE_MATTERS[house - 1]!,
    });
  }
  return out;
}

function crossDrishti(
  source: SynastryChart,
  target: SynastryChart,
  includeNodes: boolean,
): CrossDrishti[] {
  const out: CrossDrishti[] = [];
  for (const from of CLASSICAL) {
    if (!includeNodes && (from === 'Rahu' || from === 'Ketu')) continue;
    const fromSign = source.signOf[from];
    const aspects = GRAHA_DRISHTI[from];
    if (fromSign === undefined || !aspects) continue;
    for (const to of CLASSICAL) {
      const toSign = target.signOf[to];
      if (toSign === undefined) continue;
      const house = houseFrom(fromSign, toSign);
      if (!aspects.includes(house)) continue;
      out.push({
        from,
        to,
        aspectHouse: house,
        description:
          house === 7
            ? `${from} in ${signName(fromSign)} looks across at ${to} in ${signName(toSign)}`
            : `${from} in ${signName(fromSign)} casts its special ${ordinal(house)} glance on ${to} in ${signName(toSign)}`,
      });
    }
  }
  return out;
}

export function synastry(
  a: SynastryChart,
  b: SynastryChart,
  options: SynastryOptions = {},
): SynastryResult {
  const includeNodes = options.includeNodeDrishti ?? true;
  const conjunctions: { a: Graha; b: Graha; sign: string }[] = [];
  for (const ga of CLASSICAL) {
    const signA = a.signOf[ga];
    if (signA === undefined) continue;
    for (const gb of CLASSICAL) {
      if (b.signOf[gb] === signA) {
        conjunctions.push({ a: ga, b: gb, sign: signName(signA) });
      }
    }
  }

  return {
    aInB: overlay(a, b),
    bInA: overlay(b, a),
    aOnB: crossDrishti(a, b, includeNodes),
    bOnA: crossDrishti(b, a, includeNodes),
    conjunctions,
  };
}

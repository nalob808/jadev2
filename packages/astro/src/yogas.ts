import { EXALTATION, lordOfSign, MOOLATRIKONA, SIGN_LORDS } from './dignity.js';
import { SIGNS, type Graha } from './types.js';

/**
 * Yogas — the named combinations a practitioner reads a chart for.
 *
 * Two rules shape this module, and both come from CLAUDE.md.
 *
 * **Every hit carries its factors.** A yoga that reports only its name is not
 * groundable: the interpretation layer may not print a statement it cannot
 * decompose. So `YogaHit.factors` lists the actual placements that fired the
 * rule, and the UI shows them beside the name. "Śaśa yoga" alone is a claim;
 * "Śaśa yoga — Saturn in Aquarius, its own sign, in the 4th from the
 * ascendant, a kendra" is a reading.
 *
 * **Where sources disagree, the variant is named.** Several of these have a
 * kendra-from-Moon reading as well as a kendra-from-lagna one, and whether the
 * nodes count as grahas for the lunar and solar yogas is not settled. Those are
 * options with documented defaults, never silent choices.
 *
 * This is a curated set, not an exhaustive one. Roughly 260 yogas are in
 * circulation; most are cited without cancellation rules, and a yoga list
 * without cancellations is astrologically dishonest. What is here is the set
 * that is unambiguous in Parāśara and verified against Jagannātha Hora.
 */

export const BENEFICS: readonly Graha[] = ['Mercury', 'Jupiter', 'Venus'];

/** The seven classical grahas. Rāhu and Ketu own no sign and cast no yoga here. */
export const CLASSICAL: readonly Graha[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
];

export interface YogaChart {
  /** Sign index 0–11, Aries first. */
  readonly ascendantSign: number;
  readonly signOf: Readonly<Record<Graha, number>>;
  /** Degrees within the sign, needed for mūlatrikoṇa and for debilitation. */
  readonly degreeOf: Readonly<Record<Graha, number>>;
}

export interface YogaHit {
  readonly id: string;
  /** IAST, for display. */
  readonly name: string;
  /** Plain transliteration, always available beside it. */
  readonly plain: string;
  readonly source: string;
  /** What the combination *is*. Never a prediction. */
  readonly summary: string;
  /** The placements that fired the rule. Never empty. */
  readonly factors: readonly string[];
  /**
   * Conditions found that classically cancel or blunt this yoga.
   *
   * Present and non-empty means the combination is technically formed but a
   * cancellation applies — which for Kemadruma in particular is the difference
   * between a frightening reading and an ordinary chart. A yoga reported
   * without its cancellations is astrologically dishonest, so this field is
   * populated wherever the texts give cancellations, and the UI shows it
   * beside the name rather than behind a click.
   */
  readonly cancellations?: readonly string[];
}

export interface YogaOptions {
  /**
   * Pañca Mahāpuruṣa is usually read from the ascendant. Several authorities
   * accept a kendra from the Moon as well; `'either'` fires on both and says
   * which in the factors. Default is the ascendant alone, the majority reading.
   */
  readonly mahapurushaReference?: 'lagna' | 'moon' | 'either';
  /**
   * Whether Rāhu and Ketu count as grahas for the lunar (sunaphā, anaphā,
   * durudhurā, kemadruma) and solar (veśi, vāsi, ubhayacharī) yogas. Parāśara
   * counts the seven; later writers include the nodes, which materially changes
   * how often kemadruma fires — with nine bodies in play, both the 2nd and the
   * 12th from the Moon being empty is rare. Default excludes them.
   */
  readonly nodesCountAsGrahas?: boolean;
  /**
   * Whether the Sun's presence in the 2nd or 12th spoils sunaphā and anaphā.
   *
   * Both readings are in circulation. Parāśara's rule is that the yoga is
   * formed by a graha *other than* the Sun standing there — the Sun is simply
   * not counted. The stricter reading treats the Sun's presence as
   * disqualifying the house outright, so a 12th holding the Sun, Mars and
   * Mercury forms no anaphā at all. Jagannātha Hora takes the strict reading.
   * Default is Parāśara's.
   */
  readonly sunSpoilsLunarYogas?: boolean;
  /**
   * When both the 2nd and the 12th are occupied, all three conditions hold at
   * once. `'exclusive'` reports only durudhurā, which is the name a
   * practitioner uses for that configuration. `'inclusive'` reports sunaphā,
   * anaphā *and* durudhurā, which is what Jagannātha Hora does. The same
   * choice governs veśi/vāsi/ubhayacharī. Default is exclusive.
   */
  readonly lunarSolarReporting?: 'exclusive' | 'inclusive';
}

const DEFAULTS: Required<YogaOptions> = {
  mahapurushaReference: 'lagna',
  nodesCountAsGrahas: false,
  sunSpoilsLunarYogas: false,
  lunarSolarReporting: 'exclusive',
};

/**
 * The settings that reproduce Jagannātha Hora exactly.
 *
 * Verified against it on the golden fixtures: 34/34 for sunaphā and anaphā
 * across seventeen charts. Offer this as a "match Jagannātha Hora" toggle to a
 * practitioner reconciling Jade against the tool they already use — the
 * differences are definitional, not arithmetical, and this proves it.
 */
export const JHORA_COMPATIBLE: YogaOptions = {
  nodesCountAsGrahas: true,
  sunSpoilsLunarYogas: true,
  lunarSolarReporting: 'inclusive',
};

// ---------------------------------------------------------------------------
// helpers

const KENDRAS = [1, 4, 7, 10];

/**
 * House 1–12 counted from `fromSign` to `sign`, inclusive of both.
 *
 * Inclusive counting is the Jyotiṣa convention and it is where off-by-ones
 * come from: the reference sign is the **1st**, the next is the 2nd, and the
 * one before is the 12th. Nothing is ever the 0th and nothing is ever the 13th.
 */
export function houseFrom(fromSign: number, sign: number): number {
  return ((((sign - fromSign) % 12) + 12) % 12) + 1;
}

const signName = (i: number): string => SIGNS[((i % 12) + 12) % 12]!;

/** Own sign — either of the two for the five that own two. */
function inOwnSign(graha: Graha, chart: YogaChart): boolean {
  return SIGN_LORDS[chart.signOf[graha]] === graha;
}

function inMoolatrikona(graha: Graha, chart: YogaChart): boolean {
  const mt = MOOLATRIKONA[graha];
  if (!mt || chart.signOf[graha] !== mt.sign) return false;
  const d = chart.degreeOf[graha];
  return d >= mt.from && d < mt.to;
}

function inExaltation(graha: Graha, chart: YogaChart): boolean {
  return EXALTATION[graha]?.sign === chart.signOf[graha];
}

/** Debilitation is the sign opposite exaltation. */
export function inDebilitation(graha: Graha, chart: YogaChart): boolean {
  const ex = EXALTATION[graha];
  return ex !== undefined && chart.signOf[graha] === (ex.sign + 6) % 12;
}

// ---------------------------------------------------------------------------
// Pañca Mahāpuruṣa

const MAHAPURUSHA: readonly { graha: Graha; id: string; name: string; plain: string }[] = [
  { graha: 'Mars', id: 'ruchaka', name: 'Rucaka', plain: 'Ruchaka' },
  { graha: 'Mercury', id: 'bhadra', name: 'Bhadra', plain: 'Bhadra' },
  { graha: 'Jupiter', id: 'hamsa', name: 'Haṁsa', plain: 'Hamsa' },
  { graha: 'Venus', id: 'malavya', name: 'Mālavya', plain: 'Malavya' },
  { graha: 'Saturn', id: 'sasa', name: 'Śaśa', plain: 'Sasa' },
];

function panchaMahapurusha(chart: YogaChart, options: Required<YogaOptions>): YogaHit[] {
  const hits: YogaHit[] = [];
  for (const { graha, id, name, plain } of MAHAPURUSHA) {
    const sign = chart.signOf[graha];

    const dignities: string[] = [];
    if (inMoolatrikona(graha, chart)) dignities.push('its mūlatrikoṇa');
    else if (inOwnSign(graha, chart)) dignities.push('its own sign');
    if (inExaltation(graha, chart)) dignities.push('exaltation');
    if (dignities.length === 0) continue;

    const references: string[] = [];
    const fromLagna = houseFrom(chart.ascendantSign, sign);
    const fromMoon = houseFrom(chart.signOf.Moon, sign);
    const wantLagna = options.mahapurushaReference !== 'moon';
    const wantMoon = options.mahapurushaReference !== 'lagna';
    if (wantLagna && KENDRAS.includes(fromLagna)) {
      references.push(`the ${ordinal(fromLagna)} from the ascendant, a kendra`);
    }
    if (wantMoon && KENDRAS.includes(fromMoon)) {
      references.push(`the ${ordinal(fromMoon)} from the Moon, a kendra`);
    }
    if (references.length === 0) continue;

    hits.push({
      id,
      name: `${name} yoga`,
      plain: `${plain} yoga`,
      source: 'BPHS, Pañca Mahāpuruṣa yogas',
      summary: `${graha} is strong by both sign and angle.`,
      factors: [
        `${graha} in ${signName(sign)}, ${dignities.join(' and ')}`,
        ...references.map((r) => `${graha} in ${r}`),
      ],
    });
  }
  return hits;
}

function ordinal(n: number): string {
  const suffix =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `${n}${suffix}`;
}

// ---------------------------------------------------------------------------
// Lunar and solar company

function grahasIn(
  house: number,
  fromSign: number,
  chart: YogaChart,
  exclude: readonly Graha[],
  options: Required<YogaOptions>,
): Graha[] {
  const pool: Graha[] = options.nodesCountAsGrahas
    ? [...CLASSICAL, 'Rahu', 'Ketu']
    : [...CLASSICAL];
  return pool.filter(
    (g) =>
      !exclude.includes(g) &&
      chart.signOf[g] !== undefined &&
      houseFrom(fromSign, chart.signOf[g]) === house,
  );
}

/**
 * Sunaphā / anaphā / durudhurā and veśi / vāsi / ubhayacharī share one shape:
 * is the 2nd from the luminary occupied, the 12th, both, or neither. Writing
 * it once keeps the two sets from drifting apart.
 */
function attendanceYogas(
  chart: YogaChart,
  options: Required<YogaOptions>,
  spec: {
    fromSign: number;
    luminary: 'Moon' | 'Sun';
    source: string;
    second: { id: string; name: string; plain: string; summary: string };
    twelfth: { id: string; name: string; plain: string; summary: string };
    both: { id: string; name: string; plain: string; summary: string };
  },
): { hits: YogaHit[]; occupied: boolean } {
  const { fromSign, luminary, source } = spec;
  const other: Graha = luminary === 'Moon' ? 'Sun' : 'Moon';
  const exclude: Graha[] = [luminary, other];

  const sunHouse = houseFrom(fromSign, chart.signOf.Sun);
  const spoiled = (house: number): boolean => options.sunSpoilsLunarYogas && sunHouse === house;

  // Occupancy and yoga-formation are separate questions. Under the strict
  // reading the Sun's presence stops the *named yoga* forming, but grahas
  // standing there are still standing there — which matters downstream,
  // because kemadruma asks whether the Moon is alone, not whether anaphā
  // formed. Conflating the two reports a solitary Moon flanked by Mars and
  // Mercury.
  const rawSecond = grahasIn(2, fromSign, chart, exclude, options);
  const rawTwelfth = grahasIn(12, fromSign, chart, exclude, options);
  const secondOccupants = spoiled(2) ? [] : rawSecond;
  const twelfthOccupants = spoiled(12) ? [] : rawTwelfth;

  const describe = (house: number, who: Graha[]): string =>
    `${who.join(', ')} in the ${ordinal(house)} from the ${luminary} (${signName(fromSign + house - 1)})`;

  const hasSecond = secondOccupants.length > 0;
  const hasTwelfth = twelfthOccupants.length > 0;
  const hits: YogaHit[] = [];

  const push = (
    meta: { id: string; name: string; plain: string; summary: string },
    factors: string[],
  ): void => {
    hits.push({ ...meta, source, factors });
  };

  if (hasSecond && hasTwelfth) {
    if (options.lunarSolarReporting === 'inclusive') {
      push(spec.second, [describe(2, secondOccupants)]);
      push(spec.twelfth, [describe(12, twelfthOccupants)]);
    }
    push(spec.both, [describe(2, secondOccupants), describe(12, twelfthOccupants)]);
  } else if (hasSecond) {
    push(spec.second, [describe(2, secondOccupants)]);
  } else if (hasTwelfth) {
    push(spec.twelfth, [describe(12, twelfthOccupants)]);
  }

  return { hits, occupied: rawSecond.length > 0 || rawTwelfth.length > 0 };
}

function lunarYogas(chart: YogaChart, options: Required<YogaOptions>): YogaHit[] {
  const moonSign = chart.signOf.Moon;
  const { hits, occupied } = attendanceYogas(chart, options, {
    fromSign: moonSign,
    luminary: 'Moon',
    source: 'BPHS, Candra yogas',
    second: {
      id: 'sunapha',
      name: 'Sunaphā yoga',
      plain: 'Sunapha yoga',
      summary: 'The Moon is attended in the sign that follows it.',
    },
    twelfth: {
      id: 'anapha',
      name: 'Anaphā yoga',
      plain: 'Anapha yoga',
      summary: 'The Moon is attended in the sign that precedes it.',
    },
    both: {
      id: 'durudhura',
      name: 'Durudhurā yoga',
      plain: 'Durudhura yoga',
      summary: 'The Moon is attended on both sides.',
    },
  });

  if (occupied) return hits;

  // Kemadruma, and the cancellations without which reporting it is dishonest.
  // This is the yoga most likely to frighten someone reading only its name.
  const cancellations: string[] = [];
  const moonFromLagna = houseFrom(chart.ascendantSign, moonSign);
  if (KENDRAS.includes(moonFromLagna)) {
    cancellations.push(
      `the Moon itself is in the ${ordinal(moonFromLagna)} from the ascendant, a kendra`,
    );
  }
  const kendraOccupants = CLASSICAL.filter(
    (g) =>
      g !== 'Moon' &&
      g !== 'Sun' &&
      KENDRAS.includes(houseFrom(chart.ascendantSign, chart.signOf[g])),
  );
  if (kendraOccupants.length > 0) {
    const verb = kendraOccupants.length === 1 ? 'occupies' : 'occupy';
    cancellations.push(`${kendraOccupants.join(', ')} ${verb} a kendra from the ascendant`);
  }
  const withMoon = BENEFICS.filter((g) => chart.signOf[g] === moonSign);
  if (withMoon.length > 0) {
    cancellations.push(`the Moon is joined by ${withMoon.join(', ')}`);
  }

  return [
    {
      id: 'kemadruma',
      name: 'Kemadruma yoga',
      plain: 'Kemadruma yoga',
      source: 'BPHS, Candra yogas',
      summary: 'The Moon stands alone, unattended on either side.',
      factors: [
        `no graha in the 2nd from the Moon (${signName(moonSign + 1)})`,
        `no graha in the 12th from the Moon (${signName(moonSign + 11)})`,
        options.nodesCountAsGrahas
          ? 'counting Rāhu and Ketu as grahas'
          : 'not counting Rāhu and Ketu, per Parāśara',
      ],
      ...(cancellations.length > 0 ? { cancellations } : {}),
    },
  ];
}

function solarYogas(chart: YogaChart, options: Required<YogaOptions>): YogaHit[] {
  return attendanceYogas(chart, options, {
    fromSign: chart.signOf.Sun,
    luminary: 'Sun',
    source: 'BPHS, Sūrya yogas',
    second: {
      id: 'vesi',
      name: 'Veśi yoga',
      plain: 'Vesi yoga',
      summary: 'The Sun is attended in the sign that follows it, the Moon excepted.',
    },
    twelfth: {
      id: 'vasi',
      name: 'Vāsi yoga',
      plain: 'Vasi yoga',
      summary: 'The Sun is attended in the sign that precedes it, the Moon excepted.',
    },
    both: {
      id: 'ubhayachari',
      name: 'Ubhayacarī yoga',
      plain: 'Ubhayachari yoga',
      summary: 'The Sun is attended on both sides, the Moon excepted.',
    },
  }).hits;
}

// ---------------------------------------------------------------------------
// The rest of the classical core

function otherYogas(chart: YogaChart, options: Required<YogaOptions>): YogaHit[] {
  const hits: YogaHit[] = [];
  const moonSign = chart.signOf.Moon;

  // Gaja Kesari — Jupiter in a kendra from the Moon.
  const jupiterFromMoon = houseFrom(moonSign, chart.signOf.Jupiter);
  if (KENDRAS.includes(jupiterFromMoon)) {
    hits.push({
      id: 'gaja_kesari',
      name: 'Gajakesarī yoga',
      plain: 'Gaja Kesari yoga',
      source: 'BPHS',
      summary: 'Jupiter stands at an angle from the Moon.',
      factors: [
        `Jupiter in ${signName(chart.signOf.Jupiter)}, the ${ordinal(jupiterFromMoon)} from the Moon, a kendra`,
        `Moon in ${signName(moonSign)}`,
      ],
    });
  }

  // Budha-Āditya — Mercury with the Sun.
  if (chart.signOf.Mercury === chart.signOf.Sun) {
    hits.push({
      id: 'budha_aditya',
      name: 'Budhāditya yoga',
      plain: 'Budha-Aditya yoga',
      source: 'BPHS',
      summary: 'Mercury and the Sun share a sign.',
      factors: [`Sun and Mercury both in ${signName(chart.signOf.Sun)}`],
    });
  }

  // Candra-Maṅgala — the Moon with Mars.
  if (chart.signOf.Moon === chart.signOf.Mars) {
    hits.push({
      id: 'chandra_mangala',
      name: 'Candra-Maṅgala yoga',
      plain: 'Chandra-Mangala yoga',
      source: 'BPHS',
      summary: 'The Moon and Mars share a sign.',
      factors: [`Moon and Mars both in ${signName(moonSign)}`],
    });
  }

  // Adhi — the benefics in the 6th, 7th and 8th from the Moon.
  const adhiHouses = [6, 7, 8];
  const adhiPlacements = BENEFICS.filter((g) =>
    adhiHouses.includes(houseFrom(moonSign, chart.signOf[g])),
  );
  if (adhiPlacements.length === BENEFICS.length) {
    hits.push({
      id: 'adhi',
      name: 'Adhi yoga',
      plain: 'Adhi yoga',
      source: 'BPHS',
      summary: 'All three natural benefics fall in the 6th, 7th and 8th from the Moon.',
      factors: BENEFICS.map(
        (g) =>
          `${g} in ${signName(chart.signOf[g])}, the ${ordinal(houseFrom(moonSign, chart.signOf[g]))} from the Moon`,
      ),
    });
  }

  // Viparīta Rāja — a lord of the 6th, 8th or 12th sitting in another of them.
  // The three have their own names, which is how a practitioner refers to them.
  const VIPAREETA: Record<number, { id: string; name: string; plain: string }> = {
    6: { id: 'harsha', name: 'Harṣa yoga', plain: 'Harsha yoga' },
    8: { id: 'sarala', name: 'Sarala yoga', plain: 'Sarala yoga' },
    12: { id: 'vimala', name: 'Vimala yoga', plain: 'Vimala yoga' },
  };
  const dusthanas = [6, 8, 12];
  for (const house of dusthanas) {
    const sign = (chart.ascendantSign + house - 1) % 12;
    const lord = lordOfSign(sign);
    const lordHouse = houseFrom(chart.ascendantSign, chart.signOf[lord]);
    if (dusthanas.includes(lordHouse) && lordHouse !== house) {
      const named = VIPAREETA[house]!;
      hits.push({
        id: named.id,
        name: `${named.name} (viparīta rāja)`,
        plain: `${named.plain} (vipareeta raja)`,
        source: 'BPHS, on the lords of the dusthānas',
        summary: `The lord of the ${ordinal(house)} occupies another of the difficult houses.`,
        factors: [
          `the ${ordinal(house)} is ${signName(sign)}, ruled by ${lord}`,
          `${lord} sits in ${signName(chart.signOf[lord])}, the ${ordinal(lordHouse)} — also a dusthāna`,
        ],
      });
    }
  }

  // Nīcabhaṅga — a debilitated graha whose debilitation is cancelled.
  for (const graha of CLASSICAL) {
    if (!inDebilitation(graha, chart)) continue;
    const debilitationSign = chart.signOf[graha];
    const dispositor = lordOfSign(debilitationSign);
    const reasons: string[] = [];
    // The lord of the sign of debilitation is in a kendra from the ascendant.
    const dispositorHouse = houseFrom(chart.ascendantSign, chart.signOf[dispositor]);
    if (KENDRAS.includes(dispositorHouse)) {
      reasons.push(
        `${dispositor}, lord of ${signName(debilitationSign)}, is in the ${ordinal(dispositorHouse)}, a kendra from the ascendant`,
      );
    }
    // The graha exalted in that sign is in a kendra from the ascendant.
    const exaltedRuler = (Object.keys(EXALTATION) as Graha[]).find(
      (g) => EXALTATION[g]?.sign === debilitationSign,
    );
    if (exaltedRuler) {
      const h = houseFrom(chart.ascendantSign, chart.signOf[exaltedRuler]);
      if (KENDRAS.includes(h)) {
        reasons.push(
          `${exaltedRuler}, which is exalted in ${signName(debilitationSign)}, is in the ${ordinal(h)}, a kendra`,
        );
      }
    }
    if (reasons.length === 0) continue;

    hits.push({
      id: `neechabhanga_${graha.toLowerCase()}`,
      name: 'Nīcabhaṅga Rāja yoga',
      plain: 'Neechabhanga Raja yoga',
      source: 'BPHS, on the cancellation of debilitation',
      summary: `${graha} is debilitated, and the debilitation is cancelled.`,
      factors: [`${graha} debilitated in ${signName(debilitationSign)}`, ...reasons],
    });
  }

  void options;
  return hits;
}

// ---------------------------------------------------------------------------

export function detectYogas(chart: YogaChart, options: YogaOptions = {}): YogaHit[] {
  const merged = { ...DEFAULTS, ...options };
  return [
    ...panchaMahapurusha(chart, merged),
    ...lunarYogas(chart, merged),
    ...solarYogas(chart, merged),
    ...otherYogas(chart, merged),
  ];
}

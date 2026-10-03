import {
  EXALTATION,
  SIGNS,
  VARGA_NAMES,
  buildVargaChart,
  lordOfSign,
  naturalRelation,
  rulesSign,
  type ComputedChart,
  type Graha,
  type VargaId,
} from '@jade/astro';
import type { Working } from '../plainReading.js';

/**
 * The divisional charts, read.
 *
 * ## Sixteen computed, none spoken
 *
 * Every varga is computed, re-seated on its own ascendant, and drawn in a
 * contact sheet. Until this module the only sentence about a varga anywhere in
 * Jade was a geometric definition of how D9 cuts a sign into nine parts. A
 * practitioner could look at sixteen beautiful grids and be told nothing about
 * any of them.
 *
 * ## Why six and not sixteen
 *
 * Reading all sixteen would produce sixteen paragraphs of the same shape with
 * the nouns swapped, which is the failure this whole layer exists to avoid.
 * The six below are the ones whose scope the texts agree about and which a
 * working astrologer actually opens: the navāṁśa behind every reading, the
 * daśāṁśa for work, the saptāṁśa for what you make, the dvādaśāṁśa for what
 * you came from, the caturthāṁśa for where you live, and the triṁśāṁśa for
 * what tests you.
 *
 * The other ten stay drawn and unread, and `UNREAD_VARGAS` says so by name —
 * an absence a reader can see is a decision, and a silent one is a gap.
 *
 * ## The signal that is actually worth the page
 *
 * Four of the five detectors below describe a varga on its own terms. The
 * fifth — `shift` — compares the graha's standing in the rāśi against its
 * standing in the divisional, and that comparison is the whole classical use
 * of a varga: a graha exalted in D1 and debilitated in D9 is the chart saying
 * a thing looks better than it works, and no amount of describing either chart
 * separately says it. It is also the one claim here that no fragment table
 * could produce, because it is a relation between two computed facts.
 *
 * ## Vargottama
 *
 * Same sign in the rāśi and the divisional. The texts are unusually united
 * that this is the strongest a graha gets, and it is cheap to detect and
 * impossible to see by eye across sixteen grids — which makes it the single
 * highest-value thing this module prints.
 */

export interface VargaTopic {
  readonly id: VargaId;
  /** What the texts agree this division is about. A heading. */
  readonly topic: string;
  /**
   * The same thing in a form that survives being dropped into a clause.
   *
   * `topic` is a heading and reads as one — "work, and standing in it" cannot
   * follow the word "concentrates". Every explanatory sentence here names the
   * division's subject mid-clause, so each needs a form that does not have to
   * be read twice.
   */
  readonly inSentence: string;
  /** The question somebody opens it to answer. */
  readonly asks: string;
  /** The graha the tradition reads first here, when there is one. */
  readonly karaka?: Graha;
}

export const READ_VARGAS: readonly VargaTopic[] = [
  {
    id: 'D9',
    topic: 'what the chart is actually made of',
    inSentence: 'what this chart is made of',
    asks: 'Does this hold up, or only look as though it does?',
    karaka: 'Venus',
  },
  {
    id: 'D10',
    topic: 'work, and standing in it',
    inSentence: 'the working life',
    asks: 'What am I for, as far as the work is concerned?',
    karaka: 'Sun',
  },
  {
    id: 'D7',
    topic: 'children and what else you make',
    inSentence: 'what you make',
    asks: 'What comes out of me, and does it carry on?',
    karaka: 'Jupiter',
  },
  {
    id: 'D12',
    topic: 'parents, and what came down the line',
    inSentence: 'what came down the line',
    asks: 'What did I inherit before I chose anything?',
  },
  {
    id: 'D4',
    topic: 'home, land and the settled life',
    inSentence: 'the settled life',
    asks: 'Where do I put down, and does it hold?',
    karaka: 'Mars',
  },
  {
    id: 'D30',
    topic: 'what tests you',
    inSentence: 'what tests you',
    asks: 'Where does this chart get put under pressure?',
  },
];

/**
 * The ten that are drawn and not read, and why.
 *
 * Not an apology. The scope of these is either narrow enough that a general
 * reading would be noise, or disputed enough between schools that composing
 * one sentence would mean picking a side silently — which is the thing Jade
 * does not do.
 */
export const UNREAD_VARGAS: readonly { id: VargaId; why: string }[] = [
  { id: 'D1', why: 'The rāśi itself, read everywhere else in Jade.' },
  {
    id: 'D2',
    why: 'Wealth, and Jade restricts the horā to Cancer and Leo — a two-sign chart carries too little to read.',
  },
  {
    id: 'D3',
    why: 'Siblings and courage. Read by most schools from the rāśi third house instead.',
  },
  { id: 'D16', why: 'Vehicles and comforts. Scope is narrow and the schools differ on it.' },
  {
    id: 'D20',
    why: 'Spiritual practice. Reading somebody’s sādhanā from a grid is not something Jade will do.',
  },
  {
    id: 'D24',
    why: 'Learning. Overlaps the fifth and the ninth closely enough that a separate reading would repeat them.',
  },
  {
    id: 'D27',
    why: 'Strength and weakness in general — a quantity, and Jade does not print those.',
  },
  {
    id: 'D40',
    why: 'Maternal lineage. Used mainly inside vimśopaka strength, which is not built.',
  },
  { id: 'D45', why: 'Paternal lineage. The same.' },
  {
    id: 'D60',
    why: 'The finest division, and the one most sensitive to a wrong birth minute. Reading it from an unrectified time would be false precision.',
  },
];

export type VargaSignal = 'vargottama' | 'dignified' | 'afflicted' | 'shift' | 'crowded' | 'karaka';

export interface VargaReading {
  readonly vargaId: VargaId;
  /** "Navāṁśa", from the astro package's own table. */
  readonly name: string;
  readonly topic: string;
  readonly asks: string;
  readonly body: readonly string[];
  readonly signals: readonly VargaSignal[];
  readonly workings: readonly Working[];
}

const ORDINAL = [
  'first',
  'second',
  'third',
  'fourth',
  'fifth',
  'sixth',
  'seventh',
  'eighth',
  'ninth',
  'tenth',
  'eleventh',
  'twelfth',
];

const GRAHAS: readonly Graha[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function named(id: string): string {
  return id === 'Sun' || id === 'Moon' ? `the ${id}` : id;
}

function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * How a graha stands in a sign, judged by the sign alone.
 *
 * A varga position is a sign, not a degree — the division threw the degree
 * away. So mūlatrikoṇa, which is degree-bounded, cannot be assessed here and
 * is deliberately absent rather than approximated by its sign. Exaltation and
 * debilitation are sign-level in the texts and survive the division.
 */
type SignStanding = 'exalted' | 'own' | 'friend' | 'neutral' | 'enemy' | 'debilitated';

function standingIn(graha: Graha, signIndex: number): SignStanding {
  const exaltation = EXALTATION[graha];
  if (exaltation) {
    if (exaltation.sign === signIndex) return 'exalted';
    if ((exaltation.sign + 6) % 12 === signIndex) return 'debilitated';
  }
  if (rulesSign(graha, signIndex)) return 'own';
  const relation = naturalRelation(graha, lordOfSign(signIndex));
  return relation === 'friend' ? 'friend' : relation === 'enemy' ? 'enemy' : 'neutral';
}

/** Ranked, so `shift` can say which way a graha moved between two charts. */
const STANDING_RANK: Record<SignStanding, number> = {
  debilitated: 0,
  enemy: 1,
  neutral: 2,
  friend: 3,
  own: 4,
  exalted: 5,
};

/**
 * The same standings as a bare noun, for after "from" and "to".
 *
 * `STANDING_WORD` carries its own preposition because it follows a verb —
 * "is in a friend's sign". Reusing it after "from" produced "goes from in an
 * enemy's sign", which is the sort of thing a template produces and a person
 * does not.
 */
const STANDING_BARE: Record<SignStanding, string> = {
  exalted: 'exaltation',
  own: 'its own sign',
  friend: 'a friend’s sign',
  neutral: 'a neutral sign',
  enemy: 'an enemy’s sign',
  debilitated: 'debilitation',
};

const STANDING_WORD: Record<SignStanding, string> = {
  exalted: 'exalted',
  own: 'in its own sign',
  friend: 'in a friend’s sign',
  neutral: 'in a neutral sign',
  enemy: 'in an enemy’s sign',
  debilitated: 'debilitated',
};

/**
 * Read one division.
 *
 * `told` is the gloss book. Every detector here has a claim specific to this
 * division and an explanation that is true of divisions in general; printed
 * straight, the general half appears six times with one noun swapped, which is
 * how a reading starts sounding generated. Pass the same map through all six
 * and each idea is explained once. Omit it and the reading stands alone, which
 * is what a single-division view wants.
 */
export function readVarga(
  chart: ComputedChart,
  topic: VargaTopic,
  told?: Map<string, string> | undefined,
): VargaReading {
  const varga = buildVargaChart(chart, topic.id);
  const body: string[] = [];
  const signals: VargaSignal[] = [];
  const workings: Working[] = [];

  /** The specific claim always prints; the generic gloss prints once. */
  function say(key: string, claim: string, gloss?: string): void {
    if (!gloss || told?.has(key)) {
      body.push(claim);
      return;
    }
    told?.set(key, '');
    body.push(`${claim} ${gloss}`);
  }

  workings.push({
    label: `${VARGA_NAMES[topic.id]} lagna`,
    detail: SIGNS[varga.ascendantSign] ?? `sign ${varga.ascendantSign}`,
  });

  const signOf = (graha: Graha): number | undefined => chart.vargas[graha]?.[topic.id];
  const rasiSignOf = (graha: Graha): number | undefined => chart.points[graha]?.signIndex;

  // ------------------------------------------------------------ vargottama
  /*
   * The same sign in the rāśi and here. Cheap to detect, impossible to see by
   * eye across sixteen grids, and the one thing the texts are united about.
   */
  const vargottama = GRAHAS.filter((graha) => {
    const here = signOf(graha);
    const there = rasiSignOf(graha);
    return here !== undefined && there !== undefined && here === there;
  });

  if (vargottama.length > 0) {
    signals.push('vargottama');
    say(
      'vargottama',
      `${cap(list(vargottama.map(named)))} ${vargottama.length === 1 ? 'is' : 'are'} vargottama here — the same sign in the rāśi and in the ${VARGA_NAMES[topic.id]}.`,
      `A division moves almost everything; a graha it did not move is doing the same thing underneath that it does on the surface, which the texts read as the strongest a graha gets.`,
    );
    for (const graha of vargottama) {
      workings.push({
        label: `${graha} vargottama`,
        detail: `${SIGNS[signOf(graha)!]} in both D1 and ${topic.id}`,
      });
    }
  }

  // --------------------------------------------------------------- the shift
  /*
   * The comparison that is the whole classical use of a divisional. A graha
   * that stands well in the rāśi and badly here is the chart saying a thing
   * looks better than it works; the reverse is the thing that turns out to
   * have more in it than it showed. Neither is visible in either chart alone.
   */
  const moved = GRAHAS.map((graha) => {
    const here = signOf(graha);
    const there = rasiSignOf(graha);
    if (here === undefined || there === undefined || here === there) return null;
    const from = standingIn(graha, there);
    const to = standingIn(graha, here);
    const delta = STANDING_RANK[to] - STANDING_RANK[from];
    return Math.abs(delta) >= 3 ? { graha, from, to, delta } : null;
  }).filter((one): one is NonNullable<typeof one> => one !== null);

  if (moved.length > 0) {
    signals.push('shift');
    const fell = moved.filter((one) => one.delta < 0);
    const rose = moved.filter((one) => one.delta > 0);

    if (fell.length > 0) {
      say(
        'fell',
        `In the ${VARGA_NAMES[topic.id]}, ${list(
          fell.map(
            (one) =>
              `${named(one.graha)} falls from ${STANDING_BARE[one.from]} in the birth chart to ${STANDING_BARE[one.to]}`,
          ),
        )}.`,
        `Standing well in the rāśi and poorly in a division is the oldest warning the technique gives: the thing is promised and does not hold its shape when you look at what it is made of. Not that the promise is false — that the strength was in the appearance.`,
      );
    }
    if (rose.length > 0) {
      say(
        'rose',
        /* The division is named in the claim. The same graha can make the
           same move in three divisions, and three identical sentences read as
           one sentence printed three times rather than as three facts. */
        `In the ${VARGA_NAMES[topic.id]} the other direction: ${list(
          rose.map(
            (one) =>
              `${named(one.graha)} goes from ${STANDING_BARE[one.from]} to ${STANDING_BARE[one.to]}`,
          ),
        )}.`,
        `Read as something with more in it than the birth chart shows — undersold rather than oversold, and usually discovered late.`,
      );
    }
    for (const one of moved) {
      workings.push({
        label: `${one.graha} D1 → ${topic.id}`,
        detail: `${SIGNS[rasiSignOf(one.graha)!]} (${one.from}) → ${SIGNS[signOf(one.graha)!]} (${one.to})`,
      });
    }
  }

  // --------------------------------------------------------- standing here
  /*
   * Excluding anything `shift` already named.
   *
   * A graha that moved from exalted to debilitated has had both ends of that
   * move reported; adding "and it is debilitated here" is the same fact a
   * second time, and two sentences about one placement reads as a template
   * firing twice rather than as a reading.
   */
  const alreadySaid = new Set(moved.map((one) => one.graha));
  const exalted = GRAHAS.filter((g) => {
    const s = signOf(g);
    return !alreadySaid.has(g) && s !== undefined && standingIn(g, s) === 'exalted';
  });
  const debilitated = GRAHAS.filter((g) => {
    const s = signOf(g);
    return !alreadySaid.has(g) && s !== undefined && standingIn(g, s) === 'debilitated';
  });

  if (exalted.length > 0) {
    signals.push('dignified');
    say(
      'exalted',
      `${cap(list(exalted.map(named)))} ${exalted.length === 1 ? 'is' : 'are'} exalted in ${topic.inSentence}.`,
      `A graha exalted inside a division is given the best ground that part of the chart has, whatever it happens to be carrying.`,
    );
  }
  if (debilitated.length > 0) {
    signals.push('afflicted');
    say(
      'debilitated',
      `${cap(list(debilitated.map(named)))} ${debilitated.length === 1 ? 'is' : 'are'} debilitated in ${topic.inSentence}.`,
      `Debilitation inside a division says that part works against the grain. The classical reading is not failure but effort that does not convert at the rate it should, and the texts spend more pages on its cancellations than on the condition itself.`,
    );
  }

  // ---------------------------------------------------------------- karaka
  if (topic.karaka) {
    const sign = signOf(topic.karaka);
    if (sign !== undefined) {
      const house = ((sign - varga.ascendantSign + 12) % 12) + 1;
      const standing = standingIn(topic.karaka, sign);
      signals.push('karaka');
      say(
        'karaka',
        `${cap(named(topic.karaka))}, which this division is read from first, sits in the ${ORDINAL[house - 1]}, ${STANDING_WORD[standing]}.`,
        `In a divisional the kāraka is the subject of the chart rather than one feature of it, so where it sits is where the thing actually happens.`,
      );
      workings.push({
        label: `${topic.karaka} in ${topic.id}`,
        detail: `${SIGNS[sign]}, the ${ORDINAL[house - 1]} — ${standing}`,
      });
    }
  }

  // --------------------------------------------------------------- crowding
  /*
   * Three or more in one sign of a division is a concentration that cannot
   * happen by the sign alone — the division scattered everything else and did
   * not scatter these.
   */
  const crowded = varga.bySign
    .map((points, signIndex) => ({ signIndex, points: points.filter((p) => p !== 'Ascendant') }))
    .filter((one) => one.points.length >= 3);

  if (crowded.length > 0) {
    signals.push('crowded');
    for (const pile of crowded) {
      const house = ((pile.signIndex - varga.ascendantSign + 12) % 12) + 1;
      say(
        'crowded',
        `${cap(list(pile.points.map((p) => named(p as string))))} all land in the ${ORDINAL[house - 1]} of this division.`,
        `Dividing a chart scatters it — that is what dividing does — so a pile that survives the division is the chart insisting, concentrating into one place what it could have spread.`,
      );
      workings.push({
        label: `${pile.points.length} in ${SIGNS[pile.signIndex]}`,
        detail: `the ${ORDINAL[house - 1]} of ${topic.id}`,
      });
    }
  }

  /* Nothing remarkable is an answer, and saying so is better than silence. */
  if (body.length === 0) {
    body.push(
      `Nothing in this division stands out: no graha held its sign across it, none moved far in standing, and none is exalted or debilitated here. The chart has no particular argument about ${topic.inSentence} beyond what the birth chart already said.`,
    );
  }

  return {
    vargaId: topic.id,
    name: VARGA_NAMES[topic.id],
    topic: topic.topic,
    asks: topic.asks,
    body,
    signals,
    workings,
  };
}

/** The six, in the order a practitioner opens them, each idea explained once. */
export function readVargas(chart: ComputedChart): VargaReading[] {
  const told = new Map<string, string>();
  return READ_VARGAS.map((topic) => readVarga(chart, topic, told));
}

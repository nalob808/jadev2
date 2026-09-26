import {
  GRAHA_DRISHTI,
  SIGNS,
  aspectsOnSign,
  lordOfSign,
  type ComputedChart,
  type Dignity,
  type Graha,
  type PointId,
} from '@jade/astro';
import {
  HOUSE_CLASS_LABELS,
  houseSignification,
  type HouseSignification,
} from './significations/houses.js';
import { grahaSignification } from './significations/grahas.js';
import { lordSurvey, type LordPlacement } from './lords.js';

/**
 * The twelve houses, read one at a time.
 *
 * ## Why this is the view people actually want
 *
 * Jade could already tell you where every graha sits and where every house lord
 * went. Neither answers the question a student actually asks, which is "what
 * about my seventh?" — and that question needs four things joined: the sign on
 * the house, its lord and where the lord went, what is sitting in it, and what
 * is looking at it. Those four live in four different places in this codebase.
 * Joining them is the whole feature.
 *
 * ## Every sentence here is assembled, never written
 *
 * The composed statements are built from the significations libraries plus the
 * computed chart, and each one carries the placements that produced it
 * (CLAUDE.md #5). Nothing is a stored paragraph about "the 7th lord in the 5th"
 * — there are 144 such combinations before dignity, and a library of canned
 * prose for them is exactly the unsourced boilerplate the expensive desktop
 * programs ship and nobody trusts.
 *
 * `source` carries the classical citation where a statement rests on a
 * classical rule rather than on arithmetic, so a reader can go and check it.
 *
 * ## The rule this module must not break
 *
 * The eighth house signifies longevity and the sixth signifies illness. Jade
 * reports what occupies and aspects them and stops there. No statement composed
 * here may predict death, disease or a legal outcome (CLAUDE.md #6), and a test
 * asserts it against every fixture rather than trusting the phrasing to hold as
 * these strings get edited.
 */

export interface HouseOccupant {
  readonly graha: Graha;
  readonly degreesInSign: number;
  readonly dignity: Dignity | null;
  readonly retrograde: boolean;
  readonly combust: boolean;
  readonly cazimi: boolean;
  /** True when this graha also rules the house it is sitting in. */
  readonly ownHouse: boolean;
  /** Which other house this graha rules, if any. */
  readonly alsoRules: readonly number[];
}

export interface HouseAspect {
  readonly graha: Graha;
  /** 3, 4, 5, 7, 8, 9 or 10 — counted from the aspecting graha's own sign. */
  readonly distance: number;
  /** Everything but the universal seventh. */
  readonly special: boolean;
  readonly strength: number;
}

export interface ReadingStatement {
  readonly text: string;
  /** Never empty. The chart rows the sentence rests on. */
  readonly factors: readonly { kind: string; detail: string }[];
  /** Named when the statement rests on a classical rule rather than arithmetic. */
  readonly source?: string;
}

export interface HouseReading {
  readonly house: number;
  readonly sign: string;
  readonly signIndex: number;
  readonly signification: HouseSignification;
  readonly lord: LordPlacement;
  readonly occupants: readonly HouseOccupant[];
  readonly aspects: readonly HouseAspect[];
  /** The natural significator, and where it sits in this chart. */
  readonly karaka: { readonly graha: string; readonly inHouse: number | null };
  readonly statements: readonly ReadingStatement[];
  /** "kendra · trikoṇa" — the classifications, for a chip row. */
  readonly labels: readonly string[];
}

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

function ordinal(house: number): string {
  return ORDINALS[house - 1] ?? `${house}th`;
}

const DIGNITY_PHRASE: Record<Dignity, string> = {
  exalted: 'exalted, and acting at its full strength',
  moolatrikona: 'in its mūlatrikoṇa, which is nearly as strong as exaltation',
  own: 'in its own sign, settled and unobstructed',
  great_friend: 'in a great friend’s sign',
  friend: 'in a friendly sign',
  neutral: 'in a neutral sign',
  enemy: 'in an enemy’s sign',
  great_enemy: 'in a great enemy’s sign',
  debilitated: 'debilitated, and its significations come under strain here',
};

/** Degrees as 12°34′. */
function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/** A house's first few significations, for composing into a sentence. */
function keywordsOf(house: number, count = 3): string {
  const entry = houseSignification(house);
  if (!entry) return `the ${ordinal(house)} house`;
  return entry.keywords.slice(0, count).join(', ');
}

/** `Aspect.from` is a `PointId`; only the nine cast dṛṣṭi. Narrowed, not cast. */
const isGraha = (id: PointId): id is Graha => id in GRAHA_DRISHTI;

const GRAHAS: readonly Graha[] = [
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
 * Read all twelve houses.
 *
 * Pure, like everything it draws on. `includeNodes` decides whether Rāhu and
 * Ketu are treated as casting dṛṣṭi — widely taught, not in BPHS, so it is an
 * option with a stated default rather than a silent choice (CLAUDE.md working
 * rules).
 */
export function houseReadings(
  chart: ComputedChart,
  options: { readonly includeNodes?: boolean } = {},
): HouseReading[] {
  const includeNodes = options.includeNodes ?? true;
  const ascSign = chart.houses.ascendantSign;
  const survey = lordSurvey(chart);

  /** Placements once, for the aspect scan. */
  const placements = GRAHAS.filter((id) => chart.points[id]).map((id) => ({
    pointId: id as PointId,
    signIndex: chart.points[id]!.signIndex,
  }));

  const ruledBy = new Map<Graha, number[]>();
  for (let house = 1; house <= 12; house += 1) {
    const lord = lordOfSign((ascSign + house - 1) % 12);
    ruledBy.set(lord, [...(ruledBy.get(lord) ?? []), house]);
  }

  const out: HouseReading[] = [];

  for (let house = 1; house <= 12; house += 1) {
    const signIndex = (ascSign + house - 1) % 12;
    const signification = houseSignification(house);
    const lord = survey.placements.find((placement) => placement.house === house);
    if (!signification || !lord) continue;

    // ------------------------------------------------------------- occupants
    const occupants: HouseOccupant[] = GRAHAS.filter((id) => chart.points[id]?.house === house).map(
      (id) => {
        const point = chart.points[id]!;
        const combustion = chart.combustion[id];
        return {
          graha: id,
          degreesInSign: point.degreesInSign,
          dignity: chart.dignity[id] ?? null,
          retrograde: point.retrograde,
          combust: combustion?.combust ?? false,
          cazimi: combustion?.cazimi ?? false,
          ownHouse: lordOfSign(signIndex) === id,
          alsoRules: (ruledBy.get(id) ?? []).filter((ruled) => ruled !== house),
        };
      },
    );

    // --------------------------------------------------------------- aspects
    const aspects: HouseAspect[] = aspectsOnSign(placements, signIndex, { includeNodes })
      /*
       * `flatMap` rather than `filter` then a cast.
       *
       * `Aspect.from` is a `PointId` and only the nine grahas cast dṛṣṭi, so the
       * narrowing has to happen somewhere. A `.filter` does not narrow the
       * array's element type, so the obvious version ends in `as Graha` — and a
       * cast here would be the same mistake that let `Uranus` reach the glyph
       * table and throw at render time. This way the compiler checks it.
       *
       * A graha *in* the house is dropped: occupancy is the stronger statement,
       * and printing both reads as two separate influences on the house.
       */
      .flatMap((aspect) =>
        isGraha(aspect.from) && chart.points[aspect.from]?.house !== house
          ? [
              {
                graha: aspect.from,
                distance: aspect.distance,
                special: aspect.distance !== 7,
                strength: aspect.strength,
              },
            ]
          : [],
      )
      .sort((a, b) => b.strength - a.strength || a.graha.localeCompare(b.graha));

    // ---------------------------------------------------------------- karaka
    const karakaId = signification.karaka;
    const karakaPoint = chart.points[karakaId as PointId];

    // ------------------------------------------------------------ statements
    const statements: ReadingStatement[] = [];

    /*
     * The lord first, always.
     *
     * A house is read through its lord before anything else, and for an empty
     * house the lord is the *only* thing there is to read. Leading with it
     * teaches the method rather than just reporting the contents.
     */
    statements.push(
      lord.ownHouse
        ? {
            text: `${lord.lord} rules the ${ordinal(house)} and sits in it. The house answers to nothing else in the chart — its affairs are self-contained.`,
            factors: [
              { kind: 'Lord', detail: `${lord.lord} rules ${lord.sign}` },
              {
                kind: 'Placed',
                detail: `${degrees(lord.degreesInSign)} ${lord.inSign}, its own house`,
              },
            ],
            source: 'BPHS ch. 11 — a lord in its own bhāva',
          }
        : {
            text: `${lord.lord} rules the ${ordinal(house)} and has gone to the ${ordinal(lord.inHouse)}. That ties ${keywordsOf(house)} to ${keywordsOf(lord.inHouse)} — whatever happens in one shows up in the other.`,
            factors: [
              { kind: 'Lord', detail: `${lord.lord} rules ${lord.sign}` },
              {
                kind: 'Placed',
                detail: `${degrees(lord.degreesInSign)} ${lord.inSign}, the ${ordinal(lord.inHouse)} house`,
              },
              { kind: `${ordinal(lord.inHouse)} holds`, detail: keywordsOf(lord.inHouse, 5) },
            ],
            source: 'BPHS ch. 11 — bhāva results follow the bhāva lord',
          },
    );

    if (lord.alsoRules) {
      statements.push({
        text: `${lord.lord} also rules the ${ordinal(lord.alsoRules)}, so the two houses share one significator and rise or fall together.`,
        factors: [
          {
            kind: 'Double lord',
            detail: `${lord.lord} rules ${ordinal(house)} and ${ordinal(lord.alsoRules)}`,
          },
        ],
      });
    }

    if (occupants.length === 0) {
      statements.push({
        text: `Nothing occupies the ${ordinal(house)}. That is neither good nor bad — eight of twelve houses are usually empty. It means the house is read entirely through its lord and through what aspects it.`,
        factors: [
          { kind: 'Occupants', detail: 'none' },
          { kind: 'Read through', detail: `${lord.lord}, in the ${ordinal(lord.inHouse)}` },
        ],
      });
    }

    for (const occupant of occupants) {
      const graha = grahaSignification(occupant.graha);
      const notes: string[] = [];
      if (occupant.dignity) notes.push(DIGNITY_PHRASE[occupant.dignity]);
      if (occupant.retrograde) {
        notes.push(
          'retrograde, which the tradition reads as a strengthening rather than a reversal',
        );
      }
      if (occupant.cazimi)
        notes.push('cazimi — within a degree of the Sun, and held rather than burnt');
      else if (occupant.combust) notes.push('combust, too close to the Sun to act freely');

      statements.push({
        text: `${occupant.graha} sits in the ${ordinal(house)}${
          occupant.ownHouse ? ', the house it rules' : ''
        }. ${graha ? graha.acts : 'It acts on the affairs of the house it occupies'} — here that means ${keywordsOf(house, 4)}.${notes.length > 0 ? ` It is ${notes.join('; ')}.` : ''}`,
        factors: [
          {
            kind: 'Placed',
            detail: `${degrees(occupant.degreesInSign)} ${SIGNS[signIndex]!}, the ${ordinal(house)}`,
          },
          ...(occupant.dignity
            ? [{ kind: 'Dignity', detail: occupant.dignity.replace('_', ' ') }]
            : []),
          ...(occupant.alsoRules.length > 0
            ? [
                {
                  kind: 'Also rules',
                  detail: occupant.alsoRules.map((ruled) => ordinal(ruled)).join(' and '),
                },
              ]
            : []),
          ...(graha ? [{ kind: 'Signifies', detail: graha.karaka.slice(0, 4).join(', ') }] : []),
        ],
        source: graha?.source,
      });
    }

    if (aspects.length > 0) {
      const special = aspects.filter((aspect) => aspect.special);
      statements.push({
        text: `${aspects.map((aspect) => aspect.graha).join(', ')} ${aspects.length === 1 ? 'aspects' : 'aspect'} the ${ordinal(house)} without occupying it.${
          special.length > 0
            ? ` ${special.map((aspect) => `${aspect.graha}’s ${ordinal(aspect.distance)}`).join(' and ')} ${special.length === 1 ? 'is a special dṛṣṭi' : 'are special dṛṣṭis'}, which only ${special.length === 1 ? 'that graha casts' : 'those grahas cast'}.`
            : ' All by the seventh, the aspect every graha has.'
        }`,
        factors: aspects.map((aspect) => ({
          kind: aspect.graha,
          detail: `${ordinal(aspect.distance)} from ${SIGNS[chart.points[aspect.graha]!.signIndex]!}${
            aspect.strength < 1 ? `, partial strength ${aspect.strength}` : ''
          }`,
        })),
        source: 'BPHS ch. 26 — graha dṛṣṭi',
      });
    }

    if (karakaPoint) {
      statements.push({
        text: `The ${ordinal(house)}’s natural significator is ${karakaId}, which in this chart sits in the ${ordinal(karakaPoint.house)}. A house is read alongside its kāraka wherever that kāraka happens to fall.`,
        factors: [
          { kind: 'Kāraka', detail: `${karakaId} signifies ${ordinal(house)} matters` },
          {
            kind: 'Placed',
            detail: `${degrees(karakaPoint.degreesInSign)} ${karakaPoint.sign}, the ${ordinal(karakaPoint.house)}`,
          },
        ],
        source: signification.source,
      });
    }

    out.push({
      house,
      sign: SIGNS[signIndex]!,
      signIndex,
      signification,
      lord,
      occupants,
      aspects,
      karaka: { graha: karakaId, inHouse: karakaPoint?.house ?? null },
      statements,
      labels: [
        signification.group,
        ...signification.classes
          .filter((cls) => cls !== 'none')
          .map((cls) => HOUSE_CLASS_LABELS[cls]),
      ],
    });
  }

  return out;
}

/**
 * One house across several charts, for comparison.
 *
 * The thing people do most and software supports least: hold one question — the
 * seventh, say — and look at it in four charts at once. Built as a projection of
 * `houseReadings` rather than a second implementation, so a comparison and a
 * single reading can never disagree about the same chart.
 */
export interface HouseComparisonRow {
  readonly subjectId: string;
  readonly name: string;
  readonly reading: HouseReading;
}

export function compareHouse(
  house: number,
  charts: ReadonlyArray<{ id: string; name: string; chart: ComputedChart }>,
  options: { readonly includeNodes?: boolean } = {},
): HouseComparisonRow[] {
  const rows: HouseComparisonRow[] = [];
  for (const entry of charts) {
    const reading = houseReadings(entry.chart, options).find((row) => row.house === house);
    if (reading) rows.push({ subjectId: entry.id, name: entry.name, reading });
  }
  return rows;
}

/**
 * What the comparison rows have in common and where they differ.
 *
 * Counts and lists, never a verdict about whose chart is better — the whole
 * point of putting four charts beside each other is that the practitioner sees
 * the pattern themselves.
 */
export interface HouseComparison {
  readonly house: number;
  readonly rows: readonly HouseComparisonRow[];
  /** Signs on this house, and who has them. */
  readonly signs: readonly { sign: string; names: readonly string[] }[];
  /** Grahas occupying this house, and in whose charts. */
  readonly occupants: readonly { graha: string; names: readonly string[] }[];
  /** Whose house is empty. */
  readonly empty: readonly string[];
  /** Where each person's lord of this house went. */
  readonly lordDestinations: readonly { name: string; lord: string; inHouse: number }[];
}

export function summariseComparison(
  house: number,
  rows: readonly HouseComparisonRow[],
): HouseComparison {
  const bySign = new Map<string, string[]>();
  const byOccupant = new Map<string, string[]>();
  const empty: string[] = [];

  for (const row of rows) {
    bySign.set(row.reading.sign, [...(bySign.get(row.reading.sign) ?? []), row.name]);
    if (row.reading.occupants.length === 0) empty.push(row.name);
    for (const occupant of row.reading.occupants) {
      byOccupant.set(occupant.graha, [...(byOccupant.get(occupant.graha) ?? []), row.name]);
    }
  }

  return {
    house,
    rows,
    signs: [...bySign.entries()]
      .map(([sign, names]) => ({ sign, names }))
      .sort((a, b) => b.names.length - a.names.length || a.sign.localeCompare(b.sign)),
    occupants: [...byOccupant.entries()]
      .map(([graha, names]) => ({ graha, names }))
      .sort((a, b) => b.names.length - a.names.length || a.graha.localeCompare(b.graha)),
    empty,
    lordDestinations: rows.map((row) => ({
      name: row.name,
      lord: row.reading.lord.lord,
      inHouse: row.reading.lord.inHouse,
    })),
  };
}

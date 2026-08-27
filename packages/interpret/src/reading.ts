import {
  SIGNS,
  dignityOf,
  lordOfSign,
  type ComputedChart,
  type DashaPeriod,
  type Dignity,
  type Graha,
} from '@jade/astro';
import { HOUSES, houseSignification } from './significations/houses.js';
import { signSignification } from './significations/signs.js';
import { grahaSignification } from './significations/grahas.js';

/**
 * A reading, composed rather than written.
 *
 * The constitutional rule (CLAUDE.md #5) is that no interpretive statement may
 * appear without the computed factors that produced it. That rules out a
 * library of pre-written paragraphs keyed to "Mars in the 7th", because such a
 * paragraph cannot say *which* Mars, at what degree, in what dignity — it is
 * the same text for everyone and it is therefore not grounded.
 *
 * So a statement here is assembled from three things the chart actually
 * contains: what the graha signifies wherever it falls, what the house
 * governs, and what condition the graha is in. Every one of those is carried
 * on the statement as a factor and shown beside the text. A reader can always
 * ask "why does it say that" and get an answer that is a placement rather than
 * an opinion.
 *
 * The consequence is that these readings are specific and slightly dry. That
 * is the correct trade. A student can check every sentence against the chart,
 * which is what makes it a teaching tool rather than a fortune.
 */

export interface GroundedStatement {
  readonly text: string;
  /** Never empty. A statement with no factors is not printed. */
  readonly factors: ReadonlyArray<{ kind: string; detail: string }>;
  readonly source?: string;
  /** Links the statement to the notes system, so she can write against it. */
  readonly anchor?: { kind: string; key: string; label: string };
}

export interface ReadingSection {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly lede?: string;
  readonly statements: readonly GroundedStatement[];
}

/**
 * Vocabulary that must never appear in generated text.
 *
 * Constitution item 6. This is a hard product rule and it is enforced here
 * rather than in the UI, so that no future caller can route around it — a
 * statement carrying any of these is dropped before it can be returned, and a
 * test asserts the filter actually runs.
 */
export const FORBIDDEN_TOPICS = [
  'death',
  'die',
  'dying',
  'fatal',
  'disease',
  'illness',
  'cancer diagnosis',
  'lawsuit',
  'litigation',
  'prison',
  'divorce is',
] as const;

const ORDINALS = [
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

const DIGNITY_PHRASE: Record<Dignity, string> = {
  exalted: 'exalted, and at its most able',
  moolatrikona: 'in mūlatrikoṇa, close to its own best condition',
  own: 'in its own sign, comfortable and unimpeded',
  great_friend: 'in a great friend’s sign, well supported',
  friend: 'in a friendly sign, supported',
  neutral: 'in a neutral sign, neither helped nor hindered',
  enemy: 'in an enemy’s sign, working against friction',
  great_enemy: 'in a great enemy’s sign, working against considerable friction',
  debilitated: 'debilitated, and least able to act on its own terms',
};

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/** Two or three items joined as English rather than a comma-separated list. */
function list(items: readonly string[], limit = 3): string {
  const shown = items.slice(0, limit);
  if (shown.length <= 1) return shown[0] ?? '';
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
}

/**
 * Drop anything that violates constitution item 6, whatever produced it.
 *
 * Exported so that other composers — the daily reading, the synastry one —
 * run under the same filter rather than reimplementing it. A second copy of
 * this rule is a second place for it to drift.
 */
export function permitted(statement: GroundedStatement): boolean {
  if (statement.factors.length === 0) return false;
  const text = statement.text.toLowerCase();
  return !FORBIDDEN_TOPICS.some((word) => text.includes(word));
}

/**
 * Compose a reading.
 *
 * Ordered the way a practitioner actually reads: the ascendant first because
 * it fixes everything else, then the Moon, then the grahas by house, then the
 * combinations, then time. `dasha` is optional — without it the timing section
 * is absent rather than invented.
 */
export function readingFor(
  chart: ComputedChart,
  options: { dasha?: readonly DashaPeriod[]; nowJd?: number } = {},
): ReadingSection[] {
  const sections: ReadingSection[] = [];
  const ascSign = chart.houses.ascendantSign;
  const signName = (index: number): string => SIGNS[((index % 12) + 12) % 12]!;

  // ---------------------------------------------------------------- ascendant
  const ascSignLib = signSignification(ascSign);
  const ascLord = lordOfSign(ascSign);
  const ascLordPoint = chart.points[ascLord];
  const ascendant: GroundedStatement[] = [];

  if (ascSignLib) {
    ascendant.push({
      text: `${ascSignLib.name} rises, which fixes every other house in the chart. It is ${ascSignLib.modality} ${ascSignLib.element}, ruled by ${ascSignLib.lord} — ${ascSignLib.summary.split('—').slice(1).join('—').trim() || ascSignLib.summary}`,
      factors: [
        {
          kind: 'Ascendant',
          detail: `${degrees(chart.points.Ascendant?.degreesInSign ?? 0)} ${ascSignLib.name}`,
        },
        { kind: 'Modality', detail: ascSignLib.modality },
        { kind: 'Element', detail: ascSignLib.element },
      ],
      source: ascSignLib.source,
      anchor: { kind: 'sign', key: ascSignLib.name, label: ascSignLib.name },
    });
  }

  if (ascLordPoint) {
    const house = houseSignification(ascLordPoint.house);
    const lordLib = grahaSignification(ascLord);
    const dignity = dignityOf(ascLord, ascLordPoint.longitude);
    ascendant.push({
      text: `Its lord ${ascLord} sits in the ${ORDINALS[ascLordPoint.house - 1]} house${house ? `, the house of ${list(house.keywords)}` : ''}${dignity ? `, ${DIGNITY_PHRASE[dignity]}` : ''}. Where the lord of the first house goes is where the self is most invested${lordLib ? `, and ${ascLord} ${lordLib.acts} whatever it occupies` : ''}.`,
      factors: [
        { kind: 'Lagna lord', detail: `${ascLord} rules ${signName(ascSign)}` },
        {
          kind: 'Placement',
          detail: `${degrees(ascLordPoint.degreesInSign)} ${ascLordPoint.sign}, house ${ascLordPoint.house}`,
        },
        ...(dignity ? [{ kind: 'Dignity', detail: dignity.replace('_', ' ') }] : []),
      ],
      source: house?.source,
      anchor: { kind: 'graha', key: ascLord, label: ascLord },
    });
  }

  if (ascendant.length) {
    sections.push({
      id: 'ascendant',
      kicker: 'Where the chart starts',
      title: 'The ascendant',
      lede: 'The rising sign is not a topic like the others — it is the point every other house is measured from.',
      statements: ascendant.filter(permitted),
    });
  }

  // --------------------------------------------------------------------- Moon
  const moon = chart.points.Moon;
  if (moon) {
    const moonSign = signSignification(moon.signIndex);
    const moonHouse = houseSignification(moon.house);
    const dignity = dignityOf('Moon', moon.longitude);
    const statements: GroundedStatement[] = [
      {
        text: `The Moon is in ${moon.sign} in the ${ORDINALS[moon.house - 1]} house${dignity ? `, ${DIGNITY_PHRASE[dignity]}` : ''}. In Jyotiṣa the Moon is the mind — not reasoning, which belongs to Mercury, but the part that receives and responds${moonHouse ? `. Placed here, that responsiveness engages most with ${list(moonHouse.keywords, 2)}` : ''}.`,
        factors: [
          {
            kind: 'Moon',
            detail: `${degrees(moon.degreesInSign)} ${moon.sign}, house ${moon.house}`,
          },
          ...(moonSign
            ? [
                {
                  kind: 'Medium',
                  detail: `${moonSign.modality} ${moonSign.element}, ruled by ${moonSign.lord}`,
                },
              ]
            : []),
          ...(dignity ? [{ kind: 'Dignity', detail: dignity.replace('_', ' ') }] : []),
        ],
        source: 'BPHS ch. 3',
        anchor: { kind: 'graha', key: 'Moon', label: 'Moon' },
      },
      {
        text: `Its nakṣatra is ${moon.nakshatra.name}, pāda ${moon.nakshatra.pada}, ruled by ${moon.nakshatra.lord}. This is what starts the Vimśottarī daśā — the whole timing sequence of the chart is measured from this one position.`,
        factors: [
          { kind: 'Nakṣatra', detail: `${moon.nakshatra.name} pāda ${moon.nakshatra.pada}` },
          { kind: 'Daśā lord at birth', detail: moon.nakshatra.lord },
        ],
        source: 'BPHS ch. 46',
        anchor: { kind: 'nakshatra', key: moon.nakshatra.name, label: moon.nakshatra.name },
      },
    ];

    sections.push({
      id: 'moon',
      kicker: 'The mind',
      title: 'The Moon',
      lede: 'Much of Jyotiṣa is organised from the Moon rather than the Sun.',
      statements: statements.filter(permitted),
    });
  }

  // ------------------------------------------------------------- graha by house
  const placements: GroundedStatement[] = [];
  for (const id of ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']) {
    const point = chart.points[id];
    if (!point) continue;
    const lib = grahaSignification(id);
    const house = houseSignification(point.house);
    if (!lib || !house) continue;

    const dignity = ['Rahu', 'Ketu'].includes(id) ? null : dignityOf(id as Graha, point.longitude);
    const combust = chart.combustion?.[id];
    const notes: string[] = [];
    if (point.retrograde && !['Rahu', 'Ketu'].includes(id)) notes.push('retrograde');
    if (combust) notes.push('combust');
    if (house.classes.includes('upachaya') && lib.nature === 'malefic') {
      notes.push('an upachaya house, where a malefic tends to build capacity rather than obstruct');
    }

    placements.push({
      text: `${id} ${lib.acts} the ${ORDINALS[point.house - 1]} house — ${list(house.keywords)}${dignity ? `, and is ${DIGNITY_PHRASE[dignity]}` : ''}. As kāraka it carries ${list(lib.karaka, 2)} wherever it falls, so those matters and this house's matters are linked in this chart.`,
      factors: [
        { kind: id, detail: `${degrees(point.degreesInSign)} ${point.sign}, house ${point.house}` },
        { kind: 'House', detail: `${house.sanskrit} — ${house.title}` },
        ...(dignity ? [{ kind: 'Dignity', detail: dignity.replace('_', ' ') }] : []),
        ...notes.map((note) => ({ kind: 'Condition', detail: note })),
      ],
      source: house.source,
      anchor: { kind: 'graha', key: id, label: id },
    });
  }

  if (placements.length) {
    sections.push({
      id: 'placements',
      kicker: 'Graha by house',
      title: 'What sits where',
      lede: 'Each graha signifies certain matters wherever it falls, and acts on the affairs of the house it occupies. A placement links the two.',
      statements: placements.filter(permitted),
    });
  }

  // -------------------------------------------------------------------- yogas
  if (chart.yogas.length) {
    sections.push({
      id: 'yogas',
      kicker: 'Named combinations',
      title: `${chart.yogas.length} ${chart.yogas.length === 1 ? 'yoga' : 'yogas'} formed`,
      lede: 'A yoga is a named configuration the classical texts single out. Each is shown with the placements that formed it, and with any cancellation that applies.',
      statements: chart.yogas
        .map((yoga) => ({
          text: `${yoga.name} (${yoga.plain}). ${yoga.summary}`,
          factors: [
            ...yoga.factors.map((factor) => ({ kind: 'Formed by', detail: factor })),
            ...(yoga.cancellations ?? []).map((c) => ({ kind: 'Cancellation', detail: c })),
          ],
          source: yoga.source,
          anchor: { kind: 'yoga', key: yoga.id, label: yoga.name },
        }))
        .filter(permitted),
    });
  }

  // --------------------------------------------------------------------- time
  if (options.dasha?.length && options.nowJd !== undefined) {
    const running = runningChain(options.dasha, options.nowJd);
    if (running.length) {
      const statements: GroundedStatement[] = [];
      for (const period of running) {
        const lib = grahaSignification(period.lord);
        const point = chart.points[period.lord];
        const house = point ? houseSignification(point.house) : undefined;
        if (!lib) continue;
        const level =
          period.level === 1
            ? 'mahādaśā'
            : period.level === 2
              ? 'antardaśā'
              : `level ${period.level}`;
        statements.push({
          text: `${period.lord} ${level}. A daśā brings its lord's significations forward${point ? `, and in this chart ${period.lord} sits in the ${ORDINALS[point.house - 1]} house` : ''}${house ? ` — ${list(house.keywords, 2)}` : ''}. What a period does is read from where its lord is placed, not from the lord alone.`,
          factors: [
            { kind: 'Period', detail: `${period.lords.join(' → ')} (${level})` },
            { kind: 'Lord signifies', detail: list(lib.karaka, 3) },
            ...(point
              ? [{ kind: 'Lord placed', detail: `${point.sign}, house ${point.house}` }]
              : []),
          ],
          source: 'BPHS ch. 46',
          anchor: {
            kind: 'dasha',
            key: period.lords.join('/'),
            label: `${period.lords.join(' → ')} daśā`,
          },
        });
      }
      sections.push({
        id: 'dasha',
        kicker: 'Running now',
        title: 'The current period',
        lede: 'Vimśottarī measures from the Moon’s nakṣatra at birth. A period is read through the placement of its lord.',
        statements: statements.filter(permitted),
      });
    }
  }

  return sections.filter((section) => section.statements.length > 0);
}

/** The nested chain of periods containing a moment, outermost first. */
function runningChain(periods: readonly DashaPeriod[], jd: number): DashaPeriod[] {
  for (const period of periods) {
    if (jd >= period.startJd && jd < period.endJd) {
      return [period, ...(period.children ? runningChain(period.children, jd) : [])];
    }
  }
  return [];
}

/** Every house, for the chart's own ascendant — used by the house-by-house view. */
export function housesForChart(chart: ComputedChart) {
  return HOUSES.map((house) => {
    const signIndex = (chart.houses.ascendantSign + house.number - 1) % 12;
    const occupants = Object.values(chart.points).filter((p) => p.house === house.number);
    return {
      house,
      sign: SIGNS[signIndex]!,
      lord: lordOfSign(signIndex),
      occupants: occupants.map((p) => p.id),
    };
  });
}

import { norm360, separation } from '../angles.js';
import { lordOfSign } from '../dignity.js';
import { dashaChainAt, type VimshottariResult } from '../dashas/vimshottari.js';
import { houseOf } from '../houses.js';
import { SIGNS, type Graha, type HouseSystem, type PointId } from '../types.js';
import { PRECISION_WINDOW_DAYS, type LifeEventDefinition } from './events.js';

/**
 * Scoring one candidate birth time against one reported event.
 *
 * Every point this module awards comes from a named rule with a fixed weight,
 * and every rule that fires returns the placements that made it fire. A
 * rectification that reports "07:42, confidence 84%" and nothing else is
 * useless to a professional — the whole job is being able to argue with it.
 *
 * ## What actually varies with birth time
 *
 * This matters more than the rule list, because a rule that does not change as
 * the clock moves cannot discriminate between candidates no matter how
 * classical it is. Over a window of a few hours:
 *
 *  - **The ascendant moves about one degree every four minutes.** It is the
 *    fastest thing in the chart by two orders of magnitude, and it is what
 *    rotates the houses. Every rule below that mentions a house depends on it.
 *  - **The Moon moves about half a degree an hour**, which is small in itself
 *    but decides where it sits inside its nakṣatra — and that fixes the
 *    balance of the first mahādaśā. A four-hour window can shift every daśā
 *    boundary in the life by a year or more.
 *  - **Everything else is effectively still.** Saturn moves two arcseconds an
 *    hour. Any rule resting only on a slow graha's sign will fire identically
 *    for every candidate and tell you nothing.
 *
 * So the two signals are the ascendant and the daśā, and the rules are built
 * on them deliberately rather than by accident.
 */

/** A rule that can fire for a candidate/event pair. Weights are fixed and shown. */
export type RuleId =
  | 'dasha-lord-rules-house'
  | 'dasha-lord-in-house'
  | 'dasha-lord-is-karaka'
  | 'antara-lord-rules-house'
  | 'antara-lord-in-house'
  | 'transit-slow-graha-in-house'
  | 'transit-slow-graha-on-house-lord';

export interface RuleDefinition {
  readonly id: RuleId;
  readonly label: string;
  readonly weight: number;
  readonly note: string;
}

/**
 * The rule table.
 *
 * Weights are deliberately small integers rather than tuned decimals. There is
 * no training data here and no way to fit them honestly, so a weight is a
 * statement of relative importance drawn from how the texts prioritise the
 * techniques — daśā first, transit as confirmation — and nothing more. They are
 * exported so a practitioner who disagrees can see exactly what they are
 * disagreeing with.
 */
export const RULES: readonly RuleDefinition[] = [
  {
    id: 'dasha-lord-rules-house',
    label: 'Mahādaśā lord rules the house',
    weight: 5,
    note: 'The running major period belongs to the lord of a house the event engages.',
  },
  {
    id: 'dasha-lord-in-house',
    label: 'Mahādaśā lord occupies the house',
    weight: 4,
    note: 'The running major period lord sits in a house the event engages.',
  },
  {
    id: 'dasha-lord-is-karaka',
    label: 'Mahādaśā lord is the kāraka',
    weight: 2,
    note: 'The running major period belongs to the natural significator of the matter.',
  },
  {
    id: 'antara-lord-rules-house',
    label: 'Antardaśā lord rules the house',
    weight: 4,
    note: 'The sub-period lord rules a house the event engages. Sharper in time than the mahādaśā.',
  },
  {
    id: 'antara-lord-in-house',
    label: 'Antardaśā lord occupies the house',
    weight: 3,
    note: 'The sub-period lord sits in a house the event engages.',
  },
  {
    id: 'transit-slow-graha-in-house',
    label: 'Jupiter or Saturn transiting the house',
    weight: 2,
    note: 'A slow graha was crossing the house when the event was reported.',
  },
  {
    id: 'transit-slow-graha-on-house-lord',
    label: 'Jupiter or Saturn on the house lord',
    weight: 2,
    note: 'A slow graha was within orb of the natal house lord at the reported date.',
  },
];

const RULE_BY_ID = new Map(RULES.map((rule) => [rule.id, rule]));

export function rule(id: RuleId): RuleDefinition {
  const found = RULE_BY_ID.get(id);
  if (!found) throw new Error(`Unknown rectification rule: ${id}`);
  return found;
}

/** The maximum a single event can contribute, used to normalise. */
export const MAX_EVENT_SCORE = RULES.reduce((total, r) => total + r.weight, 0);

export interface RuleHit {
  readonly rule: RuleId;
  readonly label: string;
  readonly weight: number;
  /** Which house of the event's list this fired for. */
  readonly house: number;
  /** Never empty. The placements that made it fire. */
  readonly factors: readonly string[];
}

export interface EventScore {
  readonly score: number;
  readonly hits: readonly RuleHit[];
}

/**
 * The minimum a candidate chart has to expose to be scored.
 *
 * Deliberately not a `ComputedChart`. A full chart computes sixteen vargas,
 * aṣṭakavarga, yogas and ṣaḍbala — none of which the scoring uses — and a
 * rectification sweep builds hundreds of candidates. Taking the narrow shape
 * keeps the sweep affordable without approximating anything: every field here
 * is computed exactly, there are simply fewer of them.
 */
export interface CandidateChart {
  /** Sidereal ascendant longitude. */
  readonly ascendant: number;
  /** Sidereal longitudes of the grahas at the candidate moment. */
  readonly longitudes: Readonly<Partial<Record<PointId, number>>>;
  readonly houseSystem: HouseSystem;
}

const SLOW: readonly Graha[] = ['Jupiter', 'Saturn'];

/** Which house a graha occupies in a candidate chart. */
function houseOfGraha(chart: CandidateChart, graha: Graha): number | null {
  const longitude = chart.longitudes[graha];
  if (longitude == null) return null;
  return houseOf(longitude, chart.ascendant, chart.houseSystem);
}

/** The sign a house corresponds to, whole-sign from the ascendant. */
function signOfHouse(chart: CandidateChart, house: number): number {
  const ascSign = Math.floor(norm360(chart.ascendant) / 30);
  return (ascSign + house - 1) % 12;
}

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

export interface TransitSnapshot {
  /** Sidereal longitudes of the slow grahas at the event date. */
  readonly longitudes: Readonly<Partial<Record<Graha, number>>>;
  /** Days between the reported date and the sample. Zero when sampled exactly. */
  readonly offsetDays?: number;
}

/**
 * Score one candidate against one event.
 *
 * `transit` may be omitted, in which case the two transit rules simply do not
 * fire — the caller is not obliged to compute the sky at every event date, and
 * a missing input produces a missing rule rather than a guessed one.
 */
export function scoreEvent(
  chart: CandidateChart,
  dashas: VimshottariResult,
  eventJd: number,
  definition: LifeEventDefinition,
  transit?: TransitSnapshot,
): EventScore {
  const hits: RuleHit[] = [];
  const chain = dashaChainAt(dashas, eventJd);
  const maha = chain[0]?.lord;
  const antara = chain[1]?.lord;

  for (const house of definition.houses) {
    const houseSign = signOfHouse(chart, house);
    const houseLord = lordOfSign(houseSign);
    const signName = SIGNS[houseSign]!;

    // ---------------------------------------------------------------- daśā
    if (maha) {
      if (maha === houseLord) {
        hits.push({
          rule: 'dasha-lord-rules-house',
          label: rule('dasha-lord-rules-house').label,
          weight: rule('dasha-lord-rules-house').weight,
          house,
          factors: [`${maha} mahādaśā`, `${maha} rules the ${house}th (${signName})`],
        });
      }
      if (houseOfGraha(chart, maha) === house) {
        hits.push({
          rule: 'dasha-lord-in-house',
          label: rule('dasha-lord-in-house').label,
          weight: rule('dasha-lord-in-house').weight,
          house,
          factors: [
            `${maha} mahādaśā`,
            `${maha} at ${degrees(
              (chart.longitudes[maha] ?? 0) % 30,
            )} ${SIGNS[Math.floor(norm360(chart.longitudes[maha] ?? 0) / 30)]}, in the ${house}th`,
          ],
        });
      }
      if (definition.karakas.includes(maha)) {
        hits.push({
          rule: 'dasha-lord-is-karaka',
          label: rule('dasha-lord-is-karaka').label,
          weight: rule('dasha-lord-is-karaka').weight,
          house,
          factors: [
            `${maha} mahādaśā`,
            `${maha} is a kāraka for ${definition.label.toLowerCase()}`,
          ],
        });
      }
    }

    if (antara) {
      if (antara === houseLord) {
        hits.push({
          rule: 'antara-lord-rules-house',
          label: rule('antara-lord-rules-house').label,
          weight: rule('antara-lord-rules-house').weight,
          house,
          factors: [`${antara} antardaśā`, `${antara} rules the ${house}th (${signName})`],
        });
      }
      if (houseOfGraha(chart, antara) === house) {
        hits.push({
          rule: 'antara-lord-in-house',
          label: rule('antara-lord-in-house').label,
          weight: rule('antara-lord-in-house').weight,
          house,
          factors: [`${antara} antardaśā`, `${antara} occupies the ${house}th`],
        });
      }
    }

    // ------------------------------------------------------------- transit
    if (transit) {
      const windowDays = PRECISION_WINDOW_DAYS[definition.typicalPrecision];
      for (const slow of SLOW) {
        const position = transit.longitudes[slow];
        if (position == null) continue;

        if (Math.floor(norm360(position) / 30) === houseSign) {
          hits.push({
            rule: 'transit-slow-graha-in-house',
            label: rule('transit-slow-graha-in-house').label,
            weight: rule('transit-slow-graha-in-house').weight,
            house,
            factors: [
              `transiting ${slow} in ${signName}`,
              `the ${house}th from this candidate ascendant`,
              `dated to within ${windowDays} days`,
            ],
          });
        }

        const natalLord = chart.longitudes[houseLord];
        if (natalLord != null && separation(position, natalLord) <= 5) {
          hits.push({
            rule: 'transit-slow-graha-on-house-lord',
            label: rule('transit-slow-graha-on-house-lord').label,
            weight: rule('transit-slow-graha-on-house-lord').weight,
            house,
            factors: [
              `transiting ${slow} within ${separation(position, natalLord).toFixed(1)}° of natal ${houseLord}`,
              `${houseLord} rules the ${house}th`,
            ],
          });
        }
      }
    }
  }

  // The first house in an event's list is the central one; corroborating
  // houses count for less, or a rule firing on the third-listed house would
  // outweigh the same rule firing on the house the matter actually belongs to.
  const weightForHouse = (house: number): number => {
    const rank = definition.houses.indexOf(house);
    return rank === 0 ? 1 : rank === 1 ? 0.6 : 0.35;
  };

  const score = hits.reduce((total, hit) => total + hit.weight * weightForHouse(hit.house), 0);
  return { score, hits };
}

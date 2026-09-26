import { SIGNS, houseFrom, lordOfSign, type ComputedChart, type Graha } from '@jade/astro';

/**
 * Where every house lord goes, and what the pattern says.
 *
 * ## Why this is the missing view
 *
 * Jade already prints where each *graha* sits. That is not the same question.
 * A practitioner reads a chart by asking where each **house's lord** went,
 * because that is how two houses get connected: the 2nd lord in the 5th binds
 * money to creativity, and no amount of staring at a list of positions makes
 * that visible. It was the first thing Nalu asked a chatbot for, which is the
 * clearest possible signal that the app should have answered it.
 *
 * ## The pattern is the reading
 *
 * The individual rows are arithmetic. What a practitioner actually takes from
 * the table is the *shape*: when six of twelve lords land in the same house,
 * that house is the engine of the chart and everything routes through it. So
 * `hubs` counts the destinations and names the concentrations, and
 * `doubleLords` names the grahas carrying two houses at once — which is where
 * a single placement does double duty and is the commonest source of a chart
 * that reads more strongly than its parts suggest.
 *
 * ## What this deliberately does not do
 *
 * It does not say what any of it *means for the person*. Every line here is a
 * placement or a count — checkable against the chart in seconds. The
 * significations live in `significations/houses.ts` and are joined on at the
 * point of display, so the lesson and the reading cannot drift (CLAUDE.md #5).
 */

export interface LordPlacement {
  /** The house whose lord this is, 1–12. */
  readonly house: number;
  /** The sign occupying that house, given the ascendant. */
  readonly sign: string;
  readonly lord: Graha;
  /** Where the lord actually sits, 1–12. */
  readonly inHouse: number;
  readonly inSign: string;
  readonly degreesInSign: number;
  /** True when the lord occupies the house it rules. */
  readonly ownHouse: boolean;
  readonly retrograde: boolean;
  /** Present when this graha rules a second house too. */
  readonly alsoRules: number | null;
}

export interface Hub {
  /** The house the lords are landing in. */
  readonly house: number;
  readonly sign: string;
  /** Which houses send their lords here. */
  readonly from: readonly number[];
}

export interface LordSurvey {
  readonly placements: readonly LordPlacement[];
  /**
   * Houses receiving two or more lords, most first.
   *
   * Two is not yet a pattern and twelve would be a chart with one sign in it,
   * so the threshold is deliberately low and the *count* is what the reader
   * judges by. Jade names the concentration; it does not decide when a
   * concentration is interesting.
   */
  readonly hubs: readonly Hub[];
  /** Grahas ruling two houses, and which two. */
  readonly doubleLords: readonly { graha: Graha; houses: readonly number[] }[];
}

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/** Spelled out, for prose. */
export function ordinalWord(n: number): string {
  return ordinal(n);
}

/**
 * Survey all twelve lords.
 *
 * Whole-sign throughout, matching the rest of Jade: house *n* is the *n*th
 * sign from the ascendant, so the lord of a house is the lord of that sign.
 * Under a cusp-based frame this table would be subtly different, which is the
 * kind of thing that has to be said rather than assumed (CLAUDE.md #3) — the
 * frame is stated wherever this is displayed.
 */
export function lordSurvey(chart: ComputedChart): LordSurvey {
  const ascSign = chart.houses.ascendantSign;

  const ruledBy = new Map<Graha, number[]>();
  for (let house = 1; house <= 12; house += 1) {
    const sign = (ascSign + house - 1) % 12;
    const lord = lordOfSign(sign);
    ruledBy.set(lord, [...(ruledBy.get(lord) ?? []), house]);
  }

  const placements: LordPlacement[] = [];
  for (let house = 1; house <= 12; house += 1) {
    const sign = (ascSign + house - 1) % 12;
    const lord = lordOfSign(sign);
    const point = chart.points[lord];
    if (!point) continue;
    const inHouse = houseFrom(ascSign, point.signIndex);
    const both = ruledBy.get(lord) ?? [];
    placements.push({
      house,
      sign: SIGNS[sign]!,
      lord,
      inHouse,
      inSign: point.sign,
      degreesInSign: point.degreesInSign,
      ownHouse: inHouse === house,
      retrograde: point.retrograde,
      alsoRules: both.find((h) => h !== house) ?? null,
    });
  }

  const byDestination = new Map<number, number[]>();
  for (const placement of placements) {
    byDestination.set(placement.inHouse, [
      ...(byDestination.get(placement.inHouse) ?? []),
      placement.house,
    ]);
  }
  const hubs: Hub[] = [...byDestination.entries()]
    .filter(([, from]) => from.length >= 2)
    .map(([house, from]) => ({
      house,
      sign: SIGNS[(ascSign + house - 1) % 12]!,
      from: [...from].sort((a, b) => a - b),
    }))
    .sort((a, b) => b.from.length - a.from.length || a.house - b.house);

  const doubleLords = [...ruledBy.entries()]
    .filter(([, houses]) => houses.length > 1)
    .map(([graha, houses]) => ({ graha, houses: [...houses].sort((a, b) => a - b) }))
    .sort((a, b) => a.houses[0]! - b.houses[0]!);

  return { placements, hubs, doubleLords };
}

/**
 * The survey said in sentences, each carrying its own placements.
 *
 * Returned as factored statements rather than prose so the display can hold
 * Jade's rule: nothing is asserted that cannot be decomposed into the chart
 * rows that produced it.
 */
export interface LordStatement {
  readonly text: string;
  readonly factors: readonly { kind: string; detail: string }[];
}

export function lordPatternStatements(survey: LordSurvey): LordStatement[] {
  const out: LordStatement[] = [];

  for (const hub of survey.hubs) {
    if (hub.from.length < 3) continue;
    out.push({
      text: `${hub.from.length} of the twelve house lords land in the ${ordinal(hub.house)}. Whatever that house governs, this chart routes a great deal through it.`,
      factors: [
        { kind: 'Hub', detail: `${ordinal(hub.house)} house — ${hub.sign}` },
        {
          kind: 'Lords arriving',
          detail: hub.from.map((h) => `${ordinal(h)}`).join(', '),
        },
      ],
    });
  }

  for (const double of survey.doubleLords) {
    const [a, b] = double.houses;
    if (a === undefined || b === undefined) continue;
    const where = survey.placements.find((p) => p.lord === double.graha);
    out.push({
      text: `${double.graha} rules both the ${ordinal(a)} and the ${ordinal(b)}, so those two houses share a single significator and rise or fall together.`,
      factors: [
        { kind: 'Double lord', detail: `${double.graha} rules ${ordinal(a)} and ${ordinal(b)}` },
        ...(where
          ? [
              {
                kind: 'Placed',
                detail: `${where.inSign}, the ${ordinal(where.inHouse)} house`,
              },
            ]
          : []),
      ],
    });
  }

  const ownHouse = survey.placements.filter((p) => p.ownHouse);
  if (ownHouse.length > 0) {
    out.push({
      text: `${ownHouse.map((p) => `the ${ordinal(p.house)}`).join(' and ')} ${ownHouse.length === 1 ? 'has its lord' : 'have their lords'} in the house itself — self-contained, answering to nothing else in the chart.`,
      factors: ownHouse.map((p) => ({
        kind: `${ordinal(p.house)} lord`,
        detail: `${p.lord} in ${p.inSign}, its own house`,
      })),
    });
  }

  return out;
}

import { houseOfCusps, type ComputedChart, type DashaPeriod, type SkyPosition } from '@jade/astro';
import type { GroundedStatement } from '../reading.js';
import { lordSurvey, ordinalNumber } from '../lords.js';
import { placeOf } from './places.js';

/**
 * Which part of a life the sky is currently pointed at, on three clocks.
 *
 * A daily reading that lists positions leaves the reader to do the hardest
 * part. The question underneath "what about today" is always *which part of my
 * life is this about*, and the answer has three honest versions that run at
 * different speeds:
 *
 * - **today** — the house the Moon is crossing. Two and a quarter days per
 *   sign. This tracks where attention goes, not what changes.
 * - **the season** — the houses Saturn and Jupiter are crossing. Years. This
 *   is the one that corresponds to what people mean by a chapter.
 * - **the period** — the houses the running daśā lord rules, occupies or
 *   aspects. Also years, but keyed to the chart rather than to the sky, which
 *   is why it can disagree with the transits and why that disagreement is
 *   information rather than an error.
 *
 * The payoff is agreement. When two clocks or three land on the same house,
 * that is the strongest thing a chart can say about a given week, and it is
 * the one claim here that no single position supports on its own.
 *
 * Nothing in this module predicts. "Pointed at" means graha positions fall in
 * or rule that house, which is checkable, and every statement carries them.
 */

export type FocusScale = 'today' | 'season' | 'period';

export interface AreaFocus {
  readonly scale: FocusScale;
  readonly place: number;
  /** The place's in-sentence name, for a link label. */
  readonly topic: string;
  /** The graha that puts the focus there. */
  readonly by: string;
  /** The full clause, for prose: "the Moon is crossing the first". */
  readonly because: string;
  /** The same fact with the subject dropped, for a factor whose label is `by`. */
  readonly detail: string;
}

export interface DayFocus {
  readonly focuses: readonly AreaFocus[];
  /** A house two or more clocks agree on. Null is the ordinary case. */
  readonly agreement: {
    readonly place: number;
    readonly topic: string;
    readonly scales: readonly FocusScale[];
  } | null;
  readonly statements: readonly GroundedStatement[];
}

/** Saturn and Jupiter: the two the tradition reads for a chapter rather than a day. */
const SEASON = ['Saturn', 'Jupiter'] as const;

function houseOf(chart: ComputedChart, longitude: number): number | null {
  if (chart.houses.system === 'whole_sign') {
    const signIndex = Math.floor((((longitude % 360) + 360) % 360) / 30);
    return ((((signIndex - chart.houses.ascendantSign) % 12) + 12) % 12) + 1;
  }
  if (chart.houses.cusps.length !== 12) return null;
  return houseOfCusps(longitude, chart.houses.cusps);
}

function ordinal(n: number): string {
  return [
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
  ][n - 1]!;
}

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Pure: the sky and the chart in, no clock read.
 *
 * `dasha` is the running chain outermost first, as `vimshottariChain` returns
 * it; the innermost entry is the period actually running.
 */
export function dayFocus(
  chart: ComputedChart,
  sky: readonly SkyPosition[],
  dasha?: readonly DashaPeriod[],
): DayFocus {
  const focuses: AreaFocus[] = [];
  const statements: GroundedStatement[] = [];

  // --------------------------------------------------------------- today
  const moon = sky.find((one) => one.id === 'Moon');
  const moonHouse = moon ? houseOf(chart, moon.longitude) : null;
  if (moon && moonHouse) {
    const place = placeOf(moonHouse);
    focuses.push({
      scale: 'today',
      place: moonHouse,
      topic: place.shortName,
      by: 'Moon',
      because: `the Moon is crossing the ${ordinal(moonHouse)}`,
      detail: `crossing the ${ordinal(moonHouse)}`,
    });
    statements.push({
      text: `Today sits on ${place.shortName}. The Moon is crossing your ${ordinal(moonHouse)} house, and it is the fastest thing in the chart — two and a quarter days to a sign — so this is where attention goes rather than where anything settles. The question it raises is the one that house always raises: ${place.asks.charAt(0).toLowerCase()}${place.asks.slice(1)}`,
      factors: [
        {
          kind: 'Transit Moon',
          detail: `${degrees(moon.degreesInSign)} ${moon.sign} · ${moon.nakshatra}`,
        },
        { kind: 'Natal house', detail: `${moonHouse} — ${place.shortName}` },
      ],
      anchor: { kind: 'house', key: String(moonHouse), label: `${ordinalNumber(moonHouse)} house` },
    });
  }

  // -------------------------------------------------------------- the season
  for (const id of SEASON) {
    const position = sky.find((one) => one.id === id);
    if (!position) continue;
    const house = houseOf(chart, position.longitude);
    if (!house) continue;
    const place = placeOf(house);
    focuses.push({
      scale: 'season',
      place: house,
      topic: place.shortName,
      by: id,
      because: `${id} is transiting the ${ordinal(house)}`,
      detail: `transiting the ${ordinal(house)}`,
    });
    statements.push({
      text: `${id} is in your ${ordinal(house)} house, which puts ${place.shortName} under a longer kind of pressure — ${
        id === 'Saturn'
          ? 'Saturn takes about two and a half years to cross a sign, and the tradition reads its passage as a demand for something to be done properly rather than quickly'
          : 'Jupiter takes about a year to cross a sign, and the tradition reads its passage as room to expand into, with the attendant risk of taking on more than the house can hold'
      }. Nothing about this is about today in particular; it was true last month and will be true next month.`,
      factors: [
        {
          kind: `Transit ${id}`,
          detail: `${degrees(position.degreesInSign)} ${position.sign}${position.retrograde ? ', retrograde' : ''}`,
        },
        { kind: 'Natal house', detail: `${house} — ${place.shortName}` },
      ],
      anchor: { kind: 'graha', key: id, label: id },
    });
  }

  // -------------------------------------------------------------- the period
  const running = dasha?.[dasha.length - 1]?.lord;
  if (running) {
    const survey = lordSurvey(chart);
    const rules = survey.placements.filter((one) => one.lord === running).map((one) => one.house);
    const seat = chart.points[running]?.house ?? null;
    /* The house it sits in is the one it is doing something in; the houses it
       rules are the ones it is answerable for. Both count, and the tradition
       reads the seat as the more immediate of the two. */
    const touched = [...new Set([...(seat ? [seat] : []), ...rules])];
    for (const house of touched) {
      const place = placeOf(house);
      focuses.push({
        scale: 'period',
        place: house,
        topic: place.shortName,
        by: running,
        because:
          house === seat
            ? `${running} sits in the ${ordinal(house)} natally`
            : `${running} rules the ${ordinal(house)}`,
        detail: house === seat ? `sits in the ${ordinal(house)}` : `rules the ${ordinal(house)}`,
      });
    }
    if (touched.length > 0) {
      const named = touched.map((house) => `the ${ordinal(house)} (${placeOf(house).shortName})`);
      statements.push({
        text: `The period running is ${running}'s, and in this chart ${running} answers for ${named.length === 1 ? named[0] : `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`}. That is the slowest of the three clocks and the only one keyed to your chart rather than to the sky, which is why it can point somewhere the transits do not — and when it does, the daśā is usually describing the years and the transit the week.`,
        factors: [
          { kind: 'Daśā', detail: dasha!.map((one) => one.lord).join(' → ') },
          ...(seat ? [{ kind: `${running} natally`, detail: `house ${seat}` }] : []),
          ...(rules.length > 0 ? [{ kind: `${running} rules`, detail: rules.join(', ') }] : []),
        ],
        anchor: { kind: 'dasha', key: running, label: `${running} daśā` },
      });
    }
  }

  // ------------------------------------------------------------- agreement
  const byPlace = new Map<number, Set<FocusScale>>();
  for (const one of focuses) {
    const set = byPlace.get(one.place) ?? new Set<FocusScale>();
    set.add(one.scale);
    byPlace.set(one.place, set);
  }
  let agreement: DayFocus['agreement'] = null;
  /* Most scales agreeing wins; a tie goes to the lower house, which is
     arbitrary but has to be deterministic — two charts a second apart cannot
     produce different readings. */
  for (const [place, scales] of [...byPlace.entries()].sort((a, b) => a[0] - b[0])) {
    if (scales.size < 2) continue;
    if (agreement === null || scales.size > agreement.scales.length) {
      agreement = { place, topic: placeOf(place).shortName, scales: [...scales] };
    }
  }

  if (agreement) {
    const { place, scales } = agreement;
    const reasons = focuses.filter((one) => one.place === place);
    statements.push({
      text: `Three clocks run at once here and ${scales.length === 3 ? 'all three' : 'two of them'} are pointed at the same house: ${reasons.map((one) => one.because).join(', and ')}. Agreement across timescales is the strongest statement a chart makes, because each of those positions arrived independently — the Moon by the day, the slow grahas by the year, the daśā by the chart. It says this part of life is where the attention and the arrangement currently coincide. It does not say what will happen there.`,
      factors: reasons.map((one) => ({ kind: one.by, detail: one.detail })),
      anchor: { kind: 'house', key: String(place), label: `${ordinalNumber(place)} house` },
    });
  }

  return { focuses, agreement, statements };
}

/** The strongest single area to point a reader at, or null if the sky is quiet. */
export function liveArea(focus: DayFocus): number | null {
  if (focus.agreement) return focus.agreement.place;
  return focus.focuses.find((one) => one.scale === 'period')?.place ?? null;
}

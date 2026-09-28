import {
  SIGNS,
  houseFrom,
  type ComputedChart,
  type DashaPeriod,
  type Graha,
  type PointId,
} from '@jade/astro';
import type { PlainParagraph, Working } from './plainReading.js';
import { houseReadings } from './houseReading.js';
import { grahaVoice, houseVoice } from './voice/library.js';
import { DIGNITY_VOICE } from './voice/library.js';
import { SADE_SATI_VOICE, dashaVoice, transitVoice } from './voice/timing.js';

/**
 * What is happening now, in plain words.
 *
 * ## Why this is the half that matters
 *
 * The standing chart answers "who am I". People arrive asking "what is going on
 * with me *at the moment*", and that question is answered by two things: which
 * daśā period is running, and where the slow planets are. Neither had any words
 * in the plain register until now, which made the reading surface a description
 * of a person rather than of their life.
 *
 * ## Everything here takes its clock as an argument
 *
 * `nowJd` is passed in, never read. That is `packages/astro`'s rule and it
 * applies here for a practical reason as well as a principled one: the reading
 * has to be reproducible, and a page that composed itself from `Date.now()`
 * would render differently on every request and could not be tested.
 *
 * ## The rule that binds hardest here
 *
 * A period or a transit is the natural place to make a forecast, and the
 * classical literature is full of them. Jade describes the weather and never
 * the outcome (CLAUDE.md #6). The guard runs over this composer's output.
 */

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

function ordinal(house: number): string {
  return ORDINALS[house - 1] ?? `${house}th`;
}

function list(items: readonly string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Join phrases that already contain commas.
 *
 * The house plain-names are phrases — "what is hidden, shared, and out of your
 * hands" — and joining two of them with "and" produces a sentence nobody can
 * parse: *…leans on what is hidden, shared, and out of your hands and gain,
 * friends, and what arrives*. Semicolons make the seam visible. Falls back to a
 * plain list when the items are short enough not to need it.
 */
function listPhrases(items: readonly string[]): string {
  if (items.length <= 1) return list(items);
  return items.some((item) => item.includes(',')) ? items.join('; ') : list(items);
}

/** Julian days to a rounded span a person would actually say. */
function span(days: number): string {
  if (days < 45) return `${Math.max(1, Math.round(days))} days`;
  if (days < 365) return `${Math.round(days / 30.44)} months`;
  const years = days / 365.25;
  return years < 10 ? `${years.toFixed(1)} years` : `${Math.round(years)} years`;
}

export interface PlainPeriod {
  readonly level: number;
  readonly lord: Graha;
  readonly startJd: number;
  readonly endJd: number;
  /** Fraction elapsed, 0–1, for a progress bar. */
  readonly elapsed: number;
  readonly remainingDays: number;
  readonly paragraphs: readonly PlainParagraph[];
}

export interface PlainTiming {
  readonly periods: readonly PlainPeriod[];
  /** Slow transits worth naming, with what they are crossing. */
  readonly transits: readonly PlainParagraph[];
  /** Saturn against the natal Moon, stated once and carefully. */
  readonly sadeSati: PlainParagraph | null;
}

/**
 * The running daśā chain, read.
 *
 * Each level of the chain gets its own reading, because they answer different
 * questions: the mahādaśā is the decade you are in, the antardaśā is the year,
 * and the pratyantardaśā is the month. Treating them as one paragraph is what
 * makes most software's daśā display useless.
 *
 * The important join — and the thing that makes this a reading rather than a
 * lookup — is that a period's ruler is also a *house ruler* in the chart. A
 * Saturn period means something different depending on which houses Saturn runs
 * and where it sits, and that is stated rather than left implicit.
 */
export function plainPeriods(
  chart: ComputedChart,
  chain: readonly DashaPeriod[],
  nowJd: number,
): PlainPeriod[] {
  const houses = houseReadings(chart);
  const out: PlainPeriod[] = [];

  const levelName = ['', 'main period', 'sub-period', 'sub-sub-period'];

  for (const period of chain) {
    const voice = dashaVoice(period.lord);
    const graha = grahaVoice(period.lord);
    if (!voice || !graha) continue;

    const point = chart.points[period.lord as PointId];
    const rules = houses
      .filter((house) => house.lord.lord === period.lord)
      .map((house) => house.house);

    const total = period.endJd - period.startJd;
    const done = Math.min(Math.max(nowJd - period.startJd, 0), total);

    const paragraphs: PlainParagraph[] = [];

    paragraphs.push({
      text: voice.period,
      workings: [
        {
          label: levelName[period.level] ?? `level ${period.level}`,
          detail: `${period.lord}, ${span(total)} long`,
        },
        { label: 'Remaining', detail: span(period.endJd - nowJd) },
      ],
      source: 'Bṛhat Parāśara Horā Śāstra, ch. 46 — Vimśottarī daśā',
    });

    // The join: what this planet runs in *this* chart.
    if (point && rules.length > 0) {
      const homes = list(rules.map((house) => `your ${ordinal(house)}`));
      const areas = listPhrases(
        rules.map((house) => houseVoice(house)?.plainName ?? `the ${ordinal(house)}`),
      );
      paragraphs.push({
        text: `In your chart ${period.lord} rules ${homes}, and sits in your ${ordinal(point.house)}. So this period leans on ${areas} — that is what makes a ${period.lord} period yours rather than generic.`,
        workings: [
          { label: 'Rules', detail: list(rules.map((house) => `${ordinal(house)} house`)) },
          {
            label: 'Placed',
            detail: `${point.degreesInSign.toFixed(2)}° ${point.sign}, your ${ordinal(point.house)} house`,
          },
          ...(chart.dignity[period.lord]
            ? [{ label: 'Condition', detail: chart.dignity[period.lord]!.replace('_', ' ') }]
            : []),
        ],
      });
    }

    paragraphs.push({
      text: `What it puts in front of you: ${voice.brings}. ${voice.asks}`,
      workings: [{ label: 'Period ruler', detail: `${period.lord} — ${graha.temperament}` }],
    });

    out.push({
      level: period.level,
      lord: period.lord,
      startJd: period.startJd,
      endJd: period.endJd,
      elapsed: total > 0 ? done / total : 0,
      remainingDays: Math.max(period.endJd - nowJd, 0),
      paragraphs,
    });
  }

  return out;
}

/** A transiting position, as the caller already has it from `skyNow`. */
export interface TransitNow {
  readonly id: PointId;
  readonly longitude: number;
  readonly signIndex: number;
  readonly sign: string;
  readonly retrograde: boolean;
}

/** How near a transit has to be to a natal point to be called an arrival. */
const CONTACT_ORB = 3;

/**
 * The slow transits, read against this chart.
 *
 * Only Jupiter, Saturn, Rāhu and Ketu. Mars crosses a degree in days and the
 * Moon in hours; reporting them here would bury the two that matter under
 * noise, and the technical surfaces have them for anyone who wants them.
 */
export function plainTransits(chart: ComputedChart, sky: readonly TransitNow[]): PlainParagraph[] {
  const ascSign = chart.houses.ascendantSign;
  const out: PlainParagraph[] = [];

  for (const position of sky) {
    const voice = transitVoice(position.id);
    if (!voice) continue;

    const house = houseFrom(ascSign, position.signIndex);
    const area = houseVoice(house);

    // Is it sitting on a natal point?
    const contacts: { id: string; separation: number }[] = [];
    for (const [id, natal] of Object.entries(chart.points)) {
      if (id === 'Midheaven') continue;
      const separation = Math.abs(((position.longitude - natal.longitude + 540) % 360) - 180);
      const gap = 180 - separation;
      if (gap <= CONTACT_ORB) contacts.push({ id, separation: gap });
    }
    contacts.sort((a, b) => a.separation - b.separation);

    const workings: Working[] = [
      {
        label: position.id,
        detail: `${(position.longitude % 30).toFixed(2)}° ${position.sign}${position.retrograde ? ', retrograde' : ''}`,
      },
      { label: 'Crossing', detail: `your ${ordinal(house)} house` },
    ];

    let text = `${voice.crossing} For you that is your ${ordinal(house)} — ${area?.plainName ?? 'that part of the chart'}.`;

    const nearest = contacts[0];
    if (nearest) {
      const natal = chart.points[nearest.id as PointId]!;
      text += ` ${voice.arriving} The point it is reaching is your natal ${nearest.id}, ${nearest.separation.toFixed(1)}° away.`;
      workings.push({
        label: 'Contact',
        detail: `natal ${nearest.id} at ${natal.degreesInSign.toFixed(2)}° ${natal.sign}, ${nearest.separation.toFixed(1)}° from the transit`,
      });
    }

    out.push({
      text,
      workings,
      source: nearest ? 'Gochara — transits read against the natal chart' : undefined,
    });
  }

  return out;
}

/**
 * Saturn against the natal Moon.
 *
 * Handled on its own because it is the question people actually arrive with and
 * because it is the single most badly served idea in popular Vedic astrology.
 * Jade states the position, states what the tradition says the stretch is like,
 * and explicitly refuses to say what it means for the reader's life.
 */
export function plainSadeSati(
  chart: ComputedChart,
  saturn: TransitNow | undefined,
): PlainParagraph | null {
  const moon = chart.points.Moon;
  if (!moon || !saturn) return null;

  const moonSign = moon.signIndex;
  const before = (moonSign + 11) % 12;
  const after = (moonSign + 1) % 12;

  const phase =
    saturn.signIndex === before
      ? 'before'
      : saturn.signIndex === moonSign
        ? 'over'
        : saturn.signIndex === after
          ? 'after'
          : 'none';

  return {
    text: `${SADE_SATI_VOICE[phase]} ${phase === 'none' ? '' : SADE_SATI_VOICE.caveat}`.trim(),
    workings: [
      { label: 'Natal Moon', detail: `${moon.degreesInSign.toFixed(2)}° ${moon.sign}` },
      { label: 'Saturn now', detail: `${(saturn.longitude % 30).toFixed(2)}° ${saturn.sign}` },
      {
        label: 'The three signs',
        detail: `${SIGNS[before]!}, ${SIGNS[moonSign]!}, ${SIGNS[after]!}`,
      },
    ],
    source: 'Sade sati — Saturn through the sign before, of, and after the natal Moon',
  };
}

export interface PlainPlanet {
  readonly id: Graha;
  readonly title: string;
  readonly sign: string;
  readonly house: number;
  readonly dignity: string | null;
  readonly retrograde: boolean;
  /** Which houses this planet rules in this chart. */
  readonly rules: readonly number[];
  readonly paragraphs: readonly PlainParagraph[];
}

/**
 * A reading per planet, which the house-by-house view cannot give.
 *
 * Reading by house answers "what about my seventh". Reading by planet answers
 * "what is my Saturn doing", and the two are genuinely different questions —
 * a planet rules two houses, sits in a third, and aspects several more, so its
 * story is scattered across the house view and gathered nowhere.
 */
export function plainPlanets(chart: ComputedChart): PlainPlanet[] {
  const houses = houseReadings(chart);
  const out: PlainPlanet[] = [];

  const order: Graha[] = [
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

  for (const id of order) {
    const point = chart.points[id];
    const voice = grahaVoice(id);
    if (!point || !voice) continue;

    const rules = houses.filter((house) => house.lord.lord === id).map((house) => house.house);
    const sitsIn = houseVoice(point.house);
    const dignity = chart.dignity[id] ?? null;

    const paragraphs: PlainParagraph[] = [];

    paragraphs.push({
      text: `${voice.plainName} is ${voice.temperament}. In your chart it sits in ${point.sign}, in your ${ordinal(point.house)} house — ${sitsIn?.plainName ?? 'that part of life'} — where it ${voice.verb} things, bringing ${voice.brings}${dignity ? `, ${DIGNITY_VOICE[dignity]}` : ''}.`,
      workings: [
        {
          label: 'Placed',
          detail: `${point.degreesInSign.toFixed(2)}° ${point.sign}, your ${ordinal(point.house)} house`,
        },
        ...(dignity ? [{ label: 'Condition', detail: dignity.replace('_', ' ') }] : []),
        ...(point.nakshatra ? [{ label: 'Nakṣatra', detail: point.nakshatra.name }] : []),
      ],
    });

    if (rules.length > 0) {
      const areas = listPhrases(
        rules.map((house) => houseVoice(house)?.plainName ?? `the ${ordinal(house)}`),
      );
      paragraphs.push({
        text: `It also rules ${list(rules.map((house) => `your ${ordinal(house)}`))}, so wherever ${id} goes it carries ${areas} with it. That is why this one placement shows up in more than one part of your life.`,
        workings: [
          { label: 'Rules', detail: list(rules.map((house) => `${ordinal(house)} house`)) },
          {
            label: 'Which lands in',
            detail: `your ${ordinal(point.house)} house`,
          },
        ],
        source: 'Bṛhat Parāśara Horā Śāstra, ch. 11',
      });
    }

    const strained = dignity === 'debilitated' || dignity === 'enemy' || dignity === 'great_enemy';
    const strong = dignity === 'exalted' || dignity === 'own' || dignity === 'moolatrikona';
    if (strong || strained) {
      paragraphs.push({
        text: strong ? voice.whenStrong : voice.whenStrained,
        workings: [{ label: 'Condition', detail: dignity!.replace('_', ' ') }],
      });
    }

    out.push({
      id,
      title: voice.plainName,
      sign: point.sign,
      house: point.house,
      dignity,
      retrograde: point.retrograde,
      rules,
      paragraphs,
    });
  }

  return out;
}

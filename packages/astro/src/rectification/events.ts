import type { Graha } from '../types.js';

/**
 * The life events a birth time can be rectified against.
 *
 * Rectification is inference from effect back to cause: you know roughly when
 * someone was born, you know precisely when things happened to them, and you
 * ask which candidate birth time makes the classical timing rules fit. That
 * only works if each event is tied to the houses and kārakas the tradition
 * actually assigns to it — otherwise the scoring is numerology.
 *
 * Every entry below names its houses and its kāraka, and cites where the
 * assignment comes from. Nothing here is invented for convenience: where the
 * texts assign several houses to one matter, all of them are listed, because
 * dropping one to make the arithmetic tidier would silently change the answer.
 *
 * **On the difficult categories.** Bereavement, illness and accidents are among
 * the most useful rectification anchors there are — they are precisely dated,
 * emotionally unambiguous, and they engage houses that nothing else engages.
 * They appear here as *things the person reports having already happened*, which
 * is data, not prophecy. Constitution item 6 forbids predicting death, disease
 * or legal outcomes; it does not forbid a practitioner recording that a
 * bereavement occurred in 1998 and asking which birth time is consistent with
 * it. Nothing in this module or the ones beside it ever produces a
 * forward-looking statement, and a test asserts that.
 */

export type LifeEventKind =
  | 'marriage'
  | 'partnership_end'
  | 'childbirth'
  | 'career_change'
  | 'promotion'
  | 'job_loss'
  | 'relocation'
  | 'property'
  | 'education_start'
  | 'graduation'
  | 'bereavement'
  | 'illness'
  | 'accident'
  | 'windfall'
  | 'major_loss'
  | 'spiritual_turn';

export interface LifeEventDefinition {
  readonly kind: LifeEventKind;
  readonly label: string;
  /**
   * Houses the tradition assigns to this matter, most central first.
   *
   * The first house in the list is weighted highest by the scorer; the rest
   * are corroborating. A house appearing here means a graha ruling or
   * occupying it is expected to be active when the event happened.
   */
  readonly houses: readonly number[];
  /** Natural significators. A daśā of one of these is corroborating. */
  readonly karakas: readonly Graha[];
  readonly source: string;
  /**
   * How sharply this event is usually dated. An event someone places to the
   * day discriminates far better than one they place to a year, and the
   * scorer widens its transit window accordingly.
   */
  readonly typicalPrecision: 'day' | 'month' | 'year';
}

export const LIFE_EVENTS: readonly LifeEventDefinition[] = [
  {
    kind: 'marriage',
    label: 'Marriage or committed partnership',
    houses: [7, 2, 11],
    karakas: ['Venus', 'Jupiter'],
    source: 'Bṛhat Pārāśara Horā Śāstra, ch. 15 — the seventh as the house of the spouse',
    typicalPrecision: 'day',
  },
  {
    kind: 'partnership_end',
    label: 'Separation or divorce',
    houses: [7, 6, 12],
    karakas: ['Venus', 'Saturn'],
    source: 'BPHS — the sixth and twelfth as the houses that undo the seventh',
    typicalPrecision: 'month',
  },
  {
    kind: 'childbirth',
    label: 'Birth of a child',
    houses: [5, 9, 2],
    karakas: ['Jupiter'],
    source: 'BPHS, ch. 14 — the fifth as the house of progeny',
    typicalPrecision: 'day',
  },
  {
    kind: 'career_change',
    label: 'Change of career or profession',
    houses: [10, 6, 1],
    karakas: ['Saturn', 'Sun', 'Mercury'],
    source: 'BPHS — the tenth as karma-bhāva, the sixth as service',
    typicalPrecision: 'month',
  },
  {
    kind: 'promotion',
    label: 'Promotion or public recognition',
    houses: [10, 11, 1],
    karakas: ['Sun', 'Jupiter'],
    source: 'BPHS — the tenth for standing, the eleventh for gain',
    typicalPrecision: 'month',
  },
  {
    kind: 'job_loss',
    label: 'Job loss or business failure',
    houses: [10, 12, 6],
    karakas: ['Saturn'],
    source: 'BPHS — the twelfth as loss of the tenth',
    typicalPrecision: 'month',
  },
  {
    kind: 'relocation',
    label: 'Moving home or country',
    houses: [4, 12, 3],
    karakas: ['Moon', 'Mars'],
    source: 'BPHS — the fourth as home, the twelfth as distant places',
    typicalPrecision: 'month',
  },
  {
    kind: 'property',
    label: 'Buying or selling property',
    houses: [4, 2, 11],
    karakas: ['Mars', 'Venus'],
    source: 'BPHS — the fourth as immovable property',
    typicalPrecision: 'day',
  },
  {
    kind: 'education_start',
    label: 'Starting a course of study',
    houses: [4, 5, 9],
    karakas: ['Mercury', 'Jupiter'],
    source: 'BPHS — the fourth as formal learning, the fifth as intellect',
    typicalPrecision: 'month',
  },
  {
    kind: 'graduation',
    label: 'Graduation or qualification',
    houses: [4, 9, 10],
    karakas: ['Mercury', 'Jupiter'],
    source: 'BPHS — the ninth as higher learning',
    typicalPrecision: 'day',
  },
  {
    kind: 'bereavement',
    label: 'Death of a close family member',
    houses: [8, 2, 4],
    karakas: ['Saturn'],
    source: 'BPHS — the eighth counted from the relevant relative’s house',
    typicalPrecision: 'day',
  },
  {
    kind: 'illness',
    label: 'Serious illness or surgery',
    houses: [6, 8, 12],
    karakas: ['Saturn', 'Mars'],
    source: 'BPHS, ch. 44 — the sixth as roga-bhāva',
    typicalPrecision: 'month',
  },
  {
    kind: 'accident',
    label: 'Accident or injury',
    houses: [6, 8, 1],
    karakas: ['Mars', 'Saturn'],
    source: 'BPHS — Mars as the kāraka of wounds and sudden harm',
    typicalPrecision: 'day',
  },
  {
    kind: 'windfall',
    label: 'Inheritance, windfall or large gain',
    houses: [8, 11, 2],
    karakas: ['Jupiter', 'Venus'],
    source: 'BPHS — the eighth as others’ wealth, the eleventh as gain',
    typicalPrecision: 'month',
  },
  {
    kind: 'major_loss',
    label: 'Major financial loss',
    houses: [12, 8, 2],
    karakas: ['Saturn'],
    source: 'BPHS — the twelfth as vyaya, expenditure and loss',
    typicalPrecision: 'month',
  },
  {
    kind: 'spiritual_turn',
    label: 'Initiation, ordination or a decisive turn inward',
    houses: [9, 12, 5],
    karakas: ['Jupiter', 'Ketu'],
    source: 'BPHS — the ninth as dharma, the twelfth as renunciation',
    typicalPrecision: 'month',
  },
];

const BY_KIND = new Map(LIFE_EVENTS.map((event) => [event.kind, event]));

export function lifeEvent(kind: LifeEventKind): LifeEventDefinition | undefined {
  return BY_KIND.get(kind);
}

export function isLifeEventKind(value: string): value is LifeEventKind {
  return BY_KIND.has(value as LifeEventKind);
}

/**
 * How wide a transit window to allow, in days, for an event dated this well.
 *
 * A slow graha sits within orb of a point for weeks, so the window is not
 * really about the graha — it is about how much the reported date can be
 * trusted. Someone who says "March 1997" should not have their candidate
 * scored against a three-day window.
 */
export const PRECISION_WINDOW_DAYS: Record<LifeEventDefinition['typicalPrecision'], number> = {
  day: 45,
  month: 75,
  year: 200,
};

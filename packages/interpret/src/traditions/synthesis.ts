import { elementOfSign, type ComputedChart } from '@jade/astro';
import type { Working } from '../plainReading.js';
import { lordSurvey } from '../lords.js';
import { placeOf } from './places.js';

/**
 * The chart compiled — what it is organised around, before any one placement.
 *
 * ## The problem this exists to fix
 *
 * A reading made of nine graha cards is nine true statements and no reading.
 * Every card is correct, every card is grounded, and a person finishes all nine
 * knowing less than a practitioner would tell them in two minutes — because
 * what a practitioner does first is not describe placements, it is notice that
 * three of them are saying the same thing and a fourth is arguing.
 *
 * So this layer reads the chart for *patterns across* placements and leads with
 * them. The per-graha passages stay; they stop being the whole reading and
 * become the detail underneath one.
 *
 * ## Every thread is conditional, and most charts do not fire most of them
 *
 * A synthesis that always finds four themes is a horoscope. Each detector below
 * has a real threshold and returns nothing when it is not met, so two charts
 * produce different numbers of threads and a chart with nothing remarkable says
 * so. That is the difference between synthesis and padding.
 *
 * ## Grounded, same as everything else
 *
 * Every thread carries the placements that produced it (CLAUDE.md #5). A
 * statement about the whole chart is the easiest kind to make unfalsifiable,
 * which is exactly why this one has to show its working.
 */

export type ThreadKind =
  'weight' | 'ruler' | 'repetition' | 'tension' | 'extreme' | 'absence' | 'temper';

export interface Thread {
  readonly kind: ThreadKind;
  /** Ordering only. Never shown, never summed, never called a score. */
  readonly rank: number;
  readonly title: string;
  readonly body: string;
  readonly workings: readonly Working[];
  /**
   * True when the opening has already said this one.
   *
   * The first draft printed the two loudest threads in the opening and then
   * again under their own headings — the exact padding this layer exists to
   * remove, and the reader pays twice: once reading it, once wondering whether
   * they missed a difference. `threads` stays complete so nothing is hidden
   * from a caller that wants the whole picture; a surface rendering the list
   * filters this out.
   */
  readonly inOpening: boolean;
}

export interface ChartSynthesis {
  /** One sentence: what this chart is organised around. */
  readonly headline: string;
  /** The compiled read. Leads; does not list. */
  readonly opening: readonly string[];
  /** Every thread the chart fired, loudest first. See `Thread.inOpening`. */
  readonly threads: readonly Thread[];
  /** What to hold while reading the detail. Never advice. */
  readonly question: string;
}

/* The nine. The angles are not grahas and do not count toward weight. */
const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

/**
 * Natural benefic and malefic, the classical division.
 *
 * Mercury is conditional in the tradition — benefic alone, coloured by whatever
 * it sits with — so it is in neither list rather than being assigned a side it
 * does not hold. The Moon's benefic status depends on its phase, which this
 * layer does not read, so it is left out for the same reason. Putting a
 * doubtful graha on a side to make a tidier rule is how a reading becomes
 * confident about something the tradition is not.
 */
const BENEFIC = new Set(['Jupiter', 'Venus']);
const MALEFIC = new Set(['Saturn', 'Mars', 'Rahu', 'Ketu']);

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

const ANGLES = [1, 4, 7, 10];

const NUMBER = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/** The leading noun phrase of a place, for when a list has to stay readable. */
function leading(governs: string): string {
  return governs.split(',')[0]!.trim();
}

/** Sentence case, for a topic that was written to sit mid-sentence. */
function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * The lights take an article and the rest do not.
 *
 * "Sun is debilitated" is how software talks; "the Sun is debilitated" is how
 * people do. The five star-planets and the two nodes are used bare, which is
 * also how the tradition uses them.
 */
function named(id: string): string {
  return id === 'Sun' || id === 'Moon' ? `the ${id}` : id;
}

/** "a, b and c" — because "a, b, c" reads like a database row. */
function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

interface Placed {
  readonly id: string;
  readonly house: number;
  readonly sign: string;
  readonly degreesInSign: number;
  readonly dignity: string | null;
}

function placedGrahas(chart: ComputedChart): Placed[] {
  return GRAHAS.flatMap((id) => {
    const point = chart.points[id];
    if (!point) return [];
    return [
      {
        id,
        house: point.house,
        sign: point.sign,
        degreesInSign: point.degreesInSign,
        dignity: chart.dignity[id] ?? null,
      },
    ];
  });
}

const working = (one: Placed): Working => ({
  label: one.id,
  detail: `${one.degreesInSign.toFixed(1)}° ${one.sign}, the ${ORDINAL[one.house - 1]}`,
});

/* ------------------------------------------------------------- detectors */

/** Three or more of the nine in one house. Two is a coincidence. */
function weight(grahas: readonly Placed[]): Omit<Thread, 'inOpening'> | null {
  const byHouse = new Map<number, Placed[]>();
  for (const one of grahas) byHouse.set(one.house, [...(byHouse.get(one.house) ?? []), one]);

  const [house, residents] =
    [...byHouse.entries()].sort((a, b) => b[1].length - a[1].length)[0] ?? [];
  if (!house || !residents || residents.length < 3) return null;

  const place = placeOf(house);
  return {
    kind: 'weight',
    rank: 100 + residents.length,
    title: `${cap(NUMBER[residents.length]!)} of the nine are in one place`,
    body: `${cap(list(residents.map((one) => named(one.id))))} all sit in ${place.topic} — ${place.governs}. A concentration like this is the most reliable thing in a chart and the most double-edged: it is where the energy goes without being sent, which means it is both where the life actually happens and where it gets stuck. Somebody with this is rarely vague about this area and rarely finished with it.`,
    workings: residents.map(working),
  };
}

/** Where the lord of the rising sign sits. Every chart has one. */
function ruler(chart: ComputedChart, grahas: readonly Placed[]): Omit<Thread, 'inOpening'> | null {
  const survey = lordSurvey(chart);
  const first = survey.placements.find((one) => one.house === 1);
  if (!first) return null;

  const lord = grahas.find((one) => one.id === first.lord);
  if (!lord) return null;

  const place = placeOf(first.inHouse);
  const alsoRules = first.alsoRules;

  const body = first.ownHouse
    ? `${cap(named(first.lord))} rules the rising sign and stands in it. A chart run from its own first house is unusually self-contained — the question "what is this person for" is answered by the person rather than by a department of their life, and that is a strength and a limit in the same move.`
    : `${cap(named(first.lord))} rules the rising sign and sits in ${place.topic} — ${place.governs}. That is where the chart is run from: not necessarily where the most happens, but where the decisions that shape the rest get made.${
        alsoRules
          ? ` It also rules the ${ORDINAL[alsoRules - 1]}, which ties those two parts of life together whether or not that is convenient.`
          : ''
      }`;

  return {
    kind: 'ruler',
    rank: 90,
    title: first.ownHouse
      ? `The chart is run from its own first`
      : `The chart is run from the ${ORDINAL[first.inHouse - 1]}`,
    body,
    workings: [
      working(lord),
      { label: 'Rules', detail: `the rising sign (${first.sign})` },
      ...(alsoRules ? [{ label: 'And rules', detail: `the ${ORDINAL[alsoRules - 1]}` }] : []),
    ],
  };
}

/**
 * The same house named by two independent means.
 *
 * This is the thread that earns the word "compiled". A house that holds grahas
 * *and* receives two or more house lords has been pointed at twice by
 * techniques that do not know about each other, and that is the kind of
 * agreement a practitioner leads with.
 */
function repetition(
  chart: ComputedChart,
  grahas: readonly Placed[],
): Omit<Thread, 'inOpening'> | null {
  const survey = lordSurvey(chart);
  const occupied = new Set(grahas.map((one) => one.house));

  const hub = survey.hubs.find((one) => occupied.has(one.house) && one.from.length >= 2);
  if (!hub) return null;

  const residents = grahas.filter((one) => one.house === hub.house);
  const place = placeOf(hub.house);

  return {
    kind: 'repetition',
    rank: 95 + hub.from.length,
    title: `The ${ORDINAL[hub.house - 1]} keeps coming up`,
    body: `Two different ways of reading this chart point at the same place. ${cap(
      list(residents.map((one) => named(one.id))),
    )} ${residents.length === 1 ? 'sits' : 'sit'} in ${place.topic}, and the ${list(
      hub.from.map((from) => ORDINAL[from - 1]!),
    )} send their rulers there as well — so matters that belong elsewhere keep getting settled here. When a chart says something twice by different routes, that is the part of the reading to trust first.`,
    workings: [
      ...residents.map(working),
      ...hub.from.map((from) => ({
        label: `Lord of the ${ORDINAL[from - 1]}`,
        detail: `sits in the ${ORDINAL[hub.house - 1]}`,
      })),
    ],
  };
}

/** A benefic and a malefic in the same house: one area getting both at once. */
function tension(grahas: readonly Placed[]): Omit<Thread, 'inOpening'> | null {
  const byHouse = new Map<number, Placed[]>();
  for (const one of grahas) byHouse.set(one.house, [...(byHouse.get(one.house) ?? []), one]);

  for (const [house, residents] of [...byHouse.entries()].sort((a, b) => a[0] - b[0])) {
    const good = residents.filter((one) => BENEFIC.has(one.id));
    const hard = residents.filter((one) => MALEFIC.has(one.id));
    if (good.length === 0 || hard.length === 0) continue;

    const place = placeOf(house);
    return {
      kind: 'tension',
      rank: 80,
      title: `${cap(list([...good, ...hard].map((one) => named(one.id))))} share a house`,
      body: `${cap(place.topic)} gets opened up and closed down by the same chart. ${cap(
        list(good.map((one) => named(one.id))),
      )} ${good.length === 1 ? 'makes' : 'make'} room here; ${list(
        hard.map((one) => named(one.id)),
      )} ${hard.length === 1 ? 'takes' : 'take'} it back. People read this as inconsistency in themselves and it is not — it is two real appetites pointed at one part of life, and the work is giving each of them somewhere to go rather than deciding which one is the real self.`,
      workings: residents.map(working),
    };
  }
  return null;
}

/** Exalted or fallen. The first thing a practitioner looks for. */
function extreme(grahas: readonly Placed[]): Omit<Thread, 'inOpening'> | null {
  const high = grahas.filter((one) => one.dignity === 'exalted' || one.dignity === 'moolatrikona');
  const low = grahas.filter((one) => one.dignity === 'debilitated');
  if (high.length === 0 && low.length === 0) return null;

  const parts: string[] = [];
  if (high.length > 0) {
    parts.push(
      `${cap(list(high.map((one) => named(one.id))))} ${high.length === 1 ? 'is' : 'are'} as well placed as the system allows. That does not mean easy — it means this faculty does what it is for, reliably, and other people notice it before the person does.`,
    );
  }
  if (low.length > 0) {
    parts.push(
      `${cap(list(low.map((one) => named(one.id))))} ${low.length === 1 ? 'is' : 'are'} in the sign the tradition rates worst for ${low.length === 1 ? 'it' : 'them'}. Read it as a rate rather than a verdict: this is the part of life that arrives late, costs more, and tends to be the thing a person eventually becomes unusually good at precisely because none of it came free.`,
    );
  }

  return {
    kind: 'extreme',
    rank: 70,
    title:
      high.length > 0 && low.length > 0
        ? 'One graha at its best, one at its worst'
        : high.length > 0
          ? `${cap(list(high.map((one) => named(one.id))))} at full strength`
          : `${cap(list(low.map((one) => named(one.id))))} under strain`,
    body: parts.join(' '),
    workings: [...high, ...low].map(working),
  };
}

/** An empty angle. Absence is a finding, not a gap in the data. */
function absence(grahas: readonly Placed[]): Omit<Thread, 'inOpening'> | null {
  const occupied = new Set(grahas.map((one) => one.house));
  const empty = ANGLES.filter((house) => !occupied.has(house));
  if (empty.length === 0 || empty.length === ANGLES.length) return null;

  return {
    kind: 'absence',
    rank: 50,
    title: `Nothing stands in the ${list(empty.map((house) => ORDINAL[house - 1]!))}`,
    body: `An empty house is not an empty part of life. ${cap(
      list(empty.map((house) => `the ${ORDINAL[house - 1]} (${leading(placeOf(house).governs)})`)),
    )} ${empty.length === 1 ? 'has' : 'have'} nothing pushing from inside, so what happens there is run by whichever graha rules the sign, from wherever that graha happens to be standing. Practically: ${
      empty.length === 1 ? 'this area tends' : 'these areas tend'
    } to be lived through other people and circumstances rather than driven, and ${
      empty.length === 1 ? 'it is' : 'they are'
    } usually the last place somebody thinks to look when something is wrong.`,
    workings: empty.map((house) => ({
      label: `The ${ORDINAL[house - 1]}`,
      detail: 'no graha standing in it',
    })),
  };
}

/** A real skew across the four elements. Fires rarely, which is the point. */
function temper(chart: ComputedChart, grahas: readonly Placed[]): Omit<Thread, 'inOpening'> | null {
  const counts = new Map<string, Placed[]>();
  for (const one of grahas) {
    const point = chart.points[one.id]!;
    const element = elementOfSign(point.signIndex);
    counts.set(element, [...(counts.get(element) ?? []), one]);
  }

  const heavy = [...counts.entries()].find(([, held]) => held.length >= 5);
  const missing = ['fire', 'earth', 'air', 'water'].filter(
    (element) => (counts.get(element)?.length ?? 0) === 0,
  );
  if (!heavy && missing.length === 0) return null;

  const HOW: Readonly<Record<string, string>> = {
    fire: 'starts things, and finds the maintaining harder than the starting',
    earth: 'wants it to be real before it is interesting, and is slow to be impressed',
    air: 'needs to understand it before committing to it, and can mistake understanding for having done it',
    water: 'reads the room before it reads the brief, and is rarely wrong about the room',
  };

  const parts: string[] = [];
  if (heavy) {
    parts.push(
      `${heavy[1].length} of the nine sit in ${heavy[0]} signs — ${list(heavy[1].map((one) => one.id))}. A chart weighted this far one way ${HOW[heavy[0]]}.`,
    );
  }
  if (missing.length > 0) {
    parts.push(
      `There is nothing at all in ${list(missing)}. That is not a deficiency to correct; it is a register this person does not naturally reach for, and usually ends up borrowing from whoever is closest to them.`,
    );
  }

  return {
    kind: 'temper',
    rank: 40,
    title: heavy ? `Weighted toward ${heavy[0]}` : `Nothing in ${list(missing)}`,
    body: parts.join(' '),
    /*
     * The distribution itself, not just the heavy side.
     *
     * A claim that there is nothing in water is grounded by the count of what
     * is in each element — the absence has to be shown, and it cannot be shown
     * by listing the grahas that are not there. An earlier version carried only
     * the heavy element's grahas, so a chart that was merely missing one fired
     * a thread with no workings at all, which is the one thing a reading in
     * this codebase may never do.
     */
    workings: ['fire', 'earth', 'air', 'water'].map((element) => ({
      label: element,
      detail:
        (counts.get(element)?.length ?? 0) === 0
          ? 'nothing'
          : list(counts.get(element)!.map((one) => one.id)),
    })),
  };
}

/* ------------------------------------------------------------- the compile */

/**
 * Read the whole chart, then say what it is about.
 *
 * Pure: a computed chart in, text out. No clock, no database, no provider.
 */
export function synthesise(chart: ComputedChart): ChartSynthesis {
  const grahas = placedGrahas(chart);

  const found = [
    repetition(chart, grahas),
    weight(grahas),
    ruler(chart, grahas),
    tension(grahas),
    extreme(grahas),
    absence(grahas),
    temper(chart, grahas),
  ]
    .filter((one): one is Omit<Thread, 'inOpening'> => one !== null)
    .sort((a, b) => b.rank - a.rank);

  const lead = found[0];
  const second = found[1];
  /* The opening is the two loudest; the rest are listed under it. */
  const threads: Thread[] = found.map((thread, index) => ({ ...thread, inOpening: index < 2 }));
  const rest = threads.filter((thread) => !thread.inOpening);

  /*
   * The headline is the loudest true thing, not a summary of everything.
   *
   * A sentence that tries to hold all seven threads holds none of them. This
   * takes the top one and says it, and the rest of the page is the rest.
   */
  const headline = lead ? lead.title : 'A chart with no single centre of gravity';

  const opening: string[] = [];
  if (lead) {
    opening.push(lead.body);
  } else {
    opening.push(
      'Nothing in this chart shouts. No house holds three grahas, no place is named twice by different routes, and nothing is at the top or the bottom of its dignity. That is a real result and an uncommon one: it describes somebody whose life is not organised around a single preoccupation, which tends to read as range from outside and as difficulty choosing from inside.',
    );
  }
  if (second) {
    opening.push(`Underneath that: ${second.body.charAt(0).toLowerCase()}${second.body.slice(1)}`);
  }
  if (rest.length > 0) {
    opening.push(
      `${cap(NUMBER[Math.min(rest.length, 9)]!)} further ${rest.length === 1 ? 'thread runs' : 'threads run'} through this chart, below — ordered by how loudly the chart states them rather than by house number, because that is the order a practitioner reads in.`,
    );
  }

  const question = lead
    ? 'Before the detail: does the sentence above describe the shape of your life, or only a part of it you recognise? The answer tells you how much weight to give everything that follows.'
    : 'Before the detail: a chart without one dominant theme asks a different question — not "what is this about" but "which of these do you keep returning to".';

  return { headline, opening, threads, question };
}

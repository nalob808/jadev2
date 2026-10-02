import {
  SIGNS,
  houseOfCusps,
  signsAspectedBy,
  type ComputedChart,
  type Graha,
  type SkyPosition,
} from '@jade/astro';
import type { Working } from '../plainReading.js';
import { lordSurvey } from '../lords.js';
import { PLACES, placeOf } from './places.js';

/**
 * Every area of life, each read from everything that touches it.
 *
 * ## What makes this a reading rather than a table
 *
 * A house is not described by one fact. A practitioner asked "how is my money"
 * looks at five things at once — the sign on the house, where its ruler went,
 * who is standing in it, who is looking at it, and whether the chart's own
 * scoring gives it support — and then says one thing. This composes those five
 * and says one thing.
 *
 * Each signal is written once and fires only when it applies, which is why
 * twelve areas do not read as twelve paragraphs of the same shape. A house
 * whose lord sits in a difficult place, holds a malefic, and scores low gets a
 * reading that says so three times over in three different registers; a house
 * with none of that gets a short, quiet entry, which is the honest output.
 *
 * ## The one number, and what it is not
 *
 * Aṣṭakavarga sarva is the only quantity here. It is a count of benefic points
 * the classical scheme assigns to a sign, it averages 28 across the twelve, and
 * Jade reports where a sign sits against that average and nothing more. It is
 * not a score for the area, there is no total, and there is no bar. The
 * tradition uses it to rank signs for transit work, which is a narrower claim
 * than "this part of your life is a 7 out of 10" and the only one supportable.
 *
 * ## Why each explanation appears once
 *
 * Every signal needs a sentence explaining what it means — an aspect without
 * occupancy, a ruler in a duḥsthāna, an empty house. Written straight, that
 * sentence then appears in all twelve areas, and a reader who has just read
 * eleven paragraphs ending "...which usually shows up as influence arriving
 * from outside" stops reading. So the claim and its gloss are separate: the
 * claim is specific to the area and always printed, the gloss is generic and
 * printed the first time only. A reading of the whole chart therefore teaches
 * each idea once and then trusts the reader with it, the way a person would.
 *
 * ## Live now
 *
 * The daśā lord running today is the link between a natal reading and a
 * calendar. An area whose lord is the running lord — or which holds it, or is
 * aspected by it — is the part of the chart currently being asked about, and
 * saying so is the difference between a reading about a person and a reading
 * about their year.
 */

export type AreaSignal =
  | 'lordStrong'
  | 'lordOwn'
  | 'lordHidden'
  | 'lordElsewhere'
  | 'occupied'
  | 'empty'
  | 'watched'
  | 'support'
  | 'strain'
  | 'crossing';

export interface AreaReading {
  readonly place: number;
  /** The place's own topic, capitalised for a heading. */
  readonly title: string;
  readonly governs: string;
  readonly asks: string;
  /** The compiled read. One to five paragraphs, depending on what is true. */
  readonly body: readonly string[];
  /** Which signals fired. For tests and for ordering, never shown as a score. */
  readonly signals: readonly AreaSignal[];
  /**
   * Set when the running daśā lord rules or occupies this area.
   *
   * Not when it merely aspects it — see the note at the detector. The looser
   * test marked half a chart live, which is the same as marking none of it.
   */
  readonly liveNow: string | null;
  /**
   * What the sky is doing to this area right now, when a sky was supplied.
   *
   * Separate from `body` because it has a different half-life: the paragraphs
   * above are true for a lifetime and this one is true for months. A reader
   * who cannot tell those apart has been misled by the layout rather than by
   * the content.
   */
  readonly crossing: string | null;
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

const GRAHAS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];
const BENEFIC = new Set(['Jupiter', 'Venus']);
const MALEFIC = new Set(['Saturn', 'Mars', 'Rahu', 'Ketu']);

/** Angles and trines: where a graha has reach. Classical, and not controversial. */
const KENDRA = new Set([1, 4, 7, 10]);
const TRIKONA = new Set([1, 5, 9]);
/** The three the tradition treats as hard to work from. */
const DUHSTHANA = new Set([6, 8, 12]);

/**
 * The four slow enough to say something about a house for months at a time.
 *
 * The Moon crosses a house every two days and the inner grahas every few
 * weeks; including them would give every area something "happening" in it
 * permanently, which is precisely the move that turns a reading into a
 * horoscope.
 */
const SLOW_CROSSING = new Set(['Saturn', 'Jupiter', 'Rahu', 'Ketu']);

/** What each slow graha's passage is classically taken to ask of a house. */
const CROSSING_NOTE: Record<string, string> = {
  Saturn:
    'about two and a half years in a sign, and the tradition reads its passage as a demand that whatever is here be done properly rather than quickly',
  Jupiter:
    'about a year in a sign, read as room to expand into, with the attendant risk of taking on more than the house can hold',
  Rahu: 'read as appetite without a ceiling — more of whatever this house is, sought past the point of sense',
  Ketu: 'read as disinterest in what is here, which the texts treat as a loss and a release depending on what was being held',
};

/** The aṣṭakavarga average across twelve signs. 337 points, call it 28 a sign. */
const SARVA_AVERAGE = 28;

/**
 * Which house a transiting body is crossing.
 *
 * Whole sign when the chart is whole sign, cusps otherwise. Reading a transit
 * against a different house division than the chart was drawn in would put a
 * graha in the wrong area, which is the one error in this file a reader could
 * not catch from the workings.
 */
function transitHouse(chart: ComputedChart, position: SkyPosition): number | null {
  if (chart.houses.system === 'whole_sign') {
    return ((((position.signIndex - chart.houses.ascendantSign) % 12) + 12) % 12) + 1;
  }
  if (chart.houses.cusps.length !== 12) return null;
  return houseOfCusps(position.longitude, chart.houses.cusps);
}

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

export interface LiveLords {
  /** The mahādaśā lord running now. */
  readonly major: Graha;
  /** The antardaśā lord, when one is known. */
  readonly minor?: Graha | undefined;
}

/**
 * Read one area.
 *
 * Pure. Everything it needs is in the chart and the optional running lords;
 * no clock is read here, which is what makes the same day reproducible.
 */
export interface AreaOptions {
  /** The running daśā lords. Omitted, no area is marked live. */
  readonly live?: LiveLords | undefined;
  /**
   * Today's sky. Omitted, the area is read as a permanent arrangement only —
   * which is the right output for a printed report and the wrong one for a
   * screen somebody opens on a Tuesday.
   */
  readonly sky?: readonly SkyPosition[] | undefined;
  /**
   * Generic explanations already given earlier in this reading.
   *
   * Pass the same map through every area and each idea is explained once.
   * Omit it and every area stands alone, which is what a single-area view
   * wants. Mutated on purpose — the caller owns it. Most entries are flags;
   * a few carry a value, because saying "the same seat as the fourth house of
   * home and ground" requires remembering which house that was.
   */
  readonly told?: Map<string, string> | undefined;
}

export function readArea(
  chart: ComputedChart,
  place: number,
  options: AreaOptions = {},
): AreaReading {
  const { live, sky, told } = options;
  const topic = placeOf(place);
  const ascendant = chart.houses.ascendantSign;
  const signIndex = (ascendant + place - 1) % 12;

  const survey = lordSurvey(chart);
  const rule = survey.placements.find((one) => one.house === place)!;

  const occupants = GRAHAS.filter((id) => chart.points[id]?.house === place);

  /* Who is looking at this house, by whole-sign dṛṣṭi. */
  const watchers = GRAHAS.filter((id) => {
    const point = chart.points[id];
    if (!point || point.house === place) return false;
    return signsAspectedBy(id as Graha, point.signIndex, { includeNodes: true }).some(
      (aspect) => aspect.toSign === signIndex,
    );
  });

  const sarva = chart.ashtakavarga.sarva[signIndex] ?? SARVA_AVERAGE;
  const sign = SIGNS[signIndex] ?? 'this sign';

  const body: string[] = [];
  const signals: AreaSignal[] = [];
  const workings: Working[] = [];

  /** The specific claim always prints; the generic gloss prints once. */
  function say(key: string, claim: string, gloss?: string): void {
    if (!gloss) {
      body.push(claim);
      return;
    }
    if (told?.has(key)) {
      body.push(claim);
      return;
    }
    told?.set(key, '');
    body.push(`${claim} ${gloss}`);
  }

  /* ---------------------------------------------------------- the ruler */
  workings.push({
    label: `Lord of the ${ORDINAL[place - 1]}`,
    detail: `${rule.lord}, in the ${ORDINAL[rule.inHouse - 1]} (${rule.inSign})`,
  });

  /**
   * "the seventh house of partnership".
   *
   * The ordinal alone makes a reader count on their fingers; the topic alone
   * loses the practitioner. An em-dash apposition would carry both and then
   * collide with the comma of whatever clause follows, so this is the phrasing
   * that survives being dropped anywhere in a sentence.
   */
  function where(house: number): string {
    return `the ${ORDINAL[house - 1]} house of ${placeOf(house).shortName}`;
  }

  const lordClass: AreaSignal = rule.ownHouse
    ? 'lordOwn'
    : KENDRA.has(rule.inHouse) || TRIKONA.has(rule.inHouse) || rule.alsoRules === rule.inHouse
      ? 'lordStrong'
      : DUHSTHANA.has(rule.inHouse)
        ? 'lordHidden'
        : 'lordElsewhere';
  signals.push(lordClass);

  /*
   * A graha rules two houses, so its seat gets described twice in a full
   * reading — and the second description is word for word the first, which is
   * how a reading starts sounding generated. The second time, point back
   * instead. That is also what a practitioner says out loud: "same Saturn,
   * same place, so these two go together."
   */
  const seatKey = `seat:${rule.lord}`;
  const twin = told?.get(seatKey);

  if (twin && rule.ownHouse) {
    say(
      `seatOwnAgain:${rule.lord}`,
      `This is ${rule.lord}'s own house and ${rule.lord} is sitting in it — the same seat that runs ${twin}.`,
      `A ruler at home in one of its houses runs the other from inside the first, which makes the pair lopsided: the house it occupies sets the terms, and the other one lives with them.`,
    );
  } else if (twin) {
    say(
      `seatAgain:${rule.lord}`,
      `${cap(named(rule.lord))} rules this one too, from that same seat in ${where(rule.inHouse)}.`,
      `Two houses run from one position are not two separate matters that happen to correlate — they are one arrangement showing two faces, and whatever shifts in ${twin} shows up here.`,
    );
  } else if (rule.ownHouse) {
    say(
      'lordOwn',
      `${cap(named(rule.lord))} rules this and stands in it.`,
      `An area whose ruler is at home in it is self-running in a way the rest of a chart usually is not: it does not borrow its conditions from anywhere else, for better and for worse, and it is rarely the part of a life somebody blames their circumstances for.`,
    );
  } else if (rule.alsoRules === rule.inHouse) {
    say(
      'lordDoubled',
      `${cap(named(rule.lord))} rules this and has gone to ${where(rule.inHouse)}, which it also rules.`,
      `A ruler sitting in the other house it owns welds the two together: a change in either shows up in both, and neither can be worked on by itself.`,
    );
  } else if (KENDRA.has(rule.inHouse)) {
    say(
      'lordKendra',
      `What happens here is decided in ${where(rule.inHouse)} — that is where ${named(rule.lord)}, which rules this, actually sits.`,
      `A ruler on an angle has somewhere to act from, so an area run this way tends to be visible, to involve other people, and to be worked at rather than waited on.`,
    );
  } else if (TRIKONA.has(rule.inHouse)) {
    say(
      'lordTrikona',
      `${cap(named(rule.lord))} rules this and has gone to ${where(rule.inHouse)}, which the tradition counts as supported ground.`,
      `Things run from a trine tend to be helped along by what was already in place — and the help is easy to mistake for one's own doing.`,
    );
  } else if (DUHSTHANA.has(rule.inHouse)) {
    say(
      'lordDuhsthana',
      `The ruler of this area, ${named(rule.lord)}, has gone to ${where(rule.inHouse)}.`,
      `Classically that is a ruler working at a remove: the area still functions, and the mechanism sits somewhere the person does not look and other people cannot see. Indirect, not damaged — the two get confused constantly, and the difference is most of the reading.`,
    );
  } else {
    say(
      'lordElsewhere',
      `${cap(named(rule.lord))} rules this from ${where(rule.inHouse)}, so what happens here is partly settled there.`,
      `That is the ordinary way one part of a life depends quietly on another, and it is usually the connection a person has not made.`,
    );
  }

  told?.set(seatKey, where(place));

  if (rule.alsoRules !== null && rule.alsoRules !== rule.inHouse && !twin) {
    say(
      'alsoRules',
      `${cap(named(rule.lord))} also rules ${where(rule.alsoRules)}, so the two move together.`,
      `One graha holding two houses ties their seasons: a good stretch in one tends to arrive alongside a stretch in the other, whether or not that is convenient.`,
    );
    workings.push({
      label: `${rule.lord} also rules`,
      detail: `the ${ORDINAL[rule.alsoRules - 1]}`,
    });
  }

  /* ------------------------------------------------------- who is in it */
  /* A lord already reported as standing in its own house is not news twice. */
  const toReport = rule.ownHouse ? occupants.filter((id) => id !== rule.lord) : occupants;

  if (occupants.length > 0) {
    signals.push('occupied');
    if (toReport.length > 0) {
      /* Names come from toReport (no restating the lord), but the character of
         a house is set by everyone standing in it, the lord included. */
      const good = occupants.filter((id) => BENEFIC.has(id));
      const hard = occupants.filter((id) => MALEFIC.has(id));
      const claim = `${cap(list(toReport.map(named)))} ${toReport.length === 1 ? 'stands' : 'stand'} here${rule.ownHouse ? ' as well' : ''}.`;
      if (good.length > 0 && hard.length > 0) {
        say(
          'mixed',
          claim,
          `Both kinds at once, which reads from the inside as inconsistency and is not: two appetites pointed at one place, each of them answering to something real.`,
        );
      } else if (hard.length === 0 && good.length > 0) {
        say(
          'benefic',
          claim,
          `Jupiter and Venus tend to open a house up — more of it, more easily, and a standing temptation to take the ease as evidence the terms are sound.`,
        );
      } else if (good.length === 0 && hard.length > 0) {
        say(
          'malefic',
          claim,
          `Saturn, Mars and the nodes narrow a house: more friction, a higher standard to clear, and results that usually outlast whatever came easily.`,
        );
      } else {
        say(
          'neutral',
          claim,
          `Neither classically benefic nor malefic, so this takes its colour from whatever else reaches the house.`,
        );
      }
    }
    for (const id of occupants) {
      const point = chart.points[id]!;
      workings.push({
        label: id,
        detail: `${point.degreesInSign.toFixed(1)}° ${point.sign}${
          chart.dignity[id] ? `, ${chart.dignity[id]}` : ''
        }`,
      });
    }
  } else {
    signals.push('empty');
    say(
      'empty',
      `Nothing stands here.`,
      `An empty house has nothing in the chart pushing on it for its own sake, so it tends to be lived through circumstance rather than driven — and to go the longest without being examined.`,
    );
  }

  /* ----------------------------------------------------- who is watching */
  if (watchers.length > 0) {
    signals.push('watched');
    say(
      'watched',
      `${cap(list(watchers.map(named)))} ${watchers.length === 1 ? 'casts its glance' : 'cast their glances'} here from elsewhere.`,
      `A graha that aspects a house without occupying it has an opinion and no residence: the pressure arrives from outside, as people, obligations and standards that were somebody else's first.`,
    );
    for (const id of watchers) {
      workings.push({
        label: `${id} aspects`,
        detail: `from the ${ORDINAL[chart.points[id]!.house - 1]}`,
      });
    }
  }

  /* ------------------------------------------------------- the one number */
  workings.push({ label: 'Sarva', detail: `${sarva} bindus (28 is the average)` });
  if (sarva >= SARVA_AVERAGE + 4 || sarva <= SARVA_AVERAGE - 4) {
    const high = sarva >= SARVA_AVERAGE + 4;
    signals.push(high ? 'support' : 'strain');
    say(
      'sarva',
      `The chart's own scoring gives ${sign} ${sarva} points against an average of 28, so a graha crossing here has ${high ? 'more' : 'less'} of the chart behind it than usual.`,
      `Aṣṭakavarga counts how much of a chart agrees with a transit through a given sign. It is a timing instrument and nothing else: there is no total, no ranking of one part of a life against another, and a low count is not a verdict on the area.`,
    );
  }

  /* ----------------------------------------------------------- live now */
  let liveNow: string | null = null;
  if (live) {
    /*
     * The sub-period decides, not the main one.
     *
     * A mahādaśā can run nineteen years, so "the period running now" is barely
     * a statement about now at all; the antardaśā inside it is measured in
     * months and is what a reader means by currently. The main period is kept
     * for the case that matters most — when both lords point at the same area,
     * which is the strongest timing claim the chart makes without a transit.
     *
     * Ruling or occupying only, never aspecting. Jupiter aspects three signs,
     * so counting its glance put this badge on half the chart, and a marker
     * that fires on half of anything marks nothing.
     */
    const touches = (lord: Graha): 'rules' | 'sits' | null =>
      rule.lord === lord ? 'rules' : occupants.includes(lord) ? 'sits' : null;

    const deciding = live.minor ?? live.major;
    const how = touches(deciding);
    if (how) {
      const both = live.minor && live.minor !== live.major ? touches(live.major) : null;
      const verb = how === 'rules' ? 'rules this area' : 'stands in it';
      const opening = live.minor
        ? `${deciding} is running the sub-period and ${verb}`
        : `${deciding} is running the period and ${verb}`;
      const agreement = both
        ? `, and ${live.major}, whose main period encloses it, ${both === 'rules' ? 'rules it as well' : 'sits here too'} — the two levels of the daśā agreeing on one house is as close as a chart gets to pointing`
        : '';

      const gloss = told?.has('liveNow')
        ? ''
        : ' A period hands one part of the chart the microphone for its duration — nothing is scheduled, and nothing is owed, but this is the area the next stretch keeps asking about.';
      told?.set('liveNow', '');
      liveNow = `${cap(opening)}${agreement}.${gloss}`;
    }
  }

  /* -------------------------------------------------------- what is crossing */
  /*
   * The sky, laid over this one house.
   *
   * Only the slow ones. The Moon changes house every two days and Mercury
   * every few weeks, so including them would mean every area had something
   * "happening" in it at all times, which is how a reading becomes a horoscope.
   * Saturn, Jupiter, Rahu and Ketu move in years and are what the tradition
   * reads for a chapter.
   */
  let crossing: string | null = null;
  if (sky) {
    const slow = sky.filter(
      (one) => SLOW_CROSSING.has(one.id) && transitHouse(chart, one) === place,
    );
    if (slow.length > 0) {
      signals.push('crossing');
      /* The nodes are always retrograde — it is how they are defined, not
         something happening this month — so saying so about them is noise and
         the retrograde gloss below would fire on every chart forever. */
      const isRetro = (one: SkyPosition): boolean =>
        one.retrograde && one.id !== 'Rahu' && one.id !== 'Ketu';
      const described = slow.map((one) => {
        const note = CROSSING_NOTE[one.id] ?? '';
        return `${named(one.id)} is in this house now${isRetro(one) ? ', retrograde' : ''}${note ? ` — ${note}` : ''}`;
      });
      const retro = slow.some(isRetro);
      crossing = `${cap(described.join('; '))}.${
        retro
          ? ' Retrograde motion is apparent rather than real — the body is not reversing, the Earth is overtaking it — but the tradition reads the stretch as a second pass over ground already covered.'
          : ''
      } A transit is a position and not an event: it says what is being crossed, not what will come of it.`;
      for (const one of slow) {
        workings.push({
          label: `${one.id} now`,
          detail: `${one.degreesInSign.toFixed(1)}° ${one.sign}${isRetro(one) ? ', retrograde' : ''}`,
        });
      }
    }
  }

  return {
    place,
    title: cap(topic.topic),
    governs: topic.governs,
    asks: topic.asks,
    body,
    signals,
    liveNow,
    crossing,
    workings,
  };
}

/**
 * All twelve, in the order somebody asks about them.
 *
 * Not 1–12. People arrive asking about work, money, relationships and home far
 * more often than about the third or the eleventh, and a reading that opens on
 * "siblings, neighbours and short journeys" because that is house three has
 * put the filing order ahead of the reader. The live areas come first within
 * that, because a period running now is the most answerable thing in a chart.
 */
const ASKED_ORDER = [1, 10, 7, 2, 4, 5, 9, 11, 6, 3, 8, 12];

export function readAllAreas(
  chart: ComputedChart,
  options: Omit<AreaOptions, 'told'> = {},
): AreaReading[] {
  /* Two passes, because the gloss book has to be filled in the order the
     reader will actually meet the areas, and that order depends on which ones
     the running period touches — which is only known after reading them. The
     first pass is thrown away except for its ordering. */
  const probe = ASKED_ORDER.map((place) => readArea(chart, place, options));
  const order = [...probe]
    .sort((a, b) => Number(Boolean(b.liveNow)) - Number(Boolean(a.liveNow)))
    .map((one) => one.place);

  const told = new Map<string, string>();
  return order.map((place) => readArea(chart, place, { ...options, told }));
}

/** Every place, for anything that needs the list without a chart. */
export function areaTopics(): readonly { place: number; topic: string }[] {
  return PLACES.map((one) => ({ place: one.place, topic: one.topic }));
}

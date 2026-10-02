import type { ComputedChart } from '@jade/astro';
import type { Working } from '../plainReading.js';
import { placeOf } from './places.js';

/**
 * Two charts laid over each other, read deeply.
 *
 * ## Why this one has no five columns
 *
 * Every other reading in this folder puts five traditions beside each other,
 * because on a planet in a place they genuinely differ. Here they do not — and
 * the honest thing is to say so rather than to manufacture five paragraphs.
 *
 * Comparing two whole charts by laying one over the other is a modern practice
 * and an Indian one. Hellenistic, medieval and Renaissance astrologers judged a
 * marriage almost entirely from *one* chart: the seventh place, its ruler, and
 * the Moon or Venus in a man's chart and the Sun or Mars in a woman's. Lilly
 * answers "shall I marry her?" from the querent's own figure. They were not
 * being careless; they were answering a different question, and a column of
 * invented doctrine about overlays would be Jade putting words in their mouths.
 *
 * So `TRADITION_NOTE` says that once, at the top, and the passages below are
 * one careful modern reading rather than five thin ones. `traditions.test.ts`
 * holds the passages to the same no-restating rule as the rest.
 *
 * ## Direction is the whole technique
 *
 * A's Saturn in B's seventh and B's Saturn in A's seventh are two different
 * facts about two different people, and software that reports "Saturn–seventh
 * contact" has thrown away the half that matters. Every passage here names who
 * is doing it and to whom.
 */

export const TRADITION_NOTE =
  'Laying two charts over each other is a modern technique and an Indian one. The Greek, Arabic and Latin traditions read a partnership almost entirely from the seventh place of a single chart and its ruler — Lilly answers whether to marry from the querent’s own figure alone. That is a different question rather than a worse answer to this one, and it is why this reading does not pretend they all had a view.';

export interface SynastryGraha {
  /** What this graha brings into somebody else's area of life. */
  readonly brings: string;
  /** The verb clause, completed by what a place governs. */
  readonly lands: string;
  /**
   * What it is like when it works, and when it does not.
   *
   * `{guest}` is whoever's graha it is and `{host}` is whose life it lands in,
   * substituted at compose time. Written with the names in rather than in the
   * second person because the reader of this page is a third party looking at
   * two other people, and "you" has no referent there.
   */
  readonly easy: string;
  /** Never a verdict — a recognisable shape. */
  readonly hard: string;
}

export const BRINGS: Readonly<Record<string, SynastryGraha>> = {
  Sun: {
    brings: 'attention, and the expectation of being taken seriously',
    lands: 'shines a light on',
    easy: '{guest} sees this part of {host} clearly and thinks well of it, which is rarer and more useful than encouragement. People tend to become more themselves under that.',
    hard: 'Being seen and being approved of come apart. The attention is real, it arrives with terms attached, and the terms are usually unstated.',
  },
  Moon: {
    brings: 'ease, and the assumption that feelings are information',
    lands: 'softens and makes familiar',
    easy: 'This is where {host} is restful in {guest}’s company. It is why the relationship feels like somewhere to go rather than somewhere to perform.',
    hard: 'Moods move through this faster than either of them can account for, and it becomes hard to tell whose they were to begin with.',
  },
  Mars: {
    brings: 'heat, urgency, and the willingness to have the argument',
    lands: 'puts pressure on',
    easy: '{guest} gets {host} moving here. Things that had been pending for years stop being pending, which is uncomfortable and is also the point.',
    hard: 'This is where the friction lives. Not necessarily conflict — often a persistent sense of being hurried in the part of life {host} most wants to take slowly.',
  },
  Mercury: {
    brings: 'questions, and a running commentary',
    lands: 'puts words around',
    easy: '{guest} can describe this part of {host}’s life back to them better than they can themselves, and being described accurately is one of the more underrated things one person does for another.',
    hard: 'Everything here gets talked about, including what was working fine unexamined. Analysis is not always the same as attention.',
  },
  Jupiter: {
    brings: 'room, and a general confidence that it will be fine',
    lands: 'enlarges',
    easy: '{guest} makes this feel more possible than it did. Opportunity tends to arrive through them here, and so does the nerve to take it.',
    hard: 'Enlargement is not selective. The optimism is genuine, and it will talk {host} into the overheads along with the opportunity.',
  },
  Venus: {
    brings: 'liking, and an eye for what would make it nicer',
    lands: 'sweetens',
    easy: '{guest} makes this part of {host}’s life more pleasant to be in, and does it without being asked, which is most of what makes it land.',
    hard: 'Smoothness here stands in for agreement. The absence of friction is real and it is not evidence that the terms were ever settled.',
  },
  Saturn: {
    brings: 'weight, and a standard',
    lands: 'slows and tests',
    easy: '{guest} is the reason this part of {host}’s life got built properly rather than quickly. Not a comfortable gift, and usually the one that lasts.',
    hard: 'This is where {host} feels judged, or makes themselves small. The classical reading is bleak about it; the useful version is that duration is the whole difficulty, and duration is survivable once it is named.',
  },
  Rahu: {
    brings: 'appetite, and a pull out of proportion to the thing',
    lands: 'turns the volume up in',
    easy: '{guest} makes this compelling for {host}. Whatever has been quietly dormant here gets wanted again, loudly.',
    hard: 'The intensity is about the intensity. It is easy to mistake how much {host} wants something here for how much it is worth, and this is the contact that most often outlasts its own usefulness.',
  },
  Ketu: {
    brings: 'detachment, and a shrug',
    lands: 'quietly empties',
    easy: '{guest} takes the charge out of something {host} had been gripping. It stops mattering so much, and some of what they were carrying here was never theirs.',
    hard: 'Interest withdraws from this without a decision being made about it. Nobody does anything wrong and the thing goes untended anyway.',
  },
};

export interface SynastryPassage {
  readonly graha: string;
  /** Whose graha it is. */
  readonly from: string;
  /** Whose life area it lands in. */
  readonly into: string;
  readonly place: number;
  /** Stated once. Nothing below restates it. */
  readonly heading: string;
  readonly asks: string;
  readonly body: readonly string[];
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

/** The leading noun phrase of a place, for a heading that has to stay short. */
function first(governs: string): string {
  return governs.split(',')[0]!.trim();
}

/** Loudest first: the slow and heavy ones are the ones a pair actually feels. */
const WEIGHT = ['Saturn', 'Rahu', 'Ketu', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Moon', 'Mercury'];

/**
 * The places an overlay is worth reading in.
 *
 * All twelve would be a hundred and eight passages for a pair, which is not
 * depth, it is a wall. These are the angles and the trines — where classical
 * and modern practice agree an overlay is loudest — plus the second and sixth,
 * which are where money and daily grind actually get decided.
 */
const LOUD = new Set([1, 2, 4, 5, 6, 7, 9, 10]);

export interface DeepSynastry {
  /** Said once, at the top. */
  readonly note: string;
  readonly aIntoB: readonly SynastryPassage[];
  readonly bIntoA: readonly SynastryPassage[];
}

function passagesFor(
  guest: ComputedChart,
  host: ComputedChart,
  fromName: string,
  intoName: string,
): SynastryPassage[] {
  const hostAscendantSign = host.houses.ascendantSign;

  /*
   * The two names, put into the sentences.
   *
   * These passages were written in the second person first, the way the natal
   * ones are, and on a page about two other people "this is where you feel
   * judged" has no referent — the reader is a practitioner looking at a pair.
   * Naming them is also simply better: a reading that says "Maya feels judged
   * here" is doing the work, and one that says "you" is making the reader do it.
   */
  const say = (text: string): string =>
    text.replaceAll('{guest}', fromName).replaceAll('{host}', intoName);

  return WEIGHT.flatMap((graha) => {
    const point = guest.points[graha];
    const brings = BRINGS[graha];
    if (!point || !brings) return [];

    const place = ((point.signIndex - hostAscendantSign + 12) % 12) + 1;
    if (!LOUD.has(place)) return [];
    const topic = placeOf(place);

    return [
      {
        graha,
        from: fromName,
        into: intoName,
        place,
        /*
         * Third person, and not through the place's `topic`.
         *
         * The twelve topics are written in the second person for a natal
         * reading — "the ground under you", "whoever is across the table" —
         * and a possessive in front of one produces "Maya's whoever is across
         * the table". Worse, the "you" in them means the reader, and here the
         * reader is a practitioner looking at two other people. `governs` is
         * the same place in concrete nouns, which survives being talked about
         * rather than talked to.
         */
        heading: `${fromName}’s ${graha} in ${intoName}’s ${ORDINAL[place - 1]} — ${first(topic.governs)}`,
        asks: `${intoName} asks: ${topic.asks}`,
        body: [
          `${fromName}’s ${graha} brings ${brings.brings}. For ${intoName} it ${brings.lands} ${topic.governs}.`,
          say(brings.easy),
          say(brings.hard),
        ],
        workings: [
          {
            label: `${fromName}’s ${graha}`,
            detail: `${point.degreesInSign.toFixed(2)}° ${point.sign}`,
          },
          { label: `${intoName}’s house`, detail: `the ${ORDINAL[place - 1]}` },
        ],
      },
    ];
  });
}

/**
 * Both directions, because they are not the same reading.
 *
 * Pure, like the rest of the package: two computed charts and two names in,
 * text out, no clock and no database.
 */
export function deepSynastry(
  chartA: ComputedChart,
  chartB: ComputedChart,
  nameA: string,
  nameB: string,
): DeepSynastry {
  return {
    note: TRADITION_NOTE,
    aIntoB: passagesFor(chartA, chartB, nameA, nameB),
    bIntoA: passagesFor(chartB, chartA, nameB, nameA),
  };
}

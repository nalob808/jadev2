import type { ComputedChart } from '@jade/astro';
import type { Working } from '../plainReading.js';
import { GRAHA_STANCE } from './grahas.js';
import { PLACES, placeOf, type Place } from './places.js';
import { TRADITIONS, citation, sourceById, type Tradition, type TraditionId } from './sources.js';

/**
 * The deep transit reading.
 *
 * ## The rule this file exists to enforce
 *
 * A reading that says "Saturn, the greater malefic, transiting your sixth
 * house — the house of work and service" five times, once per tradition, has
 * spent five paragraphs telling the reader something they read in the heading.
 * That is the single most common failure of astrological writing and it is
 * structural rather than stylistic: it happens because each section is written
 * to stand alone.
 *
 * So the configuration is stated **once**, in `heading` and `workings`, and
 * nothing below may restate it. `traditions.test.ts` asserts that no composed
 * passage contains the words "house", "transit" or "bhāva" — if a voice needs
 * those words it is describing the setup rather than interpreting it, and the
 * test fails rather than the reader's patience.
 *
 * ## Components, not combinations
 *
 * Nine grahas across twelve places is 108 readings. Written out longhand that
 * is a book nobody finishes and a body of text that goes stale unevenly, so it
 * is composed instead: nineteen written blocks — four per graha, plus the
 * twelve places — cover all 108, and improving one block improves every reading
 * that draws on it. `voice/library.ts` made the same call for the same reason.
 *
 * ## What is not here
 *
 * No forecast. `MODERN` is written as season, texture and question, never as
 * event, because that is both the honest register for a transit and the only
 * one compatible with CLAUDE.md #6. No health, under any framing, in any
 * passage — the medical tradition is real, is named in `sources.ts`, and is
 * flagged so that it can never be cited by anything on this page.
 */

export interface ModernTransit {
  /** How long this body takes to cross a place, and what that length feels like. */
  readonly season: string;
  /**
   * The verb clause. Written to be completed by a place's topic, so it reads
   * as one sentence rather than as two facts stapled together.
   */
  readonly crossing: string;
  /** What the season sharpens — the thing that becomes decidable. */
  readonly holds: string;
  /** The characteristic mistake. Not a warning; a thing people actually do. */
  readonly mistake: string;
}

export const MODERN: Readonly<Record<string, ModernTransit>> = {
  Sun: {
    season:
      'About a month, and it moves at the speed of ordinary life — near enough to a single billing cycle that you can watch a whole arc of something start and finish inside it.',
    crossing: 'turns a light on',
    holds:
      'what you have been treating as background becomes the thing in front of you, and it is much harder to be vague about it',
    mistake:
      'Confusing being seen with being understood. The attention is real; the interpretation people put on it is theirs, and this is the month to supply your own before somebody else does.',
  },
  Moon: {
    season:
      'Two and a half days. Too short to plan around and too regular to ignore — it comes back every four weeks, which is what makes it useful as a rhythm rather than as an event.',
    crossing: 'raises the temperature of',
    holds:
      'you find out how you actually feel about it, as against how you have decided to feel about it',
    mistake:
      'Acting on the reading. The information is accurate and the moment is not — what surfaces now is worth writing down and deciding on later.',
  },
  Mars: {
    season:
      'Six or seven weeks, and twice that if it turns retrograde in the middle. Long enough to get something finished, short enough that the pressure does not become the new normal.',
    crossing: 'puts heat and hurry into',
    holds:
      'whatever has been merely annoying becomes intolerable, which is inconvenient and also how things finally get dealt with',
    mistake:
      'Spending the energy on the nearest available argument rather than the actual obstruction. The friction is generic; where you point it is not.',
  },
  Mercury: {
    season:
      'Two or three weeks, or two and a half months when it stations and goes back over its own ground — which is the version most people notice.',
    crossing: 'brings the paperwork and the conversations to',
    holds: 'the distinction you had been blurring gets named out loud, usually by somebody else',
    mistake:
      'Mistaking having explained it for having agreed it. This is a season for writing things down, not for assuming the exchange settled anything.',
  },
  Jupiter: {
    season:
      'About a year. Slow enough that you are inside it before you notice and slow enough that you will not notice it ending either.',
    crossing: 'makes more of',
    holds:
      'whatever is there gets bigger — the opportunity and the overheads together, because enlargement does not choose',
    mistake:
      'Reading a year of easy growth as a year of good judgement. The scale is a gift; the discrimination has to come from somewhere else.',
  },
  Venus: {
    season:
      'Three or four weeks, and up to four months when it retrogrades — the retrograde passage being the one that revisits an agreement you thought was settled.',
    crossing: 'smooths and sweetens',
    holds:
      'you find out what you actually want here, which is not always what you have been arguing for',
    mistake:
      'Taking the absence of friction as evidence that the arrangement is sound. Ease is a real signal about the room and a poor one about the terms.',
  },
  Saturn: {
    season:
      'Two and a half years, near enough. Long enough to reorganise a life around, and far too long to hold your breath through.',
    crossing: 'takes the slack out of',
    holds:
      'the gap between what you have been maintaining and what you have merely been claiming to maintain stops being possible to ignore',
    mistake:
      'Treating it as a siege to be endured. The whole of the difficulty is duration, and the only thing that works against duration is reducing what you are carrying.',
  },
  Rahu: {
    season:
      'About eighteen months, moving backwards through the zodiac, and it arrives with the eclipses rather than separately from them.',
    crossing: 'turns the appetite up in',
    holds:
      'you want something here at a volume that is out of proportion to the thing itself, and the wanting is the information',
    mistake:
      'Assuming the intensity is a signal about value. It is a signal about intensity. What is worth having here will still look worth having in eighteen months.',
  },
  Ketu: {
    season:
      'The same eighteen months, at the other end of the axis — so it is always doing this while its opposite is doing the reverse somewhere else in the chart.',
    crossing: 'quietly withdraws interest from',
    holds:
      'something you used to care about stops holding you, and the honest question is whether you are finished with it or merely tired',
    mistake:
      'Dismantling something in the flat stretch that you will want back. Detachment is genuine here and it is also not permanent.',
  },
};

/** A single tradition's passage. Interpretation only — never the setup again. */
export interface TraditionPassage {
  readonly tradition: Tradition;
  /** The doctrine, paraphrased. */
  readonly doctrine: string;
  /** What it means now. */
  readonly now: string;
  /** Author and work. Never a page number of a copyrighted translation. */
  readonly source: string;
  /** True where Jade may quote the English text verbatim. Two sources can. */
  readonly quotable: boolean;
}

export interface DeepTransitReading {
  readonly graha: string;
  readonly place: number;
  /** The configuration, in words, exactly once. */
  readonly heading: string;
  /** What this part of life is. Also exactly once. */
  readonly topic: string;
  readonly asks: string;
  /** The modern reading. Several paragraphs, no citations, no restating. */
  readonly body: readonly string[];
  /** Where the traditions genuinely disagree about this place. Usually absent. */
  readonly differ?: string | undefined;
  readonly voices: readonly TraditionPassage[];
  /** The chart rows behind all of it. Shown beside, never inline. */
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

/**
 * A sentence built from a verb clause and a place, which reads as English.
 *
 * The join matters more than it looks. "Saturn takes the slack out of. The
 * grind, and what wears you down." is two fragments; the sentence below is one
 * statement, and the difference is whether the reading sounds composed or
 * generated.
 */
function crossingSentence(graha: string, modern: ModernTransit, place: Place): string {
  return `${graha} ${modern.crossing} ${place.topic} — ${place.governs}.`;
}

export interface DeepTransitInput {
  readonly graha: string;
  /** Which place of the natal chart it is standing in, 1–12. */
  readonly place: number;
  readonly sign: string;
  readonly degreesInSign: number;
  readonly retrograde?: boolean;
  /**
   * Natal points it is within orb of, closest first. Deepens the reading where
   * present and is simply absent where not — an invented contact would be the
   * one kind of error a reader cannot check.
   */
  readonly contacts?: readonly { readonly id: string; readonly orb: number }[];
}

/**
 * Compose the reading.
 *
 * Pure, like everything in this package: it is handed the configuration and
 * returns text. It reads no clock and no chart of its own, so the same transit
 * always produces the same reading and a test can assert what it says.
 */
export function deepTransitReading(input: DeepTransitInput): DeepTransitReading | null {
  const modern = MODERN[input.graha];
  if (!modern) return null;
  const place = placeOf(input.place);

  const body: string[] = [
    crossingSentence(input.graha, modern, place),
    modern.season,
    `What it sharpens: ${modern.holds}.`,
  ];

  /*
   * Retrograde gets a sentence rather than a flag, because "℞" beside a name
   * tells a reader who already knows nothing they did not know, and tells
   * everybody else nothing at all.
   */
  if (input.retrograde) {
    body.push(
      'It is retrograde, so it is going back over ground it has already covered. Read that as a second pass rather than as a reversal: the same material, with the part you did not deal with the first time still in it.',
    );
  }

  if (input.contacts && input.contacts.length > 0) {
    const closest = input.contacts[0]!;
    body.push(
      `It is also sitting on your ${closest.id}, within ${closest.orb.toFixed(1)}°. That is the specific thing it is doing this to — not the whole area of life, but the part of you that ${closest.id} runs.`,
    );
  }

  body.push(modern.mistake);

  const voices: TraditionPassage[] = [];
  for (const tradition of TRADITIONS) {
    const stance = GRAHA_STANCE[tradition.id][input.graha];
    if (!stance) continue;
    const source = sourceById(stance.sourceId);
    /* Belt and braces with the test: the medical corpus is never cited here. */
    if (!source || source.historyOnly) continue;
    voices.push({
      tradition,
      doctrine: `${stance.is} ${stance.acts}`,
      now: stance.now,
      source: citation(stance.sourceId, stance.locus),
      quotable: source.quotable,
    });
  }

  const workings: Working[] = [
    {
      label: input.graha,
      detail: `${input.degreesInSign.toFixed(2)}° ${input.sign}${input.retrograde ? ', retrograde' : ''}`,
    },
    { label: 'Standing in', detail: `your ${ORDINAL[input.place - 1]} house` },
    ...(input.contacts ?? []).map((contact) => ({
      label: `On your ${contact.id}`,
      detail: `${contact.orb.toFixed(2)}° away`,
    })),
  ];

  return {
    graha: input.graha,
    place: input.place,
    heading: `${input.graha} is crossing ${place.topic}`,
    topic: place.governs,
    asks: place.asks,
    body,
    differ: place.differ,
    voices,
    workings,
  };
}

/**
 * Every transit in the sky right now, deepest first.
 *
 * Ordered by how long the body stays, because that is how much a reader can do
 * about it: a Saturn passage is worth reorganising a year around and a Moon
 * passage is worth noticing. The Moon is included rather than dropped — it is
 * the one everybody feels — but it sorts last so it never leads.
 */
const PATIENCE = ['Saturn', 'Rahu', 'Ketu', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Sun', 'Moon'];

export interface SkyPosition {
  readonly id: string;
  readonly longitude: number;
  readonly sign: string;
  readonly signIndex: number;
  readonly retrograde?: boolean;
}

/** How far apart two longitudes are, 0–180. */
function separation(a: number, b: number): number {
  const delta = (((a - b) % 360) + 360) % 360;
  return delta > 180 ? 360 - delta : delta;
}

/**
 * Three degrees, which is tight.
 *
 * A wide orb finds a contact for every transit against every chart, and a
 * reading that always has something to say about your Saturn is a reading that
 * is not looking. Three degrees is roughly where a contact is close enough that
 * a reader recognises the description.
 */
const CONTACT_ORB = 3;

export function deepTransits(
  chart: ComputedChart,
  sky: readonly SkyPosition[],
): DeepTransitReading[] {
  const ascendantSign = chart.houses.ascendantSign;

  const readings = sky.flatMap((position) => {
    const place = ((position.signIndex - ascendantSign + 12) % 12) + 1;

    const contacts = Object.entries(chart.points)
      .filter(([id]) => id !== 'Midheaven' && id !== position.id)
      .map(([id, natal]) => ({ id, orb: separation(position.longitude, natal.longitude) }))
      .filter((contact) => contact.orb <= CONTACT_ORB)
      .sort((a, b) => a.orb - b.orb);

    const reading = deepTransitReading({
      graha: position.id,
      place,
      sign: position.sign,
      degreesInSign: position.longitude % 30,
      ...(position.retrograde === undefined ? {} : { retrograde: position.retrograde }),
      ...(contacts.length > 0 ? { contacts } : {}),
    });
    return reading ? [reading] : [];
  });

  return readings.sort((a, b) => PATIENCE.indexOf(a.graha) - PATIENCE.indexOf(b.graha));
}

/** Every place, for the Learn section. The reading surface uses the chart. */
export function allPlaces(): readonly Place[] {
  return PLACES;
}

export type { Place, Tradition, TraditionId };

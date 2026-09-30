import type { ComputedChart } from '@jade/astro';
import type { Working } from '../plainReading.js';
import { GRAHA_STANCE } from './grahas.js';
import { placeOf, type Place } from './places.js';
import { TRADITIONS, citation, sourceById } from './sources.js';
import type { TraditionPassage } from './transitReading.js';

/**
 * The deep natal reading — a graha where it stands in somebody's own chart.
 *
 * ## The same rule as the transit reading, for the same reason
 *
 * The configuration is stated once, in `heading` and `workings`, and no
 * composed sentence below restates it. Nobody needs to be told four times that
 * Saturn is in the sixth house; they can see the heading. What they came for is
 * what that is like, and every sentence here is spent on that.
 *
 * `traditions.test.ts` enforces it: a passage containing "house", "bhāva" or
 * "degree" is describing the setup rather than interpreting it, and fails.
 *
 * ## Why this is not the transit reading with the tenses changed
 *
 * A transit is a season and a natal placement is a permanent fact, and the
 * traditions diverge much harder on the second. Hellenistic astrology decides
 * almost everything by sect — the same Saturn is the most manageable malefic in
 * a day chart and the hardest in a night one — while Jyotiṣa reads kārakas that
 * the Western traditions have no equivalent for. So the voices draw on
 * `GRAHA_STANCE.native`, which is written for a nativity, rather than on `now`,
 * which is written for a passing sky.
 *
 * ## Dignity has to change the text, or it is decoration
 *
 * CLAUDE.md #5 says a statement must be derived from computed factors. A
 * reading that prints the same paragraph for an exalted Saturn and a debilitated
 * one is grounded in nothing, whatever it displays in the margin. So `strong`
 * and `strained` are separate blocks and the chart chooses between them — and
 * where dignity is middling, neither prints, because inventing a verdict is
 * worse than declining to give one.
 */

export interface NatalGraha {
  /** What this planet is IN a person — not what it does in the sky. */
  readonly carries: string;
  /** A verb clause completed by a place's topic, so it reads as one sentence. */
  readonly invests: string;
  /** Dignified: exalted, own sign, mūlatrikoṇa. */
  readonly strong: string;
  /** Debilitated, or in a great enemy's sign. */
  readonly strained: string;
  /** Retrograde in a nativity, which is not what retrograde means by transit. */
  readonly turning: string;
  /** What to hold. Never advice, never a prediction. */
  readonly question: string;
}

export const NATAL: Readonly<Record<string, NatalGraha>> = {
  Sun: {
    carries: 'needs to be the author of something',
    invests: 'puts that need into',
    strong:
      'It has room, which mostly shows up as not needing the room to be granted. People with this placement tend to be surprised that others find the same thing difficult.',
    strained:
      'The need is no smaller for being harder to satisfy, and the usual shape of that is a life spent proving something to an audience that stopped watching years ago — or never was watching.',
    turning: '',
    question:
      'Whose approval are you still running the calculation against? The honest answer is usually one person and usually not a current one.',
  },
  Moon: {
    carries: 'needs somewhere to be at ease',
    invests: 'looks for that ease in',
    strong:
      'You can return to this and be restored by it, which is rarer than it sounds — most people have somewhere they go to recover and find they have to perform there too.',
    strained:
      'The place you go to rest is also the place that costs you, and the pattern is hard to see from inside because it reads as ordinary tiredness rather than as a specific one.',
    turning: '',
    question:
      'Where do you actually recover? Not where you go when you are tired — where you are different afterwards.',
  },
  Mars: {
    carries: 'will fight for something',
    invests: 'aims that at',
    strong:
      'The force has a job, and that is the whole difference. It shows as someone who will do the unglamorous part and finish, rather than as someone who is merely intense.',
    strained:
      'The same force with nothing to push against turns into friction over the nearest available thing. The energy is not the problem and never was; the aim is.',
    turning:
      'Retrograde at birth reads as a fight that goes inward before it goes outward — the position gets argued with privately for years before anyone else hears it stated.',
    question:
      'What are you actually defending? Say it in one sentence. If it takes three, you are defending the third one.',
  },
  Mercury: {
    carries: 'wants to understand how a thing is put together',
    invests: 'takes that apart in',
    strong:
      'You can hold the detail and the shape at once here, which is what makes somebody trustworthy on a subject rather than merely fluent in it.',
    strained:
      'Fluency arrives faster than accuracy, and because the fluency is genuine it is nobody around you who catches the gap. It is a placement that rewards writing things down.',
    turning:
      'Retrograde at birth is a mind that arrives at its conclusions by going back over them. Slower to state a position and considerably harder to move off one.',
    question:
      'Which of your confident opinions here have you actually checked, and which have you only ever explained?',
  },
  Jupiter: {
    carries: 'expects there to be more',
    invests: 'expects more of',
    strong:
      'The expectation gets met often enough to keep being reasonable, and it makes you someone other people bring things to — which compounds, quietly, over decades.',
    strained:
      'The expectation persists without the returns, and the recognisable shape is somebody generous in a direction that never quite pays back, who reads the shortfall as their own insufficiency.',
    turning:
      'Retrograde at birth means the principles were arrived at rather than inherited — which takes longer and holds better under pressure.',
    question:
      'Is this an area you keep enlarging because it is growing, or because enlarging is what you do here?',
  },
  Venus: {
    carries: 'knows what it likes and arranges around it',
    invests: 'makes a life near',
    strong:
      'You can tell the difference between wanting a thing and wanting to be the kind of person who has it — which sounds small and decides most of what anyone ends up with.',
    strained:
      'The wanting is real and the terms keep being the negotiable part. It shows up as arrangements kept long past the point where they were worth keeping, defended with genuine affection.',
    turning:
      'Retrograde at birth revisits its attachments: the same relationships and the same tastes get re-examined and re-chosen rather than simply held.',
    question:
      'If the arrangement here stayed exactly as it is for ten more years, would that be a relief or a sentence?',
  },
  Saturn: {
    carries: 'takes something seriously enough to be slow about it',
    invests: 'is patient and exacting with',
    strong:
      'What gets built here lasts, and arrives later than it should have. The tradition rates this highly and modern writing rarely does, which says more about modern writing.',
    strained:
      'The weight is there without the corresponding return yet, and the characteristic error is to read the delay as a verdict. It is a rate, not a judgement.',
    turning:
      'Retrograde at birth reads as an inherited standard being re-litigated — the rules of this area were handed over and have been under review ever since.',
    question:
      'What have you been carrying here because you decided to, and what because nobody ever handed it back?',
  },
  Rahu: {
    carries: 'wants something out of proportion to itself',
    invests: 'points that appetite at',
    strong: '',
    strained: '',
    turning: '',
    question:
      'Is the wanting here telling you about the thing, or about the wanting? Both are information; only one is about the thing.',
  },
  Ketu: {
    carries: 'is already finished with something',
    invests: 'has quietly let go of',
    strong: '',
    strained: '',
    turning: '',
    question:
      'Are you done here, or only tired? The two feel identical from inside and diverge completely in five years.',
  },
};

export interface DeepNatalReading {
  readonly graha: string;
  readonly place: number;
  /** The configuration, in words, exactly once. */
  readonly heading: string;
  readonly topic: string;
  readonly asks: string;
  readonly body: readonly string[];
  /** What to sit with. One line, at the end, never dressed as advice. */
  readonly question: string;
  readonly differ?: string | undefined;
  readonly voices: readonly TraditionPassage[];
  readonly workings: readonly Working[];
}

/** Dignities Jade will call strong, and the ones it will call strained. */
const STRONG = new Set(['exalted', 'moolatrikona', 'own']);
const STRAINED = new Set(['debilitated', 'great_enemy']);

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

const DIGNITY_LABEL: Readonly<Record<string, string>> = {
  exalted: 'exalted',
  moolatrikona: 'in mūlatrikoṇa',
  own: 'in its own sign',
  great_friend: 'in a great friend’s sign',
  friend: 'in a friend’s sign',
  neutral: 'in a neutral sign',
  enemy: 'in an enemy’s sign',
  great_enemy: 'in a great enemy’s sign',
  debilitated: 'debilitated',
};

export interface DeepNatalInput {
  readonly graha: string;
  readonly place: number;
  readonly sign: string;
  readonly degreesInSign: number;
  readonly dignity?: string | null;
  readonly retrograde?: boolean;
  readonly combust?: boolean;
  readonly cazimi?: boolean;
}

export function deepNatalReading(input: DeepNatalInput): DeepNatalReading | null {
  const natal = NATAL[input.graha];
  if (!natal) return null;
  const place = placeOf(input.place);

  const body: string[] = [
    `${input.graha} is the part of you that ${natal.carries}. Here it ${natal.invests} ${place.topic} — ${place.governs}.`,
  ];

  /*
   * Dignity, and only where it is decisive.
   *
   * A middling dignity prints nothing rather than something hedged. "Mars is in
   * a neutral sign, so the effects are mixed" is a sentence that survives being
   * deleted, and a reading full of those is what makes people stop reading.
   */
  if (input.dignity && STRONG.has(input.dignity) && natal.strong) body.push(natal.strong);
  else if (input.dignity && STRAINED.has(input.dignity) && natal.strained) {
    body.push(natal.strained);
  }

  if (input.retrograde && natal.turning) body.push(natal.turning);

  /*
   * Cazimi before combustion, because it is the opposite reading and the same
   * arithmetic produces both — a graha within a degree of the Sun is not burnt.
   */
  if (input.cazimi) {
    body.push(
      'It sits within a degree of the Sun, which the tradition reads as the reverse of being burnt: this faculty is not diminished here, it is identical with what you take yourself to be. The cost is that you cannot see it from outside.',
    );
  } else if (input.combust) {
    body.push(
      'It is close enough to the Sun to be hard to see separately from your own purposes. That is not a weakness so much as a blind spot — this works, and it works in service of something else, and telling the two apart takes somebody else in the room.',
    );
  }

  const voices: TraditionPassage[] = [];
  for (const tradition of TRADITIONS) {
    const stance = GRAHA_STANCE[tradition.id][input.graha];
    if (!stance) continue;
    const source = sourceById(stance.sourceId);
    if (!source || source.historyOnly) continue;
    voices.push({
      tradition,
      doctrine: `${stance.is} ${stance.acts}`,
      now: stance.native,
      source: citation(stance.sourceId, stance.locus),
      quotable: source.quotable,
    });
  }

  const workings: Working[] = [
    {
      label: input.graha,
      detail: `${input.degreesInSign.toFixed(2)}° ${input.sign}${
        input.dignity ? `, ${DIGNITY_LABEL[input.dignity] ?? input.dignity}` : ''
      }${input.retrograde ? ', retrograde' : ''}`,
    },
    { label: 'In your', detail: `${ORDINAL[input.place - 1]} house` },
    ...(input.cazimi
      ? [{ label: 'Cazimi', detail: 'within 1° of the Sun' }]
      : input.combust
        ? [{ label: 'Combust', detail: 'too near the Sun to be seen' }]
        : []),
  ];

  return {
    graha: input.graha,
    place: input.place,
    heading: `Your ${input.graha} is invested in ${place.topic}`,
    topic: place.governs,
    asks: place.asks,
    body,
    question: natal.question,
    differ: place.differ,
    voices,
    workings,
  };
}

/**
 * Every graha in the chart, read.
 *
 * Ordered by the lights first and then by weight, because that is the order a
 * reader wants them: the Sun and Moon are the two everybody recognises
 * themselves in, and the rest are read against that.
 */
const ORDER = ['Sun', 'Moon', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Rahu', 'Ketu'];

export function deepNatal(chart: ComputedChart): DeepNatalReading[] {
  const readings = ORDER.flatMap((graha) => {
    const point = chart.points[graha];
    if (!point) return [];
    const combustion = chart.combustion[graha];
    const reading = deepNatalReading({
      graha,
      place: point.house,
      sign: point.sign,
      degreesInSign: point.degreesInSign,
      dignity: chart.dignity[graha] ?? null,
      retrograde: point.retrograde,
      combust: combustion?.combust ?? false,
      cazimi: combustion?.cazimi ?? false,
    });
    return reading ? [reading] : [];
  });
  return readings;
}

export type { Place };

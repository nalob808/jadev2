import type { ComputedChart } from '@jade/astro';
import { houseReadings, type HouseReading } from './houseReading.js';
import {
  CONNECTION_VOICE,
  DIGNITY_VOICE,
  connectionShape,
  grahaVoice,
  houseVoice,
  type ConnectionShape,
} from './voice/library.js';

/**
 * The reading, in plain words.
 *
 * ## What is different here, and what is not
 *
 * `houseReading.ts` produces factored statements for practitioners: every
 * sentence is short, technical, and carries its placements printed beside it.
 * This produces flowing paragraphs for somebody who does not know the words —
 * the same facts, a different register, and the workings moved from *beside*
 * the sentence to *behind* it.
 *
 * That relocation is the whole difference, and it is a presentation change
 * rather than a licence. Every paragraph here still knows exactly which chart
 * rows produced it and hands them over in `workings`; the reading surface shows
 * them on demand instead of inline. Nothing is asserted that the chart does not
 * support, and a test walks every paragraph of every fixture to confirm it.
 *
 * ## The one rule that does not relax
 *
 * No statement about death, illness or legal outcome (CLAUDE.md #6). A warmer
 * voice makes that rule *more* important, not less: prose written to be
 * believed is believed. The voice library is written to keep the sixth, eighth
 * and twelfth houses in the register of what they are like to live rather than
 * what they forecast, and the test that enforces it runs against this composer's
 * output, not against the library.
 *
 * ## Synthesis is allowed here
 *
 * The technical reading may not join two factors into one claim. This may — a
 * paragraph can say three placements point the same way, because that is what a
 * person actually wants to know and refusing to say it is not honesty, it is
 * just unhelpfulness. The constraint that remains is that the *joining* must be
 * mechanical: a count of things the chart really contains, never an inference
 * about the person.
 */

export interface Working {
  readonly label: string;
  readonly detail: string;
}

export interface PlainParagraph {
  readonly text: string;
  /** The chart rows behind the paragraph. Shown on demand, never inline. */
  readonly workings: readonly Working[];
  /** A quiet citation, where the paragraph rests on a classical rule. */
  readonly source?: string;
}

export interface PlainHouseReading {
  readonly house: number;
  /** "Partnership — the other person". */
  readonly title: string;
  /** The question somebody actually arrives with. */
  readonly asks: string;
  readonly paragraphs: readonly PlainParagraph[];
  /** Kept so the reading surface can link through to the technical view. */
  readonly technical: HouseReading;
}

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

/** Joins a list the way a person writes it: "a, b and c". */
function list(items: readonly string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * One house, read in plain words.
 *
 * Built on top of `houseReadings` rather than beside it, so the friendly
 * version and the technical version cannot disagree about the chart — they are
 * the same computation, said twice.
 */
export function plainHouseReading(reading: HouseReading): PlainHouseReading | null {
  const voice = houseVoice(reading.house);
  if (!voice) return null;

  const paragraphs: PlainParagraph[] = [];

  // ------------------------------------------------------- what this house is
  paragraphs.push({
    text: `${voice.is} In your chart this house carries ${reading.sign}, and its ruler is ${reading.lord.lord}.`,
    workings: [
      { label: 'Sign on the house', detail: reading.sign },
      { label: 'Ruler', detail: `${reading.lord.lord}, ruler of ${reading.sign}` },
    ],
  });

  // ------------------------------------------------------------- where it went
  const shape: ConnectionShape = connectionShape(reading.house, reading.lord.inHouse);
  const destination = houseVoice(reading.lord.inHouse);
  const lordText =
    shape === 'own'
      ? `${reading.lord.lord} rules this house and sits in it. It ${CONNECTION_VOICE.own}`
      : `${reading.lord.lord} rules this house but sits in your ${ordinal(reading.lord.inHouse)} — ${destination?.plainName ?? 'another part of the chart'}. It ${CONNECTION_VOICE[shape]}` +
        (shape === 'plain' ? '' : '') +
        ` In practice, what happens to ${voice.plainName} tends to show up in ${destination?.plainName ?? 'that area'}, and the other way round.`;

  paragraphs.push({
    text: lordText,
    workings: [
      {
        label: 'Ruler placed',
        detail: `${reading.lord.lord} in ${reading.lord.inSign}, your ${ordinal(reading.lord.inHouse)} house`,
      },
      {
        label: 'Link',
        detail:
          shape === 'own'
            ? 'in its own house'
            : `${ordinal(reading.house)} to ${ordinal(reading.lord.inHouse)}`,
      },
    ],
    source: 'Bṛhat Parāśara Horā Śāstra, ch. 11 — a house’s results follow its ruler',
  });

  // -------------------------------------------------------------- who lives here
  if (reading.occupants.length === 0) {
    paragraphs.push({
      text: voice.whenEmpty,
      workings: [{ label: 'In the house', detail: 'nothing' }],
    });
  } else {
    for (const occupant of reading.occupants) {
      const graha = grahaVoice(occupant.graha);
      if (!graha) continue;
      const dignity = occupant.dignity ? DIGNITY_VOICE[occupant.dignity] : null;
      const strain =
        occupant.dignity === 'debilitated' ||
        occupant.dignity === 'enemy' ||
        occupant.dignity === 'great_enemy'
          ? graha.whenStrained
          : occupant.dignity === 'exalted' ||
              occupant.dignity === 'own' ||
              occupant.dignity === 'moolatrikona'
            ? graha.whenStrong
            : null;

      paragraphs.push({
        text:
          `${graha.plainName} sits here — ${graha.temperament}. In this house it ${graha.verb} ${voice.plainName}, bringing ${graha.brings}` +
          `${dignity ? `, ${dignity}` : ''}.` +
          `${strain ? ` Practically: ${strain}` : ''}` +
          `${occupant.retrograde ? ' It is retrograde, which the tradition reads as a strengthening rather than a reversal — the planet is closer to us and its effect is more inward.' : ''}`,
        workings: [
          {
            label: occupant.graha,
            detail: `${occupant.degreesInSign.toFixed(2)}° ${reading.sign}, your ${ordinal(reading.house)} house`,
          },
          ...(occupant.dignity
            ? [{ label: 'Condition', detail: occupant.dignity.replace('_', ' ') }]
            : []),
          ...(occupant.retrograde ? [{ label: 'Motion', detail: 'retrograde' }] : []),
        ],
      });
    }

    if (reading.occupants.length > 2) {
      paragraphs.push({
        text: voice.whenBusy,
        workings: [
          {
            label: 'In the house',
            detail: list(reading.occupants.map((occupant) => occupant.graha)),
          },
        ],
      });
    }
  }

  // ------------------------------------------------------------- who looks at it
  if (reading.aspects.length > 0) {
    const named = reading.aspects
      .map((aspect) => {
        const graha = grahaVoice(aspect.graha);
        return graha ? graha.plainName : aspect.graha;
      })
      .filter((name, index, all) => all.indexOf(name) === index);

    paragraphs.push({
      text:
        `${list(named)} ${named.length === 1 ? 'casts its influence' : 'cast their influence'} on this house without sitting in it. ` +
        'An aspect is weaker than occupancy but it is not nothing — think of it as a standing influence rather than a resident.',
      workings: reading.aspects.map((aspect) => ({
        label: aspect.graha,
        detail: `aspects from its own ${ordinal(aspect.distance)}${aspect.special ? ', a special aspect only this planet casts' : ''}`,
      })),
      source: 'Bṛhat Parāśara Horā Śāstra, ch. 26 — planetary aspects',
    });
  }

  return {
    house: reading.house,
    title: `${voice.plainName.charAt(0).toUpperCase()}${voice.plainName.slice(1)}`,
    asks: voice.asks,
    paragraphs,
    technical: reading,
  };
}

export interface PlainChartReading {
  readonly houses: readonly PlainHouseReading[];
  /**
   * Things true of the chart as a whole.
   *
   * This is where synthesis lives — statements that join several placements.
   * Every one is a *count* of something the chart contains, never an inference
   * about the person, which is what keeps a friendlier voice from becoming a
   * freer one.
   */
  readonly overall: readonly PlainParagraph[];
}

export function plainChartReading(
  chart: ComputedChart,
  options: { readonly includeNodes?: boolean } = {},
): PlainChartReading {
  const technical = houseReadings(chart, options);
  const houses = technical
    .map((reading) => plainHouseReading(reading))
    .filter((reading): reading is PlainHouseReading => reading !== null);

  const overall: PlainParagraph[] = [];

  // Where the weight of the chart actually sits.
  const busiest = [...technical]
    .filter((reading) => reading.occupants.length > 0)
    .sort((a, b) => b.occupants.length - a.occupants.length);

  const top = busiest[0];
  if (top && top.occupants.length >= 3) {
    const voice = houseVoice(top.house);
    overall.push({
      text: `${top.occupants.length} of the nine planets sit in your ${ordinal(top.house)} house — ${voice?.plainName ?? 'one area'}. That is a lot of a chart pointed at one place, and it usually means this part of life is where a great deal of your attention and difficulty and talent all end up.`,
      workings: [
        {
          label: `${ordinal(top.house)} house`,
          detail: list(top.occupants.map((occupant) => occupant.graha)),
        },
      ],
    });
  }

  const empty = technical.filter((reading) => reading.occupants.length === 0).length;
  overall.push({
    text: `${empty} of your twelve houses have no planet in them. That is completely normal — there are nine planets and twelve houses, so most charts leave seven or eight empty. An empty house is read through its ruler, and it is not a gap in your life.`,
    workings: [{ label: 'Empty houses', detail: `${empty} of 12` }],
  });

  // Houses whose rulers all land in one place — a real pattern, plainly counted.
  const destinations = new Map<number, number[]>();
  for (const reading of technical) {
    destinations.set(reading.lord.inHouse, [
      ...(destinations.get(reading.lord.inHouse) ?? []),
      reading.house,
    ]);
  }
  const hub = [...destinations.entries()].sort((a, b) => b[1].length - a[1].length)[0];
  if (hub && hub[1].length >= 4) {
    const voice = houseVoice(hub[0]);
    overall.push({
      text: `The rulers of ${hub[1].length} different houses all end up in your ${ordinal(hub[0])} — ${voice?.plainName ?? 'one house'}. When that many rulers gather in one place, that house becomes the engine of the chart: a great deal of the rest of your life routes through it.`,
      workings: [
        {
          label: 'Rulers arriving',
          detail: `from the ${list(hub[1].map((house) => ordinal(house)))} houses`,
        },
      ],
    });
  }

  return { houses, overall };
}

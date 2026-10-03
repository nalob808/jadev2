import type { ComputedChart, YogaHit } from '@jade/astro';
import type { Working } from '../plainReading.js';

/**
 * The yogas, read rather than defined.
 *
 * ## What was printed before
 *
 * The name, the plain transliteration, and a one-line `summary` — a static
 * string living in the astro package, because that is where the detector
 * lives. "The Moon is attended in the sign that follows it." That is a
 * definition of the combination, not a reading of this chart: it says what
 * Sunaphā *is*, and nothing about what this Sunaphā, made of these grahas, in
 * these houses, comes to.
 *
 * ## What a reading adds, in order of how much it is worth
 *
 * 1. **The cancellation, first and in plain words.** The detector already
 *    finds them. Kemadruma with four cancellations found is an ordinary chart;
 *    Kemadruma printed beside its own definition and a list of conditions is a
 *    frightening one. Which of those a reader takes away is decided entirely
 *    by whether the cancellation is a sentence or a footnote.
 * 2. **What the combination is made of, here.** Not "a benefic in a kendra"
 *    but which graha, in which house, and therefore what the yoga is about in
 *    this life rather than in general.
 * 3. **Families.** Five Mahāpuruṣa yogas are one statement about a chart, not
 *    five; three Viparīta are one. A reading that lists them separately has
 *    made a chart with two yogas look like a chart with five.
 *
 * ## What it refuses
 *
 * No count, no score, no "strength". A yoga is formed or it is not, and the
 * texts that rank them disagree with each other. Nothing here says a chart is
 * good because it has four of them — the number of yogas in a chart is mostly
 * a fact about how many rules somebody wrote down.
 */

export type YogaFamily =
  'mahapurusha' | 'lunar' | 'solar' | 'wealth' | 'viparita' | 'parivartana' | 'cancellation';

export interface YogaFamilyReading {
  readonly family: YogaFamily;
  /** The family's name, as a heading. */
  readonly title: string;
  /** The yogas of this family found in the chart. */
  readonly hits: readonly YogaHit[];
  readonly body: readonly string[];
  /** True when every hit in the family carries a cancellation. */
  readonly allCancelled: boolean;
  readonly workings: readonly Working[];
}

export interface YogaReading {
  readonly families: readonly YogaFamilyReading[];
  /** One sentence on the shape of the whole set, or null when there is none. */
  readonly opening: string | null;
}

/**
 * Which family each detected yoga belongs to, and what the family means.
 *
 * Keyed by the `id` the detector emits. A yoga whose id is not here reads on
 * its own rather than being dropped — a new detector should appear in the
 * reading before anybody remembers to classify it.
 */
const FAMILY_OF: Record<string, YogaFamily> = {
  ruchaka: 'mahapurusha',
  bhadra: 'mahapurusha',
  hamsa: 'mahapurusha',
  malavya: 'mahapurusha',
  sasa: 'mahapurusha',
  sunapha: 'lunar',
  anapha: 'lunar',
  durudhura: 'lunar',
  kemadruma: 'lunar',
  vesi: 'solar',
  vasi: 'solar',
  ubhayachari: 'solar',
  gaja_kesari: 'wealth',
  budha_aditya: 'wealth',
  chandra_mangala: 'wealth',
  adhi: 'wealth',
  harsha: 'viparita',
  sarala: 'viparita',
  vimala: 'viparita',
  maha: 'parivartana',
  khala: 'parivartana',
  dainya: 'parivartana',
  nicha_bhanga: 'cancellation',
};

interface FamilyVoice {
  readonly title: string;
  /** What the family is, said once however many of its members fired. */
  readonly what: string;
  /** What having several of them together means, when several fire. */
  readonly together?: string;
}

const FAMILY_VOICE: Record<YogaFamily, FamilyVoice> = {
  mahapurusha: {
    title: 'A graha in its own strength',
    what: 'A Mahāpuruṣa yoga is one of the five non-luminaries standing in its own or exalted sign and on an angle at the same time — strong by sign and placed where it can act. The texts describe the resulting person at length and in flattering terms, and the sober reading is narrower: this graha is the one the chart runs on, and its appetites are the ones that get followed.',
    together:
      'More than one is unusual and does not multiply the effect — it means the chart has two engines, which as often as not pull against each other.',
  },
  lunar: {
    title: 'What stands beside the Moon',
    what: 'These are about what accompanies the Moon — grahas in the signs either side of it. The Moon is the mind in this system, so the question underneath them is whether the mind travels with company or alone.',
  },
  solar: {
    title: 'What stands beside the Sun',
    what: 'The same arrangement read around the Sun instead: who is adjacent to the part of the chart that is the person’s own standing and purpose.',
  },
  wealth: {
    title: 'Combinations that build',
    what: 'Pairs the texts single out as productive — a benefic with the Moon, intelligence with standing, the fifth and ninth connected. They are the combinations most often quoted at people and they describe a tendency to accumulate something, not a guarantee of it.',
  },
  viparita: {
    title: 'The difficult houses turned',
    what: 'A Viparīta yoga forms when a lord of the sixth, eighth or twelfth sits in another of those three. The reasoning is that two difficulties cancelling is a kind of relief, and the classical reading is specific about its shape: the good comes through the difficulty rather than instead of it.',
  },
  parivartana: {
    title: 'Two houses that swapped lords',
    what: 'Each lord sits in the other’s house, which ties the two parts of life together so tightly that neither moves alone. The texts grade them by which houses are involved, and Jade names the grade rather than scoring it.',
  },
  cancellation: {
    title: 'A debilitation that does not hold',
    what: 'Nīcabhaṅga is the texts arguing with themselves: a graha is debilitated, and a second condition is held to undo it. It is the most disputed rule in common use, which is why both the debilitation and the undoing are shown rather than one replacing the other.',
  },
};

const FAMILY_ORDER: readonly YogaFamily[] = [
  'mahapurusha',
  'viparita',
  'parivartana',
  'wealth',
  'lunar',
  'solar',
  'cancellation',
];

function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Read the yogas a chart carries.
 *
 * Families with no hits are absent rather than reported empty: a chart does
 * not have "no Mahāpuruṣa yoga" any more than it has no Dhana yoga, and a
 * reading that lists what is missing is listing the rules somebody wrote.
 */
export function readYogas(chart: ComputedChart): YogaReading {
  const hits = chart.yogas ?? [];

  const byFamily = new Map<YogaFamily, YogaHit[]>();
  for (const hit of hits) {
    const family = FAMILY_OF[hit.id];
    /* An unclassified yoga still reads, under the family its name suggests
       least — better a reading in the wrong group than a yoga that vanishes
       because nobody updated a table. */
    const key = family ?? 'wealth';
    byFamily.set(key, [...(byFamily.get(key) ?? []), hit]);
  }

  const families: YogaFamilyReading[] = [];

  for (const family of FAMILY_ORDER) {
    const found = byFamily.get(family);
    if (!found || found.length === 0) continue;

    const voice = FAMILY_VOICE[family];
    const body: string[] = [];
    const workings: Working[] = [];

    /* What formed, named, with what it is made of. */
    body.push(
      `${list(found.map((hit) => hit.name))} ${found.length === 1 ? 'forms' : 'form'} in this chart. ${voice.what}`,
    );
    if (found.length > 1 && voice.together) body.push(voice.together);

    /*
     * The cancellations, as prose and before anything else a reader might
     * take away. This is the whole reason the module exists: a yoga reported
     * without its cancellation in the same breath is astrologically dishonest,
     * and the difference between a frightening reading and an ordinary chart.
     */
    const cancelled = found.filter((hit) => (hit.cancellations?.length ?? 0) > 0);
    for (const hit of cancelled) {
      body.push(
        `${hit.name} is formed and cancelled: ${list(hit.cancellations!)}. The texts give these cancellations as part of the rule rather than as an exception to it, so the honest reading is that the combination is present in the geometry and does not arrive in the life.`,
      );
    }

    for (const hit of found) {
      for (const factor of hit.factors) {
        workings.push({ label: hit.name, detail: factor });
      }
      if (hit.source) workings.push({ label: `${hit.name} source`, detail: hit.source });
    }

    families.push({
      family,
      title: voice.title,
      hits: found,
      body,
      allCancelled: cancelled.length === found.length && found.length > 0,
      workings,
    });
  }

  /*
   * One sentence about the set, when there is something true to say about it.
   *
   * Deliberately not a count. "Four yogas" is a fact about how many rules
   * Jade implements, not about the chart — and a reader who hears four will
   * compare it with somebody who heard six.
   */
  let opening: string | null = null;
  if (families.length === 0) {
    opening =
      'None of the combinations Jade checks for is formed here. That is a statement about a list of rules rather than about a life: the named yogas are the ones particular texts chose to name, and most charts carry none of them.';
  } else if (families.every((one) => one.allCancelled)) {
    opening =
      'Every combination formed here also carries the condition the texts give for cancelling it. The geometry is present and the reading is not — which is the ordinary case, and the reason a yoga list without its cancellations misleads.';
  } else if (families.length >= 3) {
    /* The titles keep their own capitals. Lowercasing the whole string turned
       "what stands beside the Moon" into "the moon", which is a different
       thing entirely in this system. */
    opening = `Several different families of combination are formed: ${list(
      families.map((one) => one.title.charAt(0).toLowerCase() + one.title.slice(1)),
    )}. They are separate rules from separate texts and they are not additive — a chart carrying four is not twice a chart carrying two.`;
  }

  return { families, opening };
}

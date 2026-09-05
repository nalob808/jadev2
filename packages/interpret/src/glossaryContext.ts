import {
  NAKSHATRA_NAMES,
  SIGNS,
  dashaChainAt,
  type ComputedChart,
  type VimshottariResult,
} from '@jade/astro';
import { GLOSSARY, type GlossaryEntry } from './glossary.js';

/**
 * The same word, said about *this* chart.
 *
 * A glossary alone answers "what is a nakṣatra". It does not answer the
 * question a reader actually has, which is "what is a nakṣatra **here**" —
 * and the gap between those two is the whole difference between a reference
 * work and something worth hovering. Every astrology site on the internet can
 * tell you a nakṣatra is a lunar mansion. None of them can tell you that
 * yours is Puṣya, that Saturn rules it, and that Saturn's period is therefore
 * the one you are living in.
 *
 * So a term in Jade carries two layers. The static entry says what the word
 * means; this file says what it currently refers to. The second layer is
 * computed from the chart on screen and disappears when there is no chart —
 * a term on the pricing page still explains itself, it simply has nothing
 * personal to add.
 *
 * The interface puts these above the definition's paragraph, not below it.
 * The general explanation is what a reader needs once; the line about their
 * own chart is what they came for, and burying it under six sentences means
 * it is only ever found by someone who thinks to scroll a tooltip.
 *
 * The lines are deliberately short and factual. This is not a reading: it
 * makes no claim about what any of it *means* for the person, because a
 * tooltip is the wrong place to make claims and because interpretation has to
 * carry its factors with it (CLAUDE.md #5). These lines are the factors.
 */

export interface GlossaryContext {
  /** Term id → the lines to show under the definition. */
  readonly lines: Readonly<Record<string, readonly string[]>>;
}

export interface ContextInput {
  readonly chart: ComputedChart;
  readonly dasha?: VimshottariResult;
  readonly nowJd?: number;
  /** Whose chart this is, so lines can say "Nalu's Moon" rather than "your Moon". */
  readonly subject?: string;
}

const CAP = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

function ordinal(n: number): string {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th');
  return `${n}${suffix}`;
}

/**
 * Build the per-term context for one chart.
 *
 * Returns lines only for terms the chart can actually say something about.
 * A term with no line falls back to its definition alone, which is the
 * correct behaviour — inventing a line to fill space would make every
 * tooltip look equally informative when they are not.
 */
export function glossaryContextFor(input: ContextInput): GlossaryContext {
  const { chart, dasha, subject } = input;
  const who = subject ? `${subject}’s` : 'your';
  const lines: Record<string, string[]> = {};
  const add = (id: string, line: string): void => {
    (lines[id] ??= []).push(line);
  };

  const moon = chart.points['Moon'];
  const sun = chart.points['Sun'];
  const asc = chart.points['Ascendant'];

  // -- the frame ---------------------------------------------------------
  add(
    'ayanamsa',
    `This chart uses ${chart.meta.ayanamsaMode}, currently ${chart.meta.ayanamsaValue.toFixed(4)}°.`,
  );
  add(
    'sidereal',
    `The ${chart.meta.ayanamsaValue.toFixed(2)}° difference is why ${who} sidereal and tropical positions do not match.`,
  );

  // -- lagna and houses --------------------------------------------------
  if (asc) {
    add(
      'lagna',
      `${CAP(who)} lagna is ${asc.sign} at ${asc.degreesInSign.toFixed(2)}° — so ${asc.sign} is the first house and the rest follow it.`,
    );
    add('bhava', `Counted from ${asc.sign}, whole-sign, so each house is one entire sign.`);
    const kendraSigns = [0, 3, 6, 9].map((offset) => SIGNS[(asc.signIndex + offset) % 12] ?? '');
    add('kendra', `Here the kendras are ${kendraSigns.join(', ')}.`);
    const dusthanaSigns = [5, 7, 11].map((offset) => SIGNS[(asc.signIndex + offset) % 12] ?? '');
    add('dusthana', `Here they are ${dusthanaSigns.join(', ')} — houses 6, 8 and 12.`);
  }
  add('rasi', `${CAP(who)} Sun is in ${sun?.sign ?? '—'} and ${who} Moon in ${moon?.sign ?? '—'}.`);

  // -- the nakṣatra chain ------------------------------------------------
  if (moon) {
    const index = (NAKSHATRA_NAMES as readonly string[]).indexOf(moon.nakshatra.name);
    const position = index >= 0 ? `, ${ordinal(index + 1)} of the 27` : '';
    add(
      'nakshatra',
      `${CAP(who)} Moon is in ${moon.nakshatra.name}${position}, pāda ${moon.nakshatra.pada}, ruled by ${CAP(moon.nakshatra.lord)}.`,
    );
    add(
      'pada',
      `${CAP(who)} Moon sits in pāda ${moon.nakshatra.pada} of ${moon.nakshatra.name}, which is what places it in its navāṁśa sign.`,
    );
    add(
      'vimshottari',
      `Because ${who} Moon is in ${moon.nakshatra.name}, the cycle opens on ${CAP(moon.nakshatra.lord)}.`,
    );
    add('tarabala', `Counted from ${moon.nakshatra.name}, ${who} birth nakṣatra.`);
  }

  // -- timing ------------------------------------------------------------
  const nowJd = input.nowJd;
  if (dasha && nowJd !== undefined) {
    const chain = dashaChainAt(dasha, nowJd);
    if (chain.length > 0) {
      const named = chain
        .slice(0, 3)
        .map((p) => CAP(p.lord))
        .join(' / ');
      add('dasha', `Running now: ${named}.`);
      const maha = chain[0];
      if (maha) {
        add('mahadasha', `${CAP(maha.lord)} is the mahādaśā running now.`);
        add('vimshottari', `${CAP(maha.lord)}’s period is the one currently running.`);
      }
    }
  }

  // -- divisions ---------------------------------------------------------
  const vargottama = chart.vargottama ?? [];
  if (vargottama.length > 0) {
    add('vargottama', `Vargottama here: ${vargottama.map(CAP).join(', ')}.`);
    add('navamsa', `${vargottama.map(CAP).join(', ')} hold the same sign in both charts.`);
  } else {
    add('vargottama', 'No graha in this chart is vargottama.');
  }
  const vargaCount = Object.keys(Object.values(chart.vargas)[0] ?? {}).length;
  if (vargaCount > 0) {
    add('shodashavarga', `All ${vargaCount} are computed for this chart.`);
  }

  // -- strength ----------------------------------------------------------
  const sarva = chart.ashtakavarga?.sarva;
  if (sarva && sarva.length === 12) {
    const best = sarva.indexOf(Math.max(...sarva));
    const worst = sarva.indexOf(Math.min(...sarva));
    add(
      'sarvashtakavarga',
      `Best supported here: ${SIGNS[best]} with ${sarva[best]} bindus. Least: ${SIGNS[worst]} with ${sarva[worst]}.`,
    );
    add(
      'ashtakavarga',
      `Computed for this chart — the sarva totals run ${Math.min(...sarva)} to ${Math.max(...sarva)}.`,
    );
    if (asc) {
      add(
        'bindu',
        `${asc.sign}, ${who} lagna sign, holds ${sarva[asc.signIndex]} of a possible 56.`,
      );
    }
  }

  // -- dignity, combustion -----------------------------------------------
  const dignities = Object.entries(chart.dignity ?? {});
  const exalted = dignities.filter(([, v]) => v === 'exalted').map(([id]) => CAP(id));
  const debilitated = dignities.filter(([, v]) => v === 'debilitated').map(([id]) => CAP(id));
  if (exalted.length > 0) add('dignity', `Exalted here: ${exalted.join(', ')}.`);
  if (debilitated.length > 0) add('dignity', `Debilitated here: ${debilitated.join(', ')}.`);
  if (exalted.length === 0 && debilitated.length === 0) {
    add('dignity', 'No graha in this chart is exalted or debilitated.');
  }
  const combust = Object.entries(chart.combustion ?? {})
    .filter(([, value]) => value?.combust)
    .map(([id, value]) => (value?.cazimi ? `${CAP(id)} (cazimi)` : CAP(id)));
  add(
    'combustion',
    combust.length > 0
      ? `Combust here: ${combust.join(', ')}.`
      : 'Nothing in this chart is combust.',
  );

  // -- yogas -------------------------------------------------------------
  const yogas = chart.yogas ?? [];
  if (yogas.length > 0) {
    const cancelled = yogas.filter((y) => (y.cancellations?.length ?? 0) > 0).length;
    const tail = cancelled > 0 ? `, ${cancelled} of them with cancellations` : '';
    add('yoga', `${yogas.length} found in this chart${tail}.`);
  } else {
    add('yoga', 'None of the yogas Jade checks are formed in this chart.');
  }

  // -- the day -----------------------------------------------------------
  const p = chart.panchanga;
  if (p) {
    add(
      'panchanga',
      `On the day of birth: ${p.tithi.name}, ${p.nakshatra.name}, ${p.yoga.name}, ${p.karana.name}.`,
    );
    add('tithi', `${p.tithi.name} at birth.`);
  }

  // -- the nodes ---------------------------------------------------------
  const rahu = chart.points['Rahu'];
  const ketu = chart.points['Ketu'];
  if (rahu && ketu) {
    add('rahu', `Here Rāhu is in ${rahu.sign} and Ketu opposite in ${ketu.sign}.`);
  }

  return { lines };
}

/** Terms that appear in the interface but have no entry — a build-time guard. */
export function missingEntries(ids: readonly string[]): readonly string[] {
  const known = new Set(GLOSSARY.map((entry: GlossaryEntry) => entry.id));
  return ids.filter((id) => !known.has(id));
}

import { glossaryEntry } from './glossary.js';
import {
  NAKSHATRA_NAMES,
  SIGNS,
  VARGA_NAMES,
  dashaChainAt,
  lordOfSign,
  signsAspectedBy,
  type Aspect,
  type ComputedChart,
  type Graha,
  type VargaId,
  type VimshottariResult,
} from '@jade/astro';

/**
 * The same word, said about the thing it is standing next to.
 *
 * `glossaryContextFor` answers "what does nakṣatra mean in this chart" — and
 * for a word in a page heading that is exactly right. But most technical
 * vocabulary in Jade appears in a *row*: the word `Nakṣatra` is a column
 * header in Saturn's line of the positions table, or a cell label in the
 * focus panel while Mars is selected. Answering with the Moon's nakṣatra
 * there is not merely unhelpful, it is wrong — the reader asked about the
 * thing under their finger and got told about something else.
 *
 * So context comes in two layers. The chart-wide layer is the fallback; a
 * scope narrows it. A scope is whatever the word is inside: a graha, a house,
 * a sign, a varga. Scopes are computed for every point on the page at once,
 * server-side, because they are cheap arithmetic over a chart that has
 * already been cast — and because a tooltip that has to compute before it can
 * open is a tooltip nobody waits for.
 *
 * ## Why this is not just "pass the graha to the tooltip"
 *
 * Because the *word* decides what the scope means. Inside Saturn's row,
 * `nakṣatra` means Saturn's nakṣatra, `dignity` means Saturn's dignity,
 * `dṛṣṭi` means what Saturn aspects, and `daśā` means the periods Saturn
 * rules. One scope, many different answers, each keyed by the term being
 * asked about. That mapping is what this file is.
 */

const CAP = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

/** Term id → the lines to show, for one scope. */
export type ScopeLines = Readonly<Record<string, readonly string[]>>;

/** Every scope on a page, keyed by the scope's own id. */
export type ScopeIndex = Readonly<Record<string, ScopeLines>>;

const DIGNITY_WORDS: Record<string, string> = {
  exalted: 'exalted — at its most able',
  moolatrikona: 'in mūlatrikoṇa — its own best ground',
  own: 'in its own sign',
  great_friend: 'in a great friend’s sign',
  friend: 'in a friend’s sign',
  neutral: 'in a neutral sign',
  enemy: 'in an enemy’s sign',
  great_enemy: 'in a great enemy’s sign',
  debilitated: 'debilitated — acting under constraint',
};

/**
 * Everything the vocabulary can say about one graha.
 *
 * Each line is a fact already computed and already on the page somewhere —
 * this does not derive anything new, it puts the existing figure next to the
 * word that names it (constitution #5: the factors travel with the claim).
 */
export function glossaryScopeForPoint(
  chart: ComputedChart,
  pointId: string,
  options: { readonly dasha?: VimshottariResult; readonly nowJd?: number } = {},
): ScopeLines {
  const point = chart.points[pointId];
  if (!point) return {};

  const lines: Record<string, string[]> = {};
  const add = (id: string, line: string): void => {
    (lines[id] ??= []).push(line);
  };
  const name = CAP(pointId);

  // -- where it is -------------------------------------------------------
  add(
    'rasi',
    `${name} is at ${point.degreesInSign.toFixed(2)}° of ${point.sign}, ruled by ${CAP(lordOfSign(point.signIndex))}.`,
  );
  add(
    'bhava',
    `${name} sits in the ${ORDINALS[point.house - 1] ?? `${point.house}th`} house here.`,
  );

  const index = (NAKSHATRA_NAMES as readonly string[]).indexOf(point.nakshatra.name);
  add(
    'nakshatra',
    `${name} is in ${point.nakshatra.name}${index >= 0 ? `, ${ORDINALS[index % 12] ? `${index + 1}${suffix(index + 1)}` : `${index + 1}th`} of the 27` : ''}, ruled by ${CAP(point.nakshatra.lord)}.`,
  );
  add('pada', `${name} is in pāda ${point.nakshatra.pada} of ${point.nakshatra.name}.`);

  // -- what condition it is in -------------------------------------------
  const dignity = chart.dignity[pointId];
  if (dignity) {
    add('dignity', `${name} is ${DIGNITY_WORDS[dignity] ?? dignity} in ${point.sign}.`);
  } else {
    add('dignity', `Dignity is not read for ${name}.`);
  }

  const combustion = chart.combustion[pointId];
  if (combustion?.combust) {
    add(
      'combustion',
      combustion.cazimi
        ? `${name} is cazimi — ${combustion.separation.toFixed(1)}° from the Sun, which strengthens rather than burns.`
        : `${name} is combust — ${combustion.separation.toFixed(1)}° from the Sun.`,
    );
  } else if (combustion) {
    add(
      'combustion',
      `${name} is not combust — ${combustion.separation.toFixed(1)}° from the Sun.`,
    );
  }

  if (point.retrograde) {
    add(
      'retrograde',
      `${name} is retrograde here, moving ${Math.abs(point.speed).toFixed(3)}° a day backwards.`,
    );
  }

  // -- divisions ---------------------------------------------------------
  const vargas = chart.vargas[pointId];
  if (vargas) {
    const navamsa = vargas['D9' as VargaId];
    if (navamsa !== undefined) {
      add('navamsa', `${name} falls in ${SIGNS[navamsa]} in the navāṁśa.`);
    }
    add('varga', `${name} is placed across all ${Object.keys(vargas).length} divisions.`);
    add(
      'vargottama',
      (chart.vargottama ?? []).includes(pointId)
        ? `${name} is vargottama — the same sign in the rāśi and the navāṁśa.`
        : `${name} is not vargottama.`,
    );
  }

  // -- strength ----------------------------------------------------------
  const own = chart.ashtakavarga?.bhinna?.[pointId as never] as
    { readonly bindus?: readonly number[] } | undefined;
  if (own?.bindus) {
    add(
      'bindu',
      `${name}’s own table gives ${point.sign} ${own.bindus[point.signIndex]} of a possible 8.`,
    );
    add('ashtakavarga', `${name} has its own table of bindus for all twelve signs.`);
  }
  const sarva = chart.ashtakavarga?.sarva;
  if (sarva) {
    add(
      'sarvashtakavarga',
      `${point.sign}, where ${name} stands, holds ${sarva[point.signIndex]} sarva bindus.`,
    );
  }

  // -- what it looks at --------------------------------------------------
  const aspected = safeAspects(pointId, point.signIndex);
  if (aspected.length > 0) {
    // Named by distance as well as by sign, because "the 7th" is how a
    // practitioner says it and the special aspects — Mars to the 4th and 8th,
    // Jupiter to the 5th and 9th, Saturn to the 3rd and 10th — are the whole
    // reason this line is worth printing.
    const said = aspected
      .map(
        (aspect) =>
          `${ORDINALS[aspect.distance - 1] ?? `${aspect.distance}th`} (${SIGNS[aspect.toSign]})`,
      )
      .join(', ');
    add('drishti', `${name} aspects the ${said}.`);
  }

  // -- what it takes part in ---------------------------------------------
  const yogas = (chart.yogas ?? []).filter((yoga) =>
    yoga.factors.some((factor) => factor.toLowerCase().includes(pointId.toLowerCase())),
  );
  add(
    'yoga',
    yogas.length > 0
      ? `${name} takes part in ${yogas.map((y) => y.name).join(', ')}.`
      : `${name} forms none of the yogas Jade checks.`,
  );

  // -- when it speaks ----------------------------------------------------
  const { dasha, nowJd } = options;
  if (dasha) {
    const ruled = countPeriods(dasha, pointId);
    if (ruled > 0)
      add('dasha', `${name} rules ${ruled} period${ruled === 1 ? '' : 's'} in this chart.`);
    if (nowJd !== undefined) {
      const chain = dashaChainAt(dasha, nowJd);
      const at = chain.findIndex((period) => period.lord === pointId);
      if (at >= 0) {
        const level = ['mahādaśā', 'antardaśā', 'pratyantardaśā', 'sūkṣmadaśā', 'prāṇadaśā'][at];
        add('dasha', `${name}’s ${level} is running right now.`);
        add(
          'mahadasha',
          at === 0
            ? `${name}’s mahādaśā is the one running.`
            : `The running mahādaśā is ${CAP(chain[0]!.lord)}’s.`,
        );
      }
    }
  }

  /**
   * The same answers, keyed under the specific names too.
   *
   * A cell in Saturn's row does not say "Nakṣatra", it says "Mūla" — so the
   * word the reader actually points at is the nakṣatra's own entry, not the
   * generic one, and it must carry Saturn's line rather than the chart's.
   * Aliasing here rather than at the call site means a component only has to
   * declare its scope; it does not also have to know which of the two ids the
   * text it renders will resolve to.
   */
  const alias = (from: string, to: string): void => {
    // Only ever alias onto a term that exists. The angles and the outers are
    // real chart points with no entry of their own — `graha-ascendant` is not
    // a word — and an alias to a missing id is a line of context attached to
    // nothing, which the scope-integrity test rightly refuses.
    if (lines[from] && !lines[to] && glossaryEntry(to)) lines[to] = lines[from];
  };
  alias('nakshatra', `nakshatra-${point.nakshatra.name.toLowerCase().replace(/\s+/g, '-')}`);
  alias('rasi', `sign-${point.sign.toLowerCase()}`);
  alias('bhava', `house-${point.house}`);
  alias('rasi', `graha-${pointId.toLowerCase()}`);

  return lines;
}

/** What the vocabulary can say about one house. */
export function glossaryScopeForHouse(chart: ComputedChart, house: number): ScopeLines {
  const asc = chart.points['Ascendant'];
  if (!asc || house < 1 || house > 12) return {};
  const lines: Record<string, string[]> = {};
  const add = (id: string, line: string): void => {
    (lines[id] ??= []).push(line);
  };

  const signIndex = (asc.signIndex + house - 1) % 12;
  const sign = SIGNS[signIndex]!;
  const ordinal = ORDINALS[house - 1]!;

  add('bhava', `Here the ${ordinal} house is ${sign}, ruled by ${CAP(lordOfSign(signIndex))}.`);
  add('rasi', `${sign} is the ${ordinal} house in this chart.`);

  const tenants = Object.values(chart.points).filter((point) => point.house === house);
  add(
    'graha',
    tenants.length > 0
      ? `Standing here: ${tenants.map((point) => CAP(point.id)).join(', ')}.`
      : 'No graha stands in this house.',
  );

  if ([1, 4, 7, 10].includes(house)) add('kendra', `The ${ordinal} is one of the four kendras.`);
  if ([6, 8, 12].includes(house)) add('dusthana', `The ${ordinal} is one of the three duḥsthānas.`);

  const sarva = chart.ashtakavarga?.sarva;
  if (sarva) {
    add('sarvashtakavarga', `${sign} holds ${sarva[signIndex]} sarva bindus.`);
    add('bindu', `${sign} holds ${sarva[signIndex]} of the 337 sarva bindus.`);
  }

  if (lines['bhava']) lines[`house-${house}`] = lines['bhava'];
  if (lines['rasi']) lines[`sign-${sign.toLowerCase()}`] = lines['rasi'];

  return lines;
}

/** What the vocabulary can say about one sign. */
export function glossaryScopeForSign(chart: ComputedChart, signIndex: number): ScopeLines {
  const sign = SIGNS[signIndex];
  if (!sign) return {};
  const lines: Record<string, string[]> = {};
  const add = (id: string, line: string): void => {
    (lines[id] ??= []).push(line);
  };

  add('rasi', `${sign} is ruled by ${CAP(lordOfSign(signIndex))}.`);
  const asc = chart.points['Ascendant'];
  if (asc) {
    const house = ((signIndex - asc.signIndex + 12) % 12) + 1;
    add('bhava', `${sign} is the ${ORDINALS[house - 1]} house in this chart.`);
  }
  const sarva = chart.ashtakavarga?.sarva;
  if (sarva) add('sarvashtakavarga', `${sign} holds ${sarva[signIndex]} sarva bindus.`);
  add('drishti', `Anything in ${sign} aspects ${SIGNS[(signIndex + 6) % 12]} across the chart.`);

  return lines;
}

/** What the vocabulary can say about one divisional chart. */
export function glossaryScopeForVarga(chart: ComputedChart, vargaId: VargaId): ScopeLines {
  const name = VARGA_NAMES[vargaId];
  if (!name) return {};
  const divisor = Number(vargaId.slice(1));
  return {
    varga: [
      `${name} (${vargaId}) cuts each sign into ${divisor} part${divisor === 1 ? '' : 's'} of ${(30 / divisor).toFixed(2)}°.`,
    ],
    ...(vargaId === 'D9'
      ? { navamsa: [`This is the navāṁśa — ${vargaId}, each part 3°20′, one pāda of a nakṣatra.`] }
      : {}),
  };
}

/**
 * Every scope a chart page needs, built in one pass.
 *
 * Keyed so a component can name its scope without knowing how it was built:
 * a graha by its id, a house as `house:7`, a sign as `sign:3`, a varga as
 * `varga:D9`.
 */
export function buildScopeIndex(
  chart: ComputedChart,
  options: { readonly dasha?: VimshottariResult; readonly nowJd?: number } = {},
): ScopeIndex {
  const index: Record<string, ScopeLines> = {};
  for (const id of Object.keys(chart.points)) {
    index[id] = glossaryScopeForPoint(chart, id, options);
  }
  for (let house = 1; house <= 12; house += 1) {
    index[`house:${house}`] = glossaryScopeForHouse(chart, house);
  }
  for (let sign = 0; sign < 12; sign += 1) {
    index[`sign:${sign}`] = glossaryScopeForSign(chart, sign);
  }
  for (const vargaId of Object.keys(VARGA_NAMES) as VargaId[]) {
    index[`varga:${vargaId}`] = glossaryScopeForVarga(chart, vargaId);
  }
  return index;
}

function suffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

/**
 * Dṛṣṭi for a point, or nothing.
 *
 * `signsAspectedBy` is defined for the seven visible grahas. The nodes, the
 * angles and the outers are not aspecting bodies in the scheme Jade
 * implements, and asking anyway throws — so the question is asked safely
 * rather than the caller having to know which ids are legal.
 */
function safeAspects(pointId: string, signIndex: number): Aspect[] {
  try {
    return signsAspectedBy(pointId as Graha, signIndex);
  } catch {
    return [];
  }
}

function countPeriods(dasha: VimshottariResult, lord: string): number {
  let count = 0;
  const walk = (periods: readonly { lord: string; children?: unknown }[]): void => {
    for (const period of periods) {
      if (period.lord === lord) count += 1;
      const children = (period as { children?: readonly { lord: string }[] }).children;
      if (children) walk(children);
    }
  };
  walk(dasha.periods);
  return count;
}

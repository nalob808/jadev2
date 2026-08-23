import { houseFrom } from '../yogas.js';
import { GRAHA_DRISHTI } from '../drishti.js';
import { lordOfSign } from '../dignity.js';
import { SIGNS, type Graha } from '../types.js';
import type { DashaPeriod, VimshottariResult } from '../dashas/vimshottari.js';

/**
 * Two people's daśās on one axis, and the windows where they meet.
 *
 * A shared timeline is the thing a practitioner actually wants from a pair:
 * not "are they compatible" but "when does this get easier, and when does it
 * get harder, for both of them at once". Two Vimśottarī trees laid on the same
 * axis answer that directly.
 *
 * **A convergence is a named rule, never a score.** Each one says which rule
 * fired and which placements produced it, because a highlighted band on a
 * timeline is a claim, and this project does not print claims it cannot
 * decompose (CLAUDE.md, non-negotiable #5). There is no "intensity", no
 * percentage, and no colour scale from good to bad.
 */

export interface TimelineChart {
  readonly ascendantSign: number;
  readonly signOf: Readonly<Record<Graha, number>>;
}

export interface TimelineSegment {
  readonly startJd: number;
  readonly endJd: number;
  /** The chain running for A over this whole segment, outermost first. */
  readonly a: readonly Graha[];
  /** The chain running for B. */
  readonly b: readonly Graha[];
}

export type ConvergenceRule =
  'sameLord' | 'mutualDrishti' | 'lordInPartnersSeventh' | 'seventhLordPeriod';

export interface Convergence {
  readonly rule: ConvergenceRule;
  /**
   * Whose flag this is: `'a'`, `'b'`, or `'both'` for the mutual rules.
   *
   * Needed to keep two people's flags of the same rule apart. Without it they
   * are indistinguishable, they collide as keys, and they break each other's
   * merging.
   */
  readonly subject: 'a' | 'b' | 'both';
  readonly name: string;
  readonly startJd: number;
  readonly endJd: number;
  /** Never empty. What actually produced the flag. */
  readonly factors: readonly string[];
}

const signName = (i: number): string => SIGNS[((i % 12) + 12) % 12]!;

/** Flatten a daśā tree to the periods at one level. */
function periodsAtLevel(result: VimshottariResult, level: number): DashaPeriod[] {
  const out: DashaPeriod[] = [];
  const walk = (periods: readonly DashaPeriod[]): void => {
    for (const p of periods) {
      if (p.level === level) out.push(p);
      else if (p.children) walk(p.children);
    }
  };
  walk(result.periods);
  return out.sort((x, y) => x.startJd - y.startJd);
}

/**
 * Cut both timelines at every boundary of either, so each segment has exactly
 * one chain running for each person. Without this the two sets of periods
 * overlap raggedly and nothing can be compared.
 */
export function sharedTimeline(
  a: VimshottariResult,
  b: VimshottariResult,
  options: { level?: number; fromJd?: number; toJd?: number } = {},
): TimelineSegment[] {
  const level = options.level ?? 2;
  const pa = periodsAtLevel(a, level);
  const pb = periodsAtLevel(b, level);
  if (pa.length === 0 || pb.length === 0) return [];

  const from = options.fromJd ?? Math.max(pa[0]!.startJd, pb[0]!.startJd);
  const to = options.toJd ?? Math.min(pa[pa.length - 1]!.endJd, pb[pb.length - 1]!.endJd);
  if (!(to > from)) return [];

  const cuts = new Set<number>([from, to]);
  for (const p of [...pa, ...pb]) {
    if (p.startJd > from && p.startJd < to) cuts.add(p.startJd);
    if (p.endJd > from && p.endJd < to) cuts.add(p.endJd);
  }
  const edges = [...cuts].sort((x, y) => x - y);

  const at = (periods: DashaPeriod[], jd: number): readonly Graha[] =>
    periods.find((p) => jd >= p.startJd && jd < p.endJd)?.lords ?? [];

  const segments: TimelineSegment[] = [];
  for (let i = 0; i < edges.length - 1; i += 1) {
    const startJd = edges[i]!;
    const endJd = edges[i + 1]!;
    const mid = (startJd + endJd) / 2;
    const chainA = at(pa, mid);
    const chainB = at(pb, mid);
    if (chainA.length === 0 || chainB.length === 0) continue;
    segments.push({ startJd, endJd, a: chainA, b: chainB });
  }
  return segments;
}

/**
 * Merge runs of the same flag so a rule produces one band, not forty.
 *
 * Grouping by identity **before** merging is the whole trick. Sorting
 * everything by start time and merging neighbours looks equivalent and is not:
 * when both people trigger the same rule over the same segment their two flags
 * interleave, each breaks the other's adjacency chain, and nothing merges at
 * all. On a real pair that turned a dozen bands into 312.
 */
function coalesce(flags: Convergence[]): Convergence[] {
  const groups = new Map<string, Convergence[]>();
  for (const f of flags) {
    // Keyed on the band's *identity*, not its wording. The factors quote the
    // running chain, which changes at every antardaśā boundary, so keying on
    // them means consecutive bands of one continuous condition never merge.
    const key = [f.rule, f.subject, f.name].join('\u0000');
    const list = groups.get(key);
    if (list) list.push(f);
    else groups.set(key, [f]);
  }

  const out: Convergence[] = [];
  for (const list of groups.values()) {
    list.sort((x, y) => x.startJd - y.startJd);
    let current = list[0]!;
    for (const f of list.slice(1)) {
      if (Math.abs(current.endJd - f.startJd) < 1e-6) current = { ...current, endJd: f.endJd };
      else {
        out.push(current);
        current = f;
      }
    }
    out.push(current);
  }
  return out.sort((x, y) => x.startJd - y.startJd || x.rule.localeCompare(y.rule));
}

/**
 * The rules, and only these four.
 *
 * Each is something a practitioner would say out loud about a pair, and each
 * can be decomposed on the page. Anything that could not be stated as a
 * sentence with named placements in it is not here.
 */
export function convergences(
  segments: readonly TimelineSegment[],
  chartA: TimelineChart,
  chartB: TimelineChart,
  names: { a: string; b: string } = { a: 'A', b: 'B' },
): Convergence[] {
  const found: Convergence[] = [];

  const seventhLord = (chart: TimelineChart): Graha => lordOfSign((chart.ascendantSign + 6) % 12);
  const seventhLordA = seventhLord(chartA);
  const seventhLordB = seventhLord(chartB);

  for (const segment of segments) {
    const lordA = segment.a[segment.a.length - 1]!;
    const lordB = segment.b[segment.b.length - 1]!;
    const base = { startJd: segment.startJd, endJd: segment.endJd };

    // 1. Both running the same graha.
    if (lordA === lordB) {
      found.push({
        ...base,
        rule: 'sameLord',
        subject: 'both',
        name: `Both in a ${lordA} period`,
        factors: [
          `${names.a} and ${names.b} are both running ${lordA}`,
          `${names.a} within ${segment.a[0]}, ${names.b} within ${segment.b[0]}`,
        ],
      });
    }

    // 2. The two running lords look at each other across the charts.
    const signOfA = chartA.signOf[lordA];
    const signOfB = chartB.signOf[lordB];
    if (signOfA !== undefined && signOfB !== undefined && lordA !== lordB) {
      const aSeesB = GRAHA_DRISHTI[lordA]?.includes(houseFrom(signOfA, signOfB)) ?? false;
      const bSeesA = GRAHA_DRISHTI[lordB]?.includes(houseFrom(signOfB, signOfA)) ?? false;
      if (aSeesB && bSeesA) {
        found.push({
          ...base,
          rule: 'mutualDrishti',
          subject: 'both',
          name: `${lordA} and ${lordB} in mutual dṛṣṭi`,
          factors: [
            `${names.a} is running ${lordA}, in ${signName(signOfA)}`,
            `${names.b} is running ${lordB}, in ${signName(signOfB)}`,
            'each casts a glance on the other',
          ],
        });
      }
    }

    // 3. One person's running lord sits in the other's seventh house.
    for (const [lord, ownName, otherName, otherChart, who] of [
      [lordA, names.a, names.b, chartB, 'a'],
      [lordB, names.b, names.a, chartA, 'b'],
    ] as const) {
      const sign = otherChart.signOf[lord];
      if (sign === undefined) continue;
      if (houseFrom(otherChart.ascendantSign, sign) !== 7) continue;
      found.push({
        ...base,
        rule: 'lordInPartnersSeventh',
        subject: who,
        name: `${ownName}'s ${lord} period falls on ${otherName}'s seventh`,
        factors: [
          `${ownName} is running ${lord}`,
          `in ${otherName}'s chart ${lord} sits in ${signName(sign)}, the seventh — the house of the partner`,
        ],
      });
    }

    // 4. Either is running the lord of their own seventh.
    for (const [lord, who, seventh, chart, side] of [
      [lordA, names.a, seventhLordA, chartA, 'a'],
      [lordB, names.b, seventhLordB, chartB, 'b'],
    ] as const) {
      if (lord !== seventh) continue;
      found.push({
        ...base,
        rule: 'seventhLordPeriod',
        subject: side,
        name: `${who} is running the lord of their seventh`,
        factors: [
          `${who}'s seventh is ${signName((chart.ascendantSign + 6) % 12)}, ruled by ${seventh}`,
          `${who} is running ${lord}`,
        ],
      });
    }
  }

  return coalesce(found);
}

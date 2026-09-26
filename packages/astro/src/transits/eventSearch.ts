import type { EphemerisProvider } from '../ephemeris/provider.js';
import type { DashaPeriod, VimshottariResult } from '../dashas/vimshottari.js';
import { houseFrom } from '../yogas.js';
import { SIGNS, type Graha, type PointId } from '../types.js';
import {
  findCrossings,
  findIngresses,
  findStations,
  type ScanOptions,
  type ScanWindow,
  type SiderealFrame,
  type StationDirection,
} from './scan.js';

/**
 * Event search: "when do all of these things happen at once?"
 *
 * ## The question this exists to answer
 *
 * Every tool can tell you when Saturn enters Pisces. The question a
 * practitioner actually has is compound — *when does Saturn arrive on her natal
 * Moon while a Saturn period is running* — and answering it by hand means
 * printing two lists and reading across them with a finger. That is the hour a
 * week this is meant to save.
 *
 * So a query is a set of clauses, and the result is the windows in which **all**
 * of them hold. One clause is a perfectly good query and returns that clause's
 * own events; the feature earns its keep at two and three.
 *
 * ## What "ranked" means here, and what it does not
 *
 * The windows come back ordered by **spread** — how few days separate the
 * earliest and latest event in the window. That is a measure of how tightly the
 * conditions coincide, and it is arithmetic: a Saturn contact and a Saturn
 * antardaśā beginning four days apart is a tighter coincidence than the same
 * pair ninety days apart, and anyone can check the subtraction.
 *
 * It is emphatically **not** a ranking by importance, severity, or how good or
 * bad a window is. Jade does not know that and is not allowed to imply it
 * (CLAUDE.md #5, #6). A test asserts no window carries that vocabulary.
 *
 * ## Instants, intervals, and why both are needed
 *
 * A transit clause matches an *instant* — the bisected root of a crossing. A
 * daśā clause matches an *interval* — the whole period a lord is running. Mixing
 * them is the entire point: the interesting compound questions are always of the
 * form "this moment, inside that stretch". Instants are widened to `withinDays`
 * so that two events which do not literally coincide can still be found near
 * each other, and the widening is reported so nobody mistakes a 90-day window
 * for a simultaneous event.
 */

export type EventClause =
  /** A sign change. With no `sign`, any sign change by that body. */
  | { readonly kind: 'ingress'; readonly body: PointId; readonly sign?: number }
  /** A change of apparent direction. With no `direction`, either. */
  | {
      readonly kind: 'station';
      readonly body: PointId;
      readonly direction?: StationDirection;
    }
  /** A transiting body arriving on one of the natal points. */
  | { readonly kind: 'contact'; readonly body: PointId; readonly target: PointId }
  /** A transiting body crossing a fixed sidereal degree. */
  | { readonly kind: 'degree'; readonly body: PointId; readonly longitude: number }
  /**
   * A daśā lord running. `level` 1 is the mahādaśā, 2 the antardaśā, 3 the
   * pratyantardaśā; omitted means any level in the chain.
   */
  | { readonly kind: 'lord'; readonly lord: Graha; readonly level?: number };

export interface ClauseMatch {
  readonly clause: EventClause;
  /** The moment, for an instant clause. Null for an interval clause like a daśā. */
  readonly jdUt: number | null;
  /** The span over which the clause holds. Equal to `jdUt` twice for an instant. */
  readonly fromJd: number;
  readonly toJd: number;
  readonly headline: string;
  /** Never empty — a test asserts it (CLAUDE.md #5). */
  readonly factors: readonly string[];
}

export interface EventWindow {
  readonly fromJd: number;
  readonly toJd: number;
  /** One match per clause, in the order the clauses were given. */
  readonly matches: readonly ClauseMatch[];
  /**
   * Days between the earliest and latest *instant* in the window.
   *
   * Zero when the query has no instant clauses — a daśā-only query is satisfied
   * across its whole overlap and has no coincidence to measure.
   */
  readonly spreadDays: number;
}

export interface EventSearchQuery {
  readonly clauses: readonly EventClause[];
  /**
   * How far apart two instants may fall and still count as one window.
   *
   * Defaulted to 30 and always reported back, because the number changes the
   * answer: at 7 days "Saturn on the Moon while Saturn rules" finds only exact
   * coincidences, and at 180 it finds most Saturn periods. A search tool that
   * hid this would be giving different answers to the same question without
   * saying so.
   */
  readonly withinDays?: number;
}

export interface EventSearchChart {
  readonly ascendantSign: number;
  readonly longitudeOf: Readonly<Partial<Record<PointId, number>>>;
}

export interface EventSearchResult {
  readonly window: ScanWindow;
  readonly withinDays: number;
  readonly clauses: readonly EventClause[];
  /** Ranked by spread, tightest first. */
  readonly windows: readonly EventWindow[];
  /** Per clause, how many matches it had on its own. A zero explains an empty result. */
  readonly clauseMatchCounts: readonly number[];
}

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

function ordinal(house: number): string {
  return ORDINALS[house - 1] ?? `${house}th`;
}

function signAt(longitude: number): string {
  return SIGNS[Math.floor(longitude / 30) % 12]!;
}

function pointLabel(id: PointId): string {
  return id === 'Ascendant' ? 'the lagna' : `natal ${id}`;
}

/** One line describing a clause, for a UI that has to echo the query back. */
export function describeClause(clause: EventClause): string {
  switch (clause.kind) {
    case 'ingress':
      return clause.sign === undefined
        ? `${clause.body} changes sign`
        : `${clause.body} enters ${SIGNS[clause.sign] ?? '?'}`;
    case 'station':
      return clause.direction === undefined
        ? `${clause.body} stations`
        : `${clause.body} turns ${clause.direction === 'retrograde' ? 'retrograde' : 'direct'}`;
    case 'contact':
      return `${clause.body} reaches ${pointLabel(clause.target)}`;
    case 'degree':
      return `${clause.body} crosses ${(clause.longitude % 30).toFixed(1)}° ${signAt(clause.longitude)}`;
    case 'lord':
      return clause.level === undefined
        ? `a ${clause.lord} period is running`
        : `a ${clause.lord} ${clause.level === 1 ? 'mahādaśā' : clause.level === 2 ? 'antardaśā' : 'pratyantardaśā'} is running`;
  }
}

/**
 * Every moment or span at which one clause holds.
 *
 * Instant clauses return zero-length spans; the caller widens them. Keeping the
 * widening out of here means a match reports the date the event *actually*
 * happened, and only the matching arithmetic works in the widened frame.
 */
function matchesFor(
  clause: EventClause,
  provider: EphemerisProvider,
  frame: SiderealFrame,
  window: ScanWindow,
  chart: EventSearchChart,
  dashas: VimshottariResult | undefined,
  scan: ScanOptions,
): ClauseMatch[] {
  const instant = (jdUt: number, headline: string, factors: readonly string[]): ClauseMatch => ({
    clause,
    jdUt,
    fromJd: jdUt,
    toJd: jdUt,
    headline,
    factors,
  });

  switch (clause.kind) {
    case 'ingress': {
      return findIngresses(provider, clause.body, window, frame, scan)
        .filter((hit) => clause.sign === undefined || hit.signIndex === clause.sign)
        .map((hit) => {
          const house = houseFrom(chart.ascendantSign, hit.signIndex);
          return instant(hit.jdUt, `${clause.body} enters ${hit.sign}`, [
            `${hit.sign} is the ${ordinal(house)} house from this lagna`,
            hit.retrograde
              ? `${clause.body} is retrograde, backing into the sign it just left — not the lasting entry`
              : `${clause.body} is direct`,
          ]);
        });
    }

    case 'station': {
      return findStations(provider, clause.body, window, frame, scan)
        .filter((hit) => clause.direction === undefined || hit.direction === clause.direction)
        .map((hit) => {
          const house = houseFrom(chart.ascendantSign, hit.signIndex);
          return instant(
            hit.jdUt,
            `${clause.body} turns ${hit.direction === 'retrograde' ? 'retrograde' : 'direct'} in ${hit.sign}`,
            [
              `stationary at ${(hit.longitude % 30).toFixed(2)}° ${hit.sign}`,
              `in the ${ordinal(house)} house`,
            ],
          );
        });
    }

    case 'contact': {
      const longitude = chart.longitudeOf[clause.target];
      if (longitude === undefined) return [];
      const house = houseFrom(chart.ascendantSign, Math.floor(longitude / 30) % 12);
      return findCrossings(provider, clause.body, longitude, window, frame, scan).map((hit) =>
        instant(hit.jdUt, `${clause.body} reaches ${pointLabel(clause.target)}`, [
          `${pointLabel(clause.target)} at ${(longitude % 30).toFixed(2)}° ${signAt(longitude)}, the ${ordinal(house)}`,
          `${clause.body} is ${hit.retrograde ? 'retrograde' : 'direct'}`,
          hit.pass > 1
            ? `pass ${hit.pass} of the retrograde loop over the same degree`
            : 'first and only pass over this degree',
        ]),
      );
    }

    case 'degree': {
      const house = houseFrom(chart.ascendantSign, Math.floor(clause.longitude / 30) % 12);
      return findCrossings(provider, clause.body, clause.longitude, window, frame, scan).map(
        (hit) =>
          instant(
            hit.jdUt,
            `${clause.body} crosses ${(clause.longitude % 30).toFixed(1)}° ${signAt(clause.longitude)}`,
            [
              `the degree sits in the ${ordinal(house)} house`,
              `${clause.body} is ${hit.retrograde ? 'retrograde' : 'direct'}`,
              hit.pass > 1 ? `pass ${hit.pass} over the same degree` : 'single pass',
            ],
          ),
      );
    }

    case 'lord': {
      if (!dashas) return [];
      const out: ClauseMatch[] = [];
      /**
       * Walk the tree rather than sampling it.
       *
       * A pratyantardaśā can be days long. Sampling weekly would skip whole
       * periods and the search would silently return fewer windows than exist —
       * the worst failure mode a search tool has, because nothing on screen
       * says anything is missing.
       */
      const visit = (periods: readonly DashaPeriod[]): void => {
        for (const period of periods) {
          if (period.endJd <= window.fromJd || period.startJd >= window.toJd) continue;
          const levelMatches = clause.level === undefined || period.level === clause.level;
          if (levelMatches && period.lord === clause.lord) {
            const fromJd = Math.max(period.startJd, window.fromJd);
            const toJd = Math.min(period.endJd, window.toJd);
            out.push({
              clause,
              jdUt: null,
              fromJd,
              toJd,
              headline: `${period.lords.join(' › ')} — a ${clause.lord} ${
                period.level === 1
                  ? 'mahādaśā'
                  : period.level === 2
                    ? 'antardaśā'
                    : 'pratyantardaśā'
              }`,
              factors: [
                `chain ${period.lords.join(' › ')}`,
                `level ${period.level}`,
                `${period.years.toFixed(2)} years long`,
              ],
            });
          }
          if (period.children) visit(period.children);
        }
      };
      visit(dashas.periods);
      return out;
    }
  }
}

interface Boundary {
  readonly jd: number;
  readonly clauseIndex: number;
  readonly opening: boolean;
  readonly match: ClauseMatch;
}

/**
 * Run a search.
 *
 * Pure. The window is an argument; nothing here reads a clock. `dashas` is
 * optional because a query with no `lord` clause does not need it, and a query
 * with one returns nothing without it rather than pretending the clause held.
 */
export function eventSearch(
  provider: EphemerisProvider,
  frame: SiderealFrame,
  window: ScanWindow,
  chart: EventSearchChart,
  query: EventSearchQuery,
  dashas?: VimshottariResult,
  scan: ScanOptions = {},
): EventSearchResult {
  const withinDays = query.withinDays ?? 30;
  const half = withinDays / 2;

  const perClause = query.clauses.map((clause) =>
    matchesFor(clause, provider, frame, window, chart, dashas, scan),
  );

  const result = {
    window,
    withinDays,
    clauses: query.clauses,
    clauseMatchCounts: perClause.map((matches) => matches.length),
  };

  // A clause nobody satisfied means no window can exist. Returning early keeps
  // the sweep below from having to reason about it, and `clauseMatchCounts`
  // above is what lets the UI say *which* clause emptied the result.
  if (query.clauses.length === 0 || perClause.some((matches) => matches.length === 0)) {
    return { ...result, windows: [] };
  }

  /**
   * Sweep for overlaps.
   *
   * Each match becomes an opening and a closing boundary, instants widened by
   * half the tolerance either side. Walking the boundaries in time order while
   * counting how many of each clause are currently open finds every stretch
   * where all clauses are simultaneously satisfied, in one pass.
   */
  const boundaries: Boundary[] = [];
  perClause.forEach((matches, clauseIndex) => {
    for (const match of matches) {
      const isInstant = match.jdUt !== null;
      boundaries.push({
        jd: isInstant ? match.fromJd - half : match.fromJd,
        clauseIndex,
        opening: true,
        match,
      });
      boundaries.push({
        jd: isInstant ? match.toJd + half : match.toJd,
        clauseIndex,
        opening: false,
        match,
      });
    }
  });
  // Openings before closings at the same instant, so two spans that merely touch
  // still count as overlapping — they do, for one instant, and a tolerance of
  // zero should still find an exact coincidence.
  boundaries.sort((a, b) => a.jd - b.jd || (a.opening === b.opening ? 0 : a.opening ? -1 : 1));

  const open: Map<number, ClauseMatch[]> = new Map();
  const windows: EventWindow[] = [];
  let windowStart: number | null = null;

  const allOpen = (): boolean =>
    query.clauses.every((_, index) => (open.get(index)?.length ?? 0) > 0);

  for (const boundary of boundaries) {
    const wasComplete = allOpen();

    if (boundary.opening) {
      const list = open.get(boundary.clauseIndex) ?? [];
      list.push(boundary.match);
      open.set(boundary.clauseIndex, list);
    } else {
      const list = open.get(boundary.clauseIndex) ?? [];
      const at = list.indexOf(boundary.match);
      if (at >= 0) list.splice(at, 1);
      open.set(boundary.clauseIndex, list);
    }

    const isComplete = allOpen();

    if (!wasComplete && isComplete) {
      windowStart = boundary.jd;
    } else if (wasComplete && !isComplete && windowStart !== null) {
      // Snapshot the matches that were open for the whole stretch. `boundary`
      // is the one that just closed, so it belongs to this window too.
      const matches: ClauseMatch[] = query.clauses.map((_, index) => {
        const stillOpen = open.get(index)?.[0];
        return index === boundary.clauseIndex ? boundary.match : (stillOpen ?? boundary.match);
      });
      const instants = matches.map((match) => match.jdUt).filter((jd): jd is number => jd !== null);
      windows.push({
        fromJd: windowStart,
        toJd: boundary.jd,
        matches,
        spreadDays: instants.length > 1 ? Math.max(...instants) - Math.min(...instants) : 0,
      });
      windowStart = null;
    }
  }

  windows.sort((a, b) => a.spreadDays - b.spreadDays || a.fromJd - b.fromJd);

  return { ...result, windows };
}

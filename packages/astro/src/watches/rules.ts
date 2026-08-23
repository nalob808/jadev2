import { SIGNS, type Graha, type PointId } from '../types.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import {
  findCrossings,
  findIngresses,
  findStations,
  type ScanWindow,
  type SiderealFrame,
} from '../transits/scan.js';
import type { VimshottariResult, DashaPeriod } from '../dashas/vimshottari.js';

/**
 * Watches — standing rules that fire when the sky does a particular thing to a
 * particular chart.
 *
 * This is the part of Jade that speaks first. Everything else waits to be
 * asked; a watch is the practitioner saying "tell me when Saturn reaches her
 * Moon" and then not having to remember again.
 *
 * Two rules shape it, and both are the same ones that shape the rest:
 *
 * **Every hit is decomposable.** A watch that fires produces the exact moment,
 * the rule that fired, and the placements involved. An alert that says
 * "something important is happening" is worse than no alert, because the
 * practitioner then has to go and work out what — which is the work the watch
 * was supposed to save.
 *
 * **Nothing here interprets.** A hit says Saturn reached this degree on this
 * date, on its second pass, retrograde. It does not say what that means, and it
 * never says whether it is good or bad. Reading it is the practitioner's job
 * and the reason they are paid.
 */

export type WatchRule =
  | {
      /** A transiting graha reaches a natal point. The bread and butter. */
      readonly kind: 'transitCrossing';
      readonly transiting: PointId;
      readonly natalPoint: PointId;
    }
  | {
      /** A transiting graha changes sign — optionally only into one sign, or one house. */
      readonly kind: 'ingress';
      readonly transiting: PointId;
      readonly intoSign?: number;
      readonly intoHouse?: number;
    }
  | {
      /** A graha turns. Optionally only one direction, optionally only in one house. */
      readonly kind: 'station';
      readonly transiting: PointId;
      readonly direction?: 'retrograde' | 'direct';
      readonly inHouse?: number;
    }
  | {
      /** A daśā period begins. Level 1 is a mahādaśā, 2 an antardaśā, and so on. */
      readonly kind: 'dashaChange';
      readonly level: number;
      readonly lord?: Graha;
    };

export type WatchRuleKind = WatchRule['kind'];

export interface WatchSubject {
  /** Sidereal ascendant sign, 0–11. Houses are counted from it. */
  readonly ascendantSign: number;
  /** Natal sidereal longitudes, including the ascendant if it is watchable. */
  readonly natalLongitudeOf: Readonly<Record<string, number>>;
}

export interface WatchHit {
  readonly jdUt: number;
  readonly kind: WatchRuleKind;
  /** One line, in the practitioner's own vocabulary. Never a judgement. */
  readonly title: string;
  /** What produced it. Never empty. */
  readonly factors: readonly string[];
  /**
   * A stable identity for this hit, so an alert already sent is never sent
   * twice. Built from the rule and the event, not from the time it was
   * computed — recomputing the same window must produce the same keys.
   */
  readonly key: string;
}

const signName = (i: number): string => SIGNS[((i % 12) + 12) % 12]!;
const signAt = (longitude: number): string => signName(Math.floor(longitude / 30));
const houseOf = (ascendantSign: number, longitude: number): number =>
  ((((Math.floor(longitude / 30) - ascendantSign) % 12) + 12) % 12) + 1;

const ordinal = (n: number): string => {
  const s =
    n % 10 === 1 && n !== 11
      ? 'st'
      : n % 10 === 2 && n !== 12
        ? 'nd'
        : n % 10 === 3 && n !== 13
          ? 'rd'
          : 'th';
  return `${n}${s}`;
};

/** Julian Day to a whole-day stamp, for keys. Not for display. */
const dayStamp = (jdUt: number): string => Math.floor(jdUt + 0.5).toString();

const DASHA_LEVEL_NAME = ['', 'mahādaśā', 'antardaśā', 'pratyantardaśā', 'sūkṣmadaśā', 'prāṇadaśā'];

function flattenPeriods(result: VimshottariResult, level: number): DashaPeriod[] {
  const out: DashaPeriod[] = [];
  const walk = (periods: readonly DashaPeriod[]): void => {
    for (const p of periods) {
      if (p.level === level) out.push(p);
      else if (p.children) walk(p.children);
    }
  };
  walk(result.periods);
  return out;
}

/**
 * Evaluate one watch over a window.
 *
 * Pure: the provider and the window are arguments, nothing reads a clock, and
 * the same inputs always produce the same hits with the same keys. That is what
 * makes a nightly job safe to re-run.
 */
export function evaluateWatch(
  rule: WatchRule,
  subject: WatchSubject,
  window: ScanWindow,
  context: {
    readonly provider: EphemerisProvider;
    readonly frame: SiderealFrame;
    /** Required only for `dashaChange`. */
    readonly dasha?: VimshottariResult;
  },
): WatchHit[] {
  const { provider, frame } = context;

  switch (rule.kind) {
    case 'transitCrossing': {
      const target = subject.natalLongitudeOf[rule.natalPoint];
      if (target === undefined) return [];
      return findCrossings(provider, rule.transiting, target, window, frame).map((c) => ({
        jdUt: c.jdUt,
        kind: rule.kind,
        title: `${rule.transiting} reaches natal ${rule.natalPoint}`,
        factors: [
          `natal ${rule.natalPoint} at ${target.toFixed(2)}° — ${signAt(target)}, the ${ordinal(
            houseOf(subject.ascendantSign, target),
          )} house`,
          `transiting ${rule.transiting} is ${c.retrograde ? 'retrograde' : 'direct'}`,
          c.pass > 1
            ? `pass ${c.pass} of the retrograde loop over the same degree`
            : 'first contact',
        ],
        key: `crossing:${rule.transiting}:${rule.natalPoint}:${dayStamp(c.jdUt)}`,
      }));
    }

    case 'ingress': {
      return findIngresses(provider, rule.transiting, window, frame)
        .filter((i) => {
          if (rule.intoSign !== undefined && i.signIndex !== rule.intoSign) return false;
          if (rule.intoHouse !== undefined) {
            const house = ((((i.signIndex - subject.ascendantSign) % 12) + 12) % 12) + 1;
            if (house !== rule.intoHouse) return false;
          }
          return true;
        })
        .map((i) => {
          const house = ((((i.signIndex - subject.ascendantSign) % 12) + 12) % 12) + 1;
          return {
            jdUt: i.jdUt,
            kind: rule.kind,
            title: `${rule.transiting} enters ${i.sign}`,
            factors: [
              `${i.sign} is the ${ordinal(house)} house from this ascendant`,
              i.retrograde
                ? 'entering backwards — it will leave again and return'
                : 'entering direct',
            ],
            key: `ingress:${rule.transiting}:${i.signIndex}:${dayStamp(i.jdUt)}`,
          };
        });
    }

    case 'station': {
      return findStations(provider, rule.transiting, window, frame)
        .filter((s) => {
          if (rule.direction !== undefined && s.direction !== rule.direction) return false;
          if (rule.inHouse !== undefined) {
            if (houseOf(subject.ascendantSign, s.longitude) !== rule.inHouse) return false;
          }
          return true;
        })
        .map((s) => ({
          jdUt: s.jdUt,
          kind: rule.kind,
          title: `${rule.transiting} turns ${s.direction}`,
          factors: [
            `at ${s.longitude.toFixed(2)}° — ${s.sign}`,
            `the ${ordinal(houseOf(subject.ascendantSign, s.longitude))} house from this ascendant`,
          ],
          key: `station:${rule.transiting}:${s.direction}:${dayStamp(s.jdUt)}`,
        }));
    }

    case 'dashaChange': {
      if (!context.dasha) return [];
      return flattenPeriods(context.dasha, rule.level)
        .filter((p) => p.startJd >= window.fromJd && p.startJd <= window.toJd)
        .filter((p) => rule.lord === undefined || p.lord === rule.lord)
        .map((p) => ({
          jdUt: p.startJd,
          kind: rule.kind,
          title: `${p.lords.join(' → ')} ${DASHA_LEVEL_NAME[rule.level] ?? `level ${rule.level}`} begins`,
          factors: [
            `runs for ${p.years.toFixed(2)} years`,
            `lord ${p.lord}, within ${p.lords.slice(0, -1).join(' → ') || 'the natal Moon'}`,
          ],
          key: `dasha:${rule.level}:${p.lords.join('-')}:${dayStamp(p.startJd)}`,
        }));
    }

    default: {
      // Exhaustiveness: adding a rule kind without handling it fails to compile
      // rather than silently never firing.
      const never: never = rule;
      throw new Error(`Unhandled watch rule: ${JSON.stringify(never)}`);
    }
  }
}

/** A short, human description of a rule, for the list of watches. */
export function describeRule(rule: WatchRule): string {
  switch (rule.kind) {
    case 'transitCrossing':
      return `${rule.transiting} reaches natal ${rule.natalPoint}`;
    case 'ingress':
      return rule.intoSign !== undefined
        ? `${rule.transiting} enters ${signName(rule.intoSign)}`
        : rule.intoHouse !== undefined
          ? `${rule.transiting} enters the ${ordinal(rule.intoHouse)} house`
          : `${rule.transiting} changes sign`;
    case 'station':
      return rule.inHouse !== undefined
        ? `${rule.transiting} turns ${rule.direction ?? 'either way'} in the ${ordinal(rule.inHouse)}`
        : `${rule.transiting} turns ${rule.direction ?? 'either way'}`;
    case 'dashaChange':
      return rule.lord
        ? `a ${rule.lord} ${DASHA_LEVEL_NAME[rule.level] ?? `level ${rule.level}`} begins`
        : `any ${DASHA_LEVEL_NAME[rule.level] ?? `level ${rule.level}`} begins`;
    default:
      return 'unknown rule';
  }
}

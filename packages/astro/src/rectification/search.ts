import { norm360 } from '../angles.js';
import { ayanamsa, type AyanamsaMode } from '../sidereal/ayanamsa.js';
import { jdTtFromJdUt } from '../time.js';
import { computeAngles } from '../houses.js';
import { nakshatraOf } from '../nakshatra.js';
import { vimshottari } from '../dashas/vimshottari.js';
import { GRAHAS, SIGNS, type GeoLocation, type Graha, type HouseSystem } from '../types.js';
import type { EphemerisProvider } from '../ephemeris/provider.js';
import { lifeEvent, type LifeEventKind } from './events.js';
import {
  MAX_EVENT_SCORE,
  RULES,
  scoreEvent,
  type CandidateChart,
  type RuleId,
  type TransitSnapshot,
} from './score.js';

/**
 * Sweeping a window of candidate birth times.
 *
 * The output is a ranked shortlist, never an answer. Rectification is
 * inference under uncertainty: several times will fit a handful of events, the
 * fit improves with more events, and it never becomes proof. The result type
 * is shaped to make that impossible to forget — there is no `bestTime` field,
 * only `candidates`, and every candidate carries the rules that scored it.
 *
 * ## The thing most rectification tools get wrong
 *
 * A rule that fires for *every* candidate has told you nothing, however
 * classical it is. If Saturn is in the eighth sign from the ascendant for the
 * whole window — which happens constantly, because the ascendant only moves
 * thirty degrees in two hours — then "Saturn transits the eighth" is a
 * property of the day, not of the minute, and using it to rank minutes is
 * self-deception dressed as method.
 *
 * So the sweep computes, for every rule, the fraction of candidates it fired
 * for, and returns it. A rule at 100% is reported as non-discriminating and
 * its contribution is visible rather than buried. This is the difference
 * between a tool that shows its working and one that produces a number.
 */

export interface RectificationEvent {
  readonly kind: LifeEventKind;
  /** Julian Day (UT) of the reported event. */
  readonly jdUt: number;
  /** Free label from the practitioner, carried through untouched. */
  readonly label?: string;
}

export interface RectificationOptions {
  readonly location: GeoLocation;
  /** Earliest candidate, Julian Day UT. */
  readonly fromJd: number;
  /** Latest candidate, Julian Day UT. */
  readonly toJd: number;
  /** Sampling interval in minutes. Clamped to 1–60. */
  readonly stepMinutes?: number;
  readonly events: readonly RectificationEvent[];
  readonly ayanamsaMode?: AyanamsaMode;
  readonly customAyanamsaAtJ2000?: number;
  readonly houseSystem?: HouseSystem;
  /** Hard ceiling on candidates, so a wide window cannot hang a request. */
  readonly maxCandidates?: number;
}

export interface CandidateResult {
  readonly jdUt: number;
  /** 0–1. Share of the theoretical maximum across all events. */
  readonly score: number;
  readonly rawScore: number;
  readonly ascendant: number;
  readonly ascendantSign: string;
  readonly moonNakshatra: string;
  /** Per-event breakdown, in the order the events were supplied. */
  readonly perEvent: ReadonlyArray<{
    readonly kind: LifeEventKind;
    readonly score: number;
    readonly hits: ReturnType<typeof scoreEvent>['hits'];
  }>;
}

export interface RuleDiscrimination {
  readonly rule: RuleId;
  readonly label: string;
  /** Fraction of candidates this rule fired for, 0–1. */
  readonly firedFor: number;
  /**
   * True when the rule fired for effectively every candidate or for none, and
   * therefore separated nothing. Shown to the reader, not silently dropped.
   */
  readonly discriminating: boolean;
}

export interface RectificationResult {
  readonly candidates: readonly CandidateResult[];
  readonly ruleDiscrimination: readonly RuleDiscrimination[];
  readonly window: { readonly fromJd: number; readonly toJd: number; readonly stepMinutes: number };
  readonly candidatesConsidered: number;
  /** Distinct ascendant signs across the window — the coarse ambiguity. */
  readonly ascendantSigns: readonly string[];
  /**
   * How much daylight there is between the best candidate and the median one,
   * as a share of the maximum. Low separation means the events supplied do not
   * distinguish the window, which is a fact about the evidence rather than
   * about the chart.
   */
  readonly separation: number;
}

const MINUTES_PER_DAY = 1440;

/**
 * Run the sweep.
 *
 * Pure, like everything in this package: the window is an argument, no clock is
 * read, and the same inputs always produce the same ranking.
 */
export function rectify(
  provider: EphemerisProvider,
  options: RectificationOptions,
): RectificationResult {
  const stepMinutes = Math.max(1, Math.min(options.stepMinutes ?? 4, 60));
  const step = stepMinutes / MINUTES_PER_DAY;
  const houseSystem = options.houseSystem ?? 'whole_sign';
  const maxCandidates = Math.max(1, Math.min(options.maxCandidates ?? 400, 2000));

  const definitions = options.events.map((event) => ({
    event,
    definition: lifeEvent(event.kind),
  }));

  // The sky at each event date, computed once rather than per candidate. This
  // is not an approximation: a transiting graha's position depends on the
  // event date alone and has nothing to do with which birth time is being
  // tested, so hoisting it out of the loop changes no result.
  const transits = new Map<number, TransitSnapshot>();
  for (const { event } of definitions) {
    if (transits.has(event.jdUt)) continue;
    const jdTt = jdTtFromJdUt(event.jdUt);
    const ayanamsaValue = ayanamsa(jdTt, {
      mode: options.ayanamsaMode ?? 'lahiri',
      customAtJ2000: options.customAyanamsaAtJ2000,
      includeNutation: true,
    });
    const longitudes: Partial<Record<Graha, number>> = {};
    for (const graha of ['Jupiter', 'Saturn'] as const) {
      longitudes[graha] = norm360(provider.position(graha, event.jdUt).longitude - ayanamsaValue);
    }
    transits.set(event.jdUt, { longitudes });
  }

  const candidates: CandidateResult[] = [];
  const firedCount = new Map<RuleId, number>(RULES.map((r) => [r.id, 0]));

  // Indexed rather than accumulated. `jd += step` drifts: after a few dozen
  // additions of a non-representable fraction the running value is short of
  // where it should be, and the final sample falls outside the window and is
  // silently dropped. `fromJd + i * step` has one rounding, not n of them.
  const span = Math.max(0, options.toJd - options.fromJd);

  // The tolerance is half a second, expressed as a fraction of one step.
  //
  // It cannot be an arbitrary epsilon. A Julian Day near the present is about
  // 2.45 million, so `fromJd + 11/24` has already lost the low bits: a window
  // that is exactly four hours wide divides into a step of ten minutes as
  // 23.999999977, and floor() then drops the last candidate. Anchoring the
  // slack to half a second makes it far larger than that float noise and far
  // smaller than the one-minute floor on `stepMinutes`, so it can never
  // invent a sample that a practitioner would consider distinct.
  const halfSecondOfSteps = 0.5 / 86_400 / step;
  const sampleCount = Math.min(Math.floor(span / step + halfSecondOfSteps) + 1, maxCandidates);

  let considered = 0;
  for (let i = 0; i < sampleCount; i += 1) {
    const jd = options.fromJd + i * step;
    considered += 1;

    const jdTt = jdTtFromJdUt(jd);
    const ayanamsaValue = ayanamsa(jdTt, {
      mode: options.ayanamsaMode ?? 'lahiri',
      customAtJ2000: options.customAyanamsaAtJ2000,
      includeNutation: true,
    });

    const angles = computeAngles(provider, jd, options.location);
    const ascendant = norm360(angles.ascendantTropical - ayanamsaValue);

    const longitudes: Partial<Record<Graha, number>> = {};
    for (const graha of GRAHAS) {
      longitudes[graha] = norm360(provider.position(graha, jd).longitude - ayanamsaValue);
    }

    const chart: CandidateChart = { ascendant, longitudes, houseSystem };
    const moonLongitude = longitudes.Moon!;
    const dashas = vimshottari(moonLongitude, jd, { levels: 2 });

    const perEvent: Array<CandidateResult['perEvent'][number]> = [];
    const rulesFiredHere = new Set<RuleId>();
    let rawScore = 0;

    for (const { event, definition } of definitions) {
      if (!definition) continue;
      const scored = scoreEvent(chart, dashas, event.jdUt, definition, transits.get(event.jdUt));
      rawScore += scored.score;
      perEvent.push({ kind: event.kind, score: scored.score, hits: scored.hits });
      for (const hit of scored.hits) rulesFiredHere.add(hit.rule);
    }

    for (const id of rulesFiredHere) firedCount.set(id, (firedCount.get(id) ?? 0) + 1);

    const ceiling = MAX_EVENT_SCORE * Math.max(1, definitions.length);
    candidates.push({
      jdUt: jd,
      rawScore,
      score: ceiling === 0 ? 0 : rawScore / ceiling,
      ascendant,
      ascendantSign: SIGNS[Math.floor(ascendant / 30)]!,
      moonNakshatra: nakshatraOf(moonLongitude).name,
      perEvent,
    });
  }

  candidates.sort((a, b) => b.rawScore - a.rawScore || a.jdUt - b.jdUt);

  const ruleDiscrimination: RuleDiscrimination[] = RULES.map((r) => {
    const firedFor = considered === 0 ? 0 : (firedCount.get(r.id) ?? 0) / considered;
    return {
      rule: r.id,
      label: r.label,
      firedFor,
      // A rule that fires for everything or nothing has ranked nothing. The
      // 0.98 rather than 1.0 is deliberate: one candidate in four hundred
      // differing is not discrimination either.
      discriminating: firedFor > 0.02 && firedFor < 0.98,
    };
  });

  const ascendantSigns = [...new Set(candidates.map((c) => c.ascendantSign))];

  // Separation: best against the median, as a share of the ceiling. If the
  // supplied events cannot tell the window apart this comes out near zero, and
  // that is the honest headline rather than a confident-looking ranking.
  const sortedScores = [...candidates].map((c) => c.rawScore).sort((a, b) => a - b);
  const median = sortedScores.length ? sortedScores[Math.floor(sortedScores.length / 2)]! : 0;
  const best = candidates[0]?.rawScore ?? 0;
  const ceiling = MAX_EVENT_SCORE * Math.max(1, definitions.length);
  const separation = ceiling === 0 ? 0 : Math.max(0, (best - median) / ceiling);

  return {
    candidates,
    ruleDiscrimination,
    window: { fromJd: options.fromJd, toJd: options.toJd, stepMinutes },
    candidatesConsidered: considered,
    ascendantSigns,
    separation,
  };
}

/**
 * The sentence that must travel with every result.
 *
 * Rectification produces a shortlist, and a shortlist presented without this
 * becomes a birth certificate in the reader's memory within about a week.
 */
export const RECTIFICATION_CAVEAT =
  'Rectification is inference, not measurement. These candidates are the times at which the classical timing rules best fit the events you supplied — a different set of events, or a different rule weighting, would rank them differently. Treat the top of this list as a hypothesis to test against further events, never as a corrected birth time.';

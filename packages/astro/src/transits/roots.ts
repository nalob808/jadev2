/**
 * Finding the instant a quantity crosses a threshold.
 *
 * ## Why this is its own module
 *
 * Every dated statement in Jade is one of these. "Saturn enters Pisces",
 * "Mercury stations", "the tithi turns", "the Moon is full", "the Sun returns
 * to where it was at your birth", "Mars leaves combustion" — all of them are
 * the same question asked of a different function: *when does this cross zero*.
 *
 * The bisection that answers it lived inside `scan.ts` as a private helper
 * whose three public callers each took a `PointId` rather than a function. So
 * the machinery was general and the doors were not, and six features that
 * needed nothing new were blocked on a parameter type. This module is that
 * helper with its door opened.
 *
 * ## Sampled, then bisected — never sampled alone
 *
 * The method is deliberately two-stage. A coarse walk finds brackets where the
 * sign changes; bisection then converges inside each bracket. Sampling alone
 * gives a date accurate to the step, which for a two-day comb is a two-day
 * error on a statement somebody will write in a diary. Bisection alone needs a
 * bracket it cannot find.
 *
 * **The step is the whole correctness argument.** A comb coarser than the
 * shortest interval between two roots steps straight over a pair of them — and
 * because they come in pairs, the result is not a late date, it is a silently
 * missing event. A retrograde graha crossing a degree three times inside a
 * fortnight is the usual way this bites. Callers pass a step they have
 * reasoned about; nothing here guesses one.
 *
 * ## What it does not do
 *
 * No extrapolation past the window, no interpolation between samples, and no
 * root returned that the bracket did not contain. A function with a
 * discontinuity rather than a crossing — a longitude wrapping 360° to 0°, for
 * instance — must be made continuous by its caller before it arrives here,
 * because this module cannot tell a wrap from a root and would date the wrap.
 */

/** A crossing, and the bracket it was found in. */
export interface Root {
  /** The instant, in Julian Days UT. */
  readonly jdUt: number;
  /** The sign of `f` before the crossing: -1 rising through zero, +1 falling. */
  readonly from: -1 | 1;
}

export interface RootOptions {
  /**
   * The coarse comb, in days.
   *
   * Must be well under the shortest interval between two roots of `f`. There
   * is no safe default: the right value for the Moon's tithi is hours and the
   * right value for Saturn's ingress is days.
   */
  readonly stepDays: number;
  /** Bisection tolerance in days. One second is 1.16e-5. Default one second. */
  readonly toleranceDays?: number;
  /**
   * Stop after this many roots. Omitted, every root in the window is returned.
   * A caller that wants the next one asks for one and gets one evaluation of
   * the fine search rather than a whole window's worth.
   */
  readonly limit?: number;
}

/** One second of a day, which is as fine as any date Jade prints. */
export const ONE_SECOND_DAYS = 1 / 86400;

/**
 * Bisect a sign-changing function to a root.
 *
 * `f` must have opposite signs at the two ends; a caller that has not checked
 * gets the midpoint of a bracket with no root in it, which is why this is
 * exported for callers that already know their bracket and never used to
 * search for one.
 */
export function bisectRoot(
  f: (jd: number) => number,
  lowJd: number,
  highJd: number,
  toleranceDays: number = ONE_SECOND_DAYS,
): number {
  let low = lowJd;
  let high = highJd;
  let fLow = f(low);
  /* A hard guard: 200 halvings takes any realistic window below any realistic
     tolerance, and a function that does not converge should stop rather than
     spin. */
  for (let i = 0; i < 200 && high - low > toleranceDays; i += 1) {
    const mid = (low + high) / 2;
    const fMid = f(mid);
    if (fMid === 0) return mid;
    if (fLow < 0 !== fMid < 0) high = mid;
    else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

/**
 * Every instant in the window where `f` crosses zero.
 *
 * `f` is evaluated roughly `(toJd - fromJd) / stepDays` times for the comb,
 * plus about 20 more per root found. For an expensive `f` — anything calling
 * an ephemeris — that count is the cost of the call, so the step is a budget
 * as well as a correctness argument.
 */
export function findRoots(
  f: (jd: number) => number,
  fromJd: number,
  toJd: number,
  options: RootOptions,
): Root[] {
  const step = options.stepDays;
  const tolerance = options.toleranceDays ?? ONE_SECOND_DAYS;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const found: Root[] = [];

  if (!(step > 0) || !(toJd > fromJd)) return found;

  let previousJd = fromJd;
  let previous = f(previousJd);

  /*
   * Walked by index rather than by `jd += step`, because the accumulating
   * form drifts: a 0.25-day step over a decade is 14,600 additions, and the
   * float error at the end is larger than the tolerance the bisection is
   * working to. The same bug was found and fixed once already in `scan.ts`.
   */
  const steps = Math.ceil((toJd - fromJd) / step);
  for (let i = 1; i <= steps && found.length < limit; i += 1) {
    const jd = Math.min(fromJd + i * step, toJd);
    const current = f(jd);

    if (current === 0) {
      found.push({ jdUt: jd, from: previous < 0 ? -1 : 1 });
    } else if (previous !== 0 && previous < 0 !== current < 0) {
      found.push({
        jdUt: bisectRoot(f, previousJd, jd, tolerance),
        from: previous < 0 ? -1 : 1,
      });
    }

    previousJd = jd;
    previous = current;
  }

  return found;
}

/**
 * The next instant after `fromJd` where `f` crosses zero, or null.
 *
 * A convenience over `findRoots` with `limit: 1`, named because "when is the
 * next one" is the question nine callers in ten are actually asking, and
 * because the limit is what keeps it from costing a whole window.
 */
export function nextRoot(
  f: (jd: number) => number,
  fromJd: number,
  toJd: number,
  options: RootOptions,
): number | null {
  return findRoots(f, fromJd, toJd, { ...options, limit: 1 })[0]?.jdUt ?? null;
}

/**
 * The last instant before `fromJd` where `f` crossed zero, or null.
 *
 * Searches backwards from `fromJd` to `floorJd`. Needed because a period — a
 * tithi, a combustion, a retrograde — is bounded at both ends, and "when did
 * the one I am in begin" is as common a question as "when does it end".
 */
export function previousRoot(
  f: (jd: number) => number,
  fromJd: number,
  floorJd: number,
  options: RootOptions,
): number | null {
  const roots = findRoots(f, floorJd, fromJd, options);
  return roots.length > 0 ? roots[roots.length - 1]!.jdUt : null;
}

/**
 * Every instant in the window where a stepped quantity changes step.
 *
 * ## Why this is not `findRoots` with a clever function
 *
 * It was, for about an hour. Tithis, nakṣatras, yogas and karaṇas are all
 * "which bucket of a 0–360° quantity is this in", and the obvious move is to
 * hand `findRoots` the signed distance to the nearest boundary — which rises
 * through zero at every boundary, as wanted, and also *jumps* from +half a
 * bucket to −half a bucket in the middle of every bucket. That jump is a
 * discontinuity, `findRoots` cannot tell a jump from a crossing, and the
 * search dutifully returned a spurious boundary halfway through every single
 * tithi. The test that caught it is still in `roots.test.ts`.
 *
 * So a stepped quantity gets its own search. `indexAt` returns the integer
 * bucket; the comb looks for a change in it, and the bisection narrows on
 * *where the change happened* rather than on where a continuous function
 * crossed zero. No continuity is assumed anywhere, which is the point.
 *
 * The same step budget applies: a comb coarser than the shortest bucket steps
 * over a pair of boundaries and reports neither.
 */
export interface Step {
  /** The instant the index changed, in Julian Days UT. */
  readonly jdUt: number;
  /** The index before. */
  readonly from: number;
  /** The index after. */
  readonly to: number;
}

export function findSteps(
  indexAt: (jd: number) => number,
  fromJd: number,
  toJd: number,
  options: RootOptions,
): Step[] {
  const step = options.stepDays;
  const tolerance = options.toleranceDays ?? ONE_SECOND_DAYS;
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const found: Step[] = [];

  if (!(step > 0) || !(toJd > fromJd)) return found;

  let previousJd = fromJd;
  let previous = indexAt(previousJd);

  const steps = Math.ceil((toJd - fromJd) / step);
  for (let i = 1; i <= steps && found.length < limit; i += 1) {
    const jd = Math.min(fromJd + i * step, toJd);
    const current = indexAt(jd);

    if (current !== previous) {
      /* Narrow on the change itself. The invariant held through the loop is
         that `low` still reads the old index and `high` reads a new one. */
      let low = previousJd;
      let high = jd;
      for (let k = 0; k < 200 && high - low > tolerance; k += 1) {
        const mid = (low + high) / 2;
        if (indexAt(mid) === previous) low = mid;
        else high = mid;
      }
      found.push({ jdUt: high, from: previous, to: indexAt(high) });
    }

    previousJd = jd;
    previous = current;
  }

  return found;
}

/**
 * The next step change after `fromJd`, and the one before it.
 *
 * Together they bound the bucket you are in, which is what every window on a
 * pañcāṅga page is: this tithi began here and turns there.
 */
export function stepWindow(
  indexAt: (jd: number) => number,
  jdUt: number,
  horizonDays: number,
  options: RootOptions,
): { fromJd: number | null; toJd: number | null } {
  const ahead = findSteps(indexAt, jdUt, jdUt + horizonDays, { ...options, limit: 1 });
  const behind = findSteps(indexAt, jdUt - horizonDays, jdUt, options);
  return {
    fromJd: behind.length > 0 ? behind[behind.length - 1]!.jdUt : null,
    toJd: ahead.length > 0 ? ahead[0]!.jdUt : null,
  };
}

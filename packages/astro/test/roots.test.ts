import { describe, expect, it } from 'vitest';
import {
  ONE_SECOND_DAYS,
  bisectRoot,
  findRoots,
  findSteps,
  nextRoot,
  previousRoot,
  stepWindow,
} from '../src/transits/roots.js';

/**
 * The root finder dates every statement Jade prints with a time on it, so the
 * things worth testing are the ways a search is silently wrong: a root stepped
 * over, a root invented, a wrap mistaken for a crossing, and float drift over
 * a long walk.
 */

/** A sine with a known period, so every root is known in closed form. */
const sine = (period: number) => (jd: number) => Math.sin((2 * Math.PI * jd) / period);

describe('findRoots', () => {
  it('finds every root of a known function', () => {
    /* sin(2πt/10) is zero at every multiple of 5. */
    const roots = findRoots(sine(10), 0.5, 27, { stepDays: 1 });
    expect(roots.map((r) => Math.round(r.jdUt))).toEqual([5, 10, 15, 20, 25]);
  });

  it('converges to the tolerance it was given', () => {
    const roots = findRoots(sine(10), 0.5, 7, { stepDays: 1, toleranceDays: 1e-9 });
    expect(roots).toHaveLength(1);
    expect(Math.abs(roots[0]!.jdUt - 5)).toBeLessThan(1e-8);
  });

  it('reports which way the function was going', () => {
    const roots = findRoots(sine(10), 0.5, 17, { stepDays: 1 });
    /* Rising through zero at 10, falling at 5 and 15. */
    expect(roots.map((r) => r.from)).toEqual([1, -1, 1]);
  });

  /* The failure that matters: a comb coarser than the gap between two roots
     steps over BOTH, so the result is a missing pair, not a late date. */
  it('misses roots when the comb is too coarse, which is why the step is required', () => {
    const tooCoarse = findRoots(sine(10), 0.5, 27, { stepDays: 9 });
    const fine = findRoots(sine(10), 0.5, 27, { stepDays: 1 });
    expect(tooCoarse.length).toBeLessThan(fine.length);
  });

  it('invents nothing on a function with no root', () => {
    expect(findRoots(() => 3, 0, 100, { stepDays: 1 })).toEqual([]);
    expect(findRoots(() => -3, 0, 100, { stepDays: 1 })).toEqual([]);
  });

  it('returns nothing for an empty or inverted window', () => {
    expect(findRoots(sine(10), 10, 10, { stepDays: 1 })).toEqual([]);
    expect(findRoots(sine(10), 20, 10, { stepDays: 1 })).toEqual([]);
    expect(findRoots(sine(10), 0, 10, { stepDays: 0 })).toEqual([]);
  });

  it('stops at the limit', () => {
    expect(findRoots(sine(10), 0.5, 100, { stepDays: 1, limit: 2 })).toHaveLength(2);
  });

  /*
   * Walked by index, not by `jd += step`. Over a decade at a quarter-day comb
   * that is 14,600 additions, and the accumulated float error exceeds the
   * bisection tolerance — the same bug found once already in scan.ts.
   */
  it('does not drift over a long walk', () => {
    const roots = findRoots(sine(10), 0, 3650, { stepDays: 0.25 });
    const last = roots[roots.length - 1]!.jdUt;
    expect(Math.abs(last - Math.round(last / 5) * 5)).toBeLessThan(1e-4);
    expect(roots).toHaveLength(730);
  });

  it('lands a root exactly at zero without bisecting', () => {
    const roots = findRoots((jd) => jd - 4, 0, 10, { stepDays: 1 });
    expect(roots).toHaveLength(1);
    expect(roots[0]!.jdUt).toBe(4);
  });
});

describe('nextRoot and previousRoot', () => {
  it('look the way they say they do', () => {
    expect(nextRoot(sine(10), 6, 30, { stepDays: 1 })).toBeCloseTo(10, 4);
    expect(previousRoot(sine(10), 6, 0, { stepDays: 1 })).toBeCloseTo(5, 4);
  });

  it('return null when the horizon holds nothing', () => {
    expect(nextRoot(() => 1, 0, 10, { stepDays: 1 })).toBeNull();
    expect(previousRoot(() => 1, 10, 0, { stepDays: 1 })).toBeNull();
  });

  /* The cheap path: asking for one costs one, not a window's worth. */
  it('cost one root, not all of them', () => {
    let calls = 0;
    const counted = (jd: number): number => {
      calls += 1;
      return sine(10)(jd);
    };
    nextRoot(counted, 0.5, 1000, { stepDays: 1 });
    expect(calls).toBeLessThan(60);
  });
});

describe('bisectRoot', () => {
  it('converges inside a bracket it is handed', () => {
    expect(bisectRoot((jd) => jd - 3.25, 0, 10, 1e-9)).toBeCloseTo(3.25, 7);
  });

  it('terminates on a function that does not converge', () => {
    /* No root in the bracket; it must return rather than spin. */
    const out = bisectRoot(() => 1, 0, 10, 1e-12);
    expect(Number.isFinite(out)).toBe(true);
  });
});

describe('findSteps', () => {
  /* A Moon-like angle at 12°/day crosses a 12° bucket once a day. */
  const bucket = (jd: number): number => Math.floor(((jd * 12) % 360) / 12);

  it('dates every bucket change', () => {
    const steps = findSteps(bucket, 0.1, 5.9, { stepDays: 0.1 });
    expect(steps.map((s) => Math.round(s.jdUt))).toEqual([1, 2, 3, 4, 5]);
  });

  /*
   * The bug this function exists for. Handing `findRoots` the signed distance
   * to the nearest boundary looks right and reports a spurious boundary
   * halfway through every bucket, because the sawtooth jumps from +half to
   * −half there and a root finder cannot tell a jump from a crossing.
   */
  it('does not report the half-bucket a signed distance would invent', () => {
    const sawtooth = (jd: number): number => {
      const into = (((jd * 12) % 12) + 12) % 12;
      return into > 6 ? into - 12 : into;
    };
    const wrong = findRoots(sawtooth, 0.1, 5.9, { stepDays: 0.1 });
    const right = findSteps(bucket, 0.1, 5.9, { stepDays: 0.1 });
    expect(wrong.length).toBeGreaterThan(right.length);
    expect(right).toHaveLength(5);
  });

  it('says which bucket it left and which it entered', () => {
    const steps = findSteps(bucket, 0.1, 2.9, { stepDays: 0.1 });
    expect(steps.map((s) => [s.from, s.to])).toEqual([
      [0, 1],
      [1, 2],
    ]);
  });

  it('converges to the tolerance', () => {
    const steps = findSteps(bucket, 0.1, 1.9, { stepDays: 0.1, toleranceDays: 1e-9 });
    expect(Math.abs(steps[0]!.jdUt - 1)).toBeLessThan(1e-7);
  });

  it('finds nothing in a bucket it never leaves', () => {
    expect(findSteps(() => 4, 0, 100, { stepDays: 1 })).toEqual([]);
    expect(findSteps(bucket, 5, 5, { stepDays: 0.1 })).toEqual([]);
  });

  it('stops at the limit', () => {
    expect(findSteps(bucket, 0.1, 9.9, { stepDays: 0.1, limit: 3 })).toHaveLength(3);
  });

  /* A comb coarser than a bucket steps over pairs of boundaries. */
  it('needs a comb finer than the bucket', () => {
    expect(findSteps(bucket, 0.1, 5.9, { stepDays: 2 }).length).toBeLessThan(5);
  });
});

describe('stepWindow', () => {
  const bucket = (jd: number): number => Math.floor(((jd * 12) % 360) / 12);

  it('bounds the bucket you are in', () => {
    const w = stepWindow(bucket, 2.5, 3, { stepDays: 0.1 });
    expect(w.fromJd).toBeCloseTo(2, 4);
    expect(w.toJd).toBeCloseTo(3, 4);
  });

  it('returns null past the horizon rather than guessing', () => {
    const w = stepWindow(() => 7, 2.5, 3, { stepDays: 0.1 });
    expect(w.fromJd).toBeNull();
    expect(w.toJd).toBeNull();
  });
});

describe('ONE_SECOND_DAYS', () => {
  it('is one second', () => {
    expect(ONE_SECOND_DAYS * 86400).toBeCloseTo(1, 12);
  });
});

import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import {
  ayanamsa,
  moonNakshatraIngresses,
  norm360,
  panchangaOf,
  panchangaWindows,
} from '../src/index.js';
import { jdFromCivil, jdTtFromJdUt } from '../src/time.js';

/**
 * Dating the pañcāṅga is the primitive the muhūrta half of the discipline
 * sits on, so the tests are about the properties a date has to have rather
 * than about one remembered number: the window must contain the instant it
 * was asked about, the limb inside it must not change, and the limb must
 * change the moment you step outside it.
 *
 * That last pair is the real check. It verifies the boundary against the
 * thing the boundary is supposed to describe — `panchangaOf`, which is pure
 * arithmetic on two longitudes and was verified separately — rather than
 * against a number somebody wrote down.
 */
const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = { ayanamsa: 'lahiri' } as const;

/** A fixed instant. Never a clock, so the same run gives the same answer. */
const WHEN = jdFromCivil(2026, 6, 14, 9, 20, 0, 0);
const SECOND = 1 / 86400;

/**
 * The pañcāṅga at an instant, derived the way a chart derives it.
 *
 * Sunrise is passed as null: the vāra is the only limb that needs it and no
 * test here reads the vāra. Everything else is two sidereal longitudes.
 */
function panchangaAt(jd: number) {
  const correction = ayanamsa(jdTtFromJdUt(jd), { mode: 'lahiri', includeNutation: true });
  const sun = norm360(provider.position('Sun', jd).longitude - correction);
  const moon = norm360(provider.position('Moon', jd).longitude - correction);
  return panchangaOf(sun, moon, jd, null);
}

const windows = panchangaWindows(provider, WHEN, frame);
const limbs = ['tithi', 'nakshatra', 'yoga', 'karana'] as const;

describe('every limb', () => {
  it('is bounded on both sides', () => {
    for (const limb of limbs) {
      expect(windows[limb].fromJd, limb).not.toBeNull();
      expect(windows[limb].toJd, limb).not.toBeNull();
    }
  });

  it('brackets the instant it was asked about', () => {
    for (const limb of limbs) {
      expect(windows[limb].fromJd!, limb).toBeLessThanOrEqual(WHEN);
      expect(windows[limb].toJd!, limb).toBeGreaterThanOrEqual(WHEN);
    }
  });

  it('reports an elapsed fraction consistent with the window', () => {
    for (const limb of limbs) {
      const { fromJd, toJd, elapsed } = windows[limb];
      const through = (WHEN - fromJd!) / (toJd! - fromJd!);
      /* Not equal: a limb's angular rate is not constant, so the fraction of
         the arc and the fraction of the time differ by a few percent. */
      expect(Math.abs(elapsed - through), limb).toBeLessThan(0.08);
      expect(elapsed, limb).toBeGreaterThanOrEqual(0);
      expect(elapsed, limb).toBeLessThan(1);
    }
  });
});

describe('the boundaries are where the limb actually changes', () => {
  const nameOf = {
    tithi: (jd: number) => panchangaAt(jd).tithi.index,
    nakshatra: (jd: number) => panchangaAt(jd).nakshatra.index,
    yoga: (jd: number) => panchangaAt(jd).yoga.index,
    karana: (jd: number) => panchangaAt(jd).karana.index,
  } as const;

  it('holds the same limb across the whole window', () => {
    for (const limb of limbs) {
      const { fromJd, toJd } = windows[limb];
      const at = nameOf[limb];
      const here = at(WHEN);
      /* Just inside each end, and the middle. */
      expect(at(fromJd! + SECOND), `${limb} at start`).toBe(here);
      expect(at((fromJd! + toJd!) / 2), `${limb} at middle`).toBe(here);
      expect(at(toJd! - SECOND), `${limb} at end`).toBe(here);
    }
  });

  it('shows a different limb a second outside each end', () => {
    for (const limb of limbs) {
      const { fromJd, toJd } = windows[limb];
      const at = nameOf[limb];
      const here = at(WHEN);
      expect(at(fromJd! - SECOND), `${limb} before start`).not.toBe(here);
      expect(at(toJd! + SECOND), `${limb} after end`).not.toBe(here);
    }
  });
});

describe('the limbs run at the rates the tradition says', () => {
  it('gives a tithi about a day and a karaṇa about half of one', () => {
    const tithi = windows.tithi.toJd! - windows.tithi.fromJd!;
    const karana = windows.karana.toJd! - windows.karana.fromJd!;
    /* A tithi runs roughly 19 to 26 hours depending on lunar speed. */
    expect(tithi).toBeGreaterThan(0.75);
    expect(tithi).toBeLessThan(1.15);
    expect(karana).toBeGreaterThan(tithi * 0.4);
    expect(karana).toBeLessThan(tithi * 0.6);
  });

  it('gives a nakṣatra about a day', () => {
    const nakshatra = windows.nakshatra.toJd! - windows.nakshatra.fromJd!;
    expect(nakshatra).toBeGreaterThan(0.85);
    expect(nakshatra).toBeLessThan(1.3);
  });
});

describe('moonNakshatraIngresses', () => {
  const ingresses = moonNakshatraIngresses(provider, WHEN, WHEN + 27.5, frame);

  /* The Moon crosses all 27 in a sidereal month, so a 27.5-day window holds
     26 or 27 of them depending where in a nakṣatra it starts. */
  it('finds a lunar month of them', () => {
    expect(ingresses.length).toBeGreaterThanOrEqual(26);
    expect(ingresses.length).toBeLessThanOrEqual(28);
  });

  it('walks them in order, wrapping once', () => {
    const wraps = ingresses.filter(
      (one, i) => i > 0 && one.nakshatraIndex !== (ingresses[i - 1]!.nakshatraIndex + 1) % 27,
    );
    expect(wraps).toEqual([]);
  });

  it('agrees with the pañcāṅga about which nakṣatra was entered', () => {
    for (const ingress of ingresses.slice(0, 5)) {
      /* Both are 0-based — `nakshatraOf` floors into 0–26. */
      expect(panchangaAt(ingress.jdUt + SECOND).nakshatra.index).toBe(ingress.nakshatraIndex);
    }
  });

  it('is in increasing time order', () => {
    for (let i = 1; i < ingresses.length; i += 1) {
      expect(ingresses[i]!.jdUt).toBeGreaterThan(ingresses[i - 1]!.jdUt);
    }
  });

  it('finds nothing in an empty window', () => {
    expect(moonNakshatraIngresses(provider, WHEN, WHEN, frame)).toEqual([]);
  });
});

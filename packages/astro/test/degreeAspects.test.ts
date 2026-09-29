import { describe, expect, it } from 'vitest';
import {
  ASPECTS,
  ASPECTS_BY_ID,
  aspectAngle,
  defaultAspectSettings,
  findAspects,
  separationOf,
  type AspectPoint,
  type AspectSettings,
} from '../src/index.js';

/**
 * The second aspect engine.
 *
 * Aspects are arithmetic on longitudes, so there is no reference implementation
 * to diff against and none is claimed. What can be checked is that the angles
 * are the angles the harmonics define, that an orb boundary is where the
 * setting says it is, and that applying and separating are decided by motion
 * rather than by assumption.
 */

const settings = (overrides: AspectSettings = {}): AspectSettings => ({
  ...defaultAspectSettings(),
  ...overrides,
});

const at = (id: string, longitude: number, speed?: number): AspectPoint =>
  speed === undefined ? { id, longitude } : { id, longitude, speed };

describe('the aspect set', () => {
  it('computes every angle from its harmonic', () => {
    expect(aspectAngle(ASPECTS_BY_ID.get('conjunction')!)).toBe(0);
    expect(aspectAngle(ASPECTS_BY_ID.get('sextile')!)).toBe(60);
    expect(aspectAngle(ASPECTS_BY_ID.get('square')!)).toBe(90);
    expect(aspectAngle(ASPECTS_BY_ID.get('trine')!)).toBe(120);
    expect(aspectAngle(ASPECTS_BY_ID.get('opposition')!)).toBe(180);
  });

  /*
   * The reason the angles are generated. 360/7 is 51°25′42.857″, and a table
   * typed by hand gets the seconds wrong sooner or later.
   */
  it('gets the septile family exact, to the second', () => {
    const septile = aspectAngle(ASPECTS_BY_ID.get('septile')!);
    expect(septile).toBeCloseTo(51.428571, 6);
    expect(Math.round(septile * 3600)).toBe(185143); // 51° 25′ 42.86″
    expect(aspectAngle(ASPECTS_BY_ID.get('bi-septile')!)).toBeCloseTo(102.857143, 6);
    expect(aspectAngle(ASPECTS_BY_ID.get('tri-septile')!)).toBeCloseTo(154.285714, 6);
  });

  it('never names an angle outside the half circle, or a reducible one', () => {
    for (const definition of ASPECTS) {
      const angle = aspectAngle(definition);
      expect(angle, definition.id).toBeGreaterThanOrEqual(0);
      expect(angle, definition.id).toBeLessThanOrEqual(180);
      /* A reducible (n, k) is another aspect under a second name. */
      const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
      if (definition.multiple > 0) {
        expect(gcd(definition.harmonic, definition.multiple), definition.id).toBe(1);
      }
    }
  });

  it('has unique ids and unique angles', () => {
    const ids = ASPECTS.map((one) => one.id);
    expect(new Set(ids).size).toBe(ids.length);
    const angles = ASPECTS.map((one) => aspectAngle(one).toFixed(6));
    expect(new Set(angles).size).toBe(angles.length);
  });

  it('starts with the five majors on and every minor off', () => {
    const start = defaultAspectSettings();
    const on = ASPECTS.filter((one) => start[one.id]?.on);
    expect(on.map((one) => one.id).sort()).toEqual([
      'conjunction',
      'opposition',
      'sextile',
      'square',
      'trine',
    ]);
    expect(on.every((one) => one.type === 'major')).toBe(true);
  });
});

describe('measuring a pair', () => {
  it('folds the long way round into the short way', () => {
    expect(separationOf(10, 100)).toBe(90);
    expect(separationOf(100, 10)).toBe(90);
    expect(separationOf(350, 10)).toBe(20);
    expect(separationOf(0, 180)).toBe(180);
    expect(separationOf(0, 181)).toBe(179);
  });
});

describe('finding aspects in one chart', () => {
  it('finds an exact trine', () => {
    const found = findAspects([[at('Sun', 10), at('Jupiter', 130)]]);
    expect(found).toHaveLength(1);
    expect(found[0]!.aspect).toBe('trine');
    expect(found[0]!.orb).toBeCloseTo(0, 9);
    expect(found[0]!.quality).toBe('soft');
  });

  it('respects the orb boundary exactly', () => {
    const inside = findAspects([[at('Sun', 0), at('Mars', 93.9)]]);
    const outside = findAspects([[at('Sun', 0), at('Mars', 94.1)]]);
    expect(inside.map((one) => one.aspect)).toEqual(['square']);
    expect(outside).toEqual([]);
  });

  it('stops reporting an aspect that is switched off', () => {
    const off = settings({ sextile: { on: false, applying: 4, separating: 4 } });
    expect(findAspects([[at('Sun', 0), at('Venus', 60)]], off)).toEqual([]);
    expect(findAspects([[at('Sun', 0), at('Venus', 60)]])).toHaveLength(1);
  });

  it('brings a minor in only when it is turned on', () => {
    const points = [[at('Sun', 0), at('Mars', 150)]];
    expect(findAspects(points)).toEqual([]);
    const on = settings({ quincunx: { on: true, applying: 2, separating: 1.5 } });
    expect(findAspects(points, on).map((one) => one.aspect)).toEqual(['quincunx']);
  });

  /*
   * Two aspects can both be in orb where the angles are close and the orbs are
   * wide. The one being read is the tighter one.
   */
  it('keeps the tighter of two overlapping aspects', () => {
    const wide = settings({
      'semi-sextile': { on: true, applying: 5, separating: 5 },
      decile: { on: true, applying: 5, separating: 5 },
    });
    const found = findAspects([[at('Sun', 0), at('Moon', 35)]], wide);
    expect(found).toHaveLength(1);
    expect(found[0]!.aspect).toBe('decile'); // 36° is 1° away; 30° is 5°
  });

  it('counts a pair once inside one ring', () => {
    const found = findAspects([[at('Sun', 0), at('Moon', 120), at('Mars', 240)]]);
    expect(found).toHaveLength(3); // three pairs, not six
  });

  it('sorts tightest first', () => {
    const found = findAspects([[at('Sun', 0), at('Moon', 120), at('Mars', 62)]]);
    const orbs = found.map((one) => one.orb);
    expect([...orbs].sort((a, b) => a - b)).toEqual(orbs);
  });
});

describe('applying and separating', () => {
  /* A faster body behind a slower one is closing on the aspect. */
  it('reads a closing pair as applying', () => {
    const found = findAspects([[at('Moon', 57, 13.2), at('Saturn', 0, 0.03)]]);
    expect(found[0]!.aspect).toBe('sextile');
    expect(found[0]!.applying).toBe(true);
    expect(found[0]!.directionKnown).toBe(true);
  });

  it('reads a widening pair as separating', () => {
    const found = findAspects([[at('Moon', 63, 13.2), at('Saturn', 0, 0.03)]]);
    expect(found[0]!.applying).toBe(false);
  });

  it('uses the applying orb when applying and the separating orb when not', () => {
    const tight = settings({ square: { on: true, applying: 5, separating: 1 } });
    /* 3° from exact: inside the 5° applying orb, outside the 1° separating one. */
    const applying = findAspects([[at('Moon', 87, 13.2), at('Sun', 0, 1)]], tight);
    const separating = findAspects([[at('Moon', 93, 13.2), at('Sun', 0, 1)]], tight);
    expect(applying.map((one) => one.aspect)).toEqual(['square']);
    expect(separating).toEqual([]);
  });

  /*
   * With no speed the direction cannot be decided, so the wider orb is used
   * and nothing is claimed. Guessing would be worse than declining.
   */
  it('declines to guess a direction, and widens rather than misses', () => {
    const tight = settings({ square: { on: true, applying: 5, separating: 1 } });
    const found = findAspects([[at('Moon', 93), at('Sun', 0)]], tight);
    expect(found).toHaveLength(1);
    expect(found[0]!.directionKnown).toBe(false);
    expect(found[0]!.applying).toBe(false);
  });

  /*
   * The pair straddles 0° Aries, so the separation is measured the long way
   * round and the rate of change has to flip sign with it. Get this wrong and
   * every aspect across the start of the zodiac reports the opposite direction.
   */
  it('handles a pair measured across the start of the zodiac', () => {
    const passed = findAspects([[at('Moon', 1, 13.2), at('Sun', 358, 1)]]);
    expect(passed[0]!.aspect).toBe('conjunction');
    expect(passed[0]!.separation).toBeCloseTo(3, 9);
    expect(passed[0]!.applying).toBe(false); // the Moon is pulling ahead

    const approaching = findAspects([[at('Moon', 356, 13.2), at('Sun', 359, 1)]]);
    expect(approaching[0]!.applying).toBe(true); // still closing on it
  });
});

describe('across rings, which is what synastry is', () => {
  const her = [at('Sun', 10), at('Moon', 200)];
  const him = [at('Sun', 130), at('Moon', 40)];

  it('finds the lines crossing between two charts', () => {
    const found = findAspects([her, him]);
    const crossing = found.filter((one) => one.fromRing !== one.toRing);
    expect(crossing.length).toBeGreaterThan(0);
    expect(crossing.some((one) => one.aspect === 'trine')).toBe(true);
  });

  it('says which ring each end is on', () => {
    for (const aspect of findAspects([her, him])) {
      expect(aspect.fromRing).toBeLessThanOrEqual(aspect.toRing);
      expect([0, 1]).toContain(aspect.fromRing);
    }
  });

  it('counts every pair across rings, including same-named points', () => {
    const found = findAspects([[at('Sun', 0)], [at('Sun', 120)]]);
    expect(found).toHaveLength(1);
    expect(found[0]!.from).toBe('Sun');
    expect(found[0]!.to).toBe('Sun');
    expect(found[0]!.fromRing).toBe(0);
    expect(found[0]!.toRing).toBe(1);
  });

  it('still finds each chart’s own aspects alongside the crossing ones', () => {
    const found = findAspects([her, him]);
    expect(found.some((one) => one.fromRing === one.toRing)).toBe(true);
  });

  it('returns nothing for an empty stack', () => {
    expect(findAspects([])).toEqual([]);
    expect(findAspects([[]])).toEqual([]);
  });
});

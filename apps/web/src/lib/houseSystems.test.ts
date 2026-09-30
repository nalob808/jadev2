import { describe, expect, it } from 'vitest';
import { IMPLEMENTED_HOUSE_SYSTEMS, wholeSignCusps, type HouseSystem } from '@jade/astro';
import {
  HOUSE_SYSTEM_CUSP_FRAMES,
  HOUSE_SYSTEM_HINTS,
  HOUSE_SYSTEM_LABELS,
  bhavaOverlayFor,
} from './houseSystems';

describe('every house system Jade offers is described', () => {
  for (const system of IMPLEMENTED_HOUSE_SYSTEMS) {
    it(`${system} has a label, a hint and a cusp frame`, () => {
      expect(HOUSE_SYSTEM_LABELS[system]).toBeTruthy();
      expect(HOUSE_SYSTEM_HINTS[system].length).toBeGreaterThan(40);
      expect(HOUSE_SYSTEM_CUSP_FRAMES[system]).toBeTruthy();
    });
  }
});

describe('the bhāva overlay', () => {
  const ASC = 215.4;
  const MC = 128.9;

  /*
   * The case the overlay exists for. Drawing whole-sign cusps over a whole-sign
   * chart is twelve lines that say nothing; Śrīpati beside it is the comparison
   * a Jyotiṣī actually makes.
   */
  it('offers Śrīpati beside a whole-sign chart', () => {
    const overlay = bhavaOverlayFor('whole_sign', ASC, MC);

    expect(overlay).not.toBeNull();
    expect(overlay!.cusps).toHaveLength(12);
    expect(overlay!.cusps).not.toEqual(wholeSignCusps(ASC));
    expect(overlay!.label).toContain('Śrīpati');
  });

  /*
   * And nowhere else. The chart's own cusps are drawn with their own numbers in
   * every other system, so a dashed copy would be the same twelve digits twice.
   */
  it('offers nothing where the chart already draws its own cusps', () => {
    for (const system of ['equal', 'sripati', 'placidus'] as HouseSystem[]) {
      expect(bhavaOverlayFor(system, ASC, MC), system).toBeNull();
    }
  });
});

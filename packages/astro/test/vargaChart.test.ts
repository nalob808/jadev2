import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { buildVargaChart } from '../src/vargaChart.js';
import { VARGA_IDS } from '../src/vargas.js';

// The reference chart the whole suite is pinned to: 7 Nov 2001, Ann Arbor.
const chart = computeChart(new AstronomyEngineProvider(), {
  jdUt: 2452221.1472222223,
  location: { latitude: 42.2808, longitude: -83.743 },
});

describe('varga projection', () => {
  it('D1 house 1 is the ascendant sign', () => {
    const d1 = buildVargaChart(chart, 'D1');
    expect(d1.ascendantSign).toBe(chart.points.Ascendant!.signIndex);
    expect(d1.byHouse[0]).toContain('Ascendant');
  });

  it('every varga re-seats house 1 on its OWN ascendant sign', () => {
    // The mistake this guards against: drawing a D9 grid that keeps the D1
    // ascendant. It looks plausible and is not a navāṁśa.
    for (const vargaId of VARGA_IDS) {
      const varga = buildVargaChart(chart, vargaId);
      expect(varga.ascendantSign).toBe(chart.vargas.Ascendant![vargaId]);
      expect(varga.byHouse[0], `${vargaId} house 1`).toContain('Ascendant');
    }
  });

  it('the D9 ascendant genuinely differs from the D1 one for this chart', () => {
    const d1 = buildVargaChart(chart, 'D1');
    const d9 = buildVargaChart(chart, 'D9');
    expect(d9.ascendantSign).not.toBe(d1.ascendantSign);
  });

  it('places every graha exactly once, in every varga', () => {
    for (const vargaId of VARGA_IDS) {
      const varga = buildVargaChart(chart, vargaId);
      const fromSigns = varga.bySign.flat();
      const fromHouses = varga.byHouse.flat();
      expect(fromSigns.length, `${vargaId} bySign`).toBe(varga.placements.length);
      expect(fromHouses.length, `${vargaId} byHouse`).toBe(varga.placements.length);
      expect(new Set(fromSigns).size).toBe(fromSigns.length);
      expect([...fromSigns].sort()).toEqual([...fromHouses].sort());
    }
  });

  it('drops the Midheaven, which has no varga position', () => {
    const d9 = buildVargaChart(chart, 'D9');
    expect(d9.placements.map((p) => p.pointId)).not.toContain('Midheaven');
    expect(d9.placements.map((p) => p.pointId)).toContain('Ascendant');
    expect(d9.placements.map((p) => p.pointId)).toContain('Rahu');
  });

  it('houses and signs stay consistent: house = sign offset from the lagna', () => {
    const d10 = buildVargaChart(chart, 'D10');
    for (const placement of d10.placements) {
      expect(placement.house).toBe(((placement.signIndex - d10.ascendantSign + 12) % 12) + 1);
      expect(placement.house).toBeGreaterThanOrEqual(1);
      expect(placement.house).toBeLessThanOrEqual(12);
    }
  });

  it('only D1 carries degrees — a varga sign has no degree', () => {
    expect(buildVargaChart(chart, 'D1').placements[0]!.degreesInSign).not.toBeNull();
    expect(buildVargaChart(chart, 'D9').placements[0]!.degreesInSign).toBeNull();
  });
});

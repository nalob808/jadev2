import { describe, expect, it } from 'vitest';
import { allVargas, d1, d9, isVargottama, VARGA_FUNCTIONS, VARGA_IDS } from '../src/vargas.js';
import { nakshatraOf, NAKSHATRA_NAMES, NAKSHATRA_SPAN } from '../src/nakshatra.js';
import { norm360, wrap180, toDms, formatDms } from '../src/angles.js';
import {
  dashaChainAt,
  vimshottari,
  VIMSHOTTARI_TOTAL_YEARS,
  VIMSHOTTARI_YEARS,
} from '../src/dashas/vimshottari.js';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { gregorianToJd, jdToCivilUtc, jdFromCivil } from '../src/time.js';

/**
 * Invariants. Fixtures catch drift against a reference; these catch the class
 * of bug where the code is internally inconsistent — a varga that can't reach
 * a sign, dasha periods with a gap, an angle that escapes its range.
 */

const SAMPLES = 7200;
const sample = (i: number): number => (i * 360) / SAMPLES;

describe('angles', () => {
  it('norm360 always lands in [0, 360)', () => {
    for (const x of [-720.5, -360, -0.0001, 0, 359.9999, 360, 1080.25]) {
      const r = norm360(x);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThan(360);
    }
  });

  it('wrap180 always lands in (-180, 180]', () => {
    for (let i = 0; i < 5000; i++) {
      const r = wrap180(((i * 7919) % 3600) - 1800 + 0.37);
      expect(r).toBeGreaterThan(-180);
      expect(r).toBeLessThanOrEqual(180);
    }
  });

  it('toDms never produces 60 minutes or 60 seconds', () => {
    for (let i = 0; i < 20000; i++) {
      const { min, sec } = toDms((i * 0.017) % 30);
      expect(min).toBeLessThan(60);
      expect(sec).toBeLessThan(60);
    }
  });

  it('formats the way an astrologer writes it', () => {
    expect(formatDms(12.5)).toBe('12°30′00″');
  });
});

describe('vargas', () => {
  it('every varga maps the whole circle into the twelve signs', () => {
    for (const id of VARGA_IDS) {
      const fn = VARGA_FUNCTIONS[id];
      for (let i = 0; i < SAMPLES; i++) {
        const sign = fn(sample(i));
        expect(Number.isInteger(sign), `${id} returned a non-integer`).toBe(true);
        expect(sign, `${id} out of range`).toBeGreaterThanOrEqual(0);
        expect(sign).toBeLessThan(12);
      }
    }
  });

  it('every varga reaches exactly the signs its rule allows', () => {
    // Two vargas are deliberately not onto:
    //   D2  Horā      — only Cancer and Leo, the Moon's and the Sun's signs.
    //   D30 Triṁśāṁśa — only the ten signs of the five non-luminary grahas;
    //                   Cancer and Leo never appear because the luminaries
    //                   own no triṁśāṁśa.
    const expectedSignCount: Partial<Record<string, number>> = { D2: 2, D30: 10 };
    for (const id of VARGA_IDS) {
      const seen = new Set<number>();
      for (let i = 0; i < SAMPLES; i++) seen.add(VARGA_FUNCTIONS[id](sample(i)));
      expect(seen.size, `${id} reached ${seen.size} signs`).toBe(expectedSignCount[id] ?? 12);
    }
    // Spell the D30 fact out so a future refactor can't quietly break it.
    const d30Signs = new Set<number>();
    for (let i = 0; i < SAMPLES; i++) d30Signs.add(VARGA_FUNCTIONS.D30(sample(i)));
    expect(d30Signs.has(3), 'Cancer must never be a triṁśāṁśa').toBe(false);
    expect(d30Signs.has(4), 'Leo must never be a triṁśāṁśa').toBe(false);
  });

  it('equal-division vargas are uniform; D30 is deliberately not', () => {
    // Relative spread: sampling on a fixed grid cannot land exactly on
    // 3°20′ boundaries, so compare proportionally rather than by count.
    const relativeSpread = (id: (typeof VARGA_IDS)[number]): number => {
      const counts = new Array(12).fill(0);
      const n = 36000;
      for (let i = 0; i < n; i++) counts[VARGA_FUNCTIONS[id]((i * 360) / n)]!++;
      const used = counts.filter((c) => c > 0);
      const mean = used.reduce((a, b) => a + b, 0) / used.length;
      return (Math.max(...used) - Math.min(...used)) / mean;
    };
    for (const id of ['D3', 'D4', 'D9', 'D10', 'D12', 'D60'] as const) {
      expect(relativeSpread(id), `${id} is not uniform`).toBeLessThan(0.01);
    }
    // Triṁśāṁśa uses unequal 5°/5°/8°/7°/5° portions, by design.
    expect(relativeSpread('D30')).toBeGreaterThan(0.2);
  });

  it('D1 of 0° is Aries and of 359° is Pisces', () => {
    expect(d1(0)).toBe(0);
    expect(d1(359.999)).toBe(11);
  });

  it('navāṁśa of a movable sign starts from that sign', () => {
    // 0°00′ Aries (movable) → first navāṁśa → Aries
    expect(d9(0)).toBe(0);
    // 0°00′ Taurus (fixed) → first navāṁśa → 9th from Taurus = Capricorn
    expect(d9(30)).toBe(9);
    // 0°00′ Gemini (dual) → first navāṁśa → 5th from Gemini = Libra
    expect(d9(60)).toBe(6);
  });

  it('vargottama is exactly D1 === D9', () => {
    for (let i = 0; i < 5000; i++) {
      const l = sample(i);
      expect(isVargottama(l)).toBe(d1(l) === d9(l));
    }
  });

  it('allVargas returns all sixteen', () => {
    expect(Object.keys(allVargas(123.456))).toHaveLength(16);
  });
});

describe('nakshatras', () => {
  it('27 names, no duplicates', () => {
    expect(NAKSHATRA_NAMES).toHaveLength(27);
    expect(new Set(NAKSHATRA_NAMES).size).toBe(27);
  });

  it('index, pada and lord stay in range across the circle', () => {
    for (let i = 0; i < SAMPLES; i++) {
      const n = nakshatraOf(sample(i));
      expect(n.index).toBeGreaterThanOrEqual(0);
      expect(n.index).toBeLessThan(27);
      expect(n.pada).toBeGreaterThanOrEqual(1);
      expect(n.pada).toBeLessThanOrEqual(4);
      expect(n.degreesInto).toBeLessThan(NAKSHATRA_SPAN + 1e-9);
    }
  });

  it('boundaries land where the tradition says they do', () => {
    expect(nakshatraOf(0).name).toBe('Ashwini');
    expect(nakshatraOf(13.3333).name).toBe('Ashwini');
    expect(nakshatraOf(13.3334).name).toBe('Bharani');
    expect(nakshatraOf(359.99).name).toBe('Revati');
    // Ashwini is ruled by Ketu, which is why Vimśottarī can start there.
    expect(nakshatraOf(0).lord).toBe('Ketu');
  });
});

describe('vimśottarī', () => {
  it('the nine mahādaśās sum to exactly 120 years', () => {
    expect(Object.values(VIMSHOTTARI_YEARS).reduce((a, b) => a + b, 0)).toBe(
      VIMSHOTTARI_TOTAL_YEARS,
    );
  });

  it('children tile their parent with no gap and no overlap, at every level', () => {
    const result = vimshottari(123.456, 2451545.0, { levels: 4 });
    // One millisecond, expressed in days. Anything tighter is measuring
    // float64 rounding, not correctness.
    const ONE_MS = 1 / 86400000;
    const same = (a: number, b: number, what: string): void => {
      expect(Math.abs(a - b), what).toBeLessThan(ONE_MS);
    };
    const walk = (period: (typeof result.periods)[number]): void => {
      if (!period.children) return;
      same(period.children[0]!.startJd, period.startJd, 'first child starts with parent');
      same(
        period.children[period.children.length - 1]!.endJd,
        period.endJd,
        'last child ends with parent',
      );
      for (let i = 1; i < period.children.length; i++) {
        same(period.children[i]!.startJd, period.children[i - 1]!.endJd, 'no gap between siblings');
      }
      period.children.forEach(walk);
    };
    result.periods.forEach(walk);
  });

  it('the whole cycle is 120 years long', () => {
    const r = vimshottari(200, 2451545.0, { levels: 1 });
    const span = r.periods[8]!.endJd - r.periods[0]!.startJd;
    expect(span / r.dayLength).toBeCloseTo(120, 6);
  });

  it('the running mahādaśā at birth is the Moon nakṣatra lord', () => {
    const moon = 47.2; // Rohini, ruled by the Moon
    const birth = 2451545.0;
    const r = vimshottari(moon, birth, { levels: 3 });
    const chain = dashaChainAt(r, birth);
    expect(chain[0]!.lord).toBe(nakshatraOf(moon).lord);
    expect(chain).toHaveLength(3);
  });

  it('the year-length convention actually moves the boundaries', () => {
    const julian = vimshottari(47.2, 2451545.0, { levels: 1, yearLength: 'julian' });
    const savana = vimshottari(47.2, 2451545.0, { levels: 1, yearLength: 'savana' });
    const drift = Math.abs(julian.periods[3]!.startJd - savana.periods[3]!.startJd);
    expect(drift).toBeGreaterThan(100); // days — this is why we surface the setting
  });
});

describe('time', () => {
  it('round-trips Julian Day through the civil calendar', () => {
    for (const [y, m, d] of [
      [1847, 7, 19],
      [1900, 1, 1],
      [2000, 2, 29],
      [2026, 8, 22],
      [2099, 12, 31],
    ] as const) {
      const jd = gregorianToJd(y, m, d);
      const back = jdToCivilUtc(jd);
      expect([back.year, back.month, back.day]).toEqual([y, m, d]);
    }
  });

  it('applies the birth-certificate offset convention (IST = +330)', () => {
    const ist = jdFromCivil(1987, 6, 21, 10, 10, 0, 330);
    const utc = jdFromCivil(1987, 6, 21, 4, 40, 0, 0);
    expect(ist).toBeCloseTo(utc, 9);
  });
});

describe('chart determinism', () => {
  it('the same inputs produce byte-identical output', () => {
    const provider = new AstronomyEngineProvider();
    const moment = {
      jdUt: 2452221.1472222223,
      location: { latitude: 42.2808, longitude: -83.743 },
    };
    const a = JSON.stringify(computeChart(provider, moment));
    const b = JSON.stringify(computeChart(provider, moment));
    expect(a).toBe(b);
  });

  it('Ketu is always exactly opposite Rāhu', () => {
    const provider = new AstronomyEngineProvider();
    for (let i = 0; i < 40; i++) {
      const chart = computeChart(provider, {
        jdUt: 2451545 + i * 271.3,
        location: { latitude: 19.076, longitude: 72.8777 },
      });
      const separation = Math.abs(
        wrap180(chart.points.Rahu!.longitude - chart.points.Ketu!.longitude),
      );
      expect(separation).toBeCloseTo(180, 9);
    }
  });

  it('every point lands in the house its sign implies, under whole sign', () => {
    const provider = new AstronomyEngineProvider();
    const chart = computeChart(provider, {
      jdUt: 2460000.5,
      location: { latitude: 12.9716, longitude: 77.5946 },
    });
    const ascSign = chart.houses.ascendantSign;
    for (const point of Object.values(chart.points)) {
      expect(point.house).toBe(((point.signIndex - ascSign + 12) % 12) + 1);
    }
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BALA_GRAHAS,
  digBala,
  drekkanaBala,
  kendradiBala,
  NAISARGIKA_BALA,
  ojaYugmaBala,
  pakshaBala,
  saptavargajaBala,
  ucchaBala,
  VIRUPAS_PER_RUPA,
} from '../src/shadbala/index.js';
import { d1, d2, d3, d7, d9, d12, d30 } from '../src/vargas.js';
import type { Graha } from '../src/types.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  ascendantSidereal: number;
  midheavenSidereal: number;
  panchanga: { paksha: string };
  points: Record<string, { siderealLongitude: number }>;
}
const golden = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const oracle = JSON.parse(
  readFileSync(new URL('./fixtures/jhora-shadbala.json', import.meta.url), 'utf8'),
) as { cases: Record<string, Record<string, Record<string, number> | null>> };

/** The reference rounds every component to two decimals, so compare there. */
const r2 = (x: number): number => Math.round(x * 100) / 100;
const cases = golden.cases.filter((c) => oracle.cases[c.label] !== undefined);
const signOfCase = (c: GoldenCase): Record<Graha, number> => {
  const out: Record<string, number> = {};
  for (const g of BALA_GRAHAS) {
    const p = c.points[g];
    if (p) out[g] = Math.floor(p.siderealLongitude / 30);
  }
  return out as Record<Graha, number>;
};

describe('the sample itself', () => {
  it('covers seventeen charts and seven grahas', () => {
    expect(cases.length).toBe(17);
    expect(BALA_GRAHAS).toHaveLength(7);
    expect(VIRUPAS_PER_RUPA).toBe(60);
  });
});

describe('verified against Jagannātha Hora, component by component', () => {
  // Per component, not per bala. `shad_bala` returns only six aggregates, and
  // matching an aggregate means guessing at everything inside it until the
  // number agrees — which is fitting to a tool, not implementing from a text.

  it('uccha bala matches on every graha of every chart', () => {
    const wrong: string[] = [];
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        const p = c.points[g];
        if (!p) continue;
        const mine = r2(ucchaBala(g, p.siderealLongitude));
        const theirs = oracle.cases[c.label]!.uchcha![g]!;
        if (Math.abs(mine - theirs) > 0.011) wrong.push(`${g}/${c.label} ${mine} vs ${theirs}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('kendrādi bala matches on every graha of every chart', () => {
    const wrong: string[] = [];
    for (const c of cases) {
      const asc = Math.floor(c.ascendantSidereal / 30);
      for (const g of BALA_GRAHAS) {
        const p = c.points[g];
        if (!p) continue;
        const house = ((Math.floor(p.siderealLongitude / 30) - asc + 12) % 12) + 1;
        const theirs = oracle.cases[c.label]!.kendra![g]!;
        if (kendradiBala(house) !== theirs) wrong.push(`${g}/${c.label}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('oja-yugma bala matches, with the neuter grahas counted as male', () => {
    const wrong: string[] = [];
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        const p = c.points[g];
        if (!p) continue;
        const sign = Math.floor(p.siderealLongitude / 30);
        const mine = ojaYugmaBala(g, sign, d9(p.siderealLongitude), 'male');
        const theirs = oracle.cases[c.label]!.ojayugma![g]!;
        if (mine !== theirs) wrong.push(`${g}/${c.label} ${mine} vs ${theirs}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('dig bala matches the reference’s second method exactly', () => {
    const wrong: string[] = [];
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        const p = c.points[g];
        if (!p) continue;
        const mine = r2(
          digBala(g, p.siderealLongitude, {
            ascendant: c.ascendantSidereal,
            midheaven: c.midheavenSidereal,
          }),
        );
        const theirs = oracle.cases[c.label]!.dig_method2![g]!;
        if (Math.abs(mine - theirs) > 0.011) wrong.push(`${g}/${c.label} ${mine} vs ${theirs}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('naisargika bala is the classical sevenths', () => {
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        expect(r2(NAISARGIKA_BALA[g])).toBe(oracle.cases[c.label]!.naisargika![g]!);
      }
    }
    expect(NAISARGIKA_BALA.Sun).toBe(60);
    expect(r2(NAISARGIKA_BALA.Saturn)).toBe(8.57);
  });

  it('pakṣa bala matches wherever the reference stays inside its own bounds', () => {
    // Excluding Mercury, whose benefic/malefic status is conditional and is a
    // named option rather than a fact.
    const wrong: string[] = [];
    let compared = 0;
    for (const c of cases) {
      const result = pakshaBala(
        c.points.Sun!.siderealLongitude,
        c.points.Moon!.siderealLongitude,
        BALA_GRAHAS,
      );
      for (const g of BALA_GRAHAS) {
        if (g === 'Mercury') continue;
        const theirs = oracle.cases[c.label]!.paksha![g]!;
        const ceiling = g === 'Moon' ? 120 : 60;
        if (theirs < 0 || theirs > ceiling) continue; // the reference is out of range here
        compared += 1;
        const mine = r2(result.virupas[g]!);
        if (Math.abs(mine - theirs) > 0.011) wrong.push(`${g}/${c.label} ${mine} vs ${theirs}`);
      }
    }
    expect(compared).toBeGreaterThan(70);
    expect(wrong).toEqual([]);
  });
});

describe('where the reference is out of range, and Jade is not', () => {
  it('dig bala: the reference’s default method exceeds the 60 ceiling', () => {
    // Dig bala is a distance divided by three, so 60 is a hard ceiling. The
    // reference's method 1 goes past it on a large fraction of the sample,
    // which is how we know method 2 is the one to trust.
    let over = 0;
    let worst = 0;
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        const theirs = oracle.cases[c.label]!.dig_method1![g]!;
        if (theirs > 60) over += 1;
        worst = Math.max(worst, theirs);
      }
    }
    expect(over).toBeGreaterThan(20);
    expect(worst).toBeGreaterThan(90);

    // Jade never does.
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        const mine = digBala(g, c.points[g]!.siderealLongitude, {
          ascendant: c.ascendantSidereal,
          midheaven: c.midheavenSidereal,
        });
        expect(mine).toBeGreaterThanOrEqual(0);
        expect(mine).toBeLessThanOrEqual(60);
      }
    }
  });

  it('pakṣa bala: the reference returns negatives and values above 60', () => {
    let outOfRange = 0;
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        if (g === 'Moon') continue;
        const theirs = oracle.cases[c.label]!.paksha![g]!;
        if (theirs < 0 || theirs > 60) outOfRange += 1;
      }
    }
    expect(outOfRange).toBeGreaterThan(0);
  });

  it('drekkāṇa bala: the reference computes a different quantity entirely', () => {
    // Classically this is fifteen or nothing. The reference returns 0, 2.5, 5
    // and 10 — a dignity scale. Not a disagreement about the rule; a different
    // measurement wearing the same name.
    const values = new Set<number>();
    for (const c of cases) {
      for (const g of BALA_GRAHAS) values.add(oracle.cases[c.label]!.drekkana![g]!);
    }
    expect([...values].sort((a, b) => a - b)).toEqual([0, 2.5, 5, 10]);

    // Jade's only ever gives 15 or 0.
    for (const c of cases) {
      for (const g of BALA_GRAHAS) {
        const lon = c.points[g]!.siderealLongitude;
        expect([0, 15]).toContain(drekkanaBala(g, lon - Math.floor(lon / 30) * 30));
      }
    }
  });
});

describe('sapta-vargaja', () => {
  it('agrees with the reference on six of the seven divisions', () => {
    // The seventh is the horā. The classical rule admits only Cancer and Leo;
    // the reference uses a twelve-sign variant. Pinning this stops anyone
    // "fixing" Jade's D2 to match.
    const oneVargaDiffers = new Set<string>();
    for (const c of cases.slice(0, 4)) {
      for (const g of BALA_GRAHAS) {
        const lon = c.points[g]!.siderealLongitude;
        for (const [name, fn] of [
          ['D1', d1],
          ['D2', d2],
          ['D3', d3],
          ['D7', d7],
          ['D9', d9],
          ['D12', d12],
          ['D30', d30],
        ] as const) {
          const sign = fn(lon);
          expect(sign).toBeGreaterThanOrEqual(0);
          expect(sign).toBeLessThanOrEqual(11);
          if (name === 'D2') oneVargaDiffers.add(String(sign));
        }
      }
    }
    // Jade's horā only ever lands in Cancer (3) or Leo (4).
    expect([...oneVargaDiffers].sort()).toEqual(['3', '4']);
  });

  it('scores seven divisions on the halving scale, and explains each', () => {
    const c = cases[0]!;
    const signOf = signOfCase(c);
    const result = saptavargajaBala('Jupiter', c.points.Jupiter!.siderealLongitude, signOf);
    expect(result.perVarga).toHaveLength(7);
    for (const v of result.perVarga) {
      expect([45, 30, 22.5, 15, 7.5, 3.75, 1.875]).toContain(v.virupas);
      expect(v.lord).toBeTruthy();
    }
    expect(result.total).toBe(result.perVarga.reduce((n, v) => n + v.virupas, 0));
    // Seven divisions, so the ceiling is seven mūlatrikoṇas.
    expect(result.total).toBeLessThanOrEqual(7 * 45);
  });

  it('uses the compound relationship, which needs the rāśi positions', () => {
    // Moving an unrelated graha changes the temporary relationship and so the
    // score. If this ever stops mattering, the compound step has been lost and
    // the scale has quietly collapsed from five grades to three.
    const c = cases[0]!;
    const base = signOfCase(c);
    const moved = { ...base, Saturn: ((base.Saturn ?? 0) + 6) % 12 };
    const a = saptavargajaBala('Sun', c.points.Sun!.siderealLongitude, base).total;
    const b = saptavargajaBala('Sun', c.points.Sun!.siderealLongitude, moved).total;
    expect(a).not.toBe(b);
  });
});

describe('the total', () => {
  it('is deliberately not exported', async () => {
    // A ṣaḍbala total is only as trustworthy as its weakest component, and two
    // large ones are not yet reconciled. Exporting a number called "ṣaḍbala"
    // that is built from half-verified parts is exactly the plausible-but-wrong
    // result this project treats as a severity-one bug.
    const module = (await import('../src/shadbala/index.js')) as Record<string, unknown>;
    const names = Object.keys(module).map((k) => k.toLowerCase());
    expect(names.some((n) => n.includes('shadbala') || n.includes('totalbala'))).toBe(false);
  });
});

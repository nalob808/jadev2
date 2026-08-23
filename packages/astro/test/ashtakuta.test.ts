import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ashtakuta,
  KUTA_MAXIMA,
  KUTAS,
  maitriScore,
  NADI_OF_NAKSHATRA,
  padaIndex,
  rashiOf,
  TOTAL_POINTS,
  YONI_OF_NAKSHATRA,
  type Kuta,
  type MatchSubject,
} from '../src/relations/ashtakuta.js';

const oracle = JSON.parse(
  readFileSync(new URL('./fixtures/jhora-ashtakuta.json', import.meta.url), 'utf8'),
) as { kutas: Record<string, string[]>; states: number };

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';
const decode = (ch: string): number => DIGITS.indexOf(ch) / 2;
const stateOf = (i: number): MatchSubject => ({ nakshatra: Math.floor(i / 4), pada: (i % 4) + 1 });

/** Every kūṭa's score across all 11,664 pairings, as Jade computes it. */
function sweep(kuta: Kuta): { mismatches: number; total: number } {
  let mismatches = 0;
  let total = 0;
  for (let i = 0; i < 108; i += 1) {
    for (let j = 0; j < 108; j += 1) {
      const mine = ashtakuta(stateOf(i), stateOf(j)).kutas.find((k) => k.kuta === kuta)!.score;
      if (mine !== decode(oracle.kutas[kuta]![i]![j]!)) mismatches += 1;
      total += 1;
    }
  }
  return { mismatches, total };
}

describe('the shape of the thing', () => {
  it('the eight maxima sum to 36', () => {
    expect(KUTAS.reduce((n, k) => n + KUTA_MAXIMA[k], 0)).toBe(TOTAL_POINTS);
  });

  it('nine pādas make a sign, so 108 pādas make twelve', () => {
    expect(padaIndex({ nakshatra: 0, pada: 1 })).toBe(0);
    expect(padaIndex({ nakshatra: 26, pada: 4 })).toBe(107);
    expect(rashiOf({ nakshatra: 0, pada: 1 })).toBe(0);
    expect(rashiOf({ nakshatra: 26, pada: 4 })).toBe(11);
    const counts = new Array<number>(12).fill(0);
    for (let i = 0; i < 108; i += 1) counts[rashiOf(stateOf(i))]! += 1;
    expect(counts).toEqual(new Array<number>(12).fill(9));
  });

  it('never scores above a kūṭa’s maximum or below zero, on any pairing', () => {
    for (let i = 0; i < 108; i += 1) {
      for (let j = 0; j < 108; j += 1) {
        const result = ashtakuta(stateOf(i), stateOf(j));
        for (const k of result.kutas) {
          expect(k.score).toBeGreaterThanOrEqual(0);
          expect(k.score).toBeLessThanOrEqual(k.maximum);
        }
        expect(result.total).toBeGreaterThanOrEqual(0);
        expect(result.total).toBeLessThanOrEqual(TOTAL_POINTS);
      }
    }
  });

  it('always explains every kūṭa — a bare number is not a reading', () => {
    // The whole failure mode of aṣṭakūṭa is a score out of 36 quoted at someone
    // as a verdict. Every component has to say what produced it.
    for (const k of ashtakuta({ nakshatra: 0, pada: 1 }, { nakshatra: 12, pada: 3 }).kutas) {
      expect(k.reason.trim()).not.toBe('');
      expect(k.name.trim()).not.toBe('');
    }
  });

  it('scores a person against themselves as nāḍī zero', () => {
    // Same nakṣatra means same nāḍī, which is the one kūṭa that scores zero for
    // sameness rather than full marks. Worth pinning: it is the largest single
    // component and the sign convention is easy to invert.
    const self = { nakshatra: 5, pada: 2 };
    const nadi = ashtakuta(self, self).kutas.find((k) => k.kuta === 'nadi')!;
    expect(nadi.score).toBe(0);
  });
});

describe('classification tables', () => {
  it('assigns a yoni to all 27 nakṣatras, using 14 animals', () => {
    expect(YONI_OF_NAKSHATRA).toHaveLength(27);
    expect(new Set(YONI_OF_NAKSHATRA).size).toBe(14);
  });

  it('assigns a nāḍī to all 27, nine to each', () => {
    expect(NADI_OF_NAKSHATRA).toHaveLength(27);
    const counts = { adi: 0, madhya: 0, antya: 0 };
    for (const n of NADI_OF_NAKSHATRA) counts[n] += 1;
    expect(counts).toEqual({ adi: 9, madhya: 9, antya: 9 });
  });

  it('derives graha maitrī from the natural relations, not a second table', () => {
    expect(maitriScore('Sun', 'Sun')).toBe(5);
    expect(maitriScore('Sun', 'Venus')).toBe(0); // mutual enemies
    expect(maitriScore('Sun', 'Mercury')).toBe(4); // friend one way, neutral the other
  });
});

describe('against Jagannātha Hora, over every one of the 11,664 pairings', () => {
  // Not a sample. Aṣṭakūṭa reads nothing but two nakṣatras and two pādas, so
  // the entire input space is 108 x 108 and can simply be enumerated.
  const exact: Kuta[] = ['yoni', 'maitri', 'gana', 'nadi'];

  it.each(exact)('%s matches on all of them', (kuta) => {
    const { mismatches, total } = sweep(kuta);
    expect(total).toBe(11664);
    expect(mismatches).toBe(0);
  });
});

describe('where the oracle is wrong, and Jade does not follow it', () => {
  // Four kūṭas do not match, and in each case the reference is the one that
  // departs from the text. Recorded here with the evidence so that nobody
  // "fixes" Jade into agreeing with a bug.

  it('tārā: the oracle never awards full marks and keys off the wrong remainders', () => {
    // Classically the inauspicious tārās are remainders 3, 5 and 7, and a pair
    // clean both ways scores the full 3. The reference only ever returns 0 or
    // 1.5, and splits on whether the remainder is below 3 — which is neither
    // the classical rule nor internally consistent with its own stated maximum.
    const seen = new Set<number>();
    for (let i = 0; i < 108; i += 1) {
      for (let j = 0; j < 108; j += 1) seen.add(decode(oracle.kutas.tara![i]![j]!));
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 1.5]);
    expect(KUTA_MAXIMA.tara).toBe(3);

    // Jade awards the full 3 to a clean pair.
    const best = Math.max(
      ...Array.from(
        { length: 27 },
        (_, n) =>
          ashtakuta({ nakshatra: 0, pada: 1 }, { nakshatra: n, pada: 1 }).kutas.find(
            (k) => k.kuta === 'tara',
          )!.score,
      ),
    );
    expect(best).toBe(3);
  });

  it('varṇa: the oracle’s table contradicts the rule it implements', () => {
    // Varṇa scores 1 when the first person's varṇa is not below the second's,
    // which makes a lower-triangular matrix. The reference has Śūdra over
    // Vaiśya scoring 1 and Vaiśya over Śūdra scoring 0 — exactly inverted, and
    // only on that one pair.
    const shudra = { nakshatra: 6, pada: 1 }; // Gemini — Śūdra
    const vaishya = { nakshatra: 3, pada: 1 }; // Taurus — Vaiśya
    expect(rashiOf(shudra)).toBe(2);
    expect(rashiOf(vaishya)).toBe(1);

    const higherOverLower = ashtakuta(vaishya, shudra).kutas.find((k) => k.kuta === 'varna')!;
    const lowerOverHigher = ashtakuta(shudra, vaishya).kutas.find((k) => k.kuta === 'varna')!;
    expect(higherOverLower.score).toBe(1);
    expect(lowerOverHigher.score).toBe(0);
  });

  it('bhakūṭa: the oracle exempts one pair, in one direction only', () => {
    // 6-8, 5-9 and 2-12 void bhakūṭa. The reference applies that everywhere
    // except Cancer/Aquarius, which it exempts asymmetrically — a voiding rule
    // that depends on which person is asked first is not a rule.
    const cancer = { nakshatra: 8, pada: 1 };
    const aquarius = { nakshatra: 23, pada: 1 };
    expect(rashiOf(cancer)).toBe(3);
    expect(rashiOf(aquarius)).toBe(10);

    for (const [a, b] of [
      [cancer, aquarius],
      [aquarius, cancer],
    ] as const) {
      expect(ashtakuta(a, b).kutas.find((k) => k.kuta === 'bhakuta')!.score).toBe(0);
    }
    const { mismatches } = sweep('bhakuta');
    expect(mismatches).toBe(81); // exactly one ordered sign pair, nine pādas square
  });

  it('vaśya: the oracle interleaves the pādas of the two split signs', () => {
    // Sagittarius is human in its first half and quadruped in its second;
    // Capricorn quadruped then aquatic. The reference alternates group by pāda
    // across both signs, which is a pāda-handling bug rather than a reading.
    const sagittarius = Array.from({ length: 9 }, (_, p) =>
      decode(oracle.kutas.vasya![8 * 9 + p]![0]!),
    );
    const alternating = sagittarius.some((v, i) => i > 0 && v !== sagittarius[i - 1]);
    const contiguous =
      sagittarius.slice(0, 4).every((v) => v === sagittarius[0]) &&
      sagittarius.slice(5).every((v) => v === sagittarius[8]);
    expect(alternating).toBe(true);
    expect(contiguous).toBe(false);
  });
});

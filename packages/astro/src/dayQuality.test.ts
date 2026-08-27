import { describe, expect, it } from 'vitest';
import { BAND_LABELS, TARAS, candraBala, dayQuality, taraBala } from './dayQuality.js';
import { NAKSHATRA_SPAN } from './nakshatra.js';

/**
 * These guard the one thing that makes a coloured week defensible: that the
 * colour is a restatement of two named classical counts and not a score
 * invented here. If the tārā assignments ever drift from the texts, or the
 * band starts being produced by arithmetic on the two rather than by their
 * agreement, these fail.
 */

/** Longitude at the start of nakṣatra `n` (0-based), plus a nudge into it. */
const atNakshatra = (n: number): number => n * NAKSHATRA_SPAN + 1;

describe('taraBala', () => {
  it('counts the birth star itself as the first tārā, not the zeroth', () => {
    const t = taraBala(atNakshatra(3), atNakshatra(3));
    expect(t.index).toBe(1);
    expect(t.name).toBe('Janma');
    expect(t.cycle).toBe(1);
  });

  it('walks the nine names in order from the janma nakṣatra', () => {
    const names = Array.from({ length: 9 }, (_, step) => taraBala(0, atNakshatra(step)).name);
    expect(names).toEqual([
      'Janma',
      'Sampat',
      'Vipat',
      'Kṣema',
      'Pratyari',
      'Sādhaka',
      'Vadha',
      'Mitra',
      'Ati-mitra',
    ]);
  });

  it('repeats the cycle three times across the twenty-seven', () => {
    expect(taraBala(0, atNakshatra(0)).cycle).toBe(1);
    expect(taraBala(0, atNakshatra(9)).cycle).toBe(2);
    expect(taraBala(0, atNakshatra(18)).cycle).toBe(3);
    // Same name, different cycle — which is exactly why `cycle` is reported.
    expect(taraBala(0, atNakshatra(9)).name).toBe('Janma');
    expect(taraBala(0, atNakshatra(18)).name).toBe('Janma');
  });

  it('wraps backwards through the zodiac rather than going negative', () => {
    // Natal Moon late in the circle, transit Moon early: the count must still
    // run forwards from janma, which is where a modulo bug would show.
    const t = taraBala(atNakshatra(26), atNakshatra(0));
    expect(t.index).toBe(2);
    expect(t.name).toBe('Sampat');
  });

  it('assigns exactly five favourable, three difficult and one mixed', () => {
    const counts = TARAS.reduce<Record<string, number>>((acc, t) => {
      acc[t.band] = (acc[t.band] ?? 0) + 1;
      return acc;
    }, {});
    expect(counts).toEqual({ favourable: 5, difficult: 3, mixed: 1 });
  });

  it('names both endpoints so the count can be checked by hand', () => {
    const t = taraBala(atNakshatra(0), atNakshatra(4));
    expect(t.fromNakshatra).toBe('Ashwini');
    expect(t.toNakshatra).toBe('Mrigashira');
  });
});

describe('candraBala', () => {
  it('counts the transit Moon inclusively from the natal Moon sign', () => {
    expect(candraBala(5, 5).house).toBe(1);
    expect(candraBala(5, 35).house).toBe(2);
    expect(candraBala(5, 95).house).toBe(4);
  });

  it('marks the fourth, eighth and twelfth difficult', () => {
    for (const house of [4, 8, 12]) {
      expect(candraBala(0, (house - 1) * 30 + 5).band, `house ${house}`).toBe('difficult');
    }
  });

  it('marks the classical six favourable', () => {
    for (const house of [1, 3, 6, 7, 10, 11]) {
      expect(candraBala(0, (house - 1) * 30 + 5).band, `house ${house}`).toBe('favourable');
    }
  });

  it('leaves the rest middling rather than forcing a side', () => {
    for (const house of [2, 5, 9]) {
      expect(candraBala(0, (house - 1) * 30 + 5).band, `house ${house}`).toBe('mixed');
    }
  });

  it('wraps around the zodiac', () => {
    // Natal in Pisces (330°), transit in Aries (0°) — the 2nd, not the −10th.
    expect(candraBala(335, 5).house).toBe(2);
    expect(candraBala(-25, 5).house).toBe(2);
  });
});

describe('dayQuality', () => {
  it('is favourable only when both counts agree', () => {
    // Natal Moon at 0° Aries. Transit at 74° falls in nakṣatra 5 — Sādhaka,
    // the 6th tārā — and in Gemini, the 3rd sign from Aries. Both favourable.
    const q = dayQuality(0, 74);
    expect(q.tara.band).toBe('favourable');
    expect(q.candra.band).toBe('favourable');
    expect(q.band).toBe('favourable');
  });

  it('is difficult only when both counts agree', () => {
    // 91° is nakṣatra 6 — Vadha, the 7th tārā — and Cancer, the 4th sign from
    // Aries. The two counts are not independent, so a case where both land
    // difficult has to be found rather than constructed by adding degrees.
    const q = dayQuality(0, 91);
    expect(q.tara.band).toBe('difficult');
    expect(q.candra.band).toBe('difficult');
    expect(q.band).toBe('difficult');
  });

  it('falls to mixed when the two disagree, rather than averaging them', () => {
    // 100° is nakṣatra 7 — Mitra, favourable — but still Cancer, the 4th from
    // the natal Moon. A favourable tārā over a difficult candra must not net
    // out to anything.
    const q = dayQuality(0, 100);
    expect(q.tara.band).toBe('favourable');
    expect(q.candra.band).toBe('difficult');
    expect(q.band).toBe('mixed');
  });

  it('never returns a band without the factors that produced it', () => {
    for (let n = 0; n < 27; n += 1) {
      const q = dayQuality(0, atNakshatra(n));
      expect(q.factors.length, `nakṣatra ${n}`).toBe(2);
      for (const factor of q.factors) {
        expect(factor.length).toBeGreaterThan(20);
        expect(factor).not.toContain('undefined');
        expect(factor).not.toContain('NaN');
      }
    }
  });

  it('says nothing about outcomes anywhere in its vocabulary', () => {
    // The whole design constraint, asserted. These strings reach the reader.
    const forbidden = [
      'good day',
      'bad day',
      'lucky',
      'unlucky',
      'will ',
      'expect ',
      'score',
      'rating',
    ];
    const surface = [
      ...TARAS.flatMap((t) => [t.name, t.meaning]),
      ...Object.values(BAND_LABELS),
      ...Array.from({ length: 27 }, (_, n) => dayQuality(0, atNakshatra(n)).factors.join(' ')),
    ]
      .join(' ')
      .toLowerCase();

    for (const word of forbidden) {
      expect(surface, `vocabulary contains "${word}"`).not.toContain(word);
    }
  });

  it('does not call most days remarkable', () => {
    // A colouring that greens half the week has stopped carrying information.
    // Sampled across every nakṣatra/sign combination the Moon can occupy.
    const bands = { favourable: 0, mixed: 0, difficult: 0 };
    for (let n = 0; n < 27; n += 1) {
      for (let s = 0; s < 12; s += 1) {
        bands[dayQuality(0, atNakshatra(n) + s * 30).band] += 1;
      }
    }
    const total = bands.favourable + bands.mixed + bands.difficult;
    expect(bands.favourable / total).toBeLessThan(0.35);
    expect(bands.difficult / total).toBeLessThan(0.2);
    expect(bands.mixed / total).toBeGreaterThan(0.5);
  });
});

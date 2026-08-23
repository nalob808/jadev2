import { describe, expect, it } from 'vitest';
import {
  COMBUSTION_ORBS,
  combustionOf,
  dignityOf,
  EXALTATION,
  lordOfSign,
  MOOLATRIKONA,
  naturalRelation,
  SIGN_LORDS,
} from '../src/dignity.js';
import {
  aspectsOnSign,
  GRAHA_DRISHTI,
  signsAspectedBy,
  signsAspectedBySign,
} from '../src/drishti.js';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { DEFAULT_SETTINGS, GRAHAS, SIGNS, type Graha } from '../src/types.js';

const CLASSICAL: Graha[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];

describe('sign lordship', () => {
  it('assigns all twelve, with the luminaries ruling one sign each', () => {
    expect(SIGN_LORDS).toHaveLength(12);
    const counts = new Map<Graha, number>();
    for (const lord of SIGN_LORDS) counts.set(lord, (counts.get(lord) ?? 0) + 1);
    expect(counts.get('Sun')).toBe(1);
    expect(counts.get('Moon')).toBe(1);
    for (const graha of ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const) {
      expect(counts.get(graha), graha).toBe(2);
    }
  });

  it('places the luminaries in Leo and Cancer, which anchors the whole scheme', () => {
    expect(lordOfSign(4)).toBe('Sun'); // Leo
    expect(lordOfSign(3)).toBe('Moon'); // Cancer
    // Rulership mirrors outward from there in both directions.
    expect(lordOfSign(5)).toBe('Mercury');
    expect(lordOfSign(2)).toBe('Mercury');
    expect(lordOfSign(6)).toBe('Venus');
    expect(lordOfSign(1)).toBe('Venus');
  });
});

describe('exaltation and debilitation', () => {
  it('gives each classical graha exactly one exaltation sign', () => {
    for (const graha of CLASSICAL) expect(EXALTATION[graha], graha).toBeDefined();
    const signs = CLASSICAL.map((g) => EXALTATION[g]!.sign);
    expect(new Set(signs).size).toBe(7);
  });

  it('puts debilitation exactly opposite exaltation, for every graha', () => {
    for (const graha of CLASSICAL) {
      const exalted = EXALTATION[graha]!;
      const atExalted = dignityOf(graha, exalted.sign * 30 + exalted.degree);
      const atDebilitated = dignityOf(graha, ((exalted.sign + 6) % 12) * 30 + exalted.degree);
      expect(atExalted, `${graha} exalted`).toBe('exalted');
      expect(atDebilitated, `${graha} debilitated`).toBe('debilitated');
    }
  });

  it('matches the values every textbook lists', () => {
    expect(dignityOf('Sun', 10)).toBe('exalted'); // Aries 10
    expect(dignityOf('Saturn', 6 * 30 + 20)).toBe('exalted'); // Libra 20
    expect(dignityOf('Mars', 9 * 30 + 28)).toBe('exalted'); // Capricorn 28
    expect(dignityOf('Sun', 6 * 30 + 10)).toBe('debilitated'); // Libra
    expect(dignityOf('Saturn', 0 * 30 + 20)).toBe('debilitated'); // Aries
  });

  it('has no exaltation for the nodes, and says so rather than inventing one', () => {
    expect(dignityOf('Rahu', 60)).toBeNull();
    expect(dignityOf('Ketu', 240)).toBeNull();
  });
});

describe('mūlatrikoṇa', () => {
  it('sits inside a sign the graha rules — except the Moon', () => {
    for (const graha of CLASSICAL) {
      const mt = MOOLATRIKONA[graha]!;
      if (graha === 'Moon') {
        // Classical exception: the Moon's mūlatrikoṇa is Taurus, Venus's sign.
        expect(SIGN_LORDS[mt.sign]).toBe('Venus');
        continue;
      }
      expect(SIGN_LORDS[mt.sign], `${graha} in ${SIGNS[mt.sign]}`).toBe(graha);
    }
  });

  it('takes precedence over plain own-sign but not over exaltation', () => {
    expect(dignityOf('Sun', 4 * 30 + 5)).toBe('moolatrikona'); // Leo 5
    expect(dignityOf('Sun', 4 * 30 + 25)).toBe('own'); // Leo 25, past the range
    // Mercury: Virgo is both its exaltation and its mūlatrikoṇa sign.
    expect(dignityOf('Mercury', 5 * 30 + 18)).toBe('exalted');
  });
});

describe('natural friendship', () => {
  it('is not symmetric, which is the whole point', () => {
    // The Sun counts Venus an enemy; Venus counts the Sun an enemy too, but
    // Mercury befriends the Sun while the Sun stays neutral to Mercury.
    expect(naturalRelation('Mercury', 'Sun')).toBe('friend');
    expect(naturalRelation('Sun', 'Mercury')).toBe('neutral');
  });

  it('gives the Moon no enemies', () => {
    for (const graha of CLASSICAL) {
      expect(naturalRelation('Moon', graha), graha).not.toBe('enemy');
    }
  });

  it('falls through to the sign lord’s relationship', () => {
    // Jupiter in Taurus: Venus's sign, and Jupiter counts Venus an enemy.
    expect(dignityOf('Jupiter', 1 * 30 + 15)).toBe('enemy');
    // Mars in Cancer is debilitated, which outranks any friendship.
    expect(dignityOf('Mars', 3 * 30 + 28)).toBe('debilitated');
  });
});

describe('combustion', () => {
  it('uses the tighter orb when retrograde, for the two grahas where it differs', () => {
    expect(COMBUSTION_ORBS.Mercury).toEqual({ direct: 14, retrograde: 12 });
    expect(COMBUSTION_ORBS.Venus).toEqual({ direct: 10, retrograde: 8 });
    expect(combustionOf('Venus', 9, 0, false)!.combust).toBe(true);
    expect(combustionOf('Venus', 9, 0, true)!.combust).toBe(false);
  });

  it('flags cazimi separately from combustion', () => {
    const cazimi = combustionOf('Mercury', 0.4, 0, false)!;
    expect(cazimi.combust).toBe(true);
    expect(cazimi.cazimi).toBe(true);
    expect(combustionOf('Mercury', 5, 0, false)!.cazimi).toBe(false);
  });

  it('measures the short way round the circle', () => {
    expect(combustionOf('Mars', 355, 5, false)!.separation).toBeCloseTo(10, 6);
  });

  it('does not apply to the Sun or the nodes', () => {
    expect(combustionOf('Sun', 10, 10, false)).toBeNull();
    expect(combustionOf('Rahu', 10, 10, false)).toBeNull();
  });
});

describe('graha dṛṣṭi', () => {
  it('gives everything the 7th, and only the three their extra houses', () => {
    for (const graha of GRAHAS) expect(GRAHA_DRISHTI[graha]).toContain(7);
    expect(GRAHA_DRISHTI.Mars).toEqual([4, 7, 8]);
    expect(GRAHA_DRISHTI.Jupiter).toEqual([5, 7, 9]);
    expect(GRAHA_DRISHTI.Saturn).toEqual([3, 7, 10]);
    expect(GRAHA_DRISHTI.Venus).toEqual([7]);
  });

  it('resolves to the right signs', () => {
    // Saturn in Aries (0) aspects the 3rd (Gemini), 7th (Libra), 10th (Capricorn).
    const aspects = signsAspectedBy('Saturn', 0);
    expect(aspects.map((a) => a.toSign).sort((a, b) => a - b)).toEqual([2, 6, 9]);
  });

  it('wraps past Pisces', () => {
    // Jupiter in Capricorn (9): 5th = Taurus (1), 7th = Cancer (3), 9th = Virgo (5).
    expect(
      signsAspectedBy('Jupiter', 9)
        .map((a) => a.toSign)
        .sort((a, b) => a - b),
    ).toEqual([1, 3, 5]);
  });

  it('leaves the nodes out unless asked, because BPHS does not give them dṛṣṭi', () => {
    expect(signsAspectedBy('Rahu', 0)).toEqual([]);
    expect(signsAspectedBy('Rahu', 0, { includeNodes: true })).toHaveLength(3);
  });

  it('finds who aspects a sign', () => {
    const placements = [
      { pointId: 'Saturn' as const, signIndex: 0 },
      { pointId: 'Jupiter' as const, signIndex: 3 },
    ];
    // Saturn in Aries reaches Gemini (3rd), Libra (7th) and Capricorn (10th).
    // Jupiter in Cancer reaches Scorpio (5th), Capricorn (7th) and Pisces (9th).
    expect(aspectsOnSign(placements, 6).map((a) => a.from)).toEqual(['Saturn']);
    // Capricorn takes both — Saturn's 10th and Jupiter's 7th land on the same
    // sign, which is exactly the pile-up this function exists to surface.
    expect(
      aspectsOnSign(placements, 9)
        .map((a) => a.from)
        .sort(),
    ).toEqual(['Jupiter', 'Saturn']);
    expect(
      aspectsOnSign(placements, 9)
        .map((a) => a.distance)
        .sort((a, b) => a - b),
    ).toEqual([7, 10]);
    // Aries itself is aspected by neither.
    expect(aspectsOnSign(placements, 0)).toEqual([]);
  });
});

describe('rāśi dṛṣṭi (Jaimini)', () => {
  it('movable signs aspect fixed signs, minus the adjacent one', () => {
    // Aries (movable) aspects Leo, Scorpio, Aquarius — but not Taurus.
    expect(signsAspectedBySign(0).sort((a, b) => a - b)).toEqual([4, 7, 10]);
  });

  it('fixed signs aspect movable, minus the adjacent one', () => {
    // Taurus (fixed) aspects Cancer, Libra, Capricorn — but not Aries.
    expect(signsAspectedBySign(1).sort((a, b) => a - b)).toEqual([3, 6, 9]);
  });

  it('dual signs aspect the other dual signs', () => {
    expect(signsAspectedBySign(2).sort((a, b) => a - b)).toEqual([5, 8, 11]);
  });

  it('is mutual: if A aspects B then B aspects A', () => {
    for (let a = 0; a < 12; a += 1) {
      for (const b of signsAspectedBySign(a)) {
        expect(signsAspectedBySign(b), `${a} <-> ${b}`).toContain(a);
      }
    }
  });
});

describe('the computed chart carries dignity, combustion and pañcāṅga', () => {
  it('fills them for the reference chart, and leaves the angles out', async () => {
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const { computeChart, ASTRO_VERSION } = await import('../src/chart.js');
    const chart = computeChart(new AstronomyEngineProvider(), {
      jdUt: 2452221.1472222223,
      location: { latitude: 42.2808, longitude: -83.743 },
    });

    // Bumping the version is what invalidates every cached chart. If this
    // assertion fails because the version moved, that is correct — but the
    // cache key must move with it.
    expect(ASTRO_VERSION).toBe('0.4.0');

    expect(chart.dignity.Saturn).toBeDefined();
    expect(chart.dignity.Ascendant).toBeUndefined();
    expect(chart.dignity.Midheaven).toBeUndefined();

    // Three real dignities in this chart, each a different rule firing:
    // the Sun at 21°24′ Libra is debilitated (opposite its Aries exaltation),
    // Mars at 13°41′ Capricorn is exalted, and Venus at 4°58′ Libra falls
    // inside its 0–15° mūlatrikoṇa range rather than merely its own sign.
    expect(chart.dignity.Sun).toBe('debilitated');
    expect(chart.dignity.Mars).toBe('exalted');
    expect(chart.dignity.Venus).toBe('moolatrikona');
    // Saturn in Taurus: Venus's sign, and Venus is Saturn's natural friend.
    expect(chart.dignity.Saturn).toBe('friend');
    // The nodes have no dignity, and the chart says so rather than guessing.
    expect(chart.dignity.Rahu).toBeNull();

    // Nothing is combust here, and the near-misses are the interesting part:
    // Mercury sits 15.6° from the Sun against a 14° orb, Venus 16.4° against
    // 10°. Both would be combust under a naive "same sign" rule.
    expect(chart.combustion.Mercury?.combust).toBe(false);
    expect(chart.combustion.Mercury?.separation).toBeCloseTo(15.56, 1);
    expect(chart.combustion.Venus?.combust).toBe(false);
    expect(chart.combustion.Venus?.separation).toBeCloseTo(16.43, 1);
    expect(chart.combustion.Sun).toBeNull();

    expect(chart.panchanga.tithi.index).toBe(22);
    expect(chart.panchanga.tithi.paksha).toBe('krishna');
    expect(chart.panchanga.nakshatra.name).toBe('Pushya');
    expect(chart.panchanga.vara?.name).toBe('Wednesday');
    expect(chart.sunrise).not.toBeNull();
  });
});

describe('position basis', () => {
  const provider = new AstronomyEngineProvider({ nodeType: 'mean' });

  it('computes apparent positions by default', () => {
    const a = provider.position('Sun', 2451545.0);
    const b = provider.position('Sun', 2451545.0, 'apparent');
    expect(a.longitude).toBe(b.longitude);
  });

  it('refuses the true basis rather than approximating it', () => {
    // The gap this setting exists to close is at most 55 arcseconds. The best
    // this provider can do geometrically is wrong by 20. Refusing is correct.
    expect(() => provider.position('Sun', 2451545.0, 'true')).toThrow(/swisseph provider/);
  });

  it('is part of the settings, so a chart records which basis produced it', () => {
    expect(DEFAULT_SETTINGS.positionBasis).toBe('apparent');
  });
});

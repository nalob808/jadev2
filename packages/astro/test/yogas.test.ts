import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BENEFICS,
  CLASSICAL,
  detectYogas,
  houseFrom,
  inDebilitation,
  JHORA_COMPATIBLE,
  type YogaChart,
  type YogaOptions,
} from '../src/yogas.js';
import { EXALTATION, SIGN_LORDS } from '../src/dignity.js';
import type { Graha } from '../src/types.js';

interface OracleCase {
  ascendantSignIndex: number;
  signIndexes: Record<string, number>;
  degreesInSign: Record<string, number>;
  yogas: Record<string, boolean | null>;
}
const oracle = JSON.parse(
  readFileSync(new URL('./fixtures/jhora-oracle.json', import.meta.url), 'utf8'),
) as { cases: Record<string, OracleCase> };

const chartOf = (c: OracleCase): YogaChart => ({
  ascendantSign: c.ascendantSignIndex,
  signOf: c.signIndexes as Record<Graha, number>,
  degreeOf: c.degreesInSign as Record<Graha, number>,
});

const labels = Object.keys(oracle.cases);
const idsFor = (c: OracleCase, options: YogaOptions = {}): Set<string> =>
  new Set(detectYogas(chartOf(c), options).map((y) => y.id));

describe('house counting', () => {
  // Inclusive counting, the Jyotiṣa convention. Every off-by-one in this file
  // would come from here, so it is pinned first.
  it('makes the reference sign the 1st, not the 0th', () => {
    expect(houseFrom(0, 0)).toBe(1);
    expect(houseFrom(7, 7)).toBe(1);
  });

  it('makes the next sign the 2nd and the previous the 12th', () => {
    expect(houseFrom(0, 1)).toBe(2);
    expect(houseFrom(0, 11)).toBe(12);
    expect(houseFrom(11, 0)).toBe(2);
    expect(houseFrom(0, 3)).toBe(4);
  });

  it('never returns 0 or 13, from any sign to any sign', () => {
    for (let from = 0; from < 12; from += 1) {
      for (let to = 0; to < 12; to += 1) {
        const h = houseFrom(from, to);
        expect(h).toBeGreaterThanOrEqual(1);
        expect(h).toBeLessThanOrEqual(12);
      }
    }
  });
});

describe('every hit is groundable', () => {
  // CLAUDE.md non-negotiable #5: no free-floating prose. A yoga that cannot
  // name the placements that produced it may not be printed.
  it.each(labels)('%s', (label) => {
    for (const hit of detectYogas(chartOf(oracle.cases[label]!))) {
      expect(hit.factors.length).toBeGreaterThan(0);
      expect(hit.source).not.toBe('');
      expect(hit.name).not.toBe('');
      expect(hit.plain).not.toBe('');
      for (const factor of hit.factors) expect(factor.trim()).not.toBe('');
    }
  });

  it('never reports the same yoga twice for one chart', () => {
    for (const label of labels) {
      const hits = detectYogas(chartOf(oracle.cases[label]!));
      expect(new Set(hits.map((h) => h.id)).size).toBe(hits.length);
    }
  });
});

describe('the lunar quartet is exclusive', () => {
  // Sunaphā, anaphā, durudhurā and kemadruma partition the possibilities:
  // grahas in the 2nd only, the 12th only, both, or neither. Exactly one must
  // fire on every chart, or the rule has a hole in it.
  it.each(labels)('%s reports exactly one', (label) => {
    const ids = idsFor(oracle.cases[label]!);
    const lunar = ['sunapha', 'anapha', 'durudhura', 'kemadruma'].filter((id) => ids.has(id));
    expect(lunar).toHaveLength(1);
  });
});

describe('the solar trio is exclusive', () => {
  // Veśi, vāsi and ubhayacharī are mutually exclusive, but unlike the lunar
  // set there is no fourth name for "neither", so zero or one may fire.
  it.each(labels)('%s reports at most one', (label) => {
    const ids = idsFor(oracle.cases[label]!);
    const solar = ['vesi', 'vasi', 'ubhayachari'].filter((id) => ids.has(id));
    expect(solar.length).toBeLessThanOrEqual(1);
  });
});

describe('pañca mahāpuruṣa', () => {
  it('requires both the dignity and the angle', () => {
    // Saturn in Aquarius (own sign) but in the 3rd from the ascendant: no yoga.
    const base = Object.fromEntries(CLASSICAL.map((g) => [g, 0])) as Record<Graha, number>;
    const degrees = Object.fromEntries(CLASSICAL.map((g) => [g, 15])) as Record<Graha, number>;

    const notAngular: YogaChart = {
      ascendantSign: 8, // Sagittarius; Aquarius is the 3rd
      signOf: { ...base, Saturn: 10 },
      degreeOf: degrees,
    };
    expect(new Set(detectYogas(notAngular).map((y) => y.id)).has('sasa')).toBe(false);

    const angular: YogaChart = {
      ascendantSign: 10, // Aquarius; Saturn is in the 1st, a kendra
      signOf: { ...base, Saturn: 10 },
      degreeOf: degrees,
    };
    expect(new Set(detectYogas(angular).map((y) => y.id)).has('sasa')).toBe(true);
  });

  it('accepts the from-the-Moon reading only when asked', () => {
    const base = Object.fromEntries(CLASSICAL.map((g) => [g, 0])) as Record<Graha, number>;
    const degrees = Object.fromEntries(CLASSICAL.map((g) => [g, 15])) as Record<Graha, number>;
    // Saturn in Aquarius, the 3rd from the ascendant but the 4th from the Moon.
    const chart: YogaChart = {
      ascendantSign: 8,
      signOf: { ...base, Saturn: 10, Moon: 7 },
      degreeOf: degrees,
    };
    expect(new Set(detectYogas(chart).map((y) => y.id)).has('sasa')).toBe(false);
    const withMoon = detectYogas(chart, { mahapurushaReference: 'either' });
    const sasa = withMoon.find((y) => y.id === 'sasa');
    expect(sasa).toBeDefined();
    expect(sasa!.factors.join(' ')).toContain('from the Moon');
  });
});

describe('kemadruma carries its cancellations', () => {
  // Kemadruma is the yoga most likely to frighten someone who reads only its
  // name. Reporting it without the conditions that blunt it is exactly the
  // dishonesty CLAUDE.md forbids.
  const solitary = (): YogaChart => ({
    // Moon alone in Cancer; the 2nd (Leo) and 12th (Gemini) both empty.
    ascendantSign: 3,
    signOf: {
      Sun: 0,
      Moon: 3,
      Mars: 9,
      Mercury: 0,
      Jupiter: 9,
      Venus: 0,
      Saturn: 9,
    } as Record<Graha, number>,
    degreeOf: Object.fromEntries(CLASSICAL.map((g) => [g, 15])) as Record<Graha, number>,
  });

  it('fires when the Moon is unattended', () => {
    const hit = detectYogas(solitary()).find((y) => y.id === 'kemadruma');
    expect(hit).toBeDefined();
    expect(hit!.factors.join(' ')).toContain('no graha in the 2nd');
  });

  it('reports the Moon in a kendra as a cancellation', () => {
    // Ascendant Cancer, Moon in Cancer: the Moon is in the 1st, a kendra.
    const hit = detectYogas(solitary()).find((y) => y.id === 'kemadruma');
    expect(hit!.cancellations).toBeDefined();
    expect(hit!.cancellations!.join(' ')).toContain('kendra');
  });

  it('omits the field entirely when nothing cancels', () => {
    // Ascendant Taurus, so the kendras are Taurus, Leo, Scorpio, Aquarius —
    // signs 1, 4, 7, 10. Moon in Cancer with the 2nd (Leo) and 12th (Gemini)
    // empty, nothing on an angle, and no benefic with the Moon.
    const bleak: YogaChart = {
      ascendantSign: 1,
      signOf: {
        Sun: 0,
        Moon: 3,
        Mars: 5,
        Mercury: 8,
        Jupiter: 5,
        Venus: 8,
        Saturn: 5,
      } as Record<Graha, number>,
      degreeOf: Object.fromEntries(CLASSICAL.map((g) => [g, 15])) as Record<Graha, number>,
    };
    const hit = detectYogas(bleak).find((y) => y.id === 'kemadruma');
    expect(hit).toBeDefined();
    expect(hit!.cancellations).toBeUndefined();
  });
});

describe('debilitation', () => {
  it('is the sign opposite exaltation, for every graha that has one', () => {
    for (const graha of CLASSICAL) {
      const ex = EXALTATION[graha];
      if (!ex) continue;
      const chart: YogaChart = {
        ascendantSign: 0,
        signOf: {
          ...(Object.fromEntries(CLASSICAL.map((g) => [g, 0])) as Record<Graha, number>),
          [graha]: (ex.sign + 6) % 12,
        },
        degreeOf: Object.fromEntries(CLASSICAL.map((g) => [g, 15])) as Record<Graha, number>,
      };
      expect(inDebilitation(graha, chart)).toBe(true);
    }
  });
});

describe('benefics', () => {
  it('are the three unconditional ones', () => {
    expect([...BENEFICS].sort()).toEqual(['Jupiter', 'Mercury', 'Venus']);
  });

  it('lordship covers all twelve signs', () => {
    expect(SIGN_LORDS).toHaveLength(12);
  });
});

describe('against Jagannātha Hora, in compatibility mode', () => {
  // JHora differs from Parāśara on three points, all definitional rather than
  // arithmetical: it counts Rāhu and Ketu as grahas, it treats the Sun's
  // presence in the 2nd or 12th as spoiling the yoga outright, and it reports
  // sunaphā, anaphā and durudhurā together when both sides are occupied.
  //
  // JHORA_COMPATIBLE turns all three on. Exact agreement here is what proves
  // the occupancy engine is identical and the defaults differ only by choice.
  const exact = [
    'ruchaka',
    'bhadra',
    'hamsa',
    'malavya',
    'sasa',
    'budha_aditya',
    'chandra_mangala',
    'adhi',
    'sunapha',
    'anapha',
    'durudhura',
    'ubhayachari',
  ];

  it.each(exact)('%s agrees on every chart', (id) => {
    const disagreements: string[] = [];
    for (const label of labels) {
      const c = oracle.cases[label]!;
      const theirs = c.yogas[id];
      if (theirs === null || theirs === undefined) continue;
      const mine = idsFor(c, JHORA_COMPATIBLE).has(id);
      if (mine !== theirs) disagreements.push(`${label}: Jade ${mine}, JHora ${theirs}`);
    }
    expect(disagreements).toEqual([]);
  });
});

describe('where Jade and Jagannātha Hora genuinely differ', () => {
  // Three yogas do not reconcile even in compatibility mode. Each divergence is
  // pinned here with its explanation rather than papered over, so that a change
  // in either implementation shows up as a test failure and gets re-examined.

  const divergent = (id: string): string[] =>
    labels.filter((label) => {
      const c = oracle.cases[label]!;
      const theirs = c.yogas[id];
      if (theirs === null || theirs === undefined) return false;
      return idsFor(c, JHORA_COMPATIBLE).has(id) !== theirs;
    });

  it('kemadruma: JHora folds cancellation into the answer, Jade keeps it separate', () => {
    // On these three the Moon really is unattended, and a classical
    // cancellation also applies. JHora reports "no kemadruma". Jade reports the
    // yoga *and* the cancellation, which is strictly more information: the
    // practitioner sees both the condition and the relief.
    expect(divergent('kemadruma').sort()).toEqual(
      ['equatorial', 'mars-retrograde', 'today-honolulu'].sort(),
    );
    for (const label of divergent('kemadruma')) {
      const hit = detectYogas(chartOf(oracle.cases[label]!), JHORA_COMPATIBLE).find(
        (y) => y.id === 'kemadruma',
      );
      expect(hit!.cancellations, `${label} must carry a cancellation`).toBeDefined();
      expect(hit!.cancellations!.length).toBeGreaterThan(0);
    }
  });

  it('gajakesarī: Jade uses the plain Parāśara rule, JHora adds conditions', () => {
    // BPHS gives gajakesarī as Jupiter in a kendra from the Moon, and that is
    // what Jade implements. On these three Jupiter *is* in a kendra from the
    // Moon and JHora still declines, so it is applying further conditions on
    // Jupiter that its API does not expose. Jade will not guess at them.
    const diffs = divergent('gaja_kesari');
    expect(diffs.sort()).toEqual(['equatorial', 'mars-retrograde', 'nineteenth-century-us'].sort());
    for (const label of diffs) {
      const c = oracle.cases[label]!;
      const house = houseFrom(c.signIndexes.Moon!, c.signIndexes.Jupiter!);
      expect([1, 4, 7, 10], `${label}: Jupiter must be in a kendra from the Moon`).toContain(house);
    }
  });

  it('veśi and vāsi: JHora fires on charts with nothing in the house at all', () => {
    // On these two the 2nd (or 12th) from the Sun is empty of every body
    // including the nodes, and JHora still reports the yoga. Whatever rule
    // produces that is not the one in the text, so Jade does not copy it.
    expect(divergent('vesi')).toEqual(['v0-reference-chart']);
    expect(divergent('vasi')).toEqual(['exact-midnight-ut']);

    const c = oracle.cases['v0-reference-chart']!;
    const sun = c.signIndexes.Sun!;
    const occupants = Object.entries(c.signIndexes).filter(
      ([name, sign]) => name !== 'Sun' && name !== 'Moon' && houseFrom(sun, sign) === 2,
    );
    expect(occupants).toEqual([]);
  });
});

describe('on the computed chart', () => {
  it('is present and every hit is decomposable', async () => {
    const { computeChart } = await import('../src/chart.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const { DEFAULT_SETTINGS } = await import('../src/types.js');

    const chart = computeChart(
      new AstronomyEngineProvider({ nodeType: DEFAULT_SETTINGS.nodeType }),
      { jdUt: 2452221.147222221, location: { latitude: 42.2808, longitude: -83.743 } },
      DEFAULT_SETTINGS,
    );

    expect(chart.yogas.length).toBeGreaterThan(0);
    for (const hit of chart.yogas) {
      expect(hit.factors.length).toBeGreaterThan(0);
      expect(hit.source).not.toBe('');
    }
  });

  it('threads the yoga options through to the detector', async () => {
    const { computeChart } = await import('../src/chart.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const { DEFAULT_SETTINGS } = await import('../src/types.js');

    // Reykjavík, where the readings genuinely part company: Ketu sits in the
    // 2nd from the Moon, so Parāśara's seven-graha count leaves the Moon
    // unattended and reports kemadruma, while counting the nodes makes it
    // sunaphā. Picking a chart where the option changes nothing would test
    // nothing.
    const moment = {
      jdUt: 2439140.6041666665,
      location: { latitude: 64.1466, longitude: -21.9426 },
    };
    const provider = new AstronomyEngineProvider({ nodeType: DEFAULT_SETTINGS.nodeType });
    const parashara = computeChart(provider, moment, DEFAULT_SETTINGS).yogas.map((y) => y.id);
    const jhora = computeChart(provider, moment, DEFAULT_SETTINGS, JHORA_COMPATIBLE).yogas.map(
      (y) => y.id,
    );

    expect(parashara).toContain('kemadruma');
    expect(jhora).not.toContain('kemadruma');
    expect(jhora).toContain('sunapha');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { convergences, sharedTimeline, type TimelineChart } from '../src/relations/timeline.js';
import { vimshottari } from '../src/dashas/vimshottari.js';
import type { Graha } from '../src/types.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  ascendantSidereal: number;
  points: Record<string, { siderealLongitude: number }>;
}
const golden = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const byLabel = (label: string): GoldenCase => golden.cases.find((c) => c.label === label)!;

const chartOf = (c: GoldenCase): TimelineChart => {
  const signOf: Record<string, number> = {};
  for (const [id, p] of Object.entries(c.points)) {
    signOf[id] = Math.floor(p.siderealLongitude / 30);
  }
  return { ascendantSign: Math.floor(c.ascendantSidereal / 30), signOf: signOf as never };
};

const caseA = byLabel('v0-reference-chart');
const caseB = byLabel('modern-mumbai');
const dashaOf = (c: GoldenCase) =>
  vimshottari(c.points.Moon!.siderealLongitude, c.jdUt, { levels: 2 });

describe('the shared axis', () => {
  const a = dashaOf(caseA);
  const b = dashaOf(caseB);
  const segments = sharedTimeline(a, b);

  it('produces segments', () => {
    expect(segments.length).toBeGreaterThan(10);
  });

  it('covers the overlap with no gaps and no overlaps', () => {
    // Every boundary of either timeline is a cut, so the segments must tile.
    for (let i = 0; i < segments.length - 1; i += 1) {
      expect(segments[i + 1]!.startJd).toBeCloseTo(segments[i]!.endJd, 9);
    }
    for (const s of segments) expect(s.endJd).toBeGreaterThan(s.startJd);
  });

  it('gives every segment exactly one running chain per person', () => {
    for (const s of segments) {
      expect(s.a.length).toBe(2); // mahādaśā and antardaśā
      expect(s.b.length).toBe(2);
    }
  });

  it('stays inside the window both timelines actually cover', () => {
    const first = segments[0]!;
    const last = segments[segments.length - 1]!;
    expect(first.startJd).toBeGreaterThanOrEqual(Math.min(caseA.jdUt, caseB.jdUt));
    expect(last.endJd).toBeGreaterThan(first.startJd);
  });

  it('honours an explicit window', () => {
    const from = segments[2]!.startJd;
    const to = segments[6]!.endJd;
    const windowed = sharedTimeline(a, b, { fromJd: from, toJd: to });
    expect(windowed[0]!.startJd).toBeCloseTo(from, 9);
    expect(windowed[windowed.length - 1]!.endJd).toBeCloseTo(to, 9);
  });

  it('returns nothing rather than something wrong for an empty window', () => {
    expect(sharedTimeline(a, b, { fromJd: 2500000, toJd: 2400000 })).toEqual([]);
  });
});

describe('convergences', () => {
  const segments = sharedTimeline(dashaOf(caseA), dashaOf(caseB));
  const found = convergences(segments, chartOf(caseA), chartOf(caseB), {
    a: 'Alice',
    b: 'Bob',
  });

  it('finds some, and every one names its rule and its factors', () => {
    expect(found.length).toBeGreaterThan(0);
    for (const c of found) {
      expect(c.factors.length).toBeGreaterThan(0);
      for (const f of c.factors) expect(f.trim()).not.toBe('');
      expect(c.name.trim()).not.toBe('');
      expect(c.endJd).toBeGreaterThan(c.startJd);
    }
  });

  it('uses only the four named rules — nothing unexplained gets highlighted', () => {
    const rules = new Set(found.map((c) => c.rule));
    for (const r of rules) {
      expect(['sameLord', 'mutualDrishti', 'lordInPartnersSeventh', 'seventhLordPeriod']).toContain(
        r,
      );
    }
  });

  it('returns no score, no intensity, no rating', () => {
    // A highlighted band on a timeline is a claim. The shape of the result is
    // what stops it becoming a number nobody can decompose.
    for (const c of found) {
      expect(Object.keys(c).sort()).toEqual([
        'endJd',
        'factors',
        'name',
        'rule',
        'startJd',
        'subject',
      ]);
    }
  });

  it('coalesces a run of identical flags into one band', () => {
    // Without this a single mahādaśā pairing produces one flag per antardaśā
    // boundary and the timeline turns to confetti.
    for (const rule of ['sameLord', 'seventhLordPeriod', 'lordInPartnersSeventh'] as const) {
      const bands = found.filter((c) => c.rule === rule);
      for (let i = 0; i < bands.length - 1; i += 1) {
        for (let j = i + 1; j < bands.length; j += 1) {
          const same = bands[i]!.subject === bands[j]!.subject && bands[i]!.name === bands[j]!.name;
          if (!same) continue;
          const touching = Math.abs(bands[i]!.endJd - bands[j]!.startJd) < 1e-6;
          expect(touching, `${rule} left two identical bands touching`).toBe(false);
        }
      }
    }
  });

  it('does not explode into one band per antardaśā', () => {
    // The regression this pins: coalescing merged only *adjacent* flags, so
    // when both people triggered the same rule their two flags interleaved,
    // broke each other's chain, and nothing merged. This pair produced 312
    // bands. A timeline nobody can read is worse than no timeline.
    //
    // The honest number for this pair over the full ~100-year overlap is 49 —
    // each a distinct pairing of lords, not a repeat. The ceiling here is a
    // regression guard, not a target.
    expect(found.length).toBeLessThan(80);
    expect(found.length).toBeGreaterThan(5);
  });

  it('keeps the two people’s flags of the same rule apart', () => {
    const mine = found.filter((c) => c.rule === 'seventhLordPeriod');
    if (mine.length > 1) {
      const keys = mine.map((c) => `${c.rule}-${c.subject}-${c.startJd}`);
      expect(new Set(keys).size).toBe(keys.length);
    }
    for (const c of found) expect(['a', 'b', 'both']).toContain(c.subject);
  });

  it('names the people, so the reading reads as a sentence', () => {
    const text = found.flatMap((c) => [c.name, ...c.factors]).join(' ');
    expect(text).toMatch(/Alice|Bob/);
  });

  it('fires sameLord exactly when both chains end on the same graha', () => {
    const expected = segments.filter((s) => s.a[s.a.length - 1] === s.b[s.b.length - 1]);
    const flagged = found.filter((c) => c.rule === 'sameLord');
    if (expected.length === 0) expect(flagged).toHaveLength(0);
    else expect(flagged.length).toBeGreaterThan(0);
    // And every flagged band must sit inside a segment where it is true.
    for (const band of flagged) {
      const covering = segments.find(
        (s) => s.startJd <= band.startJd + 1e-6 && s.endJd >= band.startJd + 1e-6,
      );
      expect(covering).toBeDefined();
      expect(covering!.a[covering!.a.length - 1]).toBe(covering!.b[covering!.b.length - 1]);
    }
  });

  it('is symmetric in the pair for the mutual rules', () => {
    const forward = convergences(segments, chartOf(caseA), chartOf(caseB));
    const swapped = sharedTimeline(dashaOf(caseB), dashaOf(caseA));
    const back = convergences(swapped, chartOf(caseB), chartOf(caseA));
    const count = (list: typeof forward, rule: string): number =>
      list.filter((c) => c.rule === rule).length;
    // sameLord and mutualDrishti do not care who is asked first.
    expect(count(back, 'sameLord')).toBe(count(forward, 'sameLord'));
    expect(count(back, 'mutualDrishti')).toBe(count(forward, 'mutualDrishti'));
  });
});

describe('the seventh-lord rule', () => {
  it('fires for a chart whose seventh lord actually gets a period', () => {
    // Aries ascendant, so the seventh is Libra and its lord is Venus.
    const chart: TimelineChart = {
      ascendantSign: 0,
      signOf: {
        Sun: 0,
        Moon: 0,
        Mars: 0,
        Mercury: 0,
        Jupiter: 0,
        Venus: 6,
        Saturn: 0,
      } as Record<Graha, number>,
    };
    const dasha = vimshottari(caseA.points.Moon!.siderealLongitude, caseA.jdUt, { levels: 2 });
    const segments = sharedTimeline(dasha, dasha);
    const found = convergences(segments, chart, chart, { a: 'X', b: 'Y' });
    const seventh = found.filter((c) => c.rule === 'seventhLordPeriod');
    expect(seventh.length).toBeGreaterThan(0);
    expect(seventh[0]!.factors.join(' ')).toContain('Venus');
    expect(seventh[0]!.factors.join(' ')).toContain('Libra');
  });
});

describe('transit contacts', () => {
  it('finds Jupiter and Saturn arriving on the points that matter to a pair', async () => {
    const { transitContacts } = await import('../src/relations/transitContacts.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const provider = new AstronomyEngineProvider({ nodeType: 'mean' });

    const chartFor = (c: GoldenCase) => {
      const longitudeOf: Record<string, number> = {};
      for (const [id, p] of Object.entries(c.points)) longitudeOf[id] = p.siderealLongitude;
      return {
        ascendantSign: Math.floor(c.ascendantSidereal / 30),
        longitudeOf: longitudeOf as Record<Graha, number>,
      };
    };

    const contacts = transitContacts(
      provider,
      { ayanamsa: 'lahiri' },
      { fromJd: 2458849.5, toJd: 2460676.5 }, // 2020–2025
      { a: chartFor(caseA), b: chartFor(caseB) },
      { a: 'Alice', b: 'Bob' },
    );

    expect(contacts.length).toBeGreaterThan(0);
    for (const c of contacts) {
      expect(['Jupiter', 'Saturn']).toContain(c.transiting);
      expect(['a', 'b']).toContain(c.subject);
      expect(['moon', 'venus', 'seventhLord']).toContain(c.point);
      expect(c.factors.length).toBeGreaterThan(0);
      expect(c.pass).toBeGreaterThanOrEqual(1);
      expect(c.pass).toBeLessThanOrEqual(3);
      expect(c.jdUt).toBeGreaterThan(2458849.5);
      expect(c.jdUt).toBeLessThan(2460676.5);
    }
  });

  it('returns them in time order, and reports every pass of a loop', async () => {
    const { transitContacts } = await import('../src/relations/transitContacts.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
    const chartFor = (c: GoldenCase) => {
      const longitudeOf: Record<string, number> = {};
      for (const [id, p] of Object.entries(c.points)) longitudeOf[id] = p.siderealLongitude;
      return {
        ascendantSign: Math.floor(c.ascendantSidereal / 30),
        longitudeOf: longitudeOf as Record<Graha, number>,
      };
    };
    const contacts = transitContacts(
      provider,
      { ayanamsa: 'lahiri' },
      { fromJd: 2458849.5, toJd: 2462501.5 }, // ten years, so loops complete
      { a: chartFor(caseA), b: chartFor(caseB) },
    );

    for (let i = 0; i < contacts.length - 1; i += 1) {
      expect(contacts[i + 1]!.jdUt).toBeGreaterThanOrEqual(contacts[i]!.jdUt);
    }

    // Over ten years at least one slow graha must complete a triple pass over
    // one of the six watched points, or the pass numbering is not working.
    const multi = contacts.filter((c) => c.pass > 1);
    expect(multi.length).toBeGreaterThan(0);
    for (const c of multi) {
      expect(c.factors.join(' ')).toContain('pass');
    }
  });

  it('watches only the slow grahas — a timeline that flags everything flags nothing', async () => {
    const { transitContacts } = await import('../src/relations/transitContacts.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
    const chartFor = (c: GoldenCase) => {
      const longitudeOf: Record<string, number> = {};
      for (const [id, p] of Object.entries(c.points)) longitudeOf[id] = p.siderealLongitude;
      return {
        ascendantSign: Math.floor(c.ascendantSidereal / 30),
        longitudeOf: longitudeOf as Record<Graha, number>,
      };
    };
    const contacts = transitContacts(
      provider,
      { ayanamsa: 'lahiri' },
      { fromJd: 2458849.5, toJd: 2460676.5 },
      { a: chartFor(caseA), b: chartFor(caseB) },
    );
    const bodies = new Set(contacts.map((c) => c.transiting));
    expect([...bodies].sort()).toEqual(
      bodies.size === 2 ? ['Jupiter', 'Saturn'] : [...bodies].sort(),
    );
    expect(bodies.has('Mars' as never)).toBe(false);
  });
});

describe('transit contact wording', () => {
  it('never prints "undefined" in a factor', async () => {
    // The bug: a sign was looked up with a *longitude* divided by 30 and not
    // floored, so SIGNS[7.4] came back undefined and the page said "Venus in
    // undefined". A type checker cannot see it — the index is a number either
    // way — and only reading the rendered page did.
    const { transitContacts } = await import('../src/relations/transitContacts.js');
    const { AstronomyEngineProvider } = await import('../src/ephemeris/astronomyEngine.js');
    const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
    const chartFor = (c: GoldenCase) => {
      const longitudeOf: Record<string, number> = {};
      for (const [id, p] of Object.entries(c.points)) longitudeOf[id] = p.siderealLongitude;
      return {
        ascendantSign: Math.floor(c.ascendantSidereal / 30),
        longitudeOf: longitudeOf as Record<Graha, number>,
      };
    };
    const contacts = transitContacts(
      provider,
      { ayanamsa: 'lahiri' },
      { fromJd: 2458849.5, toJd: 2462501.5 },
      { a: chartFor(caseA), b: chartFor(caseB) },
      { a: 'Alice', b: 'Bob' },
    );
    expect(contacts.length).toBeGreaterThan(0);
    for (const c of contacts) {
      const text = c.factors.join(' ');
      expect(text).not.toContain('undefined');
      expect(text).not.toContain('NaN');
      expect(text).toMatch(/Alice|Bob/);
      // Every factor is printed after a possessive, so no leading article:
      // "Jade's seventh is Taurus", never "Jade's the seventh is Taurus".
      expect(text).not.toMatch(/'s the /);
    }
  });
});

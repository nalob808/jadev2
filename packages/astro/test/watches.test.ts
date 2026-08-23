import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  describeRule,
  evaluateWatch,
  type WatchRule,
  type WatchSubject,
} from '../src/watches/rules.js';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { vimshottari } from '../src/dashas/vimshottari.js';
import type { SiderealFrame } from '../src/transits/scan.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  ascendantSidereal: number;
  points: Record<string, { siderealLongitude: number }>;
}
const golden = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const natal = golden.cases.find((c) => c.label === 'v0-reference-chart')!;
const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: SiderealFrame = { ayanamsa: 'lahiri' };

const subject: WatchSubject = {
  ascendantSign: Math.floor(natal.ascendantSidereal / 30),
  natalLongitudeOf: {
    ...Object.fromEntries(Object.entries(natal.points).map(([id, p]) => [id, p.siderealLongitude])),
    Ascendant: natal.ascendantSidereal,
  },
};

// 2020-01-01 to 2030-01-01.
//
// The natal points used below are chosen because the slow grahas actually
// reach them in this decade. Saturn covers only 267° to 24° over these ten
// years, so a watch on the natal Moon at 100° correctly returns nothing —
// the first version of this file asserted otherwise and was testing an
// impossible event. Natal Mars at 283.7° gets the full retrograde triple pass.
const window = { fromJd: 2458849.5, toJd: 2462502.5 };
const CROSSED_BY_SATURN = 'Mars';
const CROSSED_BY_JUPITER = 'Jupiter';
const dasha = vimshottari(natal.points.Moon!.siderealLongitude, natal.jdUt, { levels: 3 });
const context = { provider, frame, dasha };

describe('every watch hit is decomposable', () => {
  const rules: WatchRule[] = [
    { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: CROSSED_BY_SATURN },
    { kind: 'transitCrossing', transiting: 'Jupiter', natalPoint: CROSSED_BY_JUPITER },
    { kind: 'ingress', transiting: 'Jupiter' },
    { kind: 'station', transiting: 'Mars' },
    { kind: 'dashaChange', level: 2 },
  ];

  it.each(rules.map((r) => [describeRule(r), r] as const))('%s', (_label, rule) => {
    const hits = evaluateWatch(rule, subject, window, context);
    expect(hits.length).toBeGreaterThan(0);
    for (const hit of hits) {
      expect(hit.title.trim()).not.toBe('');
      expect(hit.factors.length).toBeGreaterThan(0);
      for (const f of hit.factors) {
        expect(f.trim()).not.toBe('');
        expect(f).not.toContain('undefined');
        expect(f).not.toContain('NaN');
      }
      expect(hit.jdUt).toBeGreaterThanOrEqual(window.fromJd);
      expect(hit.jdUt).toBeLessThanOrEqual(window.toJd);
      expect(hit.kind).toBe(rule.kind);
    }
  });
});

describe('hit keys', () => {
  // A nightly job re-runs over overlapping windows. If the key for one event
  // changed between runs, every alert would be sent again the next night.
  const rule: WatchRule = {
    kind: 'transitCrossing',
    transiting: 'Saturn',
    natalPoint: CROSSED_BY_SATURN,
  };

  it('are stable across identical evaluations', () => {
    const a = evaluateWatch(rule, subject, window, context).map((h) => h.key);
    const b = evaluateWatch(rule, subject, window, context).map((h) => h.key);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('are stable when the window shifts around the same event', () => {
    const wide = evaluateWatch(rule, subject, window, context);
    expect(wide.length).toBeGreaterThan(0);
    const one = wide[0]!;
    // A narrower window that still contains the event must produce the same key.
    const narrow = evaluateWatch(
      rule,
      subject,
      { fromJd: one.jdUt - 40, toJd: one.jdUt + 40 },
      context,
    );
    expect(narrow.some((h) => h.key === one.key)).toBe(true);
  });

  it('are unique within one evaluation', () => {
    const keys = [
      ...evaluateWatch(rule, subject, window, context),
      ...evaluateWatch({ kind: 'ingress', transiting: 'Jupiter' }, subject, window, context),
      ...evaluateWatch({ kind: 'station', transiting: 'Mars' }, subject, window, context),
    ].map((h) => h.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('filters actually filter', () => {
  it('an ingress restricted to one sign returns only that sign', () => {
    const all = evaluateWatch({ kind: 'ingress', transiting: 'Jupiter' }, subject, window, context);
    const one = evaluateWatch(
      { kind: 'ingress', transiting: 'Jupiter', intoSign: 3 },
      subject,
      window,
      context,
    );
    expect(all.length).toBeGreaterThan(one.length);
    for (const hit of one) expect(hit.title).toContain('Cancer');
  });

  it('a station restricted to one direction returns only that direction', () => {
    const all = evaluateWatch({ kind: 'station', transiting: 'Mars' }, subject, window, context);
    const retro = evaluateWatch(
      { kind: 'station', transiting: 'Mars', direction: 'retrograde' },
      subject,
      window,
      context,
    );
    expect(retro.length).toBeGreaterThan(0);
    expect(retro.length).toBeLessThan(all.length);
    for (const hit of retro) expect(hit.title).toContain('retrograde');
  });

  it('a daśā watch restricted to one lord returns only that lord', () => {
    const all = evaluateWatch({ kind: 'dashaChange', level: 2 }, subject, window, context);
    const venus = evaluateWatch(
      { kind: 'dashaChange', level: 2, lord: 'Venus' },
      subject,
      window,
      context,
    );
    expect(all.length).toBeGreaterThan(venus.length);
    for (const hit of venus) expect(hit.title).toContain('Venus');
  });

  it('a daśā watch without a daśā returns nothing rather than guessing', () => {
    const hits = evaluateWatch({ kind: 'dashaChange', level: 1 }, subject, window, {
      provider,
      frame,
    });
    expect(hits).toEqual([]);
  });

  it('a crossing of a natal point the subject does not have returns nothing', () => {
    const hits = evaluateWatch(
      { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Pluto' },
      { ...subject, natalLongitudeOf: { Moon: 100 } },
      window,
      context,
    );
    expect(hits).toEqual([]);
  });
});

describe('the retrograde loop reaches the alert', () => {
  it('reports every pass, and says which one it is', () => {
    // The practitioner needs all three dates, and needs to know the second is
    // the same contact coming back rather than a new event.
    const hits = evaluateWatch(
      { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: CROSSED_BY_SATURN },
      subject,
      window,
      context,
    );
    expect(hits).toHaveLength(3);
    const loop = hits.filter((h) => h.factors.some((f) => f.includes('pass')));
    expect(loop.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.factors.includes('first contact'))).toBe(true);
  });
});

describe('what a watch will not do', () => {
  it('never says whether an event is good or bad', () => {
    const everything = [
      { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: CROSSED_BY_SATURN },
      { kind: 'ingress', transiting: 'Saturn' },
      { kind: 'station', transiting: 'Saturn' },
      { kind: 'dashaChange', level: 2 },
    ] as WatchRule[];
    const words = [
      'good',
      'bad',
      'lucky',
      'unlucky',
      'danger',
      'warning',
      'beware',
      'auspicious',
      'inauspicious',
      'favourable',
      'unfavourable',
    ];
    for (const rule of everything) {
      for (const hit of evaluateWatch(rule, subject, window, context)) {
        const text = `${hit.title} ${hit.factors.join(' ')}`.toLowerCase();
        for (const word of words) {
          expect(text, `a watch said "${word}"`).not.toContain(word);
        }
      }
    }
  });

  it('returns only the fields an alert needs, and no verdict field', () => {
    const [hit] = evaluateWatch({ kind: 'station', transiting: 'Mars' }, subject, window, context);
    expect(Object.keys(hit!).sort()).toEqual(['factors', 'jdUt', 'key', 'kind', 'title']);
  });
});

describe('describeRule', () => {
  it('describes every kind without falling through', () => {
    const rules: WatchRule[] = [
      { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Moon' },
      { kind: 'ingress', transiting: 'Jupiter' },
      { kind: 'ingress', transiting: 'Jupiter', intoSign: 0 },
      { kind: 'ingress', transiting: 'Jupiter', intoHouse: 7 },
      { kind: 'station', transiting: 'Mercury', direction: 'retrograde' },
      { kind: 'station', transiting: 'Mercury', direction: 'direct', inHouse: 10 },
      { kind: 'dashaChange', level: 1 },
      { kind: 'dashaChange', level: 2, lord: 'Venus' },
    ];
    for (const rule of rules) {
      const text = describeRule(rule);
      expect(text).not.toBe('unknown rule');
      expect(text).not.toContain('undefined');
      expect(text.trim()).not.toBe('');
    }
  });
});

describe('a watch on an event that cannot happen', () => {
  it('returns nothing, and that is the right answer', () => {
    // Saturn travels from 267° to 24° over this decade. A watch on the natal
    // Moon at 100° must return nothing — and a scanner that invented a hit
    // here would be far worse than one that found none.
    const hits = evaluateWatch(
      { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Moon' },
      subject,
      window,
      context,
    );
    expect(hits).toEqual([]);
  });
});

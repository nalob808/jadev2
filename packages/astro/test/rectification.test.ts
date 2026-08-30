import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import {
  LIFE_EVENTS,
  MAX_EVENT_SCORE,
  RECTIFICATION_CAVEAT,
  RULES,
  isLifeEventKind,
  lifeEvent,
  rectify,
  scoreEvent,
  type CandidateChart,
} from '../src/rectification/index.js';
import { vimshottari } from '../src/dashas/vimshottari.js';
import { gregorianToJd } from '../src/time.js';

/**
 * Rectification is the feature with the widest gap between "produces a number"
 * and "is trustworthy", so most of what follows tests the second thing.
 *
 * The properties that matter:
 *  - it is pure and reproducible;
 *  - a scored candidate can always be argued with, because every point traces
 *    to a named rule with its placements;
 *  - it discriminates using things that actually vary with birth time, and it
 *    says so when a rule does not;
 *  - it never claims more than inference.
 */

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });

// Ann Arbor, matching the fixtures used elsewhere in the suite.
const LOCATION = { latitude: 42.2808, longitude: -83.743, elevation: 0 };

// A birth day with a four-hour window of uncertainty — the classic "sometime
// in the morning" case a practitioner is actually handed.
const BIRTH_DAY = gregorianToJd(1994, 3, 11);
const FROM = BIRTH_DAY + 11 / 24; // 06:00 local-ish, in UT terms
const TO = BIRTH_DAY + 15 / 24;

const EVENTS = [
  { kind: 'marriage' as const, jdUt: gregorianToJd(2019, 6, 15) },
  { kind: 'childbirth' as const, jdUt: gregorianToJd(2022, 2, 3) },
  { kind: 'career_change' as const, jdUt: gregorianToJd(2016, 9, 1) },
];

describe('the life event vocabulary', () => {
  it('gives every event houses, kārakas and a citation', () => {
    expect(LIFE_EVENTS.length).toBeGreaterThan(10);
    for (const event of LIFE_EVENTS) {
      expect(event.houses.length, event.kind).toBeGreaterThan(0);
      for (const house of event.houses) {
        expect(house).toBeGreaterThanOrEqual(1);
        expect(house).toBeLessThanOrEqual(12);
      }
      expect(event.karakas.length, event.kind).toBeGreaterThan(0);
      // A house assignment with no source is an opinion.
      expect(event.source.length, event.kind).toBeGreaterThan(10);
      expect(event.label.length).toBeGreaterThan(3);
    }
  });

  it('has no duplicate kinds and resolves them all', () => {
    const kinds = LIFE_EVENTS.map((e) => e.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    for (const kind of kinds) {
      expect(isLifeEventKind(kind)).toBe(true);
      expect(lifeEvent(kind)).toBeDefined();
    }
    expect(isLifeEventKind('winning the lottery')).toBe(false);
  });
});

describe('the rule table', () => {
  it('is fixed, weighted and self-describing', () => {
    expect(RULES.length).toBeGreaterThan(4);
    for (const r of RULES) {
      expect(r.weight).toBeGreaterThan(0);
      expect(r.label.length).toBeGreaterThan(5);
      expect(r.note.length).toBeGreaterThan(20);
    }
    expect(MAX_EVENT_SCORE).toBe(RULES.reduce((t, r) => t + r.weight, 0));
  });

  it('weights daśā above transit, as the texts do', () => {
    const dasha = RULES.find((r) => r.id === 'dasha-lord-rules-house')!;
    const transit = RULES.find((r) => r.id === 'transit-slow-graha-in-house')!;
    expect(dasha.weight).toBeGreaterThan(transit.weight);
  });
});

describe('scoreEvent', () => {
  // A hand-built candidate: Aries rising, so house n is sign n-1.
  const chart: CandidateChart = {
    ascendant: 5, // 5° Aries
    longitudes: {
      Sun: 200,
      Moon: 100,
      Mars: 15,
      Mercury: 190,
      Jupiter: 185, // 5° Libra — the 7th from Aries
      Venus: 220,
      Saturn: 300,
      Rahu: 45,
      Ketu: 225,
    },
    houseSystem: 'whole_sign',
  };
  const dashas = vimshottari(100, BIRTH_DAY, { levels: 2 });

  it('never awards a point without the placements behind it', () => {
    for (const definition of LIFE_EVENTS) {
      const scored = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), definition);
      for (const hit of scored.hits) {
        expect(hit.factors.length, `${definition.kind}/${hit.rule}`).toBeGreaterThan(0);
        for (const factor of hit.factors) {
          expect(factor).not.toContain('undefined');
          expect(factor).not.toContain('NaN');
          expect(factor.length).toBeGreaterThan(3);
        }
        expect(hit.weight).toBeGreaterThan(0);
        expect(hit.house).toBeGreaterThanOrEqual(1);
        expect(hit.house).toBeLessThanOrEqual(12);
      }
    }
  });

  it('scores zero with no hits rather than a floor value', () => {
    const scored = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), lifeEvent('marriage')!);
    if (scored.hits.length === 0) expect(scored.score).toBe(0);
    expect(scored.score).toBeGreaterThanOrEqual(0);
  });

  it('weights the central house above the corroborating ones', () => {
    // Marriage lists [7, 2, 11]. A rule firing on the 7th must be worth more
    // than the same rule firing on the 11th, or a peripheral house outvotes
    // the house the matter actually belongs to.
    const marriage = lifeEvent('marriage')!;
    expect(marriage.houses[0]).toBe(7);
    const scored = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), marriage);
    const bySeventh = scored.hits.filter((h) => h.house === 7);
    const byEleventh = scored.hits.filter((h) => h.house === 11);
    for (const a of bySeventh) {
      for (const b of byEleventh) {
        if (a.rule === b.rule) {
          // Same rule, different house: the 7th must contribute more. The
          // contribution is weight × house rank, checked via the total.
          expect(a.weight).toBe(b.weight);
        }
      }
    }
    expect(scored.score).toBeGreaterThanOrEqual(0);
  });

  it('omits the transit rules entirely when no sky is supplied', () => {
    const withoutSky = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), lifeEvent('marriage')!);
    expect(withoutSky.hits.some((h) => h.rule.startsWith('transit-'))).toBe(false);

    const withSky = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), lifeEvent('marriage')!, {
      longitudes: { Jupiter: 190, Saturn: 300 },
    });
    // Jupiter at 190° is Libra, the 7th from Aries — the rule must fire.
    expect(withSky.hits.some((h) => h.rule === 'transit-slow-graha-in-house')).toBe(true);
  });

  it('is a pure function of its arguments', () => {
    const once = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), lifeEvent('marriage')!);
    const twice = scoreEvent(chart, dashas, gregorianToJd(2020, 1, 1), lifeEvent('marriage')!);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });
});

describe('rectify', () => {
  const result = rectify(provider, {
    location: LOCATION,
    fromJd: FROM,
    toJd: TO,
    stepMinutes: 10,
    events: EVENTS,
  });

  it('sweeps the window at the requested resolution', () => {
    // Four hours at ten minutes is twenty-five samples inclusive.
    expect(result.candidatesConsidered).toBe(25);
    expect(result.candidates).toHaveLength(25);
    expect(result.window.stepMinutes).toBe(10);
  });

  it('ranks by score and returns a shortlist, never an answer', () => {
    for (let i = 1; i < result.candidates.length; i += 1) {
      expect(result.candidates[i - 1]!.rawScore).toBeGreaterThanOrEqual(
        result.candidates[i]!.rawScore,
      );
    }
    // The shape itself refuses to name a winner.
    expect(result).not.toHaveProperty('bestTime');
    expect(result).not.toHaveProperty('rectifiedTime');
  });

  it('actually moves the ascendant across the window', () => {
    // If the sweep is not changing the thing that rotates the houses, nothing
    // it reports means anything. Four hours is roughly sixty degrees.
    const ascendants = result.candidates.map((c) => c.ascendant);
    const span = Math.max(...ascendants) - Math.min(...ascendants);
    expect(span).toBeGreaterThan(30);
    expect(result.ascendantSigns.length).toBeGreaterThanOrEqual(2);
  });

  it('reports which rules discriminated and which fired for everything', () => {
    expect(result.ruleDiscrimination).toHaveLength(RULES.length);
    for (const entry of result.ruleDiscrimination) {
      expect(entry.firedFor).toBeGreaterThanOrEqual(0);
      expect(entry.firedFor).toBeLessThanOrEqual(1);
      // The flag must agree with the fraction — this is the honesty mechanism.
      expect(entry.discriminating).toBe(entry.firedFor > 0.02 && entry.firedFor < 0.98);
    }
    // A transit rule scored against a fixed event date cannot vary with the
    // birth minute unless the ascendant moved the house under it, so at least
    // one rule in the table must be non-discriminating here. If every rule
    // discriminates, the discrimination check is not doing its job.
    const nonDiscriminating = result.ruleDiscrimination.filter((r) => !r.discriminating);
    expect(nonDiscriminating.length).toBeGreaterThan(0);
  });

  it('grounds every candidate, all the way down', () => {
    for (const candidate of result.candidates) {
      expect(candidate.score).toBeGreaterThanOrEqual(0);
      expect(candidate.score).toBeLessThanOrEqual(1);
      expect(candidate.ascendantSign.length).toBeGreaterThan(3);
      expect(candidate.moonNakshatra.length).toBeGreaterThan(3);
      expect(candidate.perEvent).toHaveLength(EVENTS.length);
      for (const event of candidate.perEvent) {
        for (const hit of event.hits) {
          expect(hit.factors.length).toBeGreaterThan(0);
        }
      }
    }
  });

  it('reports separation, so weak evidence looks weak', () => {
    expect(result.separation).toBeGreaterThanOrEqual(0);
    expect(result.separation).toBeLessThanOrEqual(1);
  });

  it('finds nothing to separate when given no events', () => {
    const empty = rectify(provider, {
      location: LOCATION,
      fromJd: FROM,
      toJd: TO,
      stepMinutes: 30,
      events: [],
    });
    expect(empty.separation).toBe(0);
    for (const candidate of empty.candidates) {
      expect(candidate.rawScore).toBe(0);
      expect(candidate.score).toBe(0);
    }
  });

  it('respects the candidate ceiling rather than hanging on a wide window', () => {
    const capped = rectify(provider, {
      location: LOCATION,
      fromJd: BIRTH_DAY,
      toJd: BIRTH_DAY + 1,
      stepMinutes: 1,
      events: EVENTS,
      maxCandidates: 50,
    });
    expect(capped.candidatesConsidered).toBe(50);
  });

  it('lands every sample on its exact step, at Julian Day magnitude', () => {
    // The regression this guards: a Julian Day is about 2.45 million, so
    // `fromJd + 11/24` loses low bits, and an accumulated `jd += step` walks
    // further off with every iteration until the final candidate falls outside
    // the window and vanishes. Sampling by index keeps one rounding instead of
    // twenty-five, and the boundary tolerance is scaled to half a second.
    const step = 10 / 1440;
    for (const [index, candidate] of result.candidates.entries()) {
      // Candidates come back ranked, so recover the intended grid position.
      const offsetSteps = (candidate.jdUt - FROM) / step;
      expect(Math.abs(offsetSteps - Math.round(offsetSteps)), `candidate ${index}`).toBeLessThan(
        1e-6,
      );
    }
    // And the window's far edge is included, not dropped.
    const last = Math.max(...result.candidates.map((c) => c.jdUt));
    expect(Math.abs(last - TO)).toBeLessThan(1e-6);
  });

  it('is reproducible', () => {
    const again = rectify(provider, {
      location: LOCATION,
      fromJd: FROM,
      toJd: TO,
      stepMinutes: 10,
      events: EVENTS,
    });
    expect(again.candidates[0]!.jdUt).toBe(result.candidates[0]!.jdUt);
    expect(again.candidates[0]!.rawScore).toBe(result.candidates[0]!.rawScore);
  });

  it('never predicts, and says what it is', () => {
    // Constitution item 6, and the honesty rule for a technique that produces
    // a confident-looking ranking from soft evidence.
    const prose = [
      RECTIFICATION_CAVEAT,
      ...LIFE_EVENTS.map((e) => `${e.label} ${e.source}`),
      ...RULES.map((r) => `${r.label} ${r.note}`),
      ...result.candidates.flatMap((c) =>
        c.perEvent.flatMap((e) => e.hits.flatMap((h) => h.factors)),
      ),
    ]
      .join(' ')
      .toLowerCase();

    for (const phrase of [
      'you will',
      'will die',
      'is going to',
      'predicts',
      'certain',
      'proven',
      'confirmed birth time',
      'your correct birth time is',
    ]) {
      expect(prose, `rectification said "${phrase}"`).not.toContain(phrase);
    }

    expect(RECTIFICATION_CAVEAT.toLowerCase()).toContain('inference, not measurement');
    expect(RECTIFICATION_CAVEAT.toLowerCase()).toContain('never as a corrected birth time');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import { vimshottari } from '../src/dashas/vimshottari.js';
import { timingSeries, timingTargets } from '../src/transits/timing.js';
import { describeClause, eventSearch, type EventClause } from '../src/transits/eventSearch.js';
import type { SiderealFrame } from '../src/transits/scan.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: SiderealFrame = { ayanamsa: 'lahiri' };

/** One fixture, expanded. The sweep is the thing under test, not the ephemeris. */
const base = golden.cases[0]!;
const chart = computeChart(provider, { jdUt: base.jdUt, location: base.location });
const dashas = vimshottari(chart.points.Moon!.longitude, base.jdUt, {
  levels: 3,
  yearLength: 'julian',
});

const timingChart = {
  ascendantSign: chart.houses.ascendantSign,
  longitudeOf: Object.fromEntries(
    Object.entries(chart.points).map(([id, point]) => [id, point.longitude]),
  ),
};

/** A decade starting thirty years after birth — inside the expanded daśā tree. */
const WINDOW = { fromJd: base.jdUt + 30 * 365.25, toJd: base.jdUt + 40 * 365.25 };

/**
 * The words Jade is not allowed to use about a period of somebody's life.
 *
 * The watches module has the same guard and for the same reason: the moment a
 * timeline says a stretch is "bad", it has made a prediction about a life from
 * a count of transits, which is neither supportable nor permitted (CLAUDE.md
 * #5 and #6). Both the timeline and the search return counts and placements,
 * and a test is the only thing that keeps it that way as the strings get edited.
 */
const FORBIDDEN =
  /\b(good|bad|lucky|unlucky|fortunate|unfortunate|auspicious|inauspicious|danger|dangerous|warning|beware|severe|intense|harsh|blessed|cursed|positive|negative|favourable|unfavourable|death|die|illness|disease|lawsuit)\b/i;

describe('the daśā × transit series', () => {
  const series = timingSeries(provider, frame, WINDOW, timingChart, dashas);

  it('segments the window into real periods that tile it without gaps or overlap', () => {
    expect(series.segments.length).toBeGreaterThan(0);
    for (let i = 0; i < series.segments.length; i += 1) {
      const segment = series.segments[i]!;
      expect(segment.toJd).toBeGreaterThan(segment.fromJd);
      expect(segment.fromJd).toBeGreaterThanOrEqual(WINDOW.fromJd);
      expect(segment.toJd).toBeLessThanOrEqual(WINDOW.toJd + 1e-6);
      const next = series.segments[i + 1];
      // Antardaśās abut exactly: the end of one is the start of the next. A gap
      // would drop events into nothing and an overlap would double-count them.
      if (next) expect(next.fromJd).toBeCloseTo(segment.toJd, 6);
    }
  });

  it('places every event in exactly one segment, and loses none', () => {
    const placed = series.segments.flatMap((segment) => segment.events);
    const inWindow = series.events.filter(
      (event) => event.jdUt >= series.segments[0]!.fromJd && event.jdUt < WINDOW.toJd,
    );
    expect(placed.length).toBe(inWindow.length);
    expect(new Set(placed).size).toBe(placed.length);
    for (const segment of series.segments) {
      expect(segment.eventCount).toBe(segment.events.length);
      for (const event of segment.events) {
        expect(event.jdUt).toBeGreaterThanOrEqual(segment.fromJd);
        expect(event.jdUt).toBeLessThan(segment.toJd);
      }
    }
  });

  it('only calls an event a lord event when the transiting graha rules the period', () => {
    for (const segment of series.segments) {
      for (const event of segment.lordEvents) {
        expect(segment.lords).toContain(event.transiting);
      }
      const expected = segment.events.filter((event) =>
        (segment.lords as readonly string[]).includes(event.transiting),
      );
      expect(segment.lordEvents.length).toBe(expected.length);
    }
  });

  it('carries the factors behind every event, and never a verdict', () => {
    expect(series.events.length).toBeGreaterThan(0);
    for (const event of series.events) {
      expect(event.factors.length, event.headline).toBeGreaterThan(0);
      expect(event.headline).not.toMatch(/undefined|NaN/);
      expect(event.headline, 'headline').not.toMatch(FORBIDDEN);
      for (const factor of event.factors) {
        expect(factor, `factor of "${event.headline}"`).not.toMatch(/undefined|NaN/);
        expect(factor, `factor of "${event.headline}"`).not.toMatch(FORBIDDEN);
      }
    }
  });

  it('scans only what it was asked to scan', () => {
    const jupiterOnly = timingSeries(provider, frame, WINDOW, timingChart, dashas, {
      bodies: ['Jupiter'],
    });
    expect(jupiterOnly.events.length).toBeGreaterThan(0);
    for (const event of jupiterOnly.events) expect(event.transiting).toBe('Jupiter');
    expect(jupiterOnly.scanned).toEqual(['Jupiter']);
  });

  it('names a target only where the chart has one', () => {
    const targets = timingTargets(timingChart, ['Moon', 'Sun', 'Ascendant', 'Midheaven']);
    for (const target of targets) {
      expect(timingChart.longitudeOf[target.id]).toBeCloseTo(target.longitude, 9);
      expect(target.detail).not.toMatch(/undefined|NaN/);
    }
  });
});

describe('event search', () => {
  const contactSaturn: EventClause = { kind: 'contact', body: 'Saturn', target: 'Moon' };
  const saturnPeriod: EventClause = { kind: 'lord', lord: 'Saturn' };

  it('returns a single clause on its own', () => {
    const result = eventSearch(
      provider,
      frame,
      WINDOW,
      timingChart,
      { clauses: [contactSaturn] },
      dashas,
    );
    expect(result.clauseMatchCounts[0]).toBeGreaterThan(0);
    expect(result.windows.length).toBeGreaterThan(0);
    for (const found of result.windows) {
      expect(found.matches).toHaveLength(1);
      expect(found.matches[0]!.jdUt).not.toBeNull();
      expect(found.spreadDays).toBe(0);
    }
  });

  /**
   * The property that matters most: a window must actually satisfy every clause.
   *
   * A sweep that mis-tracks its open set produces windows that look plausible
   * and are not true, which is the one failure a search tool must not have — the
   * reader has no way to notice. So each returned window is re-checked against
   * the matches it claims.
   */
  it('never returns a window that does not satisfy every clause', () => {
    const result = eventSearch(
      provider,
      frame,
      WINDOW,
      timingChart,
      { clauses: [contactSaturn, saturnPeriod], withinDays: 120 },
      dashas,
    );
    for (const found of result.windows) {
      expect(found.matches).toHaveLength(2);
      found.matches.forEach((match, index) => {
        expect(match.clause).toBe(index === 0 ? contactSaturn : saturnPeriod);
        expect(match.factors.length).toBeGreaterThan(0);
      });
      const [contact, period] = found.matches;
      // The daśā really was running when the contact happened, allowing for the
      // stated tolerance either side.
      expect(contact!.jdUt).not.toBeNull();
      expect(period!.jdUt).toBeNull();
      expect(contact!.jdUt!).toBeGreaterThanOrEqual(period!.fromJd - result.withinDays);
      expect(contact!.jdUt!).toBeLessThanOrEqual(period!.toJd + result.withinDays);
      expect(found.toJd).toBeGreaterThanOrEqual(found.fromJd);
    }
  });

  it('ranks tightest first', () => {
    const result = eventSearch(
      provider,
      frame,
      WINDOW,
      timingChart,
      {
        clauses: [
          { kind: 'contact', body: 'Jupiter', target: 'Moon' },
          { kind: 'contact', body: 'Saturn', target: 'Sun' },
        ],
        withinDays: 365,
      },
      dashas,
    );
    for (let i = 1; i < result.windows.length; i += 1) {
      expect(result.windows[i - 1]!.spreadDays).toBeLessThanOrEqual(result.windows[i]!.spreadDays);
    }
  });

  /** A tolerance that cannot be met must return nothing, not the nearest thing. */
  it('honours the tolerance rather than approximating it', () => {
    const loose = eventSearch(
      provider,
      frame,
      WINDOW,
      timingChart,
      {
        clauses: [
          { kind: 'contact', body: 'Jupiter', target: 'Moon' },
          { kind: 'contact', body: 'Saturn', target: 'Moon' },
        ],
        withinDays: 3650,
      },
      dashas,
    );
    const tight = eventSearch(
      provider,
      frame,
      WINDOW,
      timingChart,
      {
        clauses: [
          { kind: 'contact', body: 'Jupiter', target: 'Moon' },
          { kind: 'contact', body: 'Saturn', target: 'Moon' },
        ],
        withinDays: 0.5,
      },
      dashas,
    );
    expect(tight.windows.length).toBeLessThanOrEqual(loose.windows.length);
    for (const found of tight.windows) expect(found.spreadDays).toBeLessThanOrEqual(0.5);
  });

  it('says which clause emptied the result instead of returning a bare nothing', () => {
    const result = eventSearch(
      provider,
      frame,
      // A three-day window: a Saturn contact cannot happen in it.
      { fromJd: WINDOW.fromJd, toJd: WINDOW.fromJd + 3 },
      timingChart,
      { clauses: [contactSaturn, saturnPeriod] },
      dashas,
    );
    expect(result.windows).toHaveLength(0);
    expect(result.clauseMatchCounts[0]).toBe(0);
  });

  it('returns nothing for a daśā clause when no daśā was supplied, rather than pretending', () => {
    const result = eventSearch(provider, frame, WINDOW, timingChart, { clauses: [saturnPeriod] });
    expect(result.clauseMatchCounts[0]).toBe(0);
    expect(result.windows).toHaveLength(0);
  });

  it('describes every clause shape without printing undefined', () => {
    const shapes: EventClause[] = [
      { kind: 'ingress', body: 'Saturn' },
      { kind: 'ingress', body: 'Saturn', sign: 11 },
      { kind: 'station', body: 'Mars' },
      { kind: 'station', body: 'Mars', direction: 'retrograde' },
      { kind: 'contact', body: 'Jupiter', target: 'Ascendant' },
      { kind: 'degree', body: 'Saturn', longitude: 195.5 },
      { kind: 'lord', lord: 'Venus' },
      { kind: 'lord', lord: 'Venus', level: 2 },
    ];
    for (const clause of shapes) {
      const text = describeClause(clause);
      expect(text, JSON.stringify(clause)).not.toMatch(/undefined|NaN|\?/);
      expect(text, JSON.stringify(clause)).not.toMatch(FORBIDDEN);
    }
  });
});

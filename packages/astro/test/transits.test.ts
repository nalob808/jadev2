import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STEP_DAYS,
  findCrossings,
  findIngresses,
  findStations,
  siderealLongitudeAt,
  type SiderealFrame,
} from '../src/transits/scan.js';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import type { PointId } from '../src/types.js';

interface RefWindow {
  label: string;
  fromJd: number;
  toJd: number;
  bodies: Record<
    string,
    {
      ingresses: { jdUt: number; signIndex: number; retrograde: boolean }[];
      stations: { jdUt: number; direction: string; longitude: number }[];
    }
  >;
  crossings: Record<string, { jdUt: number; retrograde: boolean }[]>;
}
const reference = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-transits.json', import.meta.url), 'utf8'),
) as { windows: RefWindow[] };

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: SiderealFrame = { ayanamsa: 'lahiri' };
const MINUTES = 1440;

/**
 * Timing tolerances, in minutes, measured against Swiss Ephemeris and rounded
 * up for headroom.
 *
 * These are **not** the scanner's precision — the bisection converges to under
 * a second. They are the interactive provider's position error expressed as a
 * time, which is why they scale with how slowly a body moves: a fixed error in
 * degrees is a small error in minutes for the Moon and a large one for Saturn
 * near a station, where it is barely moving at all.
 *
 * Stored and printed transit times should come from the reference provider for
 * exactly this reason. See docs/07-accuracy.md.
 */
const INGRESS_TOLERANCE: Record<string, number> = {
  Moon: 2,
  Sun: 3,
  Mercury: 20,
  Venus: 15,
  Mars: 25,
  Jupiter: 45,
  Saturn: 45,
};
const STATION_TOLERANCE: Record<string, number> = {
  Mercury: 25,
  Venus: 15,
  Mars: 25,
  Jupiter: 60,
  Saturn: 120,
};
const CROSSING_TOLERANCE = 30;
const CROSSING_TARGETS: Record<string, number> = { Saturn: 300, Jupiter: 30, Mars: 120 };

describe('the sidereal frame', () => {
  it('is applied — the provider is tropical and the scan is not', () => {
    // The bug this pins put every Saturn ingress nearly two years out while
    // still producing a plausible-looking list of dates. Nothing downstream
    // would have caught it.
    const jd = 2459000.5;
    const tropical = provider.position('Saturn', jd).longitude;
    const sidereal = siderealLongitudeAt(provider, 'Saturn', jd, frame);
    const difference = ((tropical - sidereal + 540) % 360) - 180;
    expect(difference).toBeGreaterThan(23);
    expect(difference).toBeLessThan(25);
  });

  it('has a step small enough for every body it scans', () => {
    // A step longer than the shortest retrograde loop walks straight over it.
    for (const [body, step] of Object.entries(DEFAULT_STEP_DAYS)) {
      expect(step).toBeGreaterThan(0);
      expect(step).toBeLessThanOrEqual(body === 'Moon' ? 0.25 : 2);
    }
  });
});

for (const window of reference.windows) {
  const scan = { fromJd: window.fromJd, toJd: window.toJd };

  describe(`ingresses and stations, ${window.label}`, () => {
    const bodies = Object.keys(window.bodies);

    it.each(bodies)('%s finds exactly the reference ingresses', (body) => {
      const mine = findIngresses(provider, body as PointId, scan, frame);
      const theirs = window.bodies[body]!.ingresses;
      // The count is the strong assertion. A missed or invented ingress is a
      // different failure from a slightly-off time, and much worse.
      expect(mine.length).toBe(theirs.length);
      for (let i = 0; i < mine.length; i += 1) {
        expect(mine[i]!.signIndex).toBe(theirs[i]!.signIndex);
        expect(mine[i]!.retrograde).toBe(theirs[i]!.retrograde);
        const off = Math.abs(mine[i]!.jdUt - theirs[i]!.jdUt) * MINUTES;
        expect(off).toBeLessThan(INGRESS_TOLERANCE[body] ?? 45);
      }
    });

    it.each(bodies)('%s finds exactly the reference stations', (body) => {
      const mine = findStations(provider, body as PointId, scan, frame);
      const theirs = window.bodies[body]!.stations;
      expect(mine.length).toBe(theirs.length);
      for (let i = 0; i < mine.length; i += 1) {
        expect(mine[i]!.direction).toBe(theirs[i]!.direction);
        const off = Math.abs(mine[i]!.jdUt - theirs[i]!.jdUt) * MINUTES;
        expect(off).toBeLessThan(STATION_TOLERANCE[body] ?? 120);
      }
    });

    it('the Sun and Moon never station', () => {
      // Not a tautology — a speed-sign scan that is subtly wrong invents them.
      expect(findStations(provider, 'Sun', scan, frame)).toHaveLength(0);
      expect(findStations(provider, 'Moon', scan, frame)).toHaveLength(0);
    });

    it('every ingress lands on a sign boundary, to the arcsecond', () => {
      for (const body of ['Mars', 'Jupiter', 'Saturn'] as const) {
        for (const ingress of findIngresses(provider, body, scan, frame)) {
          const longitude = siderealLongitudeAt(provider, body, ingress.jdUt, frame);
          const fromBoundary = Math.min(longitude % 30, 30 - (longitude % 30));
          expect(fromBoundary * 3600).toBeLessThan(1);
        }
      }
    });
  });

  describe(`crossings, ${window.label}`, () => {
    it.each(Object.keys(window.crossings))(
      '%s crosses its target the same number of times',
      (body) => {
        const target = CROSSING_TARGETS[body]!;
        const mine = findCrossings(provider, body as PointId, target, scan, frame);
        const theirs = window.crossings[body]!;
        expect(mine.length).toBe(theirs.length);
        for (let i = 0; i < mine.length; i += 1) {
          expect(mine[i]!.retrograde).toBe(theirs[i]!.retrograde);
          expect(Math.abs(mine[i]!.jdUt - theirs[i]!.jdUt) * MINUTES).toBeLessThan(
            CROSSING_TOLERANCE,
          );
        }
      },
    );

    it('every crossing really is on the target degree', () => {
      for (const [body, target] of Object.entries(CROSSING_TARGETS)) {
        for (const c of findCrossings(provider, body as PointId, target, scan, frame)) {
          const longitude = siderealLongitudeAt(provider, body as PointId, c.jdUt, frame);
          const off = Math.abs(((longitude - target + 540) % 360) - 180);
          expect(off * 3600).toBeLessThan(1);
        }
      }
    });
  });
}

describe('the retrograde triple pass', () => {
  // The case the whole module exists for. A slow graha crossing a degree,
  // turning back over it, and crossing a third time going forward is three
  // dates a practitioner gives out, and returning only the first is the
  // classic error.
  it('finds all three passes and numbers them, direct then retrograde then direct', () => {
    const window = reference.windows.find((w) => w.label === '2020s')!;
    const passes = findCrossings(
      provider,
      'Saturn',
      300,
      { fromJd: window.fromJd, toJd: window.toJd },
      frame,
    );
    expect(passes).toHaveLength(3);
    expect(passes.map((p) => p.pass)).toEqual([1, 2, 3]);
    expect(passes.map((p) => p.retrograde)).toEqual([false, true, false]);
    // Spread across the better part of a year, not clustered.
    expect(passes[2]!.jdUt - passes[0]!.jdUt).toBeGreaterThan(200);
  });

  it('numbers separate visits as first passes, not a continuing loop', () => {
    // The Moon returns to a degree every month. Those are separate events, and
    // calling the second one "pass 2 of a retrograde loop" would be nonsense.
    const window = reference.windows[0]!;
    const passes = findCrossings(
      provider,
      'Moon',
      100,
      { fromJd: window.fromJd, toJd: window.fromJd + 120 },
      frame,
    );
    expect(passes.length).toBeGreaterThan(3);
    expect(passes.every((p) => p.pass === 1)).toBe(true);
  });
});

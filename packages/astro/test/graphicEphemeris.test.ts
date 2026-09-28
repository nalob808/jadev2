import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { NAKSHATRA_SPAN } from '../src/nakshatra.js';
import { findCrossings, findStations } from '../src/transits/scan.js';
import {
  GRAPHIC_EPHEMERIS_MODULI,
  foldLongitude,
  graphicEphemerisSeries,
  type GraphicEphemerisFrame,
  type GraphicEphemerisNatalPoint,
} from '../src/transits/graphicEphemeris.js';

/**
 * The graphic ephemeris core (brief §3).
 *
 * A crossing on a dial is a claim about the sky — "Saturn is at the same point
 * in its nakṣatra as your Moon on this date" — so it is checked three ways:
 * against the dial's own definition, against `findCrossings` (which is held to
 * Swiss Ephemeris in `transits.test.ts`), and against a retrograde loop, which
 * a smoothing renderer or a first-hit scanner would get wrong.
 */

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame: GraphicEphemerisFrame = {
  ayanamsa: 'lahiri',
  nodeType: 'mean',
  positionBasis: 'apparent',
};
// 2024-01-01 to 2025-07-01, which contains Saturn's 2024 retrograde station.
const WINDOW = { fromJd: 2_460_310.5, toJd: 2_460_857.5 };
const NATAL: GraphicEphemerisNatalPoint[] = [
  { id: 'Moon', longitude: 45.25 },
  { id: 'Sun', longitude: 322.7 },
  { id: 'Ascendant', longitude: 187.9 },
];
const BODIES = ['Sun', 'Mars', 'Jupiter', 'Saturn', 'Rahu'] as const;

const series = graphicEphemerisSeries(provider, WINDOW, frame, {
  bodies: BODIES,
  natal: NATAL,
  stepDays: 1,
  toleranceDays: 1e-5,
});

describe('the dials', () => {
  it('uses exactly 360/27 for the nakṣatra fold', () => {
    expect(GRAPHIC_EPHEMERIS_MODULI.nakshatra).toBe(360 / 27);
    expect(GRAPHIC_EPHEMERIS_MODULI.nakshatra).toBe(NAKSHATRA_SPAN);
    // Revatī's end is a whole number of folds: no drift across the zodiac.
    expect(foldLongitude(26 * NAKSHATRA_SPAN, 'nakshatra')).toBe(0);
    expect(foldLongitude(360 - 1e-12, 'nakshatra')).toBe(0);
  });

  it('folds Rohiṇī’s 45°15′ to 5°15′ on the nakṣatra dial and 15°15′ on the rāśi dial', () => {
    expect(foldLongitude(45.25, 'nakshatra')).toBeCloseTo(45.25 - 40, 12);
    expect(foldLongitude(45.25, 'rashi')).toBeCloseTo(15.25, 12);
  });
});

describe('the contacts', () => {
  it('finds some on every dial, so the checks below are not vacuous', () => {
    for (const fold of ['longitude', 'rashi', 'nakshatra'] as const) {
      expect(series.contacts[fold]!.length, fold).toBeGreaterThan(0);
    }
  });

  it('puts every contact on its natal line, on every dial', () => {
    for (const fold of ['longitude', 'rashi', 'nakshatra'] as const) {
      const modulus = GRAPHIC_EPHEMERIS_MODULI[fold];
      for (const contact of series.contacts[fold]!) {
        const off = foldLongitude(contact.transitLongitude - contact.natalLongitude, fold);
        expect(Math.min(off, modulus - off), `${fold} ${contact.transiting}`).toBeLessThan(1e-3);
      }
    }
  });

  it('agrees with findCrossings — itself held to Swiss Ephemeris — on the plain dial', () => {
    for (const body of BODIES) {
      for (const point of NATAL) {
        const expected = findCrossings(provider, body, point.longitude, WINDOW, frame).map(
          (c) => c.jdUt,
        );
        const drawn = series.contacts
          .longitude!.filter((c) => c.transiting === body && c.natalPoint === point.id)
          .map((c) => c.jdUt);
        expect(drawn.length, `${body} over ${point.id}`).toBe(expected.length);
        drawn.forEach((jd, i) => expect(Math.abs(jd - expected[i]!) * 1440).toBeLessThan(1));
      }
    }
  });

  it('finds every plain-dial conjunction on the folded dials too', () => {
    // A conjunction is a separation of 0, which is a multiple of 30° and of 13°20′.
    for (const fold of ['rashi', 'nakshatra'] as const) {
      for (const conjunction of series.contacts.longitude!) {
        const match = series.contacts[fold]!.find(
          (c) =>
            c.transiting === conjunction.transiting &&
            c.natalPoint === conjunction.natalPoint &&
            Math.abs(c.jdUt - conjunction.jdUt) < 1e-3,
        );
        expect(
          match,
          `${fold}: ${conjunction.transiting} on ${conjunction.natalPoint}`,
        ).toBeDefined();
      }
    }
  });
});

describe('retrograde', () => {
  const station = findStations(provider, 'Saturn', WINDOW, frame).find(
    (s) => s.direction === 'retrograde',
  )!;

  it('keeps the loop: Saturn crosses a degree just behind its station three times', () => {
    expect(station).toBeDefined();
    const natal = [{ id: 'Moon' as const, longitude: station.longitude - 0.5 }];
    const loop = graphicEphemerisSeries(provider, WINDOW, frame, {
      bodies: ['Saturn'],
      natal,
      stepDays: 1,
      folds: ['longitude'],
    });
    const passes = loop.contacts.longitude!;
    expect(passes).toHaveLength(3);
    expect(passes.map((p) => p.retrograde)).toEqual([false, true, false]);
  });

  it('never smooths the station away: the unwrapped curve really turns back', () => {
    const saturn = series.tracks.find((t) => t.body === 'Saturn')!;
    const retrograde = saturn.samples.filter((s) => s.retrograde);
    expect(retrograde.length).toBeGreaterThan(60);
    for (let i = 1; i < saturn.samples.length; i += 1) {
      const a = saturn.samples[i - 1]!;
      const b = saturn.samples[i]!;
      if (a.retrograde && b.retrograde) {
        expect(b.unwrappedLongitude).toBeLessThan(a.unwrappedLongitude);
      }
    }
  });
});

describe('the frame is carried, never assumed', () => {
  it('records every setting that moved a longitude', () => {
    expect(series.frame).toMatchObject({
      ayanamsa: 'lahiri',
      nodeType: 'mean',
      positionBasis: 'apparent',
      providerId: 'astronomy-engine',
      precisionClass: 'interactive',
    });
    expect(series.epochs.every((e) => e.ayanamsaValue > 23 && e.ayanamsaValue < 25)).toBe(true);
  });

  it('reports latitude without flattening it into the plotted value', () => {
    const mars = series.tracks.find((t) => t.body === 'Mars')!;
    expect(mars.samples.some((s) => Math.abs(s.latitude) > 0.1)).toBe(true);
  });

  it('computes only the dials asked for', () => {
    const one = graphicEphemerisSeries(provider, WINDOW, frame, {
      bodies: ['Saturn'],
      natal: NATAL,
      stepDays: 2,
      folds: ['nakshatra'],
    });
    expect(Object.keys(one.contacts)).toEqual(['nakshatra']);
  });
});

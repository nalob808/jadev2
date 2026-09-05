import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider } from './ephemeris/astronomyEngine.js';
import { positionsAcrossDay } from './undatedDay.js';

/**
 * What a date alone determines.
 *
 * The assertions that matter are about *uncertainty being reported*, because
 * the failure this module exists to prevent is silent confidence: software that
 * assumes noon and draws an ascendant it cannot know.
 */

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = { ayanamsa: 'lahiri' } as const;

// An arbitrary but fixed day. JD 2451545.0 is 2000-01-01 12:00 TT.
const START = 2451544.5;
const END = START + 1;

const day = positionsAcrossDay(provider, START, END, frame);
const by = (id: string) => day.positions.find((p) => p.id === id)!;

describe('positionsAcrossDay', () => {
  it('covers the nine grahas and no angles', () => {
    expect(day.positions).toHaveLength(9);
    expect(day.positions.map((p) => p.id)).not.toContain('Ascendant');
  });

  it('states outright that the ascendant cannot be known', () => {
    // A type-level and value-level refusal. A caller cannot read an ascendant
    // out of this result because there is not one in it.
    expect(day.ascendantUnknowable).toBe(true);
    expect(Object.keys(day)).not.toContain('houses');
  });

  it('finds the slow grahas certain', () => {
    // Saturn moves about two arcminutes a day. Its sign is not in doubt, and
    // reporting it as uncertain would be as wrong as inventing an ascendant.
    expect(by('Saturn').signCertain).toBe(true);
    expect(Math.abs(by('Saturn').motion)).toBeLessThan(0.2);
    expect(by('Jupiter').signCertain).toBe(true);
  });

  it('reports the Moon as moving far enough to lose its nakṣatra', () => {
    // ~13°/day, and a nakṣatra is 13°20′ wide, so the Moon changes nakṣatra
    // almost every day. This is the single biggest thing a missing time costs
    // a Vedic chart.
    const moon = by('Moon');
    expect(Math.abs(moon.motion)).toBeGreaterThan(11);
    expect(moon.nakshatraCertain).toBe(false);
  });

  it('gives both possibilities when a sign is crossed, not one', () => {
    for (const position of day.positions) {
      if (position.signCertain) {
        expect(position.signStart).toBe(position.signEnd);
      } else {
        // The honest answer to "which sign" is the pair.
        expect(position.signStart).not.toBe(position.signEnd);
      }
    }
  });

  it('wraps motion rather than reporting 359° for a small step', () => {
    // A graha crossing 0° Aries during the day must not read as having
    // travelled almost the whole zodiac backwards.
    for (const position of day.positions) {
      expect(Math.abs(position.motion)).toBeLessThan(20);
    }
  });

  it('is a pure function of its arguments', () => {
    const again = positionsAcrossDay(provider, START, END, frame);
    expect(JSON.stringify(again)).toBe(JSON.stringify(day));
  });

  it('never returns a name that is missing or malformed', () => {
    for (const position of day.positions) {
      expect(position.signStart.length).toBeGreaterThan(2);
      expect(position.nakshatraStart.length).toBeGreaterThan(2);
      expect(Number.isFinite(position.longitudeStart)).toBe(true);
      expect(Number.isFinite(position.longitudeEnd)).toBe(true);
    }
  });
});

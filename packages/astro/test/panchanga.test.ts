import { describe, expect, it } from 'vitest';
import golden from './fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { computeChart } from '../src/chart.js';
import {
  FIXED_KARANAS,
  karanaOf,
  MOVABLE_KARANAS,
  nityaYogaOf,
  panchangaOf,
  tithiOf,
  varaOf,
  YOGA_NAMES,
} from '../src/panchanga.js';
import { DEFAULT_SETTINGS } from '../src/types.js';

const provider = new AstronomyEngineProvider();
type Case = (typeof golden.cases)[number];

describe('pañcāṅga against Swiss Ephemeris', () => {
  for (const c of golden.cases as Case[]) {
    it(c.label, () => {
      const chart = computeChart(
        provider,
        { jdUt: c.jdUt, location: c.location },
        DEFAULT_SETTINGS,
      );
      const sun = chart.points.Sun!.longitude;
      const moon = chart.points.Moon!.longitude;

      expect(tithiOf(sun, moon).index).toBe(c.panchanga.tithiIndex);
      expect(tithiOf(sun, moon).paksha).toBe(c.panchanga.paksha);
      expect(karanaOf(sun, moon).index).toBe(c.panchanga.karanaIndex);
      expect(nityaYogaOf(sun, moon).index).toBe(c.panchanga.yogaIndex);
      expect(chart.points.Moon!.nakshatra.index + 1).toBe(c.panchanga.nakshatraIndex);
    });
  }
});

describe('sunrise and sunset', () => {
  for (const c of golden.cases as Case[]) {
    it(c.label, () => {
      const { sunrise, sunset } = provider.sunriseSunset(
        c.jdUt,
        c.location.latitude,
        c.location.longitude,
      );
      if (c.sunrise === null) {
        // Polar day or night. Must be reported as absent, never faked.
        expect(sunrise).toBeNull();
        return;
      }
      expect(sunrise).not.toBeNull();
      // Two minutes. Sunrise depends on the refraction and disc conventions,
      // which differ slightly between implementations; the vāra only changes
      // for a birth inside that window, and `beforeSunrise` flags it.
      expect(Math.abs(sunrise! - c.sunrise!) * 24 * 60).toBeLessThan(2);
      if (c.sunset !== null && sunset !== null) {
        expect(Math.abs(sunset - c.sunset) * 24 * 60).toBeLessThan(2);
      }
    });
  }
});

describe('the karaṇa sequence is not a simple cycle', () => {
  it('opens with Kiṁstughna and closes with Śakuni, Catuṣpāda, Nāga', () => {
    const at = (halfTithi: number) => karanaOf(0, halfTithi * 6 + 3).name;
    expect(at(0)).toBe('Kimstughna');
    expect(at(57)).toBe('Shakuni');
    expect(at(58)).toBe('Chatushpada');
    expect(at(59)).toBe('Naga');
  });

  it('runs the seven movable karaṇas exactly eight times', () => {
    const counts = new Map<string, number>();
    for (let half = 0; half < 60; half += 1) {
      const name = karanaOf(0, half * 6 + 3).name;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    for (const name of MOVABLE_KARANAS) expect(counts.get(name), name).toBe(8);
    for (const name of FIXED_KARANAS) expect(counts.get(name), name).toBe(1);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(60);
  });
});

describe('tithi', () => {
  it('numbers 1 to 30 and names Purnima and Amavasya correctly', () => {
    expect(tithiOf(0, 1).index).toBe(1);
    expect(tithiOf(0, 1).name).toBe('Pratipada');
    expect(tithiOf(0, 175).index).toBe(15);
    expect(tithiOf(0, 175).name).toBe('Purnima');
    expect(tithiOf(0, 175).paksha).toBe('shukla');
    expect(tithiOf(0, 185).index).toBe(16);
    expect(tithiOf(0, 185).paksha).toBe('krishna');
    expect(tithiOf(0, 185).name).toBe('Pratipada');
    expect(tithiOf(0, 359).index).toBe(30);
    expect(tithiOf(0, 359).name).toBe('Amavasya');
  });

  it('stays in range across the whole circle', () => {
    for (let i = 0; i < 3600; i += 1) {
      const t = tithiOf(0, i / 10);
      expect(t.index).toBeGreaterThanOrEqual(1);
      expect(t.index).toBeLessThanOrEqual(30);
      expect(t.inPaksha).toBeGreaterThanOrEqual(1);
      expect(t.inPaksha).toBeLessThanOrEqual(15);
      expect(t.elapsed).toBeGreaterThanOrEqual(0);
      expect(t.elapsed).toBeLessThan(1);
    }
  });
});

describe('nitya yoga', () => {
  it('has 27 names and stays in range', () => {
    expect(YOGA_NAMES).toHaveLength(27);
    for (let i = 0; i < 720; i += 1) {
      const y = nityaYogaOf(i / 2, i);
      expect(y.index).toBeGreaterThanOrEqual(1);
      expect(y.index).toBeLessThanOrEqual(27);
    }
  });
});

describe('vāra begins at sunrise, not midnight', () => {
  const sunrise = 2452221.0108017293; // 7 Nov 2001, Ann Arbor

  it('a birth after sunrise takes the civil weekday', () => {
    const vara = varaOf(sunrise + 0.2, sunrise)!;
    expect(vara.beforeSunrise).toBe(false);
    expect(vara.name).toBe('Wednesday'); // 7 Nov 2001 was a Wednesday
    expect(vara.lord).toBe('Mercury');
  });

  it('a birth BEFORE sunrise still belongs to the previous vāra', () => {
    // The single most common silent error in pañcāṅga software.
    const vara = varaOf(sunrise - 0.1, sunrise)!;
    expect(vara.beforeSunrise).toBe(true);
    expect(vara.name).toBe('Tuesday');
    expect(vara.lord).toBe('Mars');
  });

  it('reports nothing rather than guessing when the sun never rises', () => {
    expect(varaOf(2452221.5, null)).toBeNull();
  });
});

describe('panchangaOf assembles all five limbs', () => {
  it('returns every limb for the reference chart', () => {
    const c = (golden.cases as Case[])[0]!;
    const chart = computeChart(provider, { jdUt: c.jdUt, location: c.location });
    const { sunrise } = provider.sunriseSunset(c.jdUt, c.location.latitude, c.location.longitude);
    const p = panchangaOf(
      chart.points.Sun!.longitude,
      chart.points.Moon!.longitude,
      c.jdUt,
      sunrise,
    );
    expect(p.tithi.index).toBe(c.panchanga.tithiIndex);
    expect(p.nakshatra.name).toBe('Pushya');
    expect(p.yoga.index).toBe(c.panchanga.yogaIndex);
    expect(p.karana.index).toBe(c.panchanga.karanaIndex);
    expect(p.vara?.name).toBe('Wednesday');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  dashaChainAt,
  skyNow,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import {
  GRAHA_VOICE,
  HOUSES,
  HOUSE_VOICE,
  connectionShape,
  houseReadings,
  plainChartReading,
  plainPeriods,
  plainPlanets,
  plainSadeSati,
  plainTransits,
} from '../src/index.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('../../astro/test/fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const charts: { label: string; chart: ComputedChart }[] = golden.cases.map((c) => ({
  label: c.label,
  chart: computeChart(provider, { jdUt: c.jdUt, location: c.location }),
}));

/**
 * The rule that does not relax on the reading subdomain.
 *
 * The plain voice exists because the technical register was unreadable, and the
 * things it is allowed to drop are presentational: factors move behind a tap,
 * and paragraphs may join several placements into one observation. What it is
 * *not* allowed to drop is CLAUDE.md #6.
 *
 * This matters more here than anywhere else in Jade, not less. Prose written to
 * be believed is believed, and a warm second-person sentence telling somebody
 * what their eighth house means for their health would be read as a medical
 * opinion by the exact person least equipped to discount it. So the guard runs
 * against the composed output, at full strength.
 *
 * "cancer" is absent for the same reason as in `houseReading.test.ts`: Karka is
 * Cancer, and the sign name is indistinguishable from the disease. The disease
 * sense stays covered by the other terms.
 */
const FORBIDDEN_PREDICTION =
  /\b(will die|dies|death|dying|fatal|lifespan|longevity|terminal|disease|illness|ill health|diagnos\w*|lawsuit|litigation|imprison\w*|convict\w*|sentenced|bankrupt\w*|miscarriage)\b/i;

/** Sentences assembled out of holes. */
const BROKEN = /undefined|NaN|null|\[object|Infinity|\s{2,}|,\s*\.|\s+\./;

describe('the plain-voice reading', () => {
  it('reads every house of every fixture', () => {
    for (const { label, chart } of charts) {
      const reading = plainChartReading(chart);
      expect(reading.houses, label).toHaveLength(12);
      for (const house of reading.houses) {
        expect(house.paragraphs.length, `${label} h${house.house}`).toBeGreaterThan(0);
        expect(house.title, `${label} h${house.house}`).toBeTruthy();
        expect(house.asks).toMatch(/\?$/);
      }
    }
  });

  it('never predicts death, illness or a legal outcome', () => {
    for (const { label, chart } of charts) {
      const reading = plainChartReading(chart);
      const everyParagraph = [
        ...reading.overall,
        ...reading.houses.flatMap((house) => house.paragraphs),
      ];
      for (const paragraph of everyParagraph) {
        expect(paragraph.text, `${label}: ${paragraph.text.slice(0, 60)}`).not.toMatch(
          FORBIDDEN_PREDICTION,
        );
      }
    }
  });

  /**
   * The relocation, asserted.
   *
   * Moving the workings behind a tap is only legitimate if they are still there.
   * A paragraph with no workings is a free-floating claim, which is the thing
   * the technical register's inline factors existed to prevent.
   */
  it('keeps the workings behind every paragraph, never drops them', () => {
    for (const { label, chart } of charts) {
      const reading = plainChartReading(chart);
      const everyParagraph = [
        ...reading.overall,
        ...reading.houses.flatMap((house) => house.paragraphs),
      ];
      for (const paragraph of everyParagraph) {
        expect(
          paragraph.workings.length,
          `${label}: ${paragraph.text.slice(0, 60)}`,
        ).toBeGreaterThan(0);
        for (const working of paragraph.workings) {
          expect(working.label).toBeTruthy();
          expect(working.detail).toBeTruthy();
          expect(working.detail, paragraph.text.slice(0, 60)).not.toMatch(BROKEN);
        }
      }
    }
  });

  it('assembles prose without holes in it', () => {
    for (const { label, chart } of charts) {
      const reading = plainChartReading(chart);
      const everyParagraph = [
        ...reading.overall,
        ...reading.houses.flatMap((house) => house.paragraphs),
      ];
      for (const paragraph of everyParagraph) {
        expect(paragraph.text, label).not.toMatch(BROKEN);
        // Real sentences, not fragments.
        expect(paragraph.text.trim(), label).toMatch(/[.!?]$/);
        expect(paragraph.text.length, label).toBeGreaterThan(40);
      }
    }
  });

  /**
   * The friendly version and the technical version describe the same chart.
   *
   * They are two registers of one computation, and the moment they disagree one
   * of them is lying to somebody. Checked structurally rather than by text: the
   * plain reading must carry the same sign, ruler and occupants as the technical
   * reading it was built from.
   */
  it('never disagrees with the technical reading about the chart', () => {
    for (const { label, chart } of charts) {
      const plain = plainChartReading(chart);
      const technical = houseReadings(chart);
      for (const house of plain.houses) {
        const match = technical.find((reading) => reading.house === house.house)!;
        expect(house.technical.sign, `${label} h${house.house}`).toBe(match.sign);
        expect(house.technical.lord.lord).toBe(match.lord.lord);
        expect(house.technical.lord.inHouse).toBe(match.lord.inHouse);
        expect(house.technical.occupants.map((o) => o.graha)).toEqual(
          match.occupants.map((o) => o.graha),
        );

        // The prose really does name the sign and the ruler it claims.
        const opening = house.paragraphs[0]!.text;
        expect(opening, `${label} h${house.house}`).toContain(match.sign);
        expect(opening).toContain(match.lord.lord);
      }
    }
  });

  it('says how many houses are empty, and counts correctly', () => {
    for (const { label, chart } of charts) {
      const plain = plainChartReading(chart);
      const technical = houseReadings(chart);
      const empty = technical.filter((reading) => reading.occupants.length === 0).length;
      const paragraph = plain.overall.find((entry) => /houses have no planet/.test(entry.text));
      expect(paragraph, label).toBeDefined();
      expect(paragraph!.text, label).toContain(String(empty));
    }
  });
});

describe('the voice library', () => {
  /**
   * Both registers cover the same ground.
   *
   * The plain library is a second way of saying what `significations/` says. If
   * one grows an entry the other lacks, a reader flipping between the reading
   * surface and the technical one finds a hole.
   */
  it('covers every house the significations library covers', () => {
    expect(HOUSE_VOICE).toHaveLength(HOUSES.length);
    for (const entry of HOUSES) {
      expect(
        HOUSE_VOICE.some((voice) => voice.house === entry.number),
        `house ${entry.number}`,
      ).toBe(true);
    }
  });

  it('covers all nine grahas', () => {
    const ids = GRAHA_VOICE.map((voice) => voice.id);
    for (const id of [
      'Sun',
      'Moon',
      'Mars',
      'Mercury',
      'Jupiter',
      'Venus',
      'Saturn',
      'Rahu',
      'Ketu',
    ]) {
      expect(ids, id).toContain(id);
    }
    expect(GRAHA_VOICE).toHaveLength(9);
  });

  it('writes in the second person, without untranslated Sanskrit', () => {
    for (const voice of HOUSE_VOICE) {
      expect(voice.asks, `house ${voice.house}`).toMatch(/\?$/);
      // The plain register may name a Sanskrit term but must gloss it; the bare
      // technical vocabulary belongs in `significations/`, not here.
      expect(voice.is, `house ${voice.house}`).not.toMatch(
        /\b(kendra|trikona|dusthana|upachaya|maraka|bhava|graha|drishti)\b/i,
      );
    }
  });

  it('never carries a forbidden prediction in the library itself', () => {
    for (const voice of HOUSE_VOICE) {
      for (const field of [voice.is, voice.asks, voice.whenEmpty, voice.whenBusy]) {
        expect(field, `house ${voice.house}`).not.toMatch(FORBIDDEN_PREDICTION);
      }
    }
    for (const voice of GRAHA_VOICE) {
      for (const field of [voice.temperament, voice.brings, voice.whenStrong, voice.whenStrained]) {
        expect(field, voice.id).not.toMatch(FORBIDDEN_PREDICTION);
      }
    }
  });
});

describe('connection shapes', () => {
  it('reads a house against itself as its own', () => {
    for (let house = 1; house <= 12; house += 1) {
      expect(connectionShape(house, house)).toBe('own');
    }
  });

  it('finds the trines, the pillars and the hard houses where the tradition puts them', () => {
    // Counted from the first house, so the answers are the familiar ones.
    expect(connectionShape(1, 5)).toBe('trine');
    expect(connectionShape(1, 9)).toBe('trine');
    expect(connectionShape(1, 4)).toBe('kendra');
    expect(connectionShape(1, 7)).toBe('kendra');
    expect(connectionShape(1, 10)).toBe('kendra');
    expect(connectionShape(1, 6)).toBe('dusthana');
    expect(connectionShape(1, 8)).toBe('dusthana');
    expect(connectionShape(1, 12)).toBe('dusthana');
    expect(connectionShape(1, 3)).toBe('upachaya');
    expect(connectionShape(1, 11)).toBe('upachaya');
  });

  it('counts from the house being read, not from the ascendant', () => {
    // The 5th from the 7th is the 11th. This is the bug that would make every
    // reading subtly wrong for eleven of the twelve houses.
    expect(connectionShape(7, 11)).toBe('trine');
    expect(connectionShape(7, 3)).toBe('trine');
    expect(connectionShape(7, 10)).toBe('kendra');
    expect(connectionShape(10, 1)).toBe('kendra');
  });

  it('always returns a shape, for every pair', () => {
    for (let from = 1; from <= 12; from += 1) {
      for (let to = 1; to <= 12; to += 1) {
        expect(connectionShape(from, to), `${from}→${to}`).toBeTruthy();
      }
    }
  });
});

describe('the timing reading', () => {
  const nowJd = 2461000.5; // a fixed instant — the composers take their clock as an argument
  const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
  const frame = { ayanamsa: 'lahiri' as const };
  const SLOW = ['Jupiter', 'Saturn', 'Rahu', 'Ketu'] as const;

  const cases = charts.map(({ label, chart }) => {
    const dashas = vimshottari(chart.points.Moon!.longitude, 2451545, {
      levels: 3,
      yearLength: 'julian',
    });
    const sky = skyNow(provider, nowJd, frame, [...SLOW], 'mean');
    return {
      label,
      chart,
      periods: plainPeriods(chart, dashaChainAt(dashas, nowJd), nowJd),
      transits: plainTransits(chart, sky),
      sadeSati: plainSadeSati(
        chart,
        sky.find((p) => p.id === 'Saturn'),
      ),
      planets: plainPlanets(chart),
    };
  });

  /**
   * The guard, extended to the surface that most invites a forecast.
   *
   * A period or a transit is exactly where classical literature makes
   * predictions, and where a reader is most primed to receive one. If #6 is
   * going to be broken anywhere in Jade it will be broken here, so the guard
   * runs over every composed sentence of every timing layer.
   */
  it('never predicts death, illness or a legal outcome, in any timing layer', () => {
    for (const entry of cases) {
      const everyParagraph = [
        ...entry.periods.flatMap((period) => period.paragraphs),
        ...entry.transits,
        ...(entry.sadeSati ? [entry.sadeSati] : []),
        ...entry.planets.flatMap((planet) => planet.paragraphs),
      ];
      expect(everyParagraph.length, entry.label).toBeGreaterThan(0);
      for (const paragraph of everyParagraph) {
        expect(paragraph.text, `${entry.label}: ${paragraph.text.slice(0, 60)}`).not.toMatch(
          FORBIDDEN_PREDICTION,
        );
      }
    }
  });

  it('keeps the workings behind every timing paragraph too', () => {
    for (const entry of cases) {
      const everyParagraph = [
        ...entry.periods.flatMap((period) => period.paragraphs),
        ...entry.transits,
        ...(entry.sadeSati ? [entry.sadeSati] : []),
        ...entry.planets.flatMap((planet) => planet.paragraphs),
      ];
      for (const paragraph of everyParagraph) {
        expect(paragraph.workings.length, paragraph.text.slice(0, 60)).toBeGreaterThan(0);
        expect(paragraph.text, entry.label).not.toMatch(BROKEN);
        expect(paragraph.text.trim(), entry.label).toMatch(/[.!?]$/);
      }
    }
  });

  it('reads the running chain, outermost first, with sane progress', () => {
    for (const entry of cases) {
      expect(entry.periods.length, entry.label).toBeGreaterThan(0);
      for (let i = 0; i < entry.periods.length; i += 1) {
        const period = entry.periods[i]!;
        expect(period.level, entry.label).toBe(i + 1);
        expect(period.startJd).toBeLessThanOrEqual(nowJd);
        expect(period.endJd).toBeGreaterThan(nowJd);
        expect(period.elapsed).toBeGreaterThanOrEqual(0);
        expect(period.elapsed).toBeLessThanOrEqual(1);
        expect(period.remainingDays).toBeGreaterThan(0);
      }
      // Each level sits inside the one above it.
      for (let i = 1; i < entry.periods.length; i += 1) {
        expect(entry.periods[i]!.startJd).toBeGreaterThanOrEqual(entry.periods[i - 1]!.startJd);
        expect(entry.periods[i]!.endJd).toBeLessThanOrEqual(entry.periods[i - 1]!.endJd + 1e-6);
      }
    }
  });

  it('reads only the slow transits, and places each in a real house', () => {
    for (const entry of cases) {
      expect(entry.transits).toHaveLength(SLOW.length);
      for (const paragraph of entry.transits) {
        const house = paragraph.workings.find((w) => w.label === 'Crossing');
        expect(house, entry.label).toBeDefined();
        expect(house!.detail).toMatch(
          /your (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth) house/,
        );
      }
    }
  });

  /**
   * Sade sati is reported by position, never by severity.
   *
   * The most-searched idea in Vedic astrology and the most badly handled. The
   * test asserts Jade states where Saturn actually is and, whenever the stretch
   * is running, prints the caveat refusing to say what it means for the reader.
   */
  it('states sade sati by position and refuses to rate it', () => {
    for (const entry of cases) {
      const paragraph = entry.sadeSati;
      expect(paragraph, entry.label).not.toBeNull();
      const moonSign = entry.chart.points.Moon!.signIndex;
      const saturn = skyNow(provider, nowJd, frame, ['Saturn'], 'mean')[0]!;
      const running =
        saturn.signIndex === moonSign ||
        saturn.signIndex === (moonSign + 1) % 12 ||
        saturn.signIndex === (moonSign + 11) % 12;
      if (running) {
        expect(paragraph!.text, entry.label).toContain('not a verdict');
      } else {
        expect(paragraph!.text, entry.label).toMatch(/not running/);
      }
      expect(paragraph!.text).not.toMatch(/\b(severe|dangerous|terrible|devastating|doomed)\b/i);
    }
  });

  it('reads all nine planets and agrees with the chart about each', () => {
    for (const entry of cases) {
      expect(entry.planets, entry.label).toHaveLength(9);
      for (const planet of entry.planets) {
        const point = entry.chart.points[planet.id]!;
        expect(planet.sign, `${entry.label} ${planet.id}`).toBe(point.sign);
        expect(planet.house).toBe(point.house);
        expect(planet.retrograde).toBe(point.retrograde);
        // A planet rules zero, one or two houses — never more.
        expect(planet.rules.length).toBeLessThanOrEqual(2);
      }
      // Across the chart, the twelve houses are ruled by exactly seven planets.
      const ruling = entry.planets.filter((planet) => planet.rules.length > 0);
      expect(ruling.reduce((sum, planet) => sum + planet.rules.length, 0)).toBe(12);
    }
  });
});

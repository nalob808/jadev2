import { describe, expect, it } from 'vitest';
import golden from '../../astro/test/fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider, computeChart, type ComputedChart } from '@jade/astro';
import { readYogas } from '../src/traditions/yogaReading.js';
import { mentionsForbiddenTopic } from '../src/reading.js';

/**
 * Yogas are the part of a reading most likely to frighten somebody, and the
 * part a careless implementation turns into a score. So the tests are mostly
 * about two refusals: never printing a yoga without the cancellation the
 * detector already found, and never implying that more yogas is better.
 */
const provider = new AstronomyEngineProvider();
const charts: Array<{ label: string; chart: ComputedChart }> = golden.cases.map((fixture) => ({
  label: fixture.label,
  chart: computeChart(provider, { jdUt: fixture.jdUt, location: fixture.location }),
}));

describe('every chart', () => {
  it('gets a reading, even with nothing formed', () => {
    for (const { label, chart } of charts) {
      const reading = readYogas(chart);
      if (reading.families.length === 0) {
        expect(reading.opening, label).toMatch(/list of rules/i);
      }
      for (const family of reading.families) {
        expect(family.body.length, `${label}/${family.family}`).toBeGreaterThan(0);
        expect(family.title.length, `${label}/${family.family}`).toBeGreaterThan(5);
      }
    }
  });

  /* CLAUDE.md #5. */
  it('shows the placements behind every family', () => {
    for (const { label, chart } of charts) {
      for (const family of readYogas(chart).families) {
        expect(family.workings.length, `${label}/${family.family}`).toBeGreaterThan(0);
        for (const working of family.workings) {
          expect(working.detail, `${label}/${family.family}`).not.toMatch(/undefined|NaN/);
        }
      }
    }
  });

  /* CLAUDE.md #6. Ariṣṭa-adjacent language is exactly where this would slip. */
  it('never predicts death, illness or a legal outcome', () => {
    for (const { label, chart } of charts) {
      const reading = readYogas(chart);
      for (const text of [
        reading.opening ?? '',
        ...reading.families.flatMap((one) => [one.title, ...one.body]),
      ]) {
        expect(mentionsForbiddenTopic(text), `${label}: ${text.slice(0, 50)}`).toBe(false);
      }
    }
  });
});

describe('cancellations', () => {
  /*
   * The whole reason this module exists. A yoga reported without its
   * cancellation in the same breath is astrologically dishonest — it is the
   * difference between a frightening reading and an ordinary chart.
   */
  it('names the cancellation whenever the detector found one', () => {
    for (const { label, chart } of charts) {
      for (const family of readYogas(chart).families) {
        for (const hit of family.hits) {
          if ((hit.cancellations?.length ?? 0) === 0) continue;
          const said = family.body.join(' ');
          expect(said, `${label}/${hit.id}`).toContain('formed and cancelled');
          for (const cancellation of hit.cancellations!) {
            expect(said, `${label}/${hit.id}`).toContain(cancellation);
          }
        }
      }
    }
  });

  it('says so when everything formed was also cancelled', () => {
    for (const { chart } of charts) {
      const reading = readYogas(chart);
      if (reading.families.length === 0) continue;
      const allCancelled = reading.families.every((one) => one.allCancelled);
      if (allCancelled) {
        expect(reading.opening).toMatch(/geometry is present and the reading is not/i);
      }
    }
  });
});

describe('what it refuses to say', () => {
  /* A yoga is formed or it is not. Counting them measures how many rules
     somebody wrote down, not how good a chart is. */
  it('never scores, ranks or totals', () => {
    for (const { label, chart } of charts) {
      const reading = readYogas(chart);
      const text = [reading.opening ?? '', ...reading.families.flatMap((one) => one.body)].join(
        ' ',
      );
      expect(text, label).not.toMatch(/\b(?:score|rating|out of|strength of \d|\d+\/\d+)\b/i);
      expect(text, label).not.toMatch(/\bstrongest yoga\b|\bbest yoga\b/i);
    }
  });

  /* Families with nothing in them are absent, not reported empty. A reading
     that lists what is missing is listing the rules. */
  it('never reports a family with no hits', () => {
    for (const { label, chart } of charts) {
      for (const family of readYogas(chart).families) {
        expect(family.hits.length, `${label}/${family.family}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('the opening', () => {
  /* Lowercasing a whole title turned "what stands beside the Moon" into "the
     moon", which is a different thing in this system. */
  it('keeps the luminaries capitalised', () => {
    for (const { label, chart } of charts) {
      const opening = readYogas(chart).opening ?? '';
      expect(opening, label).not.toMatch(/\bthe moon\b/);
      expect(opening, label).not.toMatch(/\bthe sun\b/);
    }
  });

  it('starts with a capital', () => {
    for (const { label, chart } of charts) {
      const opening = readYogas(chart).opening;
      if (!opening) continue;
      expect(opening.charAt(0), label).toBe(opening.charAt(0).toUpperCase());
    }
  });
});

describe('families', () => {
  it('groups the five Mahāpuruṣa as one statement, not five', () => {
    for (const { label, chart } of charts) {
      const reading = readYogas(chart);
      const mahapurusha = reading.families.filter((one) => one.family === 'mahapurusha');
      expect(mahapurusha.length, label).toBeLessThanOrEqual(1);
    }
  });

  it('explains a family once however many of its members fired', () => {
    for (const { label, chart } of charts) {
      for (const family of readYogas(chart).families) {
        if (family.hits.length < 2) continue;
        /* The "what" sentence appears in the first paragraph and nowhere
           else, regardless of how many hits the family holds. */
        const occurrences = family.body.filter((p) =>
          p.includes(family.body[0]!.split('. ').slice(-1)[0]!),
        );
        expect(occurrences.length, `${label}/${family.family}`).toBeLessThanOrEqual(1);
      }
    }
  });

  /* A yoga whose id nobody classified must still read, rather than vanish. */
  it('loses no detected yoga', () => {
    for (const { label, chart } of charts) {
      const detected = (chart.yogas ?? []).length;
      const read = readYogas(chart).families.reduce((sum, one) => sum + one.hits.length, 0);
      expect(read, label).toBe(detected);
    }
  });
});

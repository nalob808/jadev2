import { describe, expect, it } from 'vitest';
import golden from '../../astro/test/fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider, computeChart, skyNow, type ComputedChart } from '@jade/astro';
import { readAllAreas, readArea, type AreaReading } from '../src/traditions/lifeAreas.js';
import { mentionsForbiddenTopic } from '../src/reading.js';

/**
 * Twelve areas is twelve chances to write a horoscope.
 *
 * The failure mode for a feature like this is not an incorrect claim, it is a
 * generic one: twelve paragraphs of the same shape with the nouns swapped,
 * which would pass a smoke test and be worth nothing. So most of what is held
 * here is about difference — between areas in one chart, and between charts in
 * the same area — plus the two constitutional rules, and the sentence-case bug
 * that keeps coming back because every sentence is assembled rather than
 * written.
 */
const provider = new AstronomyEngineProvider();
const charts: Array<{ label: string; chart: ComputedChart }> = golden.cases.map((fixture) => ({
  label: fixture.label,
  chart: computeChart(provider, { jdUt: fixture.jdUt, location: fixture.location }),
}));

const PLACES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/* One fixed instant, never a clock, so the crossing assertions are stable. */
const SKY = skyNow(provider, golden.cases[0]!.jdUt + 365.25 * 30, { ayanamsa: 'lahiri' });

function everyArea(fn: (area: AreaReading, label: string) => void): void {
  for (const { label, chart } of charts) {
    for (const place of PLACES) fn(readArea(chart, place), `${label}/${place}`);
  }
}

describe('every area of every chart', () => {
  it('says something, and says what it is about', () => {
    everyArea((area, where) => {
      expect(area.body.length, where).toBeGreaterThan(0);
      expect(area.title.length, where).toBeGreaterThan(3);
      expect(area.governs.length, where).toBeGreaterThan(10);
      expect(area.asks.length, where).toBeGreaterThan(10);
      for (const paragraph of area.body) {
        expect(paragraph.length, where).toBeGreaterThan(40);
      }
    });
  });

  /* CLAUDE.md #5: grounded, with the factors alongside. */
  it('shows the placements behind it', () => {
    everyArea((area, where) => {
      expect(area.workings.length, where).toBeGreaterThan(1);
      for (const one of area.workings) {
        expect(one.label.length, where).toBeGreaterThan(0);
        expect(one.detail.length, where).toBeGreaterThan(0);
      }
    });
  });

  /* CLAUDE.md #6. The sixth and eighth are where this rule gets tested. */
  it('never predicts death, illness or a legal outcome', () => {
    everyArea((area, where) => {
      for (const text of [area.title, area.governs, area.asks, ...area.body, area.liveNow ?? '']) {
        expect(mentionsForbiddenTopic(text), `${where}: ${text.slice(0, 60)}`).toBe(false);
      }
    });
  });

  it('starts every sentence with a capital', () => {
    everyArea((area, where) => {
      for (const paragraph of area.body) {
        /* Split on terminal punctuation, keeping decimals and degrees intact. */
        const sentences = paragraph.split(/(?<=[.?!])\s+(?=[^\s])/);
        for (const sentence of sentences) {
          const first = sentence.trimStart().charAt(0);
          expect(first === first.toUpperCase(), `${where}: "${sentence.slice(0, 60)}"`).toBe(true);
        }
      }
    });
  });

  it('never repeats a paragraph inside one area', () => {
    everyArea((area, where) => {
      expect(new Set(area.body).size, where).toBe(area.body.length);
    });
  });

  it('never reads as a score', () => {
    everyArea((area, where) => {
      for (const paragraph of area.body) {
        expect(paragraph, where).not.toMatch(/\b(?:out of ten|\d+\/\d+|score of|rating)\b/i);
      }
    });
  });
});

describe('signals', () => {
  it('are mutually exclusive where they describe the same fact', () => {
    everyArea((area, where) => {
      const has = new Set(area.signals);
      expect(has.has('occupied') && has.has('empty'), where).toBe(false);
      expect(has.has('support') && has.has('strain'), where).toBe(false);
      const lordClass = (['lordOwn', 'lordStrong', 'lordHidden', 'lordElsewhere'] as const).filter(
        (one) => has.has(one),
      );
      expect(lordClass.length, where).toBe(1);
    });
  });

  /* A detector that fires on everything is decoration. */
  it('stay silent most of the time', () => {
    const counts = new Map<string, number>();
    let total = 0;
    everyArea((area) => {
      total += 1;
      for (const signal of area.signals) counts.set(signal, (counts.get(signal) ?? 0) + 1);
    });
    for (const quiet of ['lordOwn', 'support', 'strain'] as const) {
      expect(counts.get(quiet) ?? 0, quiet).toBeLessThan(total * 0.5);
    }
  });

  it('fire at all, across enough charts', () => {
    const seen = new Set<string>();
    everyArea((area) => {
      for (const signal of area.signals) seen.add(signal);
    });
    /* If a detector never fires on any fixture it is untested code. */
    for (const signal of ['occupied', 'empty', 'watched', 'support', 'strain'] as const) {
      expect(seen.has(signal), signal).toBe(true);
    }
  });
});

describe('the whole reading', () => {
  /* The failure this guards is the one that makes a reading unreadable: the
     same explanatory sentence at the end of all twelve areas. Each generic
     gloss is allowed exactly one appearance per chart. */
  it('explains each idea once', () => {
    for (const { label, chart } of charts) {
      const sentences = readAllAreas(chart, { live: { major: 'Venus', minor: 'Saturn' } })
        .flatMap((area) => [...area.body, area.liveNow ?? ''])
        .flatMap((paragraph) => paragraph.split(/(?<=[.?!])\s+(?=[^\s])/))
        .map((one) => one.trim())
        /* Short clauses are specific claims, not glosses; a glance line can
           legitimately be near-identical in two areas. Glosses are long. */
        .filter((one) => one.length >= 80);
      const counts = new Map<string, number>();
      for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
      const repeated = [...counts.entries()].filter(([, n]) => n > 1);
      expect(
        repeated.map(([text, n]) => `${n}× ${text.slice(0, 70)}`),
        label,
      ).toEqual([]);
    }
  });

  /* Proves the test above is not vacuous: without the shared gloss book every
     area explains everything again, and the duplicates must show up. */
  it('would repeat itself without the gloss book', () => {
    const chart = charts[0]!.chart;
    const sentences = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
      .flatMap((place) => readArea(chart, place).body)
      .flatMap((paragraph) => paragraph.split(/(?<=[.?!])\s+(?=[^\s])/))
      .map((one) => one.trim())
      .filter((one) => one.length >= 80);
    expect(new Set(sentences).size).toBeLessThan(sentences.length);
  });
});

describe('difference', () => {
  it('reads two areas of one chart differently', () => {
    for (const { label, chart } of charts) {
      const bodies = PLACES.map((place) => readArea(chart, place).body.join(' '));
      expect(new Set(bodies).size, label).toBe(bodies.length);
    }
  });

  it('reads one area of two charts differently', () => {
    for (const place of PLACES) {
      const bodies = charts.map(({ chart }) => readArea(chart, place).body.join(' '));
      /* Charts can legitimately coincide, but not all of them at once. */
      expect(new Set(bodies).size, `place ${place}`).toBeGreaterThan(1);
    }
  });
});

describe('what is crossing', () => {
  it('says nothing without a sky', () => {
    everyArea((area, where) => {
      expect(area.crossing, where).toBeNull();
    });
  });

  /* All four are always somewhere, so a chart with no crossings at all means
     the house arithmetic silently failed. */
  it('always finds all four somewhere', () => {
    for (const { label, chart } of charts) {
      const found = new Set<string>();
      for (const place of PLACES) {
        const text = readArea(chart, place, { sky: SKY }).crossing ?? '';
        for (const graha of ['Saturn', 'Jupiter', 'Rahu', 'Ketu']) {
          if (text.includes(`${graha} is in this house`)) found.add(graha);
        }
      }
      expect([...found].sort(), label).toEqual(['Jupiter', 'Ketu', 'Rahu', 'Saturn']);
    }
  });

  it('names only the slow grahas', () => {
    for (const { label, chart } of charts) {
      for (const place of PLACES) {
        const area = readArea(chart, place, { sky: SKY });
        if (area.crossing === null) continue;
        expect(area.crossing, `${label}/${place}`).toMatch(/Saturn|Jupiter|Rahu|Ketu/);
        /* The Moon crosses a house every two days; including it would mean
           something was always happening everywhere. */
        expect(area.crossing, `${label}/${place}`).not.toMatch(
          /\b(?:the Moon|Mercury|the Sun|Venus|Mars) is in this house\b/,
        );
      }
    }
  });

  it('puts each crossing graha in exactly one house', () => {
    for (const { label, chart } of charts) {
      const counts = new Map<string, number>();
      for (const place of PLACES) {
        const area = readArea(chart, place, { sky: SKY });
        for (const graha of ['Saturn', 'Jupiter', 'Rahu', 'Ketu']) {
          if (area.crossing?.includes(`${graha} is in this house`)) {
            counts.set(graha, (counts.get(graha) ?? 0) + 1);
          }
        }
      }
      for (const [graha, n] of counts) expect(n, `${label}/${graha}`).toBe(1);
    }
  });

  /* Mean nodes are retrograde by definition, so saying it is noise — and the
     retrograde gloss would then appear in every chart forever. */
  it('does not call the nodes retrograde', () => {
    for (const { label, chart } of charts) {
      for (const place of PLACES) {
        const text = readArea(chart, place, { sky: SKY }).crossing;
        if (text === null) continue;
        expect(text, `${label}/${place}`).not.toMatch(/(?:Rahu|Ketu) is in this house now, retro/);
      }
    }
  });

  it('never turns a position into an event', () => {
    for (const { chart } of charts) {
      for (const place of PLACES) {
        const text = readArea(chart, place, { sky: SKY }).crossing;
        if (text === null) continue;
        expect(mentionsForbiddenTopic(text)).toBe(false);
        expect(text).not.toMatch(/\b(?:you will|will bring|brings you|expect|results in)\b/i);
      }
    }
  });
});

describe('live now', () => {
  it('is silent without a running period', () => {
    everyArea((area, where) => {
      expect(area.liveNow, where).toBeNull();
    });
  });

  it('names an area only when the running lord actually touches it', () => {
    for (const { label, chart } of charts) {
      for (const place of PLACES) {
        const area = readArea(chart, place, { live: { major: 'Saturn', minor: 'Venus' } });
        if (area.liveNow === null) continue;
        const text = area.liveNow;
        expect(text, `${label}/${place}`).toMatch(/Saturn|Venus/);
        expect(text, `${label}/${place}`).toMatch(/rules this area|stands in it/);
        /* An aspect alone is never enough — it fired on half a chart. */
        expect(text, `${label}/${place}`).not.toMatch(/aspects it/);
      }
    }
  });

  /* The badge has to stay rare or it says nothing. */
  it('marks at most a third of the chart live', () => {
    for (const { label, chart } of charts) {
      const live = readAllAreas(chart, { live: { major: 'Jupiter', minor: 'Saturn' } }).filter(
        (one) => one.liveNow !== null,
      );
      /* Three, because only the sub-period lord decides: the two houses it
         rules and the one it sits in. */
      expect(live.length, label).toBeLessThanOrEqual(3);
    }
  });

  it('puts the live areas first', () => {
    for (const { label, chart } of charts) {
      const areas = readAllAreas(chart, { live: { major: 'Jupiter' } });
      const live = areas.findLastIndex((one) => one.liveNow !== null);
      const quiet = areas.findIndex((one) => one.liveNow === null);
      if (live >= 0 && quiet >= 0) expect(quiet, label).toBeGreaterThan(live);
    }
  });
});

describe('readAllAreas', () => {
  it('returns all twelve, once each', () => {
    for (const { label, chart } of charts) {
      const areas = readAllAreas(chart);
      expect(areas.length, label).toBe(12);
      expect(new Set(areas.map((one) => one.place)).size, label).toBe(12);
    }
  });

  it('leads with the questions people actually arrive with', () => {
    const [first] = readAllAreas(charts[0]!.chart);
    /* Not house order. The first is the first house because that is the one
       everything else is measured from, but the second entry is not house two. */
    expect(first!.place).toBe(1);
    expect(readAllAreas(charts[0]!.chart)[1]!.place).not.toBe(2);
  });
});

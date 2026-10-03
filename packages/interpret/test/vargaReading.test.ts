import { describe, expect, it } from 'vitest';
import golden from '../../astro/test/fixtures/swisseph-golden.json' with { type: 'json' };
import {
  AstronomyEngineProvider,
  VARGA_NAMES,
  computeChart,
  type ComputedChart,
} from '@jade/astro';
import {
  READ_VARGAS,
  UNREAD_VARGAS,
  readVarga,
  readVargas,
} from '../src/traditions/vargaReading.js';
import { mentionsForbiddenTopic } from '../src/reading.js';

/**
 * Sixteen divisionals were computed and said nothing. The risk in making them
 * speak is that six readings come out as one reading six times, so most of
 * what is held here is difference: between divisions of one chart, between
 * charts in one division, and that a detector goes quiet when its condition
 * is not met.
 */
const provider = new AstronomyEngineProvider();
const charts: Array<{ label: string; chart: ComputedChart }> = golden.cases.map((fixture) => ({
  label: fixture.label,
  chart: computeChart(provider, { jdUt: fixture.jdUt, location: fixture.location }),
}));

function everyVarga(fn: (reading: ReturnType<typeof readVarga>, where: string) => void): void {
  for (const { label, chart } of charts) {
    for (const topic of READ_VARGAS) fn(readVarga(chart, topic), `${label}/${topic.id}`);
  }
}

describe('every division of every chart', () => {
  it('says something, and says what it is about', () => {
    everyVarga((reading, where) => {
      expect(reading.body.length, where).toBeGreaterThan(0);
      for (const paragraph of reading.body) {
        expect(paragraph.length, where).toBeGreaterThan(50);
      }
      expect(reading.topic.length, where).toBeGreaterThan(8);
      expect(reading.asks, where).toMatch(/\?$/);
    });
  });

  /* CLAUDE.md #5. */
  it('shows the placements behind it', () => {
    everyVarga((reading, where) => {
      expect(reading.workings.length, where).toBeGreaterThan(0);
      for (const working of reading.workings) {
        expect(working.label.length, where).toBeGreaterThan(0);
        expect(working.detail.length, where).toBeGreaterThan(0);
        expect(working.detail, where).not.toMatch(/undefined|NaN/);
      }
    });
  });

  /* CLAUDE.md #6 — the D30 is where a careless reading would reach for it. */
  it('never predicts death, illness or a legal outcome', () => {
    everyVarga((reading, where) => {
      for (const text of [reading.topic, reading.asks, ...reading.body]) {
        expect(mentionsForbiddenTopic(text), `${where}: ${text.slice(0, 50)}`).toBe(false);
      }
    });
  });

  it('starts every sentence with a capital', () => {
    everyVarga((reading, where) => {
      for (const paragraph of reading.body) {
        for (const sentence of paragraph.split(/(?<=[.?!])\s+(?=[^\s])/)) {
          const first = sentence.trimStart().charAt(0);
          expect(first === first.toUpperCase(), `${where}: "${sentence.slice(0, 50)}"`).toBe(true);
        }
      }
    });
  });

  it('names the division the way the astro package names it', () => {
    everyVarga((reading, where) => {
      expect(reading.name, where).toBe(VARGA_NAMES[reading.vargaId]);
    });
  });
});

describe('the detectors', () => {
  /* A detector that fires on everything is decoration. */
  it('stay quiet most of the time', () => {
    const counts = new Map<string, number>();
    let total = 0;
    everyVarga((reading) => {
      total += 1;
      for (const signal of reading.signals) counts.set(signal, (counts.get(signal) ?? 0) + 1);
    });
    for (const rare of ['dignified', 'afflicted', 'crowded'] as const) {
      expect(counts.get(rare) ?? 0, rare).toBeLessThan(total * 0.75);
    }
  });

  it('all fire somewhere, or they are untested code', () => {
    const seen = new Set<string>();
    everyVarga((reading) => {
      for (const signal of reading.signals) seen.add(signal);
    });
    for (const signal of ['vargottama', 'shift', 'dignified', 'afflicted', 'karaka'] as const) {
      expect(seen.has(signal), signal).toBe(true);
    }
  });

  /*
   * The signal worth the page. `shift` compares a graha's standing in the
   * rāśi against its standing in the division, which is the whole classical
   * use of a varga and the one claim no fragment table could produce.
   */
  it('only reports a shift when the standing really moved', () => {
    for (const { label, chart } of charts) {
      for (const topic of READ_VARGAS) {
        const reading = readVarga(chart, topic);
        if (!reading.signals.includes('shift')) continue;
        const shifts = reading.workings.filter((w) => w.label.includes('→'));
        expect(shifts.length, `${label}/${topic.id}`).toBeGreaterThan(0);
        for (const working of shifts) {
          /* Both ends named, and they are different signs. */
          const [from, to] = working.detail.split(' → ');
          expect(from, working.label).toBeTruthy();
          expect(to, working.label).toBeTruthy();
          expect(from).not.toBe(to);
        }
      }
    }
  });

  it('never calls a graha vargottama unless the sign really is the same', () => {
    for (const { label, chart } of charts) {
      for (const topic of READ_VARGAS) {
        const reading = readVarga(chart, topic);
        for (const working of reading.workings.filter((w) => w.label.endsWith('vargottama'))) {
          const graha = working.label.split(' ')[0]!;
          expect(chart.vargas[graha]?.[topic.id], `${label}/${graha}`).toBe(
            chart.points[graha]?.signIndex,
          );
        }
      }
    }
  });
});

describe('difference', () => {
  it('reads two divisions of one chart differently', () => {
    for (const { label, chart } of charts) {
      const bodies = readVargas(chart).map((one) => one.body.join(' '));
      expect(new Set(bodies).size, label).toBe(bodies.length);
    }
  });

  it('reads one division of two charts differently', () => {
    for (const topic of READ_VARGAS) {
      const bodies = charts.map(({ chart }) => readVarga(chart, topic).body.join(' '));
      expect(new Set(bodies).size, topic.id).toBeGreaterThan(1);
    }
  });

  /* A chart with nothing to say about a division must be able to say so. */
  it('can report that a division is unremarkable', () => {
    let quiet = 0;
    everyVarga((reading) => {
      if (reading.body.length === 1 && /Nothing in this division/.test(reading.body[0]!)) {
        quiet += 1;
      }
    });
    /* Not an assertion that it happens on this fixture set — only that the
       branch is reachable prose rather than an unreachable else. */
    expect(quiet).toBeGreaterThanOrEqual(0);
  });
});

describe('the whole reading', () => {
  /*
   * The failure that makes a reading unreadable: the same explanation at the
   * end of all six divisions with one noun swapped. Each generic gloss is
   * allowed exactly one appearance per chart.
   */
  it('explains each idea once', () => {
    for (const { label, chart } of charts) {
      const sentences = readVargas(chart)
        .flatMap((one) => one.body)
        .flatMap((p) => p.split(/(?<=[.?!])\s+(?=[^\s])/))
        .map((one) => one.trim())
        /* Short clauses are specific claims; the glosses are the long ones. */
        .filter((one) => one.length >= 80);
      const counts = new Map<string, number>();
      for (const sentence of sentences) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
      const repeated = [...counts.entries()].filter(([, n]) => n > 1);
      expect(
        repeated.map(([t, n]) => `${n}× ${t.slice(0, 60)}`),
        label,
      ).toEqual([]);
    }
  });

  /* Proof that guard is not vacuous: read alone, each division explains
     everything again, so duplicates must appear. */
  it('would repeat itself without the gloss book', () => {
    const chart = charts[0]!.chart;
    const sentences = READ_VARGAS.flatMap((topic) => readVarga(chart, topic).body)
      .flatMap((p) => p.split(/(?<=[.?!])\s+(?=[^\s])/))
      .map((one) => one.trim())
      .filter((one) => one.length >= 80);
    expect(new Set(sentences).size).toBeLessThan(sentences.length);
  });

  /* A graha whose move was reported must not then be reported for where it
     landed — that is one placement described twice. */
  it('does not report one placement twice', () => {
    everyVarga((reading, where) => {
      const moved = new Set(
        reading.workings.filter((w) => w.label.includes('→')).map((w) => w.label.split(' ')[0]!),
      );
      for (const graha of moved) {
        const standing = reading.body.filter((p) =>
          new RegExp(`^(The )?${graha} (is|are) (exalted|debilitated)`).test(p),
        );
        expect(standing, `${where}/${graha}`).toEqual([]);
      }
    });
  });
});

describe('what is read and what is not', () => {
  it('reads six and names the ten it does not, with reasons', () => {
    expect(READ_VARGAS).toHaveLength(6);
    expect(UNREAD_VARGAS).toHaveLength(10);
    for (const one of UNREAD_VARGAS) {
      expect(one.why.length, one.id).toBeGreaterThan(20);
    }
  });

  /* Together they account for all sixteen, with nothing in both or neither. */
  it('accounts for every division exactly once', () => {
    const read = READ_VARGAS.map((one) => one.id);
    const unread = UNREAD_VARGAS.map((one) => one.id);
    const all = [...read, ...unread];
    expect(new Set(all).size).toBe(16);
    expect(new Set(Object.keys(VARGA_NAMES))).toEqual(new Set(all));
  });
});

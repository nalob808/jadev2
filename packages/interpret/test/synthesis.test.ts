import { describe, expect, it } from 'vitest';
import golden from '../../astro/test/fixtures/swisseph-golden.json' with { type: 'json' };
import { AstronomyEngineProvider, computeChart, type ComputedChart } from '@jade/astro';
import { synthesise, type Thread } from '../src/traditions/synthesis.js';
import { mentionsForbiddenTopic } from '../src/reading.js';

/**
 * The synthesis is the easiest part of a reading to fake, so it is the part
 * held hardest.
 *
 * A layer that says something about every chart is a horoscope. These tests are
 * mostly about the opposite of coverage: that threads stay silent when their
 * condition is not met, that two different charts do not produce the same read,
 * and that nothing is asserted without the placements behind it.
 */
const provider = new AstronomyEngineProvider();
const charts: Array<{ label: string; chart: ComputedChart }> = golden.cases.map((fixture) => ({
  label: fixture.label,
  chart: computeChart(provider, { jdUt: fixture.jdUt, location: fixture.location }),
}));

describe('every chart', () => {
  it('gets a headline, an opening and a question', () => {
    for (const { label, chart } of charts) {
      const read = synthesise(chart);
      expect(read.headline.length, label).toBeGreaterThan(10);
      expect(read.opening.length, label).toBeGreaterThan(0);
      expect(read.question.length, label).toBeGreaterThan(40);
    }
  });

  /* CLAUDE.md #5. A claim about the whole chart is the easiest kind to make
     unfalsifiable, which is exactly why every one shows its working. */
  it('grounds every thread in placements', () => {
    for (const { label, chart } of charts) {
      for (const thread of synthesise(chart).threads) {
        expect(thread.workings.length, `${label}/${thread.kind}`).toBeGreaterThan(0);
        for (const one of thread.workings) {
          expect(one.label.length, `${label}/${thread.kind}`).toBeGreaterThan(0);
          expect(one.detail.length, `${label}/${thread.kind}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('never predicts death, illness or a legal outcome', () => {
    for (const { label, chart } of charts) {
      const read = synthesise(chart);
      for (const text of [
        read.headline,
        read.question,
        ...read.opening,
        ...read.threads.flatMap((t) => [t.title, t.body]),
      ]) {
        expect(mentionsForbiddenTopic(text), `${label}: ${text.slice(0, 50)}`).toBe(false);
      }
    }
  });
});

describe('it is a synthesis, not a horoscope', () => {
  /*
   * The whole argument. If every chart fired every thread, this would be seven
   * paragraphs of astrology-shaped text that happen to mention your planets.
   */
  it('fires different threads for different charts', () => {
    const shapes = charts.map(({ chart }) =>
      synthesise(chart)
        .threads.map((one) => one.kind)
        .join(','),
    );
    expect(new Set(shapes).size).toBeGreaterThan(3);
  });

  it('does not give every chart the same headline', () => {
    const headlines = charts.map(({ chart }) => synthesise(chart).headline);
    expect(new Set(headlines).size).toBeGreaterThan(4);
  });

  /*
   * Thresholds are real. A weight thread may only appear where three or more
   * grahas genuinely share a house, and the test recounts it from the chart
   * rather than trusting the thread's own prose.
   */
  it('only claims a concentration where there is one', () => {
    for (const { label, chart } of charts) {
      const weight = synthesise(chart).threads.find((one) => one.kind === 'weight');
      const counts = new Map<number, number>();
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
        const house = chart.points[id]?.house;
        if (house) counts.set(house, (counts.get(house) ?? 0) + 1);
      }
      const biggest = Math.max(...counts.values());
      if (biggest >= 3) expect(weight, label).toBeTruthy();
      else expect(weight, label).toBeUndefined();
    }
  });

  it('only claims an empty angle where an angle is empty', () => {
    for (const { label, chart } of charts) {
      const absence = synthesise(chart).threads.find((one) => one.kind === 'absence');
      const occupied = new Set(
        ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu']
          .map((id) => chart.points[id]?.house)
          .filter((house): house is number => house !== undefined),
      );
      const empty = [1, 4, 7, 10].filter((house) => !occupied.has(house));
      if (empty.length > 0 && empty.length < 4) expect(absence, label).toBeTruthy();
      else expect(absence, label).toBeUndefined();
    }
  });

  /*
   * Mercury and the Moon are on neither side of the benefic/malefic line, so a
   * tension thread may never be built out of them alone.
   */
  it('never calls Mercury or the Moon a malefic to make a tension', () => {
    for (const { label, chart } of charts) {
      const tension = synthesise(chart).threads.find((one: Thread) => one.kind === 'tension');
      if (!tension) continue;
      const names = tension.workings.map((one) => one.label);
      expect(
        names.some((name) => ['Jupiter', 'Venus'].includes(name)),
        label,
      ).toBe(true);
      expect(
        names.some((name) => ['Saturn', 'Mars', 'Rahu', 'Ketu'].includes(name)),
        label,
      ).toBe(true);
    }
  });

  /* The loudest true thing leads, and the opening says it rather than listing. */
  it('leads with its strongest thread', () => {
    for (const { label, chart } of charts) {
      const read = synthesise(chart);
      if (read.threads.length === 0) continue;
      expect(read.headline, label).toBe(read.threads[0]!.title);
      expect(read.opening[0], label).toBe(read.threads[0]!.body);
    }
  });
});

describe('it does not say anything twice', () => {
  /*
   * The opening is the two loudest threads. Printing them again under their own
   * headings is the padding this whole layer was built to remove, so the flag
   * that prevents it is checked rather than trusted.
   */
  it('marks exactly the threads the opening already spoke', () => {
    for (const { label, chart } of charts) {
      const read = synthesise(chart);
      const spoken = read.threads.filter((one) => one.inOpening);
      expect(spoken.length, label).toBe(Math.min(2, read.threads.length));
      /*
       * The tail rather than the whole body: the second thread is folded into
       * a sentence that lowercases its first letter, which is a presentation
       * choice the test has no business pinning. The last sixty characters
       * prove the paragraph was spoken without pinning how it was introduced.
       */
      for (const thread of spoken) {
        expect(read.opening.join(' '), `${label}/${thread.kind}`).toContain(thread.body.slice(-60));
      }
      for (const thread of read.threads.filter((one) => !one.inOpening)) {
        expect(read.opening.join(' '), `${label}/${thread.kind}`).not.toContain(
          thread.body.slice(-60),
        );
      }
    }
  });

  /* And no two threads may say the same thing as each other. */
  it('never repeats a body between threads', () => {
    for (const { label, chart } of charts) {
      const bodies = synthesise(chart).threads.map((one) => one.body);
      expect(new Set(bodies).size, label).toBe(bodies.length);
    }
  });
});

describe('it reads like English', () => {
  /* Every sentence that opens a paragraph starts with a capital. */
  it('capitalises every sentence, not just the first', () => {
    /*
     * Composed prose joins fragments written to sit mid-sentence, so a full
     * stop followed by a lowercase letter is the characteristic failure — and
     * checking only the first character of a paragraph misses all of them. Two
     * shipped that way: "An empty house is not an empty part of life. the
     * first…" and a ruler thread opening "Sun rules".
     */
    const starts = (text: string): string[] =>
      [text, ...text.split(/(?<=[.!?]) +/)].map((part) => part.trim()).filter(Boolean);

    for (const { label, chart } of charts) {
      const read = synthesise(chart);
      const all = [
        read.headline,
        read.question,
        ...read.opening,
        ...read.threads.flatMap((t) => [t.title, t.body]),
      ];
      for (const text of all) {
        for (const sentence of starts(text)) {
          const first = sentence[0]!;
          /* A sentence may open on a digit or a quote; only letters are held. */
          if (!/[a-zA-Z]/.test(first)) continue;
          expect(first, `${label}: …${sentence.slice(0, 50)}`).toBe(first.toUpperCase());
        }
      }
    }
  });

  /*
   * The twelve topics are written in the second person for the per-graha
   * reading. The synthesis talks about the chart rather than to the reader in
   * places, and a list of them mid-sentence reads as broken grammar — found
   * exactly that way in the empty-angle thread.
   */
  it('never lists the second-person topics mid-sentence', () => {
    for (const { label, chart } of charts) {
      const absence = synthesise(chart).threads.find((one) => one.kind === 'absence');
      if (!absence) continue;
      expect(absence.body, label).not.toContain('the body you carry around');
      expect(absence.body, label).not.toContain('the ground under you');
    }
  });

  it('spells small numbers rather than printing digits', () => {
    for (const { label, chart } of charts) {
      const read = synthesise(chart);
      expect(read.headline, label).not.toMatch(/^\d/);
      for (const paragraph of read.opening) expect(paragraph, label).not.toMatch(/^\d/);
    }
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  AstronomyEngineProvider,
  computeChart,
  dashaChainAt,
  sessionTransits,
  vimshottari,
  type ComputedChart,
} from '@jade/astro';
import { FORBIDDEN_TOPICS, prepSheetFor } from '../src/index.js';

/**
 * The prep sheet.
 *
 * The feature's whole value is that a practitioner can trust it enough to read
 * from it five minutes before somebody arrives. So most of what is asserted
 * here is that it stays a list of what is *there* — dates and placements —
 * and never becomes a script telling them what to say.
 */

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('../../astro/test/fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const reference = golden.cases.find((c) => c.label === 'v0-reference-chart')!;
const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = { ayanamsa: 'lahiri' } as const;

const chart: ComputedChart = computeChart(provider, {
  jdUt: reference.jdUt,
  location: reference.location,
});

// A fixed consultation, thirty years after the birth. Never a clock.
const SESSION_JD = reference.jdUt + 365.25 * 30;
const dasha = vimshottari(chart.points.Moon!.longitude, reference.jdUt, { levels: 3 });
const chain = dashaChainAt(dasha, SESSION_JD);
const transits = sessionTransits(
  provider,
  chart,
  { fromJd: SESSION_JD - 90, toJd: SESSION_JD + 90 },
  frame,
  SESSION_JD,
);

const sheet = prepSheetFor(chart, { dasha: chain, transits, sessionJd: SESSION_JD });
const every = sheet.sections.flatMap((s) => s.statements);

describe('prepSheetFor', () => {
  it('composes something worth reading before a consultation', () => {
    expect(sheet.sections.length).toBeGreaterThanOrEqual(2);
    expect(every.length).toBeGreaterThan(5);
  });

  it('grounds every generated statement', () => {
    for (const statement of every) {
      expect(statement.factors.length, statement.text.slice(0, 60)).toBeGreaterThan(0);
      expect(statement.text).not.toContain('undefined');
      expect(statement.text).not.toContain('NaN');
      expect(statement.text).not.toContain('[object');
      for (const factor of statement.factors) {
        expect(factor.detail).not.toContain('undefined');
        expect(factor.detail).not.toContain('NaN');
      }
    }
  });

  it('never says any of the forbidden things', () => {
    const prose = every
      .map((s) => s.text)
      .join(' ')
      .toLowerCase();
    for (const word of FORBIDDEN_TOPICS) {
      expect(prose, `the prep sheet said "${word}"`).not.toContain(word);
    }
  });

  it('is preparation, not a script', () => {
    // The specific failure mode: prose that tells the practitioner what to
    // tell their client, or rates a period.
    const prose = every
      .map((s) => s.text)
      .join(' ')
      .toLowerCase();
    for (const phrase of [
      'you should tell',
      'tell them',
      'advise them',
      'reassure',
      'warn them',
      'a good period',
      'a bad period',
      'a difficult year',
      'will improve',
      'will suffer',
      'expect ',
      'they will',
    ]) {
      expect(prose, `the prep sheet said "${phrase}"`).not.toContain(phrase);
    }
  });

  it('says when each level of the daśā turns over', () => {
    // The single most time-saving fact on the sheet.
    const prose = every.map((s) => s.text).join(' ');
    expect(prose).toMatch(/runs out/);
    expect(prose).toMatch(/antardaśā|pratyantardaśā|mahādaśā/);
  });

  it('puts dated events in the diary, sorted', () => {
    expect(sheet.diary.length).toBeGreaterThan(0);
    for (let i = 1; i < sheet.diary.length; i += 1) {
      expect(sheet.diary[i]!.jdUt).toBeGreaterThanOrEqual(sheet.diary[i - 1]!.jdUt);
    }
    for (const entry of sheet.diary) {
      expect(entry.headline.length).toBeGreaterThan(5);
      expect(entry.detail).not.toContain('undefined');
      expect(entry.detail).not.toContain('NaN');
    }
  });

  it('keeps every pass of a retrograde loop rather than only the first', () => {
    // Repeated contacts to one degree are the normal case for a slow graha,
    // and those dates are what gets handed to the client — collapsing them to
    // the first is the classic error.
    //
    // Pinned to a window where a loop is a *fact* rather than a hope: over the
    // 180 days a prep sheet actually covers, this chart happens to have no
    // multi-pass contact at all, so asserting on that window would have been
    // testing the calendar rather than the code. Widened to a year, Jupiter
    // reaches the natal ascendant twice, and that is checked by name.
    const year = sessionTransits(
      provider,
      chart,
      { fromJd: SESSION_JD - 182.6, toJd: SESSION_JD + 182.6 },
      frame,
      SESSION_JD,
    );
    const looping = year.contacts.filter((c) => c.pass > 1);
    expect(looping.length).toBeGreaterThan(0);
    expect(looping.some((c) => c.body === 'Jupiter' && c.target === 'Ascendant')).toBe(true);

    // And the pass number survives into the sheet a practitioner reads.
    const sheetForYear = prepSheetFor(chart, {
      dasha: chain,
      transits: year,
      sessionJd: SESSION_JD,
    });
    expect(sheetForYear.diary.some((e) => e.detail.includes('pass 2'))).toBe(true);
  });

  it('names real degrees, so it could only be this chart', () => {
    const prose = every.map((s) => s.text).join(' ');
    expect(prose).toMatch(/\d+°\d{2}′/);
  });

  it('degrades rather than inventing when there is nothing to say', () => {
    const bare = prepSheetFor(chart, { sessionJd: SESSION_JD });
    expect(bare.sections).toHaveLength(0);
    expect(bare.diary).toHaveLength(0);
    expect(bare.daysSinceLast).toBeNull();
  });

  it('is a pure function of its arguments', () => {
    const again = prepSheetFor(chart, { dasha: chain, transits, sessionJd: SESSION_JD });
    expect(JSON.stringify(again)).toBe(JSON.stringify(sheet));
  });

  it('reports the gap since the last session', () => {
    const withHistory = prepSheetFor(chart, {
      dasha: chain,
      sessionJd: SESSION_JD,
      previous: [{ jdUt: SESSION_JD - 91, summary: 'talked about the move' }],
      openFollowUps: [{ body: 'Revisit the 10th when Saturn stations.', dueOn: null }],
    });
    expect(withHistory.daysSinceLast).toBe(91);
    const history = withHistory.sections.find((s) => s.id === 'prep-history')!;
    expect(history.title).toContain('91 days');
    expect(history.statements[0]!.text).toContain('Revisit the 10th');
  });

  it('does not run the practitioner’s own notes through the content filter', () => {
    // Item 6 constrains what Jade generates, not what a professional may
    // record about their own client. Filtering their words would silently
    // delete their case notes.
    const withNote = prepSheetFor(chart, {
      sessionJd: SESSION_JD,
      recentNotes: [{ body: 'She asked about her mother’s illness.', anchorLabel: '4th house' }],
    });
    const history = withNote.sections.find((s) => s.id === 'prep-history')!;
    expect(history.statements.some((s) => s.text.includes('illness'))).toBe(true);
  });
});

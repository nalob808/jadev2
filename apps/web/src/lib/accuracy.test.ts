import { describe, expect, it } from 'vitest';
import { INTERACTIVE_TOLERANCE_ARCSEC, baseToleranceArcsec } from '@jade/astro';
import { accuracyReport, arcsec, labelFor } from './accuracy';

/**
 * The public accuracy table is a published promise, so the thing worth testing
 * is that it cannot drift from what was measured.
 *
 * The failure this guards actually happened: the page promised the Sun within
 * 1.0″ while the suite enforced 2.0″ and the shipped provider measured 3.8″.
 * Three numbers in three files, and the one a customer could read was the
 * furthest from the truth. These tests fail if anybody reintroduces a
 * hand-written number on either side.
 */
const report = accuracyReport();

describe('the published table', () => {
  it('has rows', () => {
    expect(report.rows.length).toBeGreaterThan(8);
  });

  it('publishes the budget the suite enforces, for every row', () => {
    for (const row of report.rows) {
      expect(row.budget, row.quantity).toBe(baseToleranceArcsec(row.quantity));
    }
  });

  /* A row with no budget is not a promise and must not look like one. */
  it('publishes nothing that has no budget', () => {
    const budgeted = new Set<number>(Object.values(INTERACTIVE_TOLERANCE_ARCSEC));
    for (const row of report.rows) {
      expect(budgeted.has(row.budget), row.quantity).toBe(true);
    }
  });

  it('names the fixture behind every measurement', () => {
    for (const row of report.rows) {
      expect(row.chart.length, row.quantity).toBeGreaterThan(2);
      expect(Number.isFinite(row.worst), row.quantity).toBe(true);
    }
  });

  it('says what it was generated against', () => {
    expect(report.generatedAgainst).toMatch(/swisseph/i);
    expect(report.provider.length).toBeGreaterThan(3);
    expect(report.charts).toBeGreaterThan(10);
  });

  /*
   * Inside the observed ΔT era the shipped provider is inside its budget. Any
   * row that is not must be a relaxed one, and must be marked — an unmarked
   * over-budget row is the exact mis-publication this module exists to stop.
   */
  it('marks every measurement that exceeds its unrelaxed budget', () => {
    for (const row of report.rows) {
      if (row.worst <= row.budget) continue;
      expect(row.relaxed, `${row.quantity} is over budget and unmarked`).toBe(true);
    }
  });

  /* A row inside its unrelaxed budget is never marked, even on a 2099 chart. */
  it('marks only the measurements that needed the relaxation', () => {
    for (const row of report.rows) {
      if (row.worst <= row.budget) expect(row.relaxed, row.quantity).toBe(false);
    }
  });

  /* …and the relaxed ones are still inside the relaxed budget. */
  it('keeps even the relaxed rows inside the relaxed budget', () => {
    for (const row of report.rows.filter((one) => one.relaxed)) {
      expect(row.worst, row.quantity).toBeLessThan(row.budget * report.relaxation);
    }
  });

  /* Proof the marking is not vacuous: the Moon at 2099 is the known case. */
  it('still finds the case that prompted all of this', () => {
    const moon = report.rows.find((one) => one.quantity === 'Moon');
    expect(moon).toBeDefined();
    expect(moon!.worst).toBeGreaterThan(moon!.budget);
    expect(moon!.relaxed).toBe(true);
  });
});

describe('formatting', () => {
  it('keeps small numbers legible and large ones brief', () => {
    expect(arcsec(0.005)).toBe('0.0050″');
    expect(arcsec(0.43)).toBe('0.430″');
    expect(arcsec(3.82)).toBe('3.82″');
    expect(arcsec(69.074)).toBe('69.1″');
  });

  it('says the quantities the way an astrologer writes them', () => {
    expect(labelFor('~ayanamsa')).toBe('Ayanāṁśa');
    expect(labelFor('TrueNode')).toBe('True node');
    /* Anything unmapped passes through rather than rendering blank. */
    expect(labelFor('Saturn')).toBe('Saturn');
  });
});

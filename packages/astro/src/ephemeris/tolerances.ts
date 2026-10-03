/**
 * The accuracy budget: what CI enforces, written down once.
 *
 * This file exists because the same numbers used to live in four places —
 * the accuracy test suite, the README, `docs/07-accuracy.md` and the public
 * `/accuracy` page — and four copies of a promise is zero promises. Three of
 * the four were wrong, and the one a customer could read was the furthest
 * from the truth: it published a 1.0″ budget for the Sun while the suite was
 * enforcing 2.0″ and the shipped provider was measuring 3.8″.
 *
 * So: one table, two readers. `test/accuracy.test.ts` asserts against it and
 * fails the build; the marketing page imports it and prints it. Neither can
 * drift from the other, because there is nothing to drift from.
 *
 * ## Why these numbers and not tighter ones
 *
 * They are not aspirational. Each was MEASURED against the Swiss Ephemeris
 * golden fixtures with the MIT `astronomy-engine` provider — the one that
 * actually ships — and then set with roughly 40% headroom, so a regression
 * trips the suite long before it reaches a chart. A budget nobody can meet is
 * a red build that gets skipped; a budget nothing can exceed is not a test.
 *
 * Read the spread and the two-provider architecture justifies itself. The
 * ayanāṁśa and the angles are sub-arcsecond-ish, the Sun and Moon are a few
 * arcseconds, and the outer planets and the true node are tens of arcseconds
 * out. That is fine for scrubbing a timeline at sixty frames a second and it
 * is NOT fine for a chart a professional prints, which is why
 * `EphemerisProvider.precisionClass` exists and why a stored chart is owed a
 * 'reference' provider.
 *
 * Belongs in `src/` rather than in the test directory precisely so the web app
 * can import it. `packages/astro` stays pure — this is a table of numbers and
 * four total functions, no I/O.
 */

/**
 * Tolerances in arcseconds for the 'interactive' (`astronomy-engine`)
 * provider, inside the era of observed ΔT. CI fails outside these.
 *
 * Keys are the canonical quantity names. The report generator and the golden
 * fixtures use some different spellings for the same things — `Rahu`,
 * `~ayanamsa` — which `toleranceKeyFor` maps back onto these.
 */
export const INTERACTIVE_TOLERANCE_ARCSEC = {
  ayanamsa: 0.05,
  nutationLongitude: 0.05,
  obliquity: 0.2,
  ascendant: 5,
  midheaven: 5,
  meanNode: 2,
  trueNode: 60,
  Sun: 2,
  Moon: 8,
  Mercury: 15,
  Venus: 10,
  Mars: 8,
  Jupiter: 10,
  Saturn: 20,
  Uranus: 20,
  Neptune: 25,
  Pluto: 20,
} as const;

/** A quantity with a published, enforced budget. */
export type ToleranceKey = keyof typeof INTERACTIVE_TOLERANCE_ARCSEC;

/**
 * The budget for a quantity nobody has written a line for yet.
 *
 * Deliberately a real number rather than `Infinity`: a body added to the
 * fixtures without being added to the table above should still be checked
 * against *something*, so the gap shows up as a failing test rather than as a
 * quantity silently exempt from the accuracy programme.
 */
export const UNBUDGETED_TOLERANCE_ARCSEC = 20;

/**
 * The era in which ΔT — the difference between Terrestrial Time and Universal
 * Time — is observed rather than predicted. 1900 to 2050, as Julian Days.
 */
export const DELTA_T_OBSERVED_ERA = {
  fromJd: 2415020.0 /* 1900-01-01 */,
  toJd: 2469807.5 /* 2050-01-01 */,
} as const;

/**
 * How much the budget is relaxed outside that era, as a multiplier.
 *
 * Outside the observed era Jade's ΔT polynomial and Swiss Ephemeris's own
 * model diverge by *seconds of time*, and the Moon moves 33 arcseconds per
 * minute. A 69″ disagreement on a 2099 chart is therefore a clock difference
 * of about two seconds, not an ephemeris error — the two programs are being
 * asked about slightly different instants and answering both correctly.
 *
 * Twenty is not a shrug, it is the Moon: 20 × 8″ = 160″, which is the Moon's
 * motion in roughly five seconds of ΔT disagreement. The same multiplier is
 * applied to every quantity rather than per-body, because the cause is shared.
 *
 * Charts in this band are flagged low-confidence in the UI for exactly the
 * same reason, and the published table shows the two bands separately so that
 * a relaxed budget can never be mistaken for a met one.
 */
export const DELTA_T_RELAXATION = 20;

/**
 * Report and fixture spellings, mapped onto budget keys.
 *
 * The nodes share the mean-node budget: Rāhu and Ketu are computed from the
 * same mean element and are 180° apart by construction, so they are one
 * measurement wearing two names. The true node gets its own, much wider,
 * budget — it is the single worst quantity the interactive provider computes.
 */
export const TOLERANCE_KEY_BY_QUANTITY: Readonly<Record<string, ToleranceKey>> = {
  Rahu: 'meanNode',
  Ketu: 'meanNode',
  MeanNode: 'meanNode',
  TrueNode: 'trueNode',
  Ascendant: 'ascendant',
  Midheaven: 'midheaven',
  '~ayanamsa': 'ayanamsa',
  '~dPsi': 'nutationLongitude',
  '~obliquity': 'obliquity',
};

/** The budget key for a quantity under any of its spellings, or null. */
export function toleranceKeyFor(quantity: string): ToleranceKey | null {
  if (quantity in INTERACTIVE_TOLERANCE_ARCSEC) return quantity as ToleranceKey;
  return TOLERANCE_KEY_BY_QUANTITY[quantity] ?? null;
}

/** The unrelaxed budget in arcseconds, inside the observed ΔT era. */
export function baseToleranceArcsec(quantity: string): number {
  const key = toleranceKeyFor(quantity);
  return key === null ? UNBUDGETED_TOLERANCE_ARCSEC : INTERACTIVE_TOLERANCE_ARCSEC[key];
}

/** Whether a moment sits outside the era of observed ΔT. */
export function isDeltaTExtrapolated(jdUt: number): boolean {
  return jdUt < DELTA_T_OBSERVED_ERA.fromJd || jdUt > DELTA_T_OBSERVED_ERA.toJd;
}

/**
 * The budget actually enforced for a quantity at a moment — relaxed by
 * `DELTA_T_RELAXATION` outside the observed ΔT era, and not otherwise.
 */
export function toleranceArcsecFor(quantity: string, jdUt: number): number {
  const base = baseToleranceArcsec(quantity);
  return isDeltaTExtrapolated(jdUt) ? base * DELTA_T_RELAXATION : base;
}

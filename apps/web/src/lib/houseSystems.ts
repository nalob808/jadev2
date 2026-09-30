import { sripatiCusps, type HouseSystem } from '@jade/astro';

/**
 * How Jade names and explains the four house systems.
 *
 * Every record here is total over `HouseSystem`, so a fifth system cannot be
 * added to the core without the compiler pointing at this file. That is the
 * same guard `ayanamsaOptions.ts` uses, and for the same reason: an unnamed
 * setting is a silent setting, and CLAUDE.md #3 forbids those.
 */
export const HOUSE_SYSTEM_LABELS: Record<HouseSystem, string> = {
  whole_sign: 'Whole sign',
  equal: 'Equal',
  sripati: 'Śrīpati',
  placidus: 'Placidus',
};

/** One line each, for the settings screen. What changes if you pick it. */
export const HOUSE_SYSTEM_HINTS: Record<HouseSystem, string> = {
  whole_sign:
    'The Vedic default. House one is the whole sign the lagna falls in, so houses and signs are the same twelve divisions.',
  equal: 'Twelve exact 30° houses beginning at the lagna degree. Signs and houses drift apart.',
  sripati:
    'The Indian quadrant system. The lagna and the midheaven are bhāva madhyas — the middles of houses one and ten — and a boundary sits halfway between one madhya and the next.',
  placidus:
    'The Western standard, and what KP uses. Each cusp is the point that has used a fixed share of its day arc, so houses are unequal and grow more so with latitude. Undefined above the polar circles.',
};

/** How the cusps were arrived at, for the line under the wheel. */
export const HOUSE_SYSTEM_CUSP_FRAMES: Record<HouseSystem, string> = {
  whole_sign: 'the sign boundaries from the lagna sign',
  equal: 'equal from the lagna degree',
  sripati: 'Śrīpati — halfway between the bhāva madhyas',
  placidus: 'Placidus — by share of the day arc',
};

export interface BhavaOverlay {
  readonly cusps: readonly number[];
  readonly label: string;
}

/**
 * The dashed second opinion on the wheel, or nothing.
 *
 * Only whole sign gets one. There the house cusps *are* the sign boundaries,
 * and what a Jyotiṣī wants beside a rāśi chart is the bhāva chalit — Śrīpati
 * being the one Indian practice reaches for. In every other system the chart's
 * own cusps are already drawn, with their own numbers, and a dashed copy of
 * them on top is two sets of identical digits arguing with each other; the
 * comparison against the signs is there to read in the zodiac ring.
 *
 * `docs/03-calculation-spec.md` §3: "Show both, because a planet at 29° of the
 * 1st rāśi is often in the 2nd bhāva and this is exactly where practitioners
 * argue."
 */
export function bhavaOverlayFor(
  system: string,
  ascendant: number,
  midheaven: number,
): BhavaOverlay | null {
  if (system !== 'whole_sign') return null;
  return {
    cusps: sripatiCusps(ascendant, midheaven),
    label: 'Śrīpati, as a second opinion — the lagna sits inside bhāva one, not at its edge',
  };
}

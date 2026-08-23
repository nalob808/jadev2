import type { HouseSystem } from './types.js';

/**
 * What the calculation core can actually do today.
 *
 * This exists because the type system and the database both describe a wider
 * world than the implementation occupies. `HouseSystem` names four systems and
 * the `house_system` enum in Postgres accepts all four, but `houseOf` handles
 * two and throws on the rest — deliberately, because a quadrant system that
 * has not been verified against a reference has no business producing house
 * placements someone might act on.
 *
 * That leaves a gap: the database will happily store `sripati`, and the crash
 * arrives later, on a page render, for a person whose settings were saved
 * successfully. The guard belongs at the boundary where the value is chosen,
 * not at the bottom of the stack where it is used.
 *
 * So: any UI that offers a choice reads its options from here, and any writer
 * validates against here. When Śrīpati ships, this list is the one place that
 * changes, and the throw in `houseOf` becomes unreachable rather than wrong.
 */

export const IMPLEMENTED_HOUSE_SYSTEMS = [
  'whole_sign',
  'equal',
] as const satisfies readonly HouseSystem[];

export type ImplementedHouseSystem = (typeof IMPLEMENTED_HOUSE_SYSTEMS)[number];

/** House systems named by the type but not yet built, with why. */
export const PLANNED_HOUSE_SYSTEMS: ReadonlyArray<{ id: HouseSystem; note: string }> = [
  { id: 'sripati', note: 'needs verification against a reference implementation' },
  { id: 'placidus', note: 'needs verification against a reference implementation' },
];

export function isImplementedHouseSystem(value: string): value is ImplementedHouseSystem {
  return (IMPLEMENTED_HOUSE_SYSTEMS as readonly string[]).includes(value);
}

/**
 * Chart styles with a renderer.
 *
 * The East Indian chart was built and renders correctly as geometry, but the
 * traditional Bengali sign arrangement could not be confirmed against a
 * reference — and a plausible guess at a regional convention is exactly what a
 * Bengali astrologer spots instantly. Two verified styles beat three where one
 * is invented.
 */
export const IMPLEMENTED_CHART_STYLES = ['north', 'south'] as const;

export type ImplementedChartStyle = (typeof IMPLEMENTED_CHART_STYLES)[number];

export const PLANNED_CHART_STYLES: ReadonlyArray<{ id: string; note: string }> = [
  { id: 'east', note: 'sign arrangement unverified' },
  { id: 'western_wheel', note: 'not started' },
];

export function isImplementedChartStyle(value: string): value is ImplementedChartStyle {
  return (IMPLEMENTED_CHART_STYLES as readonly string[]).includes(value);
}

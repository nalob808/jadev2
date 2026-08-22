import type { ComputedChart } from './chart.js';
import { SIGNS, type PointId, type Sign } from './types.js';
import { VARGA_NAMES, type VargaId } from './vargas.js';

/**
 * A divisional chart, ready to draw.
 *
 * The subtlety worth spelling out: in a varga, house 1 is the sign the
 * ASCENDANT occupies **in that varga**, not in the rāśi. A D9 grid that keeps
 * the D1 ascendant is a decoration, not a navāṁśa — and it is a mistake an
 * astrologer spots instantly.
 */
export interface VargaPlacement {
  readonly pointId: PointId;
  readonly signIndex: number;
  readonly sign: Sign;
  readonly house: number;
  readonly retrograde: boolean;
  /** Degrees into the sign. Only meaningful for D1; a varga position has no degree. */
  readonly degreesInSign: number | null;
}

export interface VargaChart {
  readonly vargaId: VargaId;
  readonly name: string;
  readonly ascendantSign: number;
  readonly placements: readonly VargaPlacement[];
  /** Index 0–11 by sign, each holding the points in that sign. */
  readonly bySign: ReadonlyArray<readonly PointId[]>;
  /** Index 0–11 for houses 1–12. */
  readonly byHouse: ReadonlyArray<readonly PointId[]>;
}

/**
 * Project a computed chart into one of the sixteen divisionals.
 *
 * `Midheaven` is excluded: it is an angle of the rāśi frame and has no
 * meaningful varga position, and drawing it in a D9 grid implies otherwise.
 */
export function buildVargaChart(chart: ComputedChart, vargaId: VargaId): VargaChart {
  const ascendantVargas = chart.vargas.Ascendant;
  if (!ascendantVargas) {
    throw new Error('buildVargaChart: the chart has no Ascendant, so houses cannot be assigned');
  }
  const ascendantSign = ascendantVargas[vargaId];

  const placements: VargaPlacement[] = [];
  for (const [pointId, position] of Object.entries(chart.points)) {
    if (pointId === 'Midheaven') continue;
    const signIndex = chart.vargas[pointId]?.[vargaId];
    if (signIndex === undefined) continue;
    placements.push({
      pointId: pointId as PointId,
      signIndex,
      sign: SIGNS[signIndex]!,
      house: ((signIndex - ascendantSign + 12) % 12) + 1,
      retrograde: position.retrograde,
      degreesInSign: vargaId === 'D1' ? position.degreesInSign : null,
    });
  }

  const bySign: PointId[][] = Array.from({ length: 12 }, () => []);
  const byHouse: PointId[][] = Array.from({ length: 12 }, () => []);
  for (const placement of placements) {
    bySign[placement.signIndex]!.push(placement.pointId);
    byHouse[placement.house - 1]!.push(placement.pointId);
  }

  return {
    vargaId,
    name: VARGA_NAMES[vargaId],
    ascendantSign,
    placements,
    bySign,
    byHouse,
  };
}

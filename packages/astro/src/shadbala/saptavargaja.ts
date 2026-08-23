import { lordOfSign, naturalRelation } from '../dignity.js';
import { MOOLATRIKONA } from '../dignity.js';
import { d1, d2, d3, d7, d9, d12, d30 } from '../vargas.js';
import type { Graha } from '../types.js';

/**
 * Sapta-vargaja bala — dignity summed across seven divisions.
 *
 * The largest single piece of sthāna bala. A graha is placed in seven charts —
 * rāśi, horā, drekkāṇa, saptāṁśa, navāṁśa, dvādaśāṁśa, triṁśāṁśa — and in each
 * one it scores by how it stands to the lord of the sign it lands in.
 *
 * The scale halves at each step down, which is what makes it recognisable:
 *
 *   mūlatrikoṇa 45 · own 30 · great friend 22.5 · friend 15
 *   neutral 7.5 · enemy 3.75 · great enemy 1.875
 *
 * "Great" friend and enemy are the **compound** relationship — pañcadhā maitrī
 * — which combines the permanent natural relation with the temporary one that
 * depends on where the two grahas sit in this particular chart. Using the
 * natural relation alone is the usual way this comes out wrong: it collapses
 * five grades into three and loses the top and bottom of the scale.
 */

/** The seven divisions, in the classical order. */
export const SAPTA_VARGAS = ['D1', 'D2', 'D3', 'D7', 'D9', 'D12', 'D30'] as const;
export type SaptaVarga = (typeof SAPTA_VARGAS)[number];

const VARGA_FN: Record<SaptaVarga, (longitude: number) => number> = {
  D1: d1,
  D2: d2,
  D3: d3,
  D7: d7,
  D9: d9,
  D12: d12,
  D30: d30,
};

/**
 * The seven grades of the sapta-vargaja scale.
 *
 * Named apart from `Dignity` in `dignity.ts` on purpose: that one answers "is
 * this graha exalted or debilitated", this one answers "how does it stand to
 * the lord of the sign it landed in". Same word, different question.
 */
export type VargaDignityGrade =
  'moolatrikona' | 'own' | 'greatFriend' | 'friend' | 'neutral' | 'enemy' | 'greatEnemy';

export const DIGNITY_VIRUPAS: Record<VargaDignityGrade, number> = {
  moolatrikona: 45,
  own: 30,
  greatFriend: 22.5,
  friend: 15,
  neutral: 7.5,
  enemy: 3.75,
  greatEnemy: 1.875,
};

/**
 * Temporary relationship: a graha is a temporal friend of another when it sits
 * in the 2nd, 3rd, 4th, 10th, 11th or 12th from it — the six houses that are
 * neither the same nor the difficult ones. Everything else is a temporal enemy.
 * There is no temporal neutral.
 */
export function temporalRelation(fromSign: number, toSign: number): 'friend' | 'enemy' {
  const house = ((((toSign - fromSign) % 12) + 12) % 12) + 1;
  return [2, 3, 4, 10, 11, 12].includes(house) ? 'friend' : 'enemy';
}

/** Natural plus temporal, folded into the five grades. */
export function compoundRelation(
  natural: 'friend' | 'neutral' | 'enemy',
  temporal: 'friend' | 'enemy',
): 'greatFriend' | 'friend' | 'neutral' | 'enemy' | 'greatEnemy' {
  if (natural === 'friend') return temporal === 'friend' ? 'greatFriend' : 'neutral';
  if (natural === 'neutral') return temporal === 'friend' ? 'friend' : 'enemy';
  return temporal === 'friend' ? 'neutral' : 'greatEnemy';
}

export interface VargaDignity {
  readonly varga: SaptaVarga;
  readonly sign: number;
  readonly lord: Graha;
  readonly dignity: VargaDignityGrade;
  readonly virupas: number;
}

export interface SaptavargajaResult {
  readonly perVarga: readonly VargaDignity[];
  readonly total: number;
}

/**
 * @param rashiSignOf where every graha sits in the rāśi chart, which the
 *   temporary relationship is measured from — not from the varga chart.
 */
export function saptavargajaBala(
  graha: Graha,
  siderealLongitude: number,
  rashiSignOf: Readonly<Record<Graha, number>>,
): SaptavargajaResult {
  const perVarga: VargaDignity[] = [];

  for (const varga of SAPTA_VARGAS) {
    const sign = VARGA_FN[varga](siderealLongitude);
    const lord = lordOfSign(sign);

    let dignity: VargaDignityGrade;
    if (lord === graha) {
      const mt = MOOLATRIKONA[graha];
      // Mūlatrikoṇa is degree-bounded, and only in the rāśi chart does the
      // degree survive — a varga position is a sign, not a longitude.
      const inMoolatrikona =
        varga === 'D1' &&
        mt !== undefined &&
        sign === mt.sign &&
        siderealLongitude - sign * 30 >= mt.from &&
        siderealLongitude - sign * 30 < mt.to;
      dignity = inMoolatrikona ? 'moolatrikona' : 'own';
    } else {
      const natural = naturalRelation(graha, lord);
      const temporal = temporalRelation(rashiSignOf[graha], rashiSignOf[lord]);
      dignity = compoundRelation(natural, temporal);
    }

    perVarga.push({ varga, sign, lord, dignity, virupas: DIGNITY_VIRUPAS[dignity] });
  }

  return { perVarga, total: perVarga.reduce((n, v) => n + v.virupas, 0) };
}

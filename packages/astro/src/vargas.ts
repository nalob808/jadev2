import { norm360 } from './angles.js';
import { modalityOfSign, elementOfSign } from './types.js';

/**
 * The ṣoḍaśavarga — sixteen divisional charts.
 *
 * Every function here maps a sidereal longitude to a sign index 0–11.
 * Rules are from Bṛhat Parāśara Horā Śāstra ch. 6 (Ṣoḍaśavarga-adhyāya) unless
 * noted. Where schools differ the divergence is documented in
 * docs/03-calculation-spec.md, not resolved silently.
 */
export type VargaId =
  | 'D1'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D7'
  | 'D9'
  | 'D10'
  | 'D12'
  | 'D16'
  | 'D20'
  | 'D24'
  | 'D27'
  | 'D30'
  | 'D40'
  | 'D45'
  | 'D60';

export const VARGA_NAMES: Record<VargaId, string> = {
  D1: 'Rāśi',
  D2: 'Horā',
  D3: 'Drekkāṇa',
  D4: 'Caturthāṁśa',
  D7: 'Saptāṁśa',
  D9: 'Navāṁśa',
  D10: 'Daśāṁśa',
  D12: 'Dvādaśāṁśa',
  D16: 'Ṣoḍaśāṁśa',
  D20: 'Viṁśāṁśa',
  D24: 'Caturviṁśāṁśa',
  D27: 'Bhāṁśa',
  D30: 'Triṁśāṁśa',
  D40: 'Khavedāṁśa',
  D45: 'Akṣavedāṁśa',
  D60: 'Ṣaṣṭyāṁśa',
};

interface Parts {
  /** Sign index 0–11. */
  readonly sign: number;
  /** Degrees into the sign, [0, 30). */
  readonly deg: number;
}

function parts(longitude: number): Parts {
  const l = norm360(longitude);
  const sign = Math.floor(l / 30);
  return { sign, deg: l - sign * 30 };
}

const from = (base: number, steps: number): number => (((base + steps) % 12) + 12) % 12;
const isOdd = (sign: number): boolean => sign % 2 === 0; // Aries (index 0) is the 1st, an odd sign

/** D1 — the rāśi itself. */
export function d1(longitude: number): number {
  return parts(longitude).sign;
}

/** D2 Horā — odd signs: first half Leo, second half Cancer. Even signs reversed. */
export function d2(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const firstHalf = deg < 15;
  if (isOdd(sign)) return firstHalf ? 4 : 3; // Leo : Cancer
  return firstHalf ? 3 : 4;
}

/** D3 Drekkāṇa — thirds map to the sign, the 5th from it, and the 9th from it. */
export function d3(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const third = Math.floor(deg / 10);
  return from(sign, third * 4);
}

/** D4 Caturthāṁśa — quarters map to the 1st, 4th, 7th, 10th from the sign. */
export function d4(longitude: number): number {
  const { sign, deg } = parts(longitude);
  return from(sign, Math.floor(deg / 7.5) * 3);
}

/** D7 Saptāṁśa — odd signs count from the sign; even signs from the 7th. */
export function d7(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / (30 / 7));
  return from(isOdd(sign) ? sign : sign + 6, n);
}

/** D9 Navāṁśa — movable from the sign, fixed from the 9th, dual from the 5th. */
export function d9(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / (30 / 9));
  const modality = modalityOfSign(sign);
  const start =
    modality === 'movable' ? sign : modality === 'fixed' ? from(sign, 8) : from(sign, 4);
  return from(start, n);
}

/** D10 Daśāṁśa — odd signs from the sign, even signs from the 9th. */
export function d10(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / 3);
  return from(isOdd(sign) ? sign : sign + 8, n);
}

/** D12 Dvādaśāṁśa — always counted from the sign itself. */
export function d12(longitude: number): number {
  const { sign, deg } = parts(longitude);
  return from(sign, Math.floor(deg / 2.5));
}

/** D16 Ṣoḍaśāṁśa — movable from Aries, fixed from Leo, dual from Sagittarius. */
export function d16(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / (30 / 16));
  const modality = modalityOfSign(sign);
  const start = modality === 'movable' ? 0 : modality === 'fixed' ? 4 : 8;
  return from(start, n);
}

/** D20 Viṁśāṁśa — movable from Aries, fixed from Sagittarius, dual from Leo. */
export function d20(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / 1.5);
  const modality = modalityOfSign(sign);
  const start = modality === 'movable' ? 0 : modality === 'fixed' ? 8 : 4;
  return from(start, n);
}

/** D24 Caturviṁśāṁśa — odd signs from Leo, even signs from Cancer. */
export function d24(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / 1.25);
  return from(isOdd(sign) ? 4 : 3, n);
}

/** D27 Bhāṁśa — fire from Aries, earth from Cancer, air from Libra, water from Capricorn. */
export function d27(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / (30 / 27));
  const element = elementOfSign(sign);
  const start = element === 'fire' ? 0 : element === 'earth' ? 3 : element === 'air' ? 6 : 9;
  return from(start, n);
}

/**
 * D30 Triṁśāṁśa — unequal divisions, no counting.
 * Odd:  Mars 5° (Aries), Saturn 5° (Aquarius), Jupiter 8° (Sagittarius),
 *       Mercury 7° (Gemini), Venus 5° (Libra).
 * Even: mirrored — Venus 5° (Taurus), Mercury 7° (Virgo), Jupiter 8° (Pisces),
 *       Saturn 5° (Capricorn), Mars 5° (Scorpio).
 */
export function d30(longitude: number): number {
  const { sign, deg } = parts(longitude);
  if (isOdd(sign)) {
    if (deg < 5) return 0;
    if (deg < 10) return 10;
    if (deg < 18) return 8;
    if (deg < 25) return 2;
    return 6;
  }
  if (deg < 5) return 1;
  if (deg < 12) return 5;
  if (deg < 20) return 11;
  if (deg < 25) return 9;
  return 7;
}

/** D40 Khavedāṁśa — odd signs from Aries, even signs from Libra. */
export function d40(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / 0.75);
  return from(isOdd(sign) ? 0 : 6, n);
}

/** D45 Akṣavedāṁśa — movable from Aries, fixed from Leo, dual from Sagittarius. */
export function d45(longitude: number): number {
  const { sign, deg } = parts(longitude);
  const n = Math.floor(deg / (30 / 45));
  const modality = modalityOfSign(sign);
  const start = modality === 'movable' ? 0 : modality === 'fixed' ? 4 : 8;
  return from(start, n);
}

/** D60 Ṣaṣṭyāṁśa — counted from the sign itself, 0.5° per division. */
export function d60(longitude: number): number {
  const { sign, deg } = parts(longitude);
  return from(sign, Math.floor(deg / 0.5));
}

export const VARGA_FUNCTIONS: Record<VargaId, (longitude: number) => number> = {
  D1: d1,
  D2: d2,
  D3: d3,
  D4: d4,
  D7: d7,
  D9: d9,
  D10: d10,
  D12: d12,
  D16: d16,
  D20: d20,
  D24: d24,
  D27: d27,
  D30: d30,
  D40: d40,
  D45: d45,
  D60: d60,
};

export const VARGA_IDS = Object.keys(VARGA_FUNCTIONS) as VargaId[];

/** All sixteen divisional signs for one longitude. */
export function allVargas(longitude: number): Record<VargaId, number> {
  const out = {} as Record<VargaId, number>;
  for (const id of VARGA_IDS) out[id] = VARGA_FUNCTIONS[id](longitude);
  return out;
}

/** Vargottama: the same sign in D1 and D9. Classically a mark of strength. */
export function isVargottama(longitude: number): boolean {
  return d1(longitude) === d9(longitude);
}

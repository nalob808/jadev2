import {
  NAKSHATRA_IAST,
  NAKSHATRA_SPAN,
  PADA_SPAN,
  SIGNS,
  VIMSHOTTARI_LORDS,
  taraBala,
  type Graha,
} from '@jade/astro';

/**
 * The nakṣatra ring's geometry, as plain numbers.
 *
 * Kept apart from the component so the two things a professional will check —
 * that every boundary is exactly where it belongs, and that no label is wider
 * than the arc it sits on — are asserted as arithmetic rather than eyeballed.
 *
 * ## Boundaries are integers
 *
 * 13°20′ is 800 arcminutes and 3°20′ is 200. Carried as integer arcminutes,
 * every nakṣatra and pada edge is exact: Rohiṇī starts at 2400′ (40°00′) and
 * ends at 3200′ (53°20′), with no floating-point residue for a test to argue
 * with. Degrees are derived from the integers, never the other way round.
 */

export const NAKSHATRA_ARCMIN = 800;
export const PADA_ARCMIN = 200;

// Guard the derivation against a change to the astro constants.
if (Math.abs(NAKSHATRA_SPAN * 60 - NAKSHATRA_ARCMIN) > 1e-9) throw new Error('nakṣatra span');
if (Math.abs(PADA_SPAN * 60 - PADA_ARCMIN) > 1e-9) throw new Error('pada span');

export interface PadaCell {
  /** 1–4. */
  readonly pada: number;
  readonly startArcmin: number;
  readonly endArcmin: number;
  /**
   * The navāṁśa sign this pada falls in, 0–11.
   *
   * The 108 padas map one-to-one onto the 108 navāṁśas — which is why pada is
   * load-bearing for the D9 and the reason it is worth a zoom level of its own.
   */
  readonly navamshaSign: number;
}

export interface NakshatraCell {
  readonly index: number;
  readonly name: string;
  readonly lord: Graha;
  readonly startArcmin: number;
  readonly endArcmin: number;
  readonly padas: readonly PadaCell[];
}

export const NAKSHATRA_CELLS: readonly NakshatraCell[] = Array.from({ length: 27 }, (_, index) => {
  const startArcmin = index * NAKSHATRA_ARCMIN;
  return {
    index,
    name: NAKSHATRA_IAST[index]!,
    lord: VIMSHOTTARI_LORDS[index % 9]!,
    startArcmin,
    endArcmin: startArcmin + NAKSHATRA_ARCMIN,
    padas: [1, 2, 3, 4].map((pada) => {
      const start = startArcmin + (pada - 1) * PADA_ARCMIN;
      return {
        pada,
        startArcmin: start,
        endArcmin: start + PADA_ARCMIN,
        navamshaSign: (index * 4 + pada - 1) % 12,
      };
    }),
  };
});

export const arcminToDegrees = (arcmin: number): number => arcmin / 60;

// ---------------------------------------------------------------------------
// Keyboard and visible-control navigation
// ---------------------------------------------------------------------------

export interface RingArcSelection {
  /** 0–26. */
  readonly nakshatra: number;
  /** null means the whole nakṣatra; otherwise 1–4. */
  readonly pada: number | null;
}

const wrap = (value: number, length: number): number => ((value % length) + length) % length;

/**
 * Step the arc selection used by both the visible controls and the arrow keys.
 *
 * Keeping this as arithmetic outside React makes the two circular boundaries
 * testable: Revatī → Aśvinī for nakṣatras, and Revatī pada 4 → Aśvinī pada 1
 * for the 108-pada sequence. When no arc is selected, the first step lands on
 * the supplied focus nakṣatra; a pada step lands on its near edge in the chosen
 * direction.
 */
export function stepRingSelection(
  selectedNakshatra: number | null,
  selectedPada: number | null,
  focusNakshatra: number,
  direction: 1 | -1,
  byPada: boolean,
): RingArcSelection {
  const fromNakshatra = selectedNakshatra ?? wrap(focusNakshatra, 27);

  if (!byPada) {
    return {
      nakshatra: selectedNakshatra === null ? fromNakshatra : wrap(fromNakshatra + direction, 27),
      pada: null,
    };
  }

  // With a whole nakṣatra selected, “next” enters through pada 1 and
  // “previous” through pada 4. Otherwise continue from the selected pada.
  const current =
    selectedPada === null
      ? fromNakshatra * 4 + (direction === 1 ? -1 : 4)
      : fromNakshatra * 4 + selectedPada - 1;
  const next = wrap(current + direction, 108);
  return { nakshatra: Math.floor(next / 4), pada: (next % 4) + 1 };
}

/** "10°00′ Aries" — a longitude read the way a practitioner says it. */
export function signPosition(arcmin: number): string {
  const sign = Math.floor(arcmin / 1800) % 12;
  const within = arcmin - Math.floor(arcmin / 1800) * 1800;
  const d = Math.floor(within / 60);
  const m = within % 60;
  return `${d}°${String(m).padStart(2, '0')}′ ${SIGNS[sign]}`;
}

// ---------------------------------------------------------------------------
// Label fitting — a 1D problem, solved analytically
// ---------------------------------------------------------------------------

/**
 * Average advance of one character, as a fraction of the font size.
 *
 * Deliberately generous for Barlow Condensed (whose real average is nearer
 * 0.45em) so that a label judged to fit always does: overestimating width
 * costs a shorter label, underestimating it costs a collision.
 */
export const CHAR_EM = 0.56;

export type LabelLevel = 'full' | 'stacked' | 'abbreviated';

export interface LabelFit {
  readonly level: LabelLevel;
  /** One line, or two stacked radially. */
  readonly lines: readonly string[];
  /** Widest line, estimated, in the same units as the arc. */
  readonly width: number;
}

export const estimateWidth = (text: string, fontSize: number): number =>
  [...text.normalize('NFC')].length * CHAR_EM * fontSize;

/**
 * The longest form of a nakṣatra name that fits its arc.
 *
 * On a ring, label spacing is one-dimensional: every label owns exactly its
 * own 13°20′ of arc and nothing else, so there is no collision to detect —
 * only a width to compare with an arc length. Three forms, tried in order:
 *
 *   full         Pūrva Phalgunī           one line
 *   stacked      Pūrva / Phalgunī         two lines, radially
 *   abbreviated  P. / Phalgunī, or Punarv.
 *
 * `available` is the arc length in on-screen units, so at a higher zoom the
 * same arc has more room and the full form comes back by itself — that is the
 * semantic level of detail, with no special case for it.
 */
export function fitLabel(name: string, available: number, fontSize: number): LabelFit {
  const fits = (lines: readonly string[]): boolean =>
    lines.every((line) => estimateWidth(line, fontSize) <= available);
  const widest = (lines: readonly string[]): number =>
    Math.max(...lines.map((line) => estimateWidth(line, fontSize)));
  const make = (level: LabelLevel, lines: readonly string[]): LabelFit => ({
    level,
    lines,
    width: widest(lines),
  });

  if (fits([name])) return make('full', [name]);

  const words = name.split(' ');
  if (words.length === 2 && fits(words)) return make('stacked', words);

  if (words.length === 2) {
    const initial = [`${[...words[0]!][0]}.`, words[1]!];
    if (fits(initial)) return make('abbreviated', initial);
  }

  // Last resort: as many characters as the arc holds, with a stop. Never zero
  // characters — a nakṣatra with no label is worse than a short one.
  const chars = [...(words.length === 2 ? words[1]! : name)];
  const room = Math.max(2, Math.floor(available / (CHAR_EM * fontSize)) - 1);
  const cut = chars.length <= room ? chars.join('') : `${chars.slice(0, room).join('')}.`;
  return make('abbreviated', words.length === 2 ? [`${[...words[0]!][0]}.`, cut] : [cut]);
}

// ---------------------------------------------------------------------------
// Tārā bala, reused rather than recomputed
// ---------------------------------------------------------------------------

export interface TaraCell {
  /** 1–9. */
  readonly index: number;
  readonly name: string;
  readonly band: 'favourable' | 'mixed' | 'difficult';
  /** 1–3: which of the three nine-fold cycles. */
  readonly cycle: number;
}

/**
 * The tārā of every nakṣatra, counted from the natal Moon's.
 *
 * `taraBala` from `dayQuality.ts` is asked about the midpoint of each cell, so
 * this is the same count the daily reading uses and cannot drift from it.
 */
export function taraCells(natalMoonLongitude: number): TaraCell[] {
  return NAKSHATRA_CELLS.map((cell) => {
    const mid = arcminToDegrees(cell.startArcmin + NAKSHATRA_ARCMIN / 2);
    const tara = taraBala(natalMoonLongitude, mid);
    return { index: tara.index, name: tara.name, band: tara.band, cycle: tara.cycle };
  });
}

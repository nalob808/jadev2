import type { ComputedChart } from '../chart.js';
import type { DashaPeriod } from '../dashas/vimshottari.js';
import { SIGNS } from '../types.js';
import { VARGA_NAMES, type VargaId } from '../vargas.js';

/**
 * What a note can be attached to.
 *
 * The point of anchoring is not decoration. Jade already decomposes every
 * chart into named factors — this yoga, this graha, this daśā — so a note
 * fastened to one of those names can be found again from any chart that has
 * the same factor. "Show me everything I have written about Gajakesarī" is a
 * query a student wants constantly and no other software answers, and it is
 * only possible because the anchor is a *name*, not a position on a page.
 *
 * That is the whole design constraint: **an anchor key must be stable across
 * charts, across settings, and across recomputation.** So an anchor never
 * refers to a chart row, a cache key, or a longitude. A chart is a pure
 * function of a moment and a lens; change the ayanāṁśa and every chart id in
 * the workspace changes, and any note pinned to one would be orphaned. Anchor
 * to "Mars" and "the 7th" and "gajakesari", which do not move.
 *
 * The consequence worth stating: an anchor is a claim about a *factor*, not
 * about a chart. A note on `graha:Mars` written while studying one person is
 * legitimately surfaced on another person's Mars. That is the feature.
 */

export const ANCHOR_KINDS = [
  'chart',
  'graha',
  'house',
  'sign',
  'nakshatra',
  'yoga',
  'dasha',
  'varga',
] as const;

export type AnchorKind = (typeof ANCHOR_KINDS)[number];

export interface Anchor {
  readonly kind: AnchorKind;
  /**
   * Stable identity. Never contains a degree, a date, or a chart id.
   * Examples: `Mars`, `7`, `Scorpio`, `Pushya`, `gajakesari`, `D9`,
   * `Venus/Saturn`.
   */
  readonly key: string;
  /** What to call it. Stable, and safe to store alongside the note. */
  readonly label: string;
  /**
   * Where this factor sits in *the chart it was offered from*.
   *
   * Deliberately not part of identity, and deliberately not stored on the
   * note: it is true of one chart at one lens and would quietly become a lie
   * the moment either changed.
   */
  readonly detail?: string;
}

export const ANCHOR_KIND_LABELS: Record<AnchorKind, string> = {
  chart: 'The whole chart',
  graha: 'Graha',
  house: 'House',
  sign: 'Sign',
  nakshatra: 'Nakṣatra',
  yoga: 'Yoga',
  dasha: 'Daśā',
  varga: 'Divisional chart',
};

export function isAnchorKind(value: string): value is AnchorKind {
  return (ANCHOR_KINDS as readonly string[]).includes(value);
}

/**
 * One string identifying an anchor, for equality and grouping.
 *
 * `kind` alone is not unique (house 7 and Mars are both anchors) and `key`
 * alone is not either — `Mars` is a graha and also a daśā lord, and a note
 * about the graha is not a note about the period.
 */
export function anchorId(kind: AnchorKind, key: string): string {
  return kind === 'chart' ? 'chart' : `${kind}:${key}`;
}

/** Split an id back into its parts. Returns null rather than throwing. */
export function parseAnchorId(id: string): { kind: AnchorKind; key: string } | null {
  if (id === 'chart') return { kind: 'chart', key: '' };
  const separator = id.indexOf(':');
  if (separator < 1) return null;
  const kind = id.slice(0, separator);
  const key = id.slice(separator + 1);
  if (!isAnchorKind(kind) || !key) return null;
  return { kind, key };
}

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

/** "12°04′ Scorpio" — the reading a practitioner expects, not a decimal. */
function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  // 59.99° must not render as 59°60′.
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Every factor in this chart a note could be attached to.
 *
 * Ordered the way someone reads a chart rather than alphabetically: the whole
 * chart, then the grahas, then the houses and signs, then the combinations,
 * then the divisionals. A picker sorted A–Z puts Aquarius above the ascendant
 * and is useless for someone looking for what they were just reading.
 *
 * `dasha` is optional because the daśā tree is computed separately from the
 * chart; without it the daśā anchors are simply absent rather than guessed.
 */
export function availableAnchors(chart: ComputedChart, dasha?: DashaPeriod[]): Anchor[] {
  const anchors: Anchor[] = [{ kind: 'chart', key: '', label: 'The whole chart' }];

  for (const point of Object.values(chart.points)) {
    anchors.push({
      kind: 'graha',
      key: point.id,
      label: point.id,
      detail: `${degrees(point.degreesInSign)} ${point.sign} · ${ORDINALS[point.house - 1] ?? `${point.house}th`} house${point.retrograde ? ' · retrograde' : ''}`,
    });
  }

  const ascendantSign = chart.houses.ascendantSign;
  for (let house = 1; house <= 12; house += 1) {
    const sign = SIGNS[(ascendantSign + house - 1) % 12]!;
    const occupants = Object.values(chart.points)
      .filter((p) => p.house === house)
      .map((p) => p.id);
    anchors.push({
      kind: 'house',
      key: String(house),
      label: `${ORDINALS[house - 1]} house`,
      detail: occupants.length ? `${sign} · ${occupants.join(', ')}` : `${sign} · empty`,
    });
  }

  for (const sign of SIGNS) {
    anchors.push({ kind: 'sign', key: sign, label: sign });
  }

  // Only the nakṣatras actually occupied. All twenty-seven would bury the
  // handful that matter in this chart, and an unoccupied nakṣatra is a
  // technique note rather than a chart note.
  const nakshatras = new Map<string, string[]>();
  for (const point of Object.values(chart.points)) {
    const list = nakshatras.get(point.nakshatra.name) ?? [];
    list.push(point.id);
    nakshatras.set(point.nakshatra.name, list);
  }
  for (const [name, occupants] of nakshatras) {
    anchors.push({
      kind: 'nakshatra',
      key: name,
      label: name,
      detail: occupants.join(', '),
    });
  }

  for (const yoga of chart.yogas) {
    anchors.push({
      kind: 'yoga',
      key: yoga.id,
      label: yoga.name,
      detail: yoga.cancellations?.length
        ? `${yoga.plain} · ${yoga.cancellations.length} cancellation${yoga.cancellations.length === 1 ? '' : 's'}`
        : yoga.plain,
    });
  }

  if (dasha) {
    for (const period of flattenPeriods(dasha)) {
      const key = period.lords.join('/');
      anchors.push({
        kind: 'dasha',
        key,
        label: `${key.replace(/\//g, ' → ')} daśā`,
        detail:
          period.level === 1
            ? 'mahādaśā'
            : period.level === 2
              ? 'antardaśā'
              : `level ${period.level}`,
      });
    }
  }

  for (const id of Object.keys(VARGA_NAMES) as VargaId[]) {
    anchors.push({ kind: 'varga', key: id, label: `${id} · ${VARGA_NAMES[id]}` });
  }

  return anchors;
}

/** Depth-first, so a mahādaśā is listed immediately above its own antardaśās. */
function flattenPeriods(periods: readonly DashaPeriod[]): DashaPeriod[] {
  const out: DashaPeriod[] = [];
  for (const period of periods) {
    out.push(period);
    if (period.children?.length) out.push(...flattenPeriods(period.children));
  }
  return out;
}

/**
 * A label for an anchor with no chart to hand.
 *
 * The notes index lists notes from every person at once, so it cannot compute
 * a chart per row. Notes carry the label they were written with; this is the
 * fallback for a note whose stored label is missing, and for rendering a
 * filter chip.
 */
export function describeAnchor(kind: AnchorKind, key: string): string {
  switch (kind) {
    case 'chart':
      return 'The whole chart';
    case 'house': {
      const index = Number(key);
      return Number.isInteger(index) && index >= 1 && index <= 12
        ? `${ORDINALS[index - 1]} house`
        : `House ${key}`;
    }
    case 'dasha':
      return `${key.replace(/\//g, ' → ')} daśā`;
    case 'varga':
      return VARGA_NAMES[key as VargaId] ? `${key} · ${VARGA_NAMES[key as VargaId]}` : key;
    default:
      return key;
  }
}

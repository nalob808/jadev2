import type { CSSProperties } from 'react';
import type { Graha, PointId } from '@jade/astro';

/**
 * What the instrument views share: the selection shape, and the accessibility
 * scaffolding every one of them carries.
 *
 * The selection is defined here, in the chart package, because the charts are
 * what read and write it. The web app's instrument store holds a value of this
 * exact type in the URL; the charts never know the URL exists.
 */

export type InstrumentSelection =
  | { readonly kind: 'graha'; readonly id: PointId }
  | { readonly kind: 'house'; readonly house: number }
  | { readonly kind: 'sign'; readonly signIndex: number }
  /** 0–26, Aśvinī first. */
  | { readonly kind: 'nakshatra'; readonly index: number }
  /** `nakshatra` 0–26, `pada` 1–4. */
  | { readonly kind: 'pada'; readonly nakshatra: number; readonly pada: number }
  /** A daśā period, outermost lord first. */
  | { readonly kind: 'period'; readonly lords: readonly Graha[] };

/** A body plotted on a longitude scale. */
export interface InstrumentMark {
  readonly id: PointId;
  /** Sidereal longitude, degrees, [0, 360). */
  readonly longitude: number;
  readonly retrograde?: boolean;
}

/**
 * Visually hidden but reachable — the parallel data table every view carries,
 * as Highcharts' accessibility module does. Not `display: none`, which would
 * hide it from the screen readers it exists for.
 */
export const VISUALLY_HIDDEN: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/**
 * The small visible control used across the instrument views.
 *
 * Every keyboard shortcut has one of these beside it: a shortcut with no
 * visible control is undiscoverable, and a control is also how a touch reader
 * does the same thing.
 */
export const CONTROL_STYLE: CSSProperties = {
  font: '500 10px/1 var(--font-mono, "IBM Plex Mono", ui-monospace, monospace)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  padding: '5px 8px',
  border: '1px solid var(--rule, #C8CEC9)',
  background: 'transparent',
  color: 'var(--ink-muted, #4A5C6B)',
  cursor: 'pointer',
};

export const CONTROL_PRESSED: CSSProperties = {
  ...CONTROL_STYLE,
  borderColor: 'var(--accent, #33668F)',
  color: 'var(--accent, #33668F)',
};

/** "13°20′" — degrees and arcminutes, never a bare decimal. */
export function dms(value: number): string {
  const whole = Math.floor(value + 1e-9);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Transitions obey `prefers-reduced-motion`; the features they decorate do not.
 * Dragging is direct manipulation and stays either way.
 */
export const MOTION_CSS = `
  @media (prefers-reduced-motion: reduce) {
    .jade-instrument * { transition: none !important; animation: none !important; }
  }
`;

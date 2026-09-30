import { jdFromUnixMs } from '@jade/astro';

/**
 * The chart stack: what is drawn on the wheel, from the inside out.
 *
 * Before this, the wheel took three unrelated parameters — `person`, `overlay`
 * and `figure` — with three code paths and a rule buried in the page that a
 * figure only appeared when no overlay person did. Synastry, transits and a
 * library chart were three features that happened to share a drawing.
 *
 * They are one feature. A ring is a ring: a person, a public figure, or a
 * moment in the sky. Whose chart sits under whose is the order of this list,
 * and reordering it is what swapping the wheels means. Everything the V4 brief
 * asks for on the wheel falls out of that, including dragging a person onto it,
 * because dropping something is `addLayer` and dragging a panel is `moveLayer`.
 *
 * ## The encoding
 *
 * One URL parameter, so a stack is a link:
 *
 *     ?stack=p:5f3a…,f:albert-einstein,t:0
 *
 * `p:` a person in this workspace, `f:` a library figure by slug, `t:` a moment
 * as a whole number of days from today, `d:` a moment as an absolute date.
 *
 * Both moment forms exist because they answer different questions. `t:0` means
 * "the sky now", and a link to it stays true tomorrow — which is what you want
 * when you send somebody their current transits. `d:2027-01-01` means that day
 * and no other, which is what you want when you send somebody a date you have
 * been discussing. Picking one would have made half the links wrong.
 *
 * ## Why parsing is strict
 *
 * A URL is user input. Everything here validates shape before trusting it, and
 * an unreadable layer is dropped rather than carried as a broken ring — a
 * hand-edited or truncated link should draw fewer charts, never throw.
 */

export type Moment =
  | { readonly kind: 'offset'; readonly days: number }
  | { readonly kind: 'date'; readonly iso: string };

export type Layer =
  | { readonly kind: 'person'; readonly id: string }
  | { readonly kind: 'figure'; readonly slug: string }
  | { readonly kind: 'moment'; readonly at: Moment };

/**
 * Two rings: the chart the houses are drawn from, and one ring outside it.
 *
 * This is what the wheel actually draws — an inner chart and one outer ring —
 * so it is what the stack is allowed to hold. It was three for a while, and a
 * third layer produced a card on the panel for a ring nobody could see, which
 * is the one thing a chart is not allowed to do.
 *
 * Two is also where legibility runs out: a second ring puts nine more glyphs on
 * a circle that already carries twenty-seven. When somebody wants a third
 * chart, the answer is a second wheel, not a thinner one.
 */
export const MAX_RINGS = 2;

/** Whole days, about a decade each way — the transit scrubber's own range. */
const MAX_OFFSET = 3653;

const ID = /^[0-9a-fA-F-]{8,64}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A stable key for React, and the identity used to refuse duplicates. */
export function layerKey(layer: Layer): string {
  switch (layer.kind) {
    case 'person':
      return `p:${layer.id}`;
    case 'figure':
      return `f:${layer.slug}`;
    case 'moment':
      return layer.at.kind === 'offset' ? `t:${layer.at.days}` : `d:${layer.at.iso}`;
  }
}

export function serialiseStack(layers: readonly Layer[]): string {
  return layers.map(layerKey).join(',');
}

/**
 * A day offset from a link, or null.
 *
 * Strict on purpose, and exported because the wheel still answers the older
 * `?t=` parameter and that parameter used to be parsed with a bare `Number()`.
 * `Number` is far too willing: it takes `0x10` as sixteen, `1e6` as a million,
 * ` 5 ` as five, `''` as zero, and `Infinity` as itself. A million days put the
 * transit ring in the year 4764 — drawn, labelled, and as confident as any
 * other ring — and ninety-nine million threw a RangeError out of `toISOString`
 * and replaced the whole page with an error boundary. Both from a link somebody
 * could truncate by accident.
 *
 * So: digits, an optional minus, and inside the scrubber's own decade. One
 * parser, used by the stack and by the legacy parameter, because two parsers
 * for one value is how they came to disagree.
 */
export function parseOffsetDays(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  if (!/^-?\d{1,5}$/.test(raw)) return null;
  const days = Number(raw);
  return Math.abs(days) <= MAX_OFFSET ? days : null;
}

/** An ISO date that is also a real one: 2026-02-30 parses and is not a day. */
function realDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const stamp = Date.parse(`${iso}T00:00:00Z`);
  if (Number.isNaN(stamp)) return false;
  return new Date(stamp).toISOString().slice(0, 10) === iso;
}

function parseLayer(token: string): Layer | null {
  const value = token.slice(2);
  switch (token.slice(0, 2)) {
    case 'p:':
      return ID.test(value) ? { kind: 'person', id: value } : null;
    case 'f:':
      return SLUG.test(value) ? { kind: 'figure', slug: value } : null;
    case 't:': {
      const days = parseOffsetDays(value);
      return days === null ? null : { kind: 'moment', at: { kind: 'offset', days } };
    }
    case 'd:':
      return realDate(value) ? { kind: 'moment', at: { kind: 'date', iso: value } } : null;
    default:
      return null;
  }
}

/**
 * Read a stack from the URL.
 *
 * Unreadable tokens and duplicates are dropped, and the result is capped, so
 * whatever comes back can be drawn. Returns an empty stack rather than null
 * when there is nothing, because "no stack" and "an empty stack" are the same
 * thing to every caller.
 */
export function parseStack(raw: string | undefined | null): Layer[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const layers: Layer[] = [];
  for (const token of raw.split(',')) {
    const layer = parseLayer(token.trim());
    if (!layer) continue;
    const key = layerKey(layer);
    if (seen.has(key)) continue;
    seen.add(key);
    layers.push(layer);
    if (layers.length === MAX_RINGS) break;
  }
  return layers;
}

/**
 * The stack an old link asks for.
 *
 * `?person=&overlay=&figure=` is in bookmarks, in the library's overlay links
 * and in anything anyone has shared. It keeps working: the old parameters
 * describe a stack, so they are read as one rather than redirected away.
 */
export function stackFromLegacy(params: {
  person?: string | undefined;
  overlay?: string | undefined;
  figure?: string | undefined;
}): Layer[] {
  const tokens = [
    params.person ? `p:${params.person}` : '',
    params.overlay ? `p:${params.overlay}` : '',
    params.figure ? `f:${params.figure}` : '',
  ].filter(Boolean);
  return parseStack(tokens.join(','));
}

export function isFull(layers: readonly Layer[]): boolean {
  return layers.length >= MAX_RINGS;
}

export function hasLayer(layers: readonly Layer[], layer: Layer): boolean {
  const key = layerKey(layer);
  return layers.some((entry) => layerKey(entry) === key);
}

/**
 * Add a ring on the outside.
 *
 * A full stack is returned unchanged rather than silently dropping whatever was
 * there. The caller disables the control and says why; a menu that quietly
 * replaces a chart you spent a minute choosing is worse than one that refuses.
 */
export function addLayer(layers: readonly Layer[], layer: Layer): Layer[] {
  if (isFull(layers) || hasLayer(layers, layer)) return [...layers];
  return [...layers, layer];
}

export function removeLayer(layers: readonly Layer[], index: number): Layer[] {
  if (index < 0 || index >= layers.length) return [...layers];
  return layers.filter((_, at) => at !== index);
}

/**
 * Move a ring to a new position, which is the whole point of the feature.
 *
 * Out-of-range indices return the stack unchanged rather than clamping: a drag
 * that ends outside the list is a cancelled drag, and clamping would turn it
 * into a reorder nobody asked for.
 */
export function moveLayer(layers: readonly Layer[], from: number, to: number): Layer[] {
  if (from < 0 || from >= layers.length || to < 0 || to >= layers.length) return [...layers];
  const next = [...layers];
  const [moved] = next.splice(from, 1);
  if (!moved) return [...layers];
  next.splice(to, 0, moved);
  return next;
}

/** The Julian day a moment layer stands for, given the workspace's today. */
export function momentJd(moment: Moment, todayJd: number): number {
  if (moment.kind === 'offset') return todayJd + moment.days;
  return jdFromUnixMs(Date.parse(`${moment.iso}T00:00:00Z`));
}

/** A stack with nothing in it is not a wheel; this is what the page falls back to. */
export function defaultStack(personId: string): Layer[] {
  return [{ kind: 'person', id: personId }];
}

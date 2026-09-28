import { GRAHAS, POINT_DISPLAY_ORDER, type Graha, type PointId } from '@jade/astro';

/**
 * The instrument's one piece of state, without React and without Next.
 *
 * Every view on an instrument page — the wheel, the nakṣatra ring, the daśā
 * timeline, the aṣṭakavarga graphics, the graphic ephemeris — is a projection
 * of exactly two values: the moment being shown and what is selected. This
 * module owns both. `instrument.tsx` is a thin React binding over it.
 *
 * It is split out so it can be tested as plain code. The rules that matter —
 * a reload restores the view, a drag writes no history, a hand-edited URL
 * degrades instead of throwing — are properties of this store and the URL
 * adapter it is given, and none of them need a browser to check.
 *
 * Nothing here reads a clock. `todayJd` is supplied by the page, as it is
 * everywhere else in Jade; the URL stores whole days from it (see `?t=` in
 * `WheelWorkspace.tsx` for why days rather than a date).
 */

export type Selection =
  | { readonly kind: 'graha'; readonly id: PointId }
  | { readonly kind: 'house'; readonly house: number }
  | { readonly kind: 'sign'; readonly signIndex: number }
  /** 0–26, Aśvinī first. */
  | { readonly kind: 'nakshatra'; readonly index: number }
  /** `nakshatra` 0–26, `pada` 1–4. */
  | { readonly kind: 'pada'; readonly nakshatra: number; readonly pada: number }
  /** A daśā period, outermost lord first: ['Saturn', 'Mercury'] is Saturn–Mercury. */
  | { readonly kind: 'period'; readonly lords: readonly Graha[] };

export interface InstrumentState {
  /** The moment every view is showing. Julian Day (UT). */
  readonly jd: number;
  /** What is selected, or null. One selection for the whole app. */
  readonly selection: Selection | null;
  /** True while a drag holds a live value that has not been written to the URL. */
  readonly isDragging: boolean;
}

// ---------------------------------------------------------------------------
// The URL codec
// ---------------------------------------------------------------------------

const isInt = (value: string): boolean => /^-?\d+$/.test(value);

/**
 * `?sel=` → a selection, or null for anything that is not exactly one.
 *
 * The URL is user-editable, so every branch validates its range: `nak:27` is
 * not "the 28th nakṣatra", it is nothing, and a view handed nothing shows
 * nothing selected rather than an out-of-range arc.
 */
export function parseSelection(raw: string | null | undefined): Selection | null {
  if (!raw) return null;
  const colon = raw.indexOf(':');
  if (colon < 0) return null;
  const kind = raw.slice(0, colon);
  const value = raw.slice(colon + 1);

  switch (kind) {
    case 'graha':
      return (POINT_DISPLAY_ORDER as readonly string[]).includes(value)
        ? { kind: 'graha', id: value as PointId }
        : null;
    case 'house': {
      if (!isInt(value)) return null;
      const house = Number(value);
      return house >= 1 && house <= 12 ? { kind: 'house', house } : null;
    }
    case 'sign': {
      if (!isInt(value)) return null;
      const signIndex = Number(value);
      return signIndex >= 0 && signIndex <= 11 ? { kind: 'sign', signIndex } : null;
    }
    case 'nak': {
      if (!isInt(value)) return null;
      const index = Number(value);
      return index >= 0 && index <= 26 ? { kind: 'nakshatra', index } : null;
    }
    case 'pada': {
      const match = /^(\d+)\.(\d)$/.exec(value);
      if (!match) return null;
      const nakshatra = Number(match[1]);
      const pada = Number(match[2]);
      return nakshatra <= 26 && pada >= 1 && pada <= 4 ? { kind: 'pada', nakshatra, pada } : null;
    }
    case 'period': {
      const lords = value.split('.');
      if (lords.length < 1 || lords.length > 5) return null;
      if (!lords.every((lord) => (GRAHAS as readonly string[]).includes(lord))) return null;
      return { kind: 'period', lords: lords as Graha[] };
    }
    default:
      return null;
  }
}

/** A selection → its `?sel=` value. The inverse of `parseSelection`. */
export function encodeSelection(selection: Selection): string {
  switch (selection.kind) {
    case 'graha':
      return `graha:${selection.id}`;
    case 'house':
      return `house:${selection.house}`;
    case 'sign':
      return `sign:${selection.signIndex}`;
    case 'nakshatra':
      return `nak:${selection.index}`;
    case 'pada':
      return `pada:${selection.nakshatra}.${selection.pada}`;
    case 'period':
      return `period:${selection.lords.join('.')}`;
  }
}

/**
 * `?t=` → whole days from today. Absent or malformed is today.
 *
 * Bounded at ±200 years, which covers any lifetime the daśā timeline can draw
 * and stops `t=1e308` from producing a Julian Day the ephemeris cannot answer.
 */
export const MAX_OFFSET_DAYS = 73_050;

export function parseOffset(raw: string | null | undefined): number {
  if (raw === null || raw === undefined || !isInt(raw)) return 0;
  const days = Number(raw);
  return Math.abs(days) <= MAX_OFFSET_DAYS ? days : 0;
}

export function sameSelection(a: Selection | null, b: Selection | null): boolean {
  if (a === null || b === null) return a === b;
  return encodeSelection(a) === encodeSelection(b);
}

// ---------------------------------------------------------------------------
// The store
// ---------------------------------------------------------------------------

/**
 * Where the store reads and writes its URL.
 *
 * In the app this is the Next router; in the tests it is an array standing in
 * for browser history. `push` is used for every commit, so the back button
 * walks the views someone actually settled on.
 */
export interface UrlAdapter {
  /** The current query string, without the leading `?`. */
  read(): string;
  push(query: string): void;
}

export interface InstrumentStore {
  getState(): InstrumentState;
  subscribe(listener: () => void): () => void;
  /** Commit a moment. Rounds to whole days from today — the URL's resolution. */
  setJd(jd: number): void;
  setSelection(selection: Selection | null): void;
  /** Move the live value during a drag. Writes nothing to the URL. */
  scrubTo(jd: number): void;
  /** Release: commit the live value in one history entry and leave drag mode. */
  endScrub(): void;
  /** Call when the URL changed underneath the store (back, forward, a link). */
  syncFromUrl(): void;
  readonly todayJd: number;
}

export function createInstrumentStore(adapter: UrlAdapter, todayJd: number): InstrumentStore {
  let live: number | null = null;
  let state = fromUrl();
  const listeners = new Set<() => void>();

  function fromUrl(): InstrumentState {
    const params = new URLSearchParams(adapter.read());
    return {
      jd: live ?? todayJd + parseOffset(params.get('t')),
      selection: parseSelection(params.get('sel')),
      isDragging: live !== null,
    };
  }

  function emit(): void {
    state = fromUrl();
    for (const listener of listeners) listener();
  }

  function write(mutate: (params: URLSearchParams) => void): void {
    const before = adapter.read();
    const params = new URLSearchParams(before);
    mutate(params);
    const after = params.toString();
    // A click on what is already chosen must not stack a duplicate entry.
    if (after !== before) adapter.push(after);
  }

  function commitJd(jd: number): void {
    const days = Math.max(-MAX_OFFSET_DAYS, Math.min(MAX_OFFSET_DAYS, Math.round(jd - todayJd)));
    write((params) => {
      if (days === 0) params.delete('t');
      else params.set('t', String(days));
    });
  }

  return {
    todayJd,
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setJd(jd) {
      if (!Number.isFinite(jd)) return;
      live = null;
      commitJd(jd);
      emit();
    },
    setSelection(selection) {
      write((params) => {
        if (selection) params.set('sel', encodeSelection(selection));
        else params.delete('sel');
      });
      emit();
    },
    scrubTo(jd) {
      if (!Number.isFinite(jd)) return;
      live = jd;
      emit();
    },
    endScrub() {
      if (live === null) return;
      const jd = live;
      live = null;
      commitJd(jd);
      emit();
    },
    syncFromUrl() {
      emit();
    },
  };
}

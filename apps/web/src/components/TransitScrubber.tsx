'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { dashaChainAt, jdFromUnixMs, unixMsFromJd, vimshottari } from '@jade/astro';
import type { YearLength } from '@jade/astro';
import { T } from './Glossary';

/**
 * The transit ring, moved through time.
 *
 * ## The one rule that makes this cheap
 *
 * **Only transits recompute.** Nine bodies move. The natal positions, the
 * yogas, the vargas, the aṣṭakavarga, the ṣaḍbala and the house lords are
 * properties of the birth moment and cannot change because someone dragged a
 * slider. Recomputing them would be both wasteful and wrong — it would let a
 * rendering control alter a reading. The natal ring is passed in already
 * computed and this component never touches it.
 *
 * The daśā chain is the exception, and it is not really one: `dashaChainAt` is
 * a lookup in a tree that was built from the birth Moon, so moving the date
 * asks a different question of the same fixed structure. It costs nothing and
 * it is the actual question people scrub for — "what is running when Saturn
 * gets there".
 *
 * ## Saying when it is not today
 *
 * A wheel quietly showing a date you set twenty minutes ago and forgot is a
 * correctness problem, not a UI wrinkle. So the off-today state is announced in
 * text, in colour, and to screen readers, and one control returns to now.
 */

export interface ScrubberNatal {
  /** Sidereal longitude of the natal Moon — the daśā tree is built from it. */
  readonly moonLongitude: number;
  readonly birthJd: number;
  readonly yearLength: YearLength;
}

/** Days per step of the slider. One day: the Moon moves about 13°, visibly. */
const SLIDER_MIN = -3653; // ten years back
const SLIDER_MAX = 3653; // ten years forward

function isoOf(jdUt: number): string {
  return new Date(unixMsFromJd(jdUt)).toISOString().slice(0, 10);
}

/** Midnight UT on an ISO date, as a Julian Day. Returns null for junk input. */
export function jdFromIsoDate(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const ms = Date.parse(`${iso}T00:00:00Z`);
  return Number.isNaN(ms) ? null : jdFromUnixMs(ms);
}

function formatLongDate(jdUt: number): string {
  return new Date(unixMsFromJd(jdUt)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** "in 8 months", "3 years ago" — the distance, in the unit a reader thinks in. */
function relativeSpan(days: number): string {
  const magnitude = Math.abs(days);
  const ahead = days > 0;
  let value: number;
  let unit: string;
  if (magnitude < 45) {
    value = Math.round(magnitude);
    unit = value === 1 ? 'day' : 'days';
  } else if (magnitude < 365) {
    value = Math.round(magnitude / 30.44);
    unit = value === 1 ? 'month' : 'months';
  } else {
    value = Math.round((magnitude / 365.25) * 10) / 10;
    unit = value === 1 ? 'year' : 'years';
  }
  return ahead ? `in ${value} ${unit}` : `${value} ${unit} ago`;
}

const JUMPS: readonly { readonly label: string; readonly days: number }[] = [
  { label: '−1y', days: -365 },
  { label: '−1m', days: -30 },
  { label: '−1w', days: -7 },
  { label: '+1w', days: 7 },
  { label: '+1m', days: 30 },
  { label: '+1y', days: 365 },
];

export function TransitScrubber({
  natal,
  todayJd,
  offsetDays,
  loading = false,
  onOffsetChange,
  onDismiss,
}: {
  readonly natal: ScrubberNatal;
  /** Today, supplied by the page. The core has no clock; neither does this. */
  readonly todayJd: number;
  /** Days from today. Zero means today, and today is a distinct state. */
  readonly offsetDays: number;
  /**
   * True while the ephemeris is still being fetched.
   *
   * Said out loud rather than shown as an empty ring. A wheel with no transits
   * on it is a legitimate state of this component, so a reader who was not told
   * would reasonably conclude the feature is broken.
   */
  readonly loading?: boolean;
  /**
   * Commit a new offset. Called on release rather than on every pixel of a
   * drag, because each commit is a URL write and a dragged finger would
   * otherwise leave a hundred history entries behind it.
   */
  readonly onOffsetChange: (days: number) => void;
  /** Take the transit ring off again. */
  readonly onDismiss: () => void;
}): React.ReactElement {
  /**
   * The live value during a drag, before it is committed upward.
   *
   * Two sources of truth for one number is normally a bug; here it is the
   * difference between a slider that moves under your finger and one that
   * waits for a router round trip. `dragging` decides which one is displayed,
   * and releasing collapses them.
   */
  const [dragValue, setDragValue] = useState<number | null>(null);
  const [dateFieldError, setDateFieldError] = useState<string | null>(null);
  const liveRef = useRef(offsetDays);

  const shown = dragValue ?? offsetDays;
  liveRef.current = shown;
  const jd = todayJd + shown;
  const isToday = Math.abs(shown) < 0.5;

  /**
   * The daśā tree, built once from the birth Moon and never rebuilt.
   *
   * Three levels: mahā, antara, pratyantara. Recomputed only if the subject
   * changes, which on this page it does not.
   */
  const dashas = useMemo(
    () =>
      vimshottari(natal.moonLongitude, natal.birthJd, { levels: 3, yearLength: natal.yearLength }),
    [natal.moonLongitude, natal.birthJd, natal.yearLength],
  );

  const chain = useMemo(() => dashaChainAt(dashas, jd), [dashas, jd]);

  const commit = useCallback(
    (days: number): void => {
      const clamped = Math.max(SLIDER_MIN, Math.min(SLIDER_MAX, Math.round(days)));
      setDragValue(null);
      setDateFieldError(null);
      onOffsetChange(clamped);
    },
    [onOffsetChange],
  );

  const release = useCallback((): void => {
    commit(liveRef.current);
  }, [commit]);

  return (
    <section
      aria-label="Transit date"
      className={`mt-3 border p-3 ${
        isToday ? 'border-[var(--rule)]' : 'border-[var(--clay)] bg-[var(--band-difficult-wash)]'
      }`}
    >
      {/* ------------------------------------------------- what date is this */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          Outer ring · transits
        </p>
        {/* Announced, not merely coloured: a reader who cannot see the tint
            still has to be told the chart is not showing today. */}
        <p aria-live="polite" className="font-mono text-[10px] uppercase tracking-[0.14em]">
          {loading ? (
            <span className="text-[var(--ink-faint)]">Loading the ephemeris…</span>
          ) : isToday ? (
            <span className="text-[var(--jade)]">Today</span>
          ) : (
            <span className="text-[var(--clay)]">Not today — {relativeSpan(shown)}</span>
          )}
        </p>
      </div>

      <p className="mt-1 font-display text-2xl leading-none">{formatLongDate(jd)}</p>

      {/* ------------------------------------------------------- the slider */}
      <label className="mt-3 block">
        <span className="sr-only">Scrub the transit date, in days from today</span>
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={1}
          value={shown}
          onChange={(event) => setDragValue(Number(event.target.value))}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyUp={release}
          onBlur={() => {
            if (dragValue !== null) release();
          }}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      {/* -------------------------------------------------------- the jumps */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => commit(0)}
          disabled={isToday}
          className="border border-[var(--accent)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] disabled:border-[var(--rule)] disabled:text-[var(--ink-faint)]"
        >
          Today
        </button>
        {JUMPS.map((jump) => (
          <button
            key={jump.label}
            type="button"
            onClick={() => commit(shown + jump.days)}
            className="border border-[var(--rule)] px-2 py-1 font-mono text-[10px] tracking-wider hover:border-[var(--accent)]"
          >
            {jump.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onDismiss}
          className="border border-[var(--rule)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--ink-muted)] hover:border-[var(--clay)]"
        >
          Remove ring
        </button>
        <label className="ml-auto flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
            Date
          </span>
          <input
            type="date"
            value={isoOf(jd)}
            onChange={(event) => {
              const parsed = jdFromIsoDate(event.target.value);
              if (parsed === null) {
                setDateFieldError('That is not a date Jade can read. Use YYYY-MM-DD.');
                return;
              }
              const days = parsed - todayJd;
              if (days < SLIDER_MIN || days > SLIDER_MAX) {
                setDateFieldError('The scrubber covers ten years either side of today.');
                return;
              }
              commit(days);
            }}
            className="border border-[var(--rule)] bg-[var(--surface)] px-1.5 py-0.5 font-mono text-[11px]"
          />
        </label>
      </div>
      {dateFieldError ? (
        <p role="alert" className="mt-1.5 text-[12px] text-[var(--clay)]">
          {dateFieldError}
        </p>
      ) : null}

      {/* --------------------------------------------------- the daśā chain */}
      {chain.length > 0 ? (
        <p className="mt-2.5 border-t border-[var(--rule)] pt-2 text-[13px] leading-relaxed">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Running then ·{' '}
          </span>
          {chain.map((period, index) => (
            <span key={period.lords.join('-')}>
              {index > 0 ? <span className="text-[var(--ink-faint)]"> › </span> : null}
              <T id={`graha-${period.lord.toLowerCase()}`} plainTrigger>
                {period.lord}
              </T>
            </span>
          ))}
          <span className="ml-2 font-mono text-[10.5px] text-[var(--ink-faint)]">
            {chain.length === 1 ? (
              <T id="mahadasha" plainTrigger>
                mahādaśā
              </T>
            ) : (
              <>
                to{' '}
                <T id={chain.length === 2 ? 'antardasha' : 'pratyantardasha'} plainTrigger>
                  {chain.length === 2 ? 'antardaśā' : 'pratyantardaśā'}
                </T>
              </>
            )}
          </span>
        </p>
      ) : null}

      {/* Constitution #1 and docs/07-accuracy.md: the interactive provider
          drives the screen and is not allowed to be the source of a printed
          date. Said here rather than in a doc nobody opens. */}
      <p className="mt-2 font-mono text-[10px] leading-relaxed text-[var(--ink-faint)]">
        Positions from the interactive ephemeris — right to well under a degree, drawn live in your
        browser. A date Jade states or prints is recomputed server-side from the reference
        ephemeris.
      </p>
    </section>
  );
}

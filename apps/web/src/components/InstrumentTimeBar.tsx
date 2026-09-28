'use client';

import { useEffect, useRef, useState } from 'react';
import { unixMsFromJd } from '@jade/astro';
import { useInstrument } from '@/lib/instrument';

/**
 * The instrument's time cursor, as visible controls.
 *
 * Every shortcut the views honour has a button here: `[` and `]` step a day,
 * `{` and `}` a month, Escape clears the selection. A keyboard shortcut with
 * no visible control is undiscoverable, and a button is how a phone does the
 * same thing (brief §6).
 *
 * ## Play, and WCAG 2.2.2
 *
 * Play advances the sky a day at a time. It never starts by itself, and while
 * it runs the same button reads "Pause" — anything that moves needs a visible
 * way to stop it, and the "essential motion" exemption does not apply because
 * a still view carries identical data. Play drives the live value, not the
 * URL, so a minute of playback is one history entry when it stops, not six
 * hundred.
 */

const SLIDER_SPAN = 3653; // ten years either side of today

function formatDate(jd: number): string {
  return new Date(unixMsFromJd(jd)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function InstrumentTimeBar(): React.ReactElement {
  const { jd, todayJd, isDragging, setJd, scrubTo, endScrub, selection, setSelection } =
    useInstrument();
  const [playing, setPlaying] = useState(false);
  const liveJd = useRef(jd);
  liveJd.current = jd;

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => scrubTo(liveJd.current + 1), 120);
    return () => window.clearInterval(timer);
  }, [playing, scrubTo]);

  const stopPlaying = (): void => {
    setPlaying(false);
    endScrub();
  };

  const offset = Math.round(jd - todayJd);
  const isToday = offset === 0;
  const step = (days: number): void => setJd(Math.round(jd) + days - (Math.round(jd) - jd));

  return (
    <section
      aria-label="Instrument time"
      className={`border p-3 ${
        isToday ? 'border-[var(--rule)]' : 'border-[var(--clay)] bg-[var(--band-difficult-wash)]'
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-2xl leading-none">{formatDate(jd)}</p>
        <p aria-live="polite" className="font-mono text-[10px] uppercase tracking-[0.14em]">
          {isToday ? (
            <span className="text-[var(--jade)]">Today</span>
          ) : (
            <span className="text-[var(--clay)]">
              Not today — {offset > 0 ? `${offset} days ahead` : `${-offset} days back`}
              {isDragging ? ' · moving' : ''}
            </span>
          )}
        </p>
      </div>

      <label className="mt-3 block">
        <span className="sr-only">Move every view through time, in days from today</span>
        <input
          type="range"
          min={-SLIDER_SPAN}
          max={SLIDER_SPAN}
          step={1}
          value={Math.max(-SLIDER_SPAN, Math.min(SLIDER_SPAN, offset))}
          onChange={(event) => scrubTo(todayJd + Number(event.target.value))}
          onPointerUp={endScrub}
          onPointerCancel={endScrub}
          onKeyUp={endScrub}
          onBlur={endScrub}
          className="w-full accent-[var(--accent)]"
        />
      </label>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
        <button type="button" onClick={() => step(-30)} className={BUTTON} title="Shortcut: {">
          −1 month {'{'}
        </button>
        <button type="button" onClick={() => step(-1)} className={BUTTON} title="Shortcut: [">
          −1 day [
        </button>
        <button type="button" onClick={() => step(1)} className={BUTTON} title="Shortcut: ]">
          +1 day ]
        </button>
        <button type="button" onClick={() => step(30)} className={BUTTON} title="Shortcut: }">
          +1 month {'}'}
        </button>
        <button
          type="button"
          onClick={() => setJd(todayJd)}
          disabled={isToday}
          className={`${BUTTON} disabled:text-[var(--ink-faint)]`}
        >
          Today
        </button>
        <button
          type="button"
          aria-pressed={playing}
          onClick={() => (playing ? stopPlaying() : setPlaying(true))}
          className={`${BUTTON} ${playing ? 'border-[var(--accent)] text-[var(--accent)]' : ''}`}
        >
          {playing ? 'Pause ❚❚' : 'Play ▶'}
        </button>
        <button
          type="button"
          onClick={() => setSelection(null)}
          disabled={!selection}
          className={`${BUTTON} ml-auto disabled:text-[var(--ink-faint)]`}
          title="Shortcut: Escape"
        >
          Clear selection · Esc
        </button>
      </div>
    </section>
  );
}

const BUTTON = 'border border-[var(--rule)] px-2 py-1 hover:border-[var(--accent)]';

/**
 * The page-wide shortcuts, bound to the instrument region rather than the
 * window so typing in a note field never scrubs the sky.
 *
 * Views handle their own arrows and Escape first and stop the event; what
 * reaches here is time, plus Escape from anywhere else in the region.
 */
export function useInstrumentKeys(): (event: React.KeyboardEvent) => void {
  const { jd, setJd, setSelection } = useInstrument();
  return (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const days = { '[': -1, ']': 1, '{': -30, '}': 30 }[event.key];
    if (days !== undefined) {
      setJd(jd + days);
      event.preventDefault();
    } else if (event.key === 'Escape') {
      setSelection(null);
      event.preventDefault();
    }
  };
}

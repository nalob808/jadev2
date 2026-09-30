'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import {
  STEP_UNITS,
  daysBetween,
  isRealDate,
  readableDate,
  stepDate,
  type StepUnit,
} from '@/lib/spacetime';

/**
 * Where in time the wheel is looking.
 *
 * The scrubber that already exists covers ten years either way and is the right
 * tool for sweeping — drag it and watch Saturn crawl. It is the wrong tool for
 * arriving: nobody finds next March by dragging. So this sits beside it and
 * does the other half, stepping by whole calendar units or taking a date
 * outright.
 *
 * Both write the same `?t=` parameter the instrument and the scrubber already
 * use, so the two controls cannot disagree and a link still carries the moment.
 * Calendar arithmetic is in `lib/spacetime.ts`, tested, because a month is not
 * thirty days and stepping forward then back has to come home.
 */
export function SpacetimeNavigator({
  todayIso,
  offsetDays,
}: {
  /** The workspace's today, resolved on the server from its own clock. */
  readonly todayIso: string;
  /** Days from today, as `?t=` carries it. */
  readonly offsetDays: number;
}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [amount, setAmount] = useState(1);
  const [unit, setUnit] = useState<StepUnit>('day');

  const currentIso = stepDate(todayIso, offsetDays, 'day');
  const [typed, setTyped] = useState(currentIso);

  const goTo = (iso: string): void => {
    const query = new URLSearchParams(params.toString());
    const days = daysBetween(todayIso, iso);
    if (days === 0) query.delete('t');
    else query.set('t', String(days));
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  };

  const step = (direction: 1 | -1): void => {
    goTo(stepDate(currentIso, direction * Math.max(1, Math.round(amount)), unit));
  };

  return (
    <section className="jade-panel p-4">
      <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--accent)]">
        Where in time
      </p>
      <p className="mt-0.5 font-display text-xl leading-tight">{readableDate(currentIso)}</p>
      <p className="font-mono text-[10px] text-[var(--ink-faint)]">
        {offsetDays === 0
          ? 'Today'
          : `${Math.abs(offsetDays)} day${Math.abs(offsetDays) === 1 ? '' : 's'} ${offsetDays > 0 ? 'ahead' : 'back'}`}
      </p>

      {/* ------------------------------------------------------- the stepper */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={`Back ${amount} ${unit}${amount === 1 ? '' : 's'}`}
          className="border border-[var(--rule-strong)] px-2.5 py-1.5 font-mono text-[11px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          ←
        </button>
        <input
          type="number"
          min="1"
          max="999"
          value={amount}
          onChange={(event) => setAmount(Number(event.target.value))}
          aria-label="How many"
          className="w-14 border border-[var(--rule-strong)] bg-transparent px-2 py-1.5 text-right font-mono text-[12px] tabular-nums"
        />
        <select
          value={unit}
          onChange={(event) => setUnit(event.target.value as StepUnit)}
          aria-label="Step by"
          className="border border-[var(--rule-strong)] bg-transparent px-2 py-1.5 font-mono text-[11px]"
        >
          {STEP_UNITS.map((one) => (
            <option key={one} value={one}>
              {one}
              {amount === 1 ? '' : 's'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={`Forward ${amount} ${unit}${amount === 1 ? '' : 's'}`}
          className="border border-[var(--rule-strong)] px-2.5 py-1.5 font-mono text-[11px] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          →
        </button>
      </div>

      {/* ---------------------------------------------------------- a date */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <input
          type="date"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          aria-label="Go to a date"
          className="border border-[var(--rule-strong)] bg-transparent px-2 py-1.5 font-mono text-[12px]"
        />
        <button
          type="button"
          disabled={!isRealDate(typed) || typed === currentIso}
          onClick={() => goTo(typed)}
          className="border border-[var(--accent)] px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] transition-colors enabled:hover:bg-[var(--accent)] enabled:hover:text-white disabled:opacity-30"
        >
          Go
        </button>
        <button
          type="button"
          disabled={offsetDays === 0}
          onClick={() => goTo(todayIso)}
          className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] transition-colors enabled:hover:text-[var(--accent)] disabled:opacity-30"
        >
          now
        </button>
      </div>

      <p className="mt-2.5 border-t border-[var(--rule)] pt-2 font-mono text-[9.5px] leading-relaxed text-[var(--ink-faint)]">
        Dates are UTC, and the transit ring is drawn for midnight on the day shown. Drag the
        scrubber to sweep; use this to arrive.
      </p>
    </section>
  );
}

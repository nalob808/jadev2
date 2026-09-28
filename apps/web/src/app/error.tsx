'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * What a page does when it throws.
 *
 * There was no boundary here at all, so any unhandled throw in a server
 * component became a 500 — a blank browser error page with no way back. That
 * mattered more than it sounds, because the throws Jade can produce are mostly
 * *settings* throws: a frame of reference the core cannot compute breaks all
 * sixteen pages that cast a chart, including the one you land on after signing
 * in, and the masthead goes with them. Somebody two minutes into their first
 * session would have had to guess the URL of the settings page.
 *
 * So this says which way is out. `reset()` re-renders the segment, which is the
 * right first move for a transient failure — a dropped database connection —
 * and does nothing for a stored setting, which is why Settings is offered
 * beside it rather than underneath it.
 *
 * The message is not printed. Next redacts server error messages in production
 * to a digest precisely so internals and data do not leak to the browser, and
 * birth data is the sensitive kind (CLAUDE.md #4). The digest is enough to find
 * the matching server log; in development the real error is on the console,
 * where it belongs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.ReactElement {
  useEffect(() => {
    console.error('Jade page error', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        Something broke
      </p>
      <h1 className="mt-1 font-display text-[2.6rem] font-semibold leading-[1.06]">
        This page could not be drawn
      </h1>
      <p className="mt-3 max-w-[58ch] text-[var(--ink-muted)]">
        Nothing was lost — your charts and notes are stored, and no calculation was saved. If this
        started right after changing a setting, the frame of reference is the usual cause: an
        ayanāṁśa or house system Jade names but cannot compute yet.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="border border-[var(--accent)] bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
        >
          Try again
        </button>
        <Link
          href="/settings"
          className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-4"
        >
          Check your settings →
        </Link>
        <Link
          href="/home"
          className="font-mono text-[11px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
        >
          Home
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-10 border-t border-[var(--rule)] pt-4 font-mono text-[10px] text-[var(--ink-faint)]">
          Reference {error.digest} — quote this if you report it.
        </p>
      ) : null}
    </main>
  );
}

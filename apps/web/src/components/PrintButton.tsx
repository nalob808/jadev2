'use client';

/**
 * Print, or save as PDF — the same thing in every modern browser.
 *
 * A client component for one reason: `window.print()`. It is deliberately not
 * an `<a href>` to a server-rendered PDF, because there is no server-side PDF
 * renderer and pretending otherwise would mean shipping a link that sometimes
 * times out.
 *
 * The `print-hide` class is what removes it from the printed page. Without it
 * the report has a button drawn on it, which is the detail that makes a
 * printout look like a screenshot of an app rather than a document.
 */
export function PrintButton({ label = 'Print / Save as PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print-hide inline-flex items-center gap-2 border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-1.5 font-display text-base tracking-wide text-white transition-colors hover:bg-transparent hover:text-[var(--accent)]"
    >
      {label}
    </button>
  );
}

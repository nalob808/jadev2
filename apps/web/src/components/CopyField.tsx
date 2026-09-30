'use client';

import { useState } from 'react';

/**
 * A value that exists to be copied, and says when it has been.
 *
 * Read-only and selected on focus, because the only thing anybody wants to do
 * with a share link is take all of it. The button is a convenience over that
 * rather than the only way in — `navigator.clipboard` is unavailable on an
 * insecure origin and can be refused by permission policy, so the input is
 * always there and always selectable.
 */
export function CopyField({
  value,
  label,
}: {
  readonly value: string;
  readonly label: string;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* No clipboard. The field is selectable, which is the fallback. */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        readOnly
        value={value}
        aria-label={label}
        onFocus={(event) => event.currentTarget.select()}
        className="min-w-0 flex-1 border border-[var(--rule-strong)] bg-[var(--paper)] px-3 py-2 font-mono text-[12px]"
      />
      <button
        type="button"
        onClick={() => void copy()}
        className="border border-[var(--accent)] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] transition-colors hover:bg-[var(--accent)] hover:text-white"
      >
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

type Choice = 'system' | 'light' | 'dark';

const CHOICES: Array<{ id: Choice; label: string }> = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/**
 * Light, dark, or follow the operating system.
 *
 * Stored in `localStorage` rather than on the workspace, because a theme is a
 * property of the screen someone is looking at, not of their practice — the
 * same person wants dark on a laptop at night and light on a phone outdoors,
 * and a server-side preference would fight that.
 *
 * "System" removes the attribute entirely rather than writing a third value,
 * so the CSS falls through to `prefers-color-scheme` with nothing overriding
 * it. The blocking script in the root layout applies the saved choice before
 * first paint; this only has to handle changes made after the page is up.
 *
 * Every access is wrapped: a browser with site data blocked throws on the
 * `localStorage` getter itself, and the page must still work.
 */
export function ThemeToggle(): React.ReactElement {
  const [choice, setChoice] = useState<Choice>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('jade-theme');
      if (saved === 'dark' || saved === 'light') setChoice(saved);
    } catch {
      // Site data blocked. System theme it is.
    }
    setReady(true);
  }, []);

  const apply = (next: Choice): void => {
    setChoice(next);
    const root = document.documentElement;
    if (next === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', next);
    }
    try {
      if (next === 'system') localStorage.removeItem('jade-theme');
      else localStorage.setItem('jade-theme', next);
    } catch {
      // The theme still applies for this page; it just will not be remembered.
    }
  };

  return (
    <div
      role="group"
      aria-label="Theme"
      className="flex w-fit border border-[var(--rule)] bg-[var(--surface)]"
    >
      {CHOICES.map((option) => {
        const active = ready && choice === option.id;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => apply(option.id)}
            className={`px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
              active
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

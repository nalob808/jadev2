'use client';

import { useId, useState } from 'react';

/**
 * The settings screen's tabs.
 *
 * Every panel stays mounted and inactive ones are hidden, rather than only the
 * active panel being rendered. That is the whole reason this is a client
 * component instead of a `?tab=` query parameter: the four panels are one
 * `<form>`, and a field that is not in the DOM is not submitted. Rendering one
 * panel at a time would mean saving the Aspects tab silently cleared the frame,
 * or the other way round.
 *
 * Keyboard behaviour follows the tabs pattern: arrows move between tabs, and
 * only the selected tab is in the tab order, so somebody tabbing through the
 * form lands on the panel rather than on five buttons.
 */
export function SettingsTabs({
  labels,
  children,
}: {
  readonly labels: readonly string[];
  readonly children: readonly React.ReactNode[];
}): React.ReactElement {
  const [active, setActive] = useState(0);
  const base = useId();

  const move = (delta: number): void => {
    setActive((current) => (current + delta + labels.length) % labels.length);
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Settings sections"
        className="mb-5 flex flex-wrap gap-1.5 border-b border-[var(--rule)] pb-2"
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') move(1);
          else if (event.key === 'ArrowLeft') move(-1);
          else return;
          event.preventDefault();
        }}
      >
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`${base}-tab-${index}`}
            aria-selected={index === active}
            aria-controls={`${base}-panel-${index}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            className={`border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              index === active
                ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                : 'border-[var(--rule)] text-[var(--ink-muted)] hover:border-[var(--accent-soft)] hover:text-[var(--ink)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {children.map((panel, index) => (
        <div
          key={labels[index] ?? index}
          role="tabpanel"
          id={`${base}-panel-${index}`}
          aria-labelledby={`${base}-tab-${index}`}
          hidden={index !== active}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}

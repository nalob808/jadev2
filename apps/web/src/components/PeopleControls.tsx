'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import {
  SORTS,
  SORT_LABELS,
  VIEWS,
  VIEW_LABELS,
  toQuery,
  type PeopleViewState,
  type Sort,
} from '@/lib/peopleView';

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: 'Me',
  partner: 'Partner',
  family: 'Family',
  friend: 'Friend',
  client: 'Client',
  student: 'Student',
  public_figure: 'Public figure',
  other: 'Other',
};

function label(value: string): string {
  return RELATIONSHIP_LABELS[value] ?? value.replace(/_/g, ' ');
}

const FIELD =
  'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] ' +
  'focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]';

/**
 * Search, sort, filter and view switching for the people list.
 *
 * All four live in the URL rather than in component state. That makes a view
 * survive a reload and the back button, and it means the server does the
 * filtering — so what is on screen is always what the current URL describes,
 * with no second copy of the list held in the client that can drift from it.
 *
 * `useTransition` keeps the old list on screen and dimmed while the new one is
 * fetched, rather than blanking to a skeleton on every keystroke. Typing is
 * the one navigation where a placeholder is more disruptive than stale data.
 */
export function PeopleControls({
  state,
  relationships,
  total,
  showing,
}: {
  state: PeopleViewState;
  relationships: readonly string[];
  total: number;
  showing: number;
}): React.ReactElement {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(state.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const go = (next: PeopleViewState): void => {
    startTransition(() => {
      router.replace(`/people${toQuery(next)}`, { scroll: false });
    });
  };

  // Typing navigates, but not on every keystroke.
  useEffect(() => {
    if (query === state.q) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => go({ ...state, q: query }), 220);
    return () => clearTimeout(debounce.current);
  }, [query]);

  // Keep the box in step when the URL changes from somewhere else — a back
  // button, or the "clear search" link below.
  useEffect(() => {
    setQuery(state.q);
  }, [state.q]);

  const filtered = showing !== total;

  return (
    <div className={`mb-5 transition-opacity ${pending ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="people-search">
          Search people
        </label>
        <input
          id="people-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, birthplace or tag"
          className={`${FIELD} min-w-[12rem] grow`}
        />

        <label className="sr-only" htmlFor="people-sort">
          Sort by
        </label>
        <select
          id="people-sort"
          value={state.sort}
          onChange={(event) => go({ ...state, sort: event.target.value as Sort })}
          className={FIELD}
        >
          {SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>

        {/* A filter with one option is furniture, not a control. */}
        {relationships.length > 1 ? (
          <>
            <label className="sr-only" htmlFor="people-relationship">
              Filter by relationship
            </label>
            <select
              id="people-relationship"
              value={state.relationship}
              onChange={(event) => go({ ...state, relationship: event.target.value })}
              className={FIELD}
            >
              <option value="">Everyone</option>
              {relationships.map((value) => (
                <option key={value} value={value}>
                  {label(value)}
                </option>
              ))}
            </select>
          </>
        ) : null}

        <div
          role="group"
          aria-label="View style"
          className="flex border border-[var(--rule)] bg-[var(--surface)]"
        >
          {VIEWS.map((view) => {
            const active = state.view === view;
            return (
              <button
                key={view}
                type="button"
                aria-pressed={active}
                onClick={() => go({ ...state, view })}
                className={`px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors ${
                  active
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
              >
                {VIEW_LABELS[view]}
              </button>
            );
          })}
        </div>
      </div>

      {filtered ? (
        <p className="mt-2 font-mono text-[11px] text-[var(--ink-muted)]">
          {showing} of {total}
          {' · '}
          <button
            type="button"
            onClick={() => go({ ...state, q: '', relationship: '' })}
            className="underline hover:text-[var(--ink)]"
          >
            clear filters
          </button>
        </p>
      ) : null}
    </div>
  );
}

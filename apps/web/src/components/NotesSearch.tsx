'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Search and tag filter for the notes index.
 *
 * Preserves every search param it does not own, so filtering by text while an
 * anchor filter is active narrows within that anchor rather than silently
 * dropping it — the failure that makes a filter bar feel like it is fighting
 * you.
 *
 * `useTransition` keeps the current notes on screen and dimmed while the next
 * set loads. Typing is the one navigation where a skeleton is more disruptive
 * than slightly stale content.
 */
export function NotesSearch({
  query,
  tag,
  tags,
  basePath,
}: {
  query: string;
  tag: string;
  tags: readonly string[];
  basePath: string;
}): React.ReactElement {
  const router = useRouter();
  const current = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState(query);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const go = (patch: Record<string, string>): void => {
    const next = new URLSearchParams(current?.toString() ?? '');
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    // A stale error banner must not survive the next navigation.
    next.delete('noteError');
    startTransition(() => {
      router.replace(`${basePath}${next.toString() ? `?${next}` : ''}`, { scroll: false });
    });
  };

  useEffect(() => {
    if (text === query) return;
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => go({ q: text }), 240);
    return () => clearTimeout(debounce.current);
  }, [text]);

  useEffect(() => {
    setText(query);
  }, [query]);

  const field =
    'border border-[var(--rule)] bg-[var(--surface)] px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--accent)] placeholder:text-[var(--ink-faint)]';

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity ${pending ? 'opacity-60' : ''}`}
    >
      <label className="sr-only" htmlFor="notes-search">
        Search notes
      </label>
      <input
        id="notes-search"
        type="search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search your notes"
        className={`${field} min-w-[12rem] grow`}
      />

      {tags.length > 0 ? (
        <>
          <label className="sr-only" htmlFor="notes-tag">
            Filter by tag
          </label>
          <select
            id="notes-tag"
            value={tag}
            onChange={(event) => go({ tag: event.target.value })}
            className={field}
          >
            <option value="">All tags</option>
            {tags.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useId, useRef, useState } from 'react';
import { moveLayer, parseStack, serialiseStack } from '@/lib/chartStack';

/**
 * The chart stack, as panels beside the wheel.
 *
 * One panel per ring, inner first, and dragging one above another is what
 * swapping the wheels means. The ring order decides whose ascendant frames the
 * drawing, so a reorder is a real recast on the server rather than a repaint —
 * which is why this navigates instead of setting local state.
 *
 * ## Dragging is the decoration, not the mechanism
 *
 * Every reorder is available as a button before it is available as a drag.
 * Pointer drag does not exist on a phone in any reliable form, it is invisible
 * to a screen reader, and it is unusable with a keyboard — and quick chart
 * checks happen on phones more than anywhere else. So the buttons are built
 * first and the drag is added on top of them, sharing one code path.
 */

export interface StackEntry {
  /** `layerKey` — also the drag payload and the React key. */
  readonly key: string;
  readonly kind: 'person' | 'figure' | 'moment';
  readonly title: string;
  /** Natal, Library, Transits — what this ring is. */
  readonly role: string;
  readonly line?: string | undefined;
  /** Rodden rating, for library figures that carry one. */
  readonly rating?: string | null | undefined;
  readonly href?: string | undefined;
  /**
   * A moment rides the outer ring and cannot be reordered yet: the wheel draws
   * transits from `?t=` in a fixed outermost position. Reordering the chart
   * rings works today; moving the sky inside a chart waits for the wheel to
   * take an ordered list of point sets.
   */
  readonly pinned?: boolean | undefined;
}

export function ChartStackPanels({
  entries,
  stack,
}: {
  readonly entries: readonly StackEntry[];
  /**
   * The stack the page actually resolved, serialised.
   *
   * Passed in rather than re-read from `?stack=`, because an old
   * `?person=&overlay=` link has no such parameter — and reordering from one of
   * those has to work, or every bookmark in the wild loses the feature.
   */
  readonly stack: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [dragging, setDragging] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const liveId = useId();
  const busy = useRef(false);

  const movable = entries.filter((entry) => !entry.pinned);

  /** Rewrite `?stack=` in the order the panels are now in. */
  const commit = useCallback(
    (from: number, to: number) => {
      if (busy.current || from === to) return;
      const next = moveLayer(parseStack(stack), from, to);
      if (next.length === 0) return;
      busy.current = true;
      const query = new URLSearchParams(params.toString());
      query.set('stack', serialiseStack(next));
      const moved = movable[from];
      setAnnouncement(
        moved ? `${moved.title} moved to ring ${to + 1} of ${movable.length}.` : 'Order changed.',
      );
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [movable, params, pathname, router, stack],
  );

  const remove = useCallback(
    (entry: StackEntry, index: number) => {
      const query = new URLSearchParams(params.toString());
      if (entry.kind === 'moment') {
        /* The sky is carried by the scrubber's own parameter, not by the stack. */
        query.delete('t');
      } else {
        const next = parseStack(stack).filter((_, at) => at !== index);
        if (next.length === 0) return;
        query.set('stack', serialiseStack(next));
      }
      setAnnouncement(`${entry.title} removed.`);
      router.push(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [params, pathname, router, stack],
  );

  return (
    <div className="flex flex-col gap-3">
      <p aria-live="polite" className="sr-only" id={liveId}>
        {announcement}
      </p>

      {entries.map((entry, index) => {
        const position = entry.pinned ? -1 : movable.findIndex((one) => one.key === entry.key);
        const canMoveUp = position > 0;
        const canMoveDown = position >= 0 && position < movable.length - 1;

        return (
          <section
            key={entry.key}
            draggable={!entry.pinned}
            onDragStart={(event) => {
              setDragging(position);
              event.dataTransfer.effectAllowed = 'move';
              /* Firefox refuses to start a drag with no payload set. */
              event.dataTransfer.setData('text/plain', entry.key);
            }}
            onDragEnd={() => setDragging(null)}
            onDragOver={(event) => {
              if (dragging === null || entry.pinned) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              if (dragging === null || entry.pinned) return;
              event.preventDefault();
              commit(dragging, position);
              setDragging(null);
            }}
            className={`jade-panel p-4 transition-opacity ${
              dragging === position && position >= 0 ? 'opacity-40' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--accent)]">
                  Ring {index + 1} · {entry.role}
                </p>
                <h2 className="mt-0.5 truncate font-display text-xl leading-tight">
                  {entry.href ? (
                    <Link href={entry.href} className="hover:text-[var(--accent)]">
                      {entry.title}
                    </Link>
                  ) : (
                    entry.title
                  )}
                </h2>
                {entry.line ? (
                  <p className="mt-0.5 font-mono text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
                    {entry.line}
                  </p>
                ) : null}
                {entry.rating ? (
                  <p className="mt-1 inline-block border border-[var(--rule-strong)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--ink-faint)]">
                    Rodden {entry.rating}
                  </p>
                ) : null}
              </div>

              <span
                aria-hidden="true"
                title={entry.pinned ? undefined : 'Drag to change ring order'}
                className={`select-none font-mono text-[13px] leading-none text-[var(--ink-faint)] ${
                  entry.pinned ? 'opacity-30' : 'cursor-grab'
                }`}
              >
                ⠿
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-[var(--rule)] pt-2 font-mono text-[9.5px] uppercase tracking-wider">
              <button
                type="button"
                disabled={!canMoveUp}
                onClick={() => commit(position, position - 1)}
                className="text-[var(--ink-faint)] transition-colors enabled:hover:text-[var(--accent)] disabled:opacity-30"
              >
                ↑ inward
              </button>
              <button
                type="button"
                disabled={!canMoveDown}
                onClick={() => commit(position, position + 1)}
                className="text-[var(--ink-faint)] transition-colors enabled:hover:text-[var(--accent)] disabled:opacity-30"
              >
                ↓ outward
              </button>
              {entries.length > 1 ? (
                <button
                  type="button"
                  onClick={() => remove(entry, index)}
                  className="ml-auto text-[var(--ink-faint)] transition-colors hover:text-[var(--clay)]"
                >
                  remove
                </button>
              ) : null}
            </div>
          </section>
        );
      })}

      <p className="font-mono text-[9.5px] leading-relaxed text-[var(--ink-faint)]">
        ⠿ Drag a card above another to swap which chart is on the inside, or use inward and outward.
        The innermost chart sets the houses.
      </p>
    </div>
  );
}

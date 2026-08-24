'use client';

import { useRef, useState } from 'react';
import type { Anchor } from '@jade/astro';
import { addNote } from '@/app/actions';
import { AnchorPicker } from './AnchorPicker';

/**
 * Write a note.
 *
 * Collapsed to a single line until it is clicked. A study page that opens with
 * a large empty box demands to be filled in; one that opens with a quiet
 * prompt waits, which is the right posture for something you use twenty times
 * a day and ignore the rest of the time.
 *
 * The textarea grows with its content — a fixed six rows is always wrong,
 * either scrolling a paragraph or leaving a hole under one line.
 */
export function NoteComposer({
  subjectId,
  anchors,
  returnTo,
  error,
}: {
  subjectId?: string;
  anchors: readonly Anchor[];
  returnTo: string;
  error?: string | undefined;
}): React.ReactElement {
  const [open, setOpen] = useState(Boolean(error));
  const [pending, setPending] = useState(false);
  const [body, setBody] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  const grow = (element: HTMLTextAreaElement): void => {
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 420)}px`;
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => area.current?.focus());
        }}
        className="jade-panel jade-panel--interactive w-full px-4 py-3 text-left text-sm text-[var(--ink-faint)]"
      >
        Write a note…
      </button>
    );
  }

  return (
    <form
      action={addNote}
      onSubmit={() => {
        // Deferred, so the browser dispatches the submission before React
        // re-renders the button as pending — setting it synchronously drops
        // the submit entirely. Same reason as SubmitButton.
        setTimeout(() => setPending(true), 0);
      }}
      className="jade-panel jade-panel--marked jade-fade p-4"
    >
      <input type="hidden" name="returnTo" value={returnTo} />
      {subjectId ? <input type="hidden" name="subjectId" value={subjectId} /> : null}

      {error ? (
        <p className="mb-3 border-l-2 border-[var(--clay)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--clay)]">
          {error}
        </p>
      ) : null}

      <textarea
        ref={area}
        name="body"
        value={body}
        rows={3}
        onChange={(event) => {
          setBody(event.target.value);
          grow(event.target);
        }}
        placeholder="What did you notice?"
        className="w-full resize-none border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[15px] leading-relaxed outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Attach to
          </span>
          {anchors.length > 0 ? (
            <AnchorPicker anchors={anchors} />
          ) : (
            <>
              <input type="hidden" name="anchorKind" value="chart" />
              <p className="py-2 text-sm text-[var(--ink-faint)]">Not tied to a chart factor.</p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Tags
          </span>
          <input
            type="text"
            name="tags"
            placeholder="lesson, revisit"
            className="border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm outline-none transition-colors placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="submit"
          aria-disabled={pending}
          className={`bg-[var(--accent)] px-4 py-2 font-display text-lg tracking-wide text-white transition-opacity ${
            pending ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          {pending ? 'Saving…' : 'Save note'}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setBody('');
          }}
          className="text-sm text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
        >
          Cancel
        </button>
        <span className="ml-auto font-mono text-[10px] text-[var(--ink-faint)]">
          {body.trim().length > 0 ? `${body.trim().split(/\s+/).length} words` : ''}
        </span>
      </div>
    </form>
  );
}

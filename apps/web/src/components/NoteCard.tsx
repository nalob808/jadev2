'use client';

import Link from 'next/link';
import { useState } from 'react';
import { describeAnchor, type AnchorKind } from '@jade/astro';
import type { Note } from '@jade/db';
import { editNote, removeNote, toggleNotePin } from '@/app/actions';

/**
 * One note.
 *
 * The anchor sits in a bracket above the body rather than inline, so a column
 * of notes can be scanned by what each is *about* without reading any of them
 * — which is the actual way a study log gets used once there are more than
 * twenty entries.
 *
 * Editing happens in place. Sending someone to a separate page to fix a typo
 * loses the surrounding notes, which are usually the reason they spotted it.
 */

const KIND_TINT: Record<AnchorKind, string> = {
  chart: 'var(--ink-faint)',
  graha: 'var(--accent)',
  house: 'var(--accent)',
  sign: 'var(--ink-muted)',
  nakshatra: 'var(--jade)',
  yoga: 'var(--jade)',
  dasha: 'var(--clay)',
  varga: 'var(--ink-muted)',
};

function when(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NoteCard({
  note,
  returnTo,
  subjectName,
  index = 0,
}: {
  note: Note;
  returnTo: string;
  /** Shown only on the index, where notes from different people sit together. */
  subjectName?: string | undefined;
  index?: number;
}): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const label =
    note.anchorLabel ?? describeAnchor(note.anchorKind as AnchorKind, note.anchorKey ?? '');
  const tint = KIND_TINT[note.anchorKind as AnchorKind] ?? 'var(--ink-faint)';

  return (
    <article
      className={`jade-panel jade-rise p-4 ${note.pinned ? 'jade-panel--marked' : ''}`}
      style={{ '--i': index } as React.CSSProperties}
    >
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        {note.anchorKind === 'chart' ? null : (
          <Link
            href={`/notes?anchorKind=${note.anchorKind}&anchorKey=${encodeURIComponent(note.anchorKey ?? '')}`}
            className="border-l-2 pl-2 font-mono text-[10.5px] uppercase tracking-[0.14em] transition-opacity hover:opacity-70"
            style={{ borderColor: tint, color: tint }}
          >
            {label}
          </Link>
        )}

        {subjectName && note.subjectId ? (
          <Link
            href={`/people/${note.subjectId}`}
            className="font-display text-base text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
          >
            {subjectName}
          </Link>
        ) : null}

        <span className="ml-auto font-mono text-[10px] text-[var(--ink-faint)]">
          {when(note.updatedAt)}
        </span>

        <form action={toggleNotePin}>
          <input type="hidden" name="id" value={note.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            aria-label={note.pinned ? 'Unpin this note' : 'Pin this note'}
            title={note.pinned ? 'Unpin' : 'Pin to the top'}
            className={`px-1 text-sm transition-colors ${
              note.pinned
                ? 'text-[var(--accent)]'
                : 'text-[var(--rule-strong)] hover:text-[var(--ink-muted)]'
            }`}
          >
            {/* U+FE0E keeps this a glyph rather than a colour emoji. */}
            {'◆︎'}
          </button>
        </form>
      </div>

      {editing ? (
        <form action={editNote} className="jade-fade">
          <input type="hidden" name="id" value={note.id} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <textarea
            name="body"
            defaultValue={note.body}
            rows={Math.min(Math.max(note.body.split('\n').length + 1, 3), 16)}
            className="w-full resize-y border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-[15px] leading-relaxed outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            name="tags"
            defaultValue={note.tags.join(', ')}
            placeholder="tags, comma separated"
            className="mt-2 w-full border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              className="bg-[var(--accent)] px-3 py-1.5 font-display text-base tracking-wide text-white"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-sm text-[var(--ink-faint)] hover:text-[var(--ink)]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* `whitespace-pre-wrap` so her paragraph breaks survive. Notes are
              written, not authored — nobody wants Markdown in a study log. */}
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--ink)]">
            {note.body}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {note.tags.map((tag) => (
              <Link
                key={tag}
                href={`/notes?tag=${encodeURIComponent(tag)}`}
                className="border border-[var(--rule)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent-soft)] hover:text-[var(--ink)]"
              >
                {tag}
              </Link>
            ))}

            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] transition-colors hover:text-[var(--ink)]"
              >
                Edit
              </button>

              {confirming ? (
                <form action={removeNote} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={note.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <span className="font-mono text-[10px] text-[var(--clay)]">Delete?</span>
                  <button
                    type="submit"
                    className="font-mono text-[10px] uppercase tracking-wider text-[var(--clay)] underline"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)]"
                  >
                    No
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] transition-colors hover:text-[var(--clay)]"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </article>
  );
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ANCHOR_KIND_LABELS, anchorId, type Anchor, type AnchorKind } from '@jade/astro';

/**
 * Choose what a note is attached to.
 *
 * The list is every factor the open chart actually contains, grouped the way a
 * chart is read rather than alphabetically — an A–Z picker puts Aquarius above
 * the ascendant and is useless to someone looking for what they were just
 * looking at.
 *
 * Each row carries where that factor sits in *this* chart ("12°04′ Scorpio ·
 * 7th house"). That context is shown and never stored: it is true of one chart
 * at one lens, and the anchor has to outlive both.
 */

const GLYPHS: Record<string, string> = {
  Sun: '☉',
  Moon: '☽',
  Mars: '♂',
  Mercury: '☿',
  Jupiter: '♃',
  Venus: '♀',
  Saturn: '♄',
  Rahu: '☊',
  Ketu: '☋',
};

// Read order, not alphabetical order.
const GROUP_ORDER: AnchorKind[] = [
  'chart',
  'graha',
  'house',
  'yoga',
  'dasha',
  'nakshatra',
  'sign',
  'varga',
];

function fold(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function AnchorPicker({
  anchors,
  defaultAnchor,
}: {
  anchors: readonly Anchor[];
  defaultAnchor?: Anchor;
}): React.ReactElement {
  const initial = defaultAnchor ?? anchors[0]!;
  const [chosen, setChosen] = useState<Anchor>(initial);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  // Close on outside click and on Escape. Both, because a picker that traps
  // you until you choose something is worse than no picker.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent): void => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) search.current?.focus();
    else setQuery('');
  }, [open]);

  const groups = useMemo(() => {
    const needle = fold(query.trim());
    const matched = needle
      ? anchors.filter(
          (a) => fold(a.label).includes(needle) || fold(a.detail ?? '').includes(needle),
        )
      : anchors;

    return GROUP_ORDER.map((kind) => ({
      kind,
      items: matched.filter((a) => a.kind === kind),
    })).filter((group) => group.items.length > 0);
  }, [anchors, query]);

  const chosenId = anchorId(chosen.kind, chosen.key);

  return (
    <div className="relative" ref={box}>
      {/* What the form actually submits. */}
      <input type="hidden" name="anchorKind" value={chosen.kind} />
      <input type="hidden" name="anchorKey" value={chosen.key} />
      <input type="hidden" name="anchorLabel" value={chosen.label} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex w-full items-center gap-2 border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-left text-sm transition-colors hover:border-[var(--accent-soft)]"
      >
        <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          {ANCHOR_KIND_LABELS[chosen.kind]}
        </span>
        <span className="truncate text-[var(--ink)]">
          {chosen.kind === 'chart' ? 'No particular factor' : chosen.label}
        </span>
        <span
          aria-hidden="true"
          className={`ml-auto text-[var(--ink-faint)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          ▾
        </span>
      </button>

      {open ? (
        <div className="jade-fade absolute left-0 right-0 z-30 mt-1 border border-[var(--rule)] bg-[var(--surface)] shadow-[var(--panel-shadow-lifted)]">
          <div className="border-b border-[var(--rule)] p-2">
            <input
              ref={search}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter — Mars, 7th, gajakesarī…"
              className="w-full bg-transparent px-1 py-1 text-sm outline-none placeholder:text-[var(--ink-faint)]"
            />
          </div>

          <div className="max-h-[19rem] overflow-y-auto" role="listbox">
            {groups.length === 0 ? (
              <p className="px-3 py-4 text-sm text-[var(--ink-faint)]">
                Nothing in this chart matches that.
              </p>
            ) : (
              groups.map((group) => (
                <div key={group.kind}>
                  <p className="sticky top-0 border-b border-[var(--rule)] bg-[var(--surface-alt)] px-3 py-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                    {ANCHOR_KIND_LABELS[group.kind]}
                  </p>
                  {group.items.map((anchor) => {
                    const id = anchorId(anchor.kind, anchor.key);
                    const selected = id === chosenId;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          setChosen(anchor);
                          setOpen(false);
                        }}
                        className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                          selected
                            ? 'bg-[var(--accent-wash)] text-[var(--ink)]'
                            : 'hover:bg-[var(--surface-alt)]'
                        }`}
                      >
                        {GLYPHS[anchor.key] ? (
                          // U+FE0E forces the text presentation. Without it a
                          // browser with an emoji font renders these as colour
                          // pictograms and a chart page looks like a chat app.
                          <span className="w-4 shrink-0 text-[var(--accent)]">
                            {GLYPHS[anchor.key]}
                            {'︎'}
                          </span>
                        ) : null}
                        <span className="shrink-0">
                          {anchor.kind === 'chart' ? 'No particular factor' : anchor.label}
                        </span>
                        {anchor.detail ? (
                          <span className="ml-auto truncate pl-3 font-mono text-[10.5px] text-[var(--ink-faint)]">
                            {anchor.detail}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

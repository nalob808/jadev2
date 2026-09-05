'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * A word that explains itself.
 *
 * ## Why not a title attribute
 *
 * `title=""` is free and almost right: it is accessible, it needs no
 * JavaScript, and it degrades perfectly. It also cannot be styled, cannot
 * hold structure, takes about a second to appear, and — the reason it is
 * disqualified here — does nothing at all on a phone. Jade's reader is often
 * looking at a chart on an iPhone, and a definition she cannot reach is the
 * same as no definition.
 *
 * ## Hover, click and tap
 *
 * Three gestures, two states. Pointing at a word with a mouse opens the card
 * loosely — moving away closes it again. Clicking or tapping **pins** it:
 * it then stays until dismissed, which is what makes the cross-references
 * reachable, because you cannot click a chip inside a card that vanishes when
 * you move towards it.
 *
 * That distinction is load-bearing rather than decorative. The first version
 * of this component treated click as a plain toggle, and on a desktop the
 * hover had already opened the card by the time the click arrived — so
 * clicking a word closed it. It looked like the feature was broken, and for
 * every user who hovers before clicking, which is all of them, it was.
 *
 * On touch there is no hover, so a tap goes straight to pinned. Keyboard
 * focus opens it loosely and Escape closes it, so none of this is
 * mouse-only.
 *
 * ## The gap between the word and the card
 *
 * A card that closes the instant the pointer leaves the word is unreachable,
 * because getting to it means crossing the gap between the two. So an
 * unpinned card closes on a short delay, and entering the card cancels it.
 *
 * ## Placement
 *
 * The popover is positioned in a fixed layer measured from the trigger, not
 * absolutely inside it, because these words live inside tables and SVG
 * panels with their own overflow and stacking contexts. An absolutely
 * positioned tooltip inside a scrolling table gets clipped by it, which is
 * exactly where most of Jade's technical vocabulary appears.
 */

export interface TermDefinition {
  readonly id: string;
  readonly term: string;
  readonly plain: string;
  readonly literal?: string;
  readonly short: string;
  readonly body: string;
  readonly related: readonly string[];
  readonly whereInJade?: string;
}

export interface TermProps {
  /** The definition to show. */
  readonly entry: TermDefinition;
  /** Lines computed from the chart on screen. Optional — a term still works alone. */
  readonly context?: readonly string[];
  /** Resolve a related id, so the popover can walk to its neighbours. */
  readonly resolve?: (id: string) => TermDefinition | null;
  /** Lines for a term reached through `related`. */
  readonly contextFor?: (id: string) => readonly string[] | undefined;
  /** What the reader sees. Defaults to the term itself. */
  readonly children?: React.ReactNode;
  /** Suppress the dotted underline where the surrounding design already marks it. */
  readonly plainTrigger?: boolean;
}

export function Term({
  entry,
  context,
  resolve,
  contextFor,
  children,
  plainTrigger = false,
}: TermProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  /** Pinned cards survive the pointer leaving. Set by click or tap. */
  const [pinned, setPinned] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Set while focus is being handed back to the trigger after a dismissal.
   *
   * Escape has to return focus to the word — leaving a keyboard user stranded
   * on `<body>` is the sort of thing that makes a component unusable without a
   * mouse. But `.focus()` fires the same `onFocus` that opens the card, so
   * closing with Escape immediately reopened it. This flag is how the reopen
   * is told apart from a reader tabbing to the word deliberately.
   */
  const restoringFocus = useRef(false);
  /** Terms walked into via `related`, so the reader can come back. */
  const [trail, setTrail] = useState<TermDefinition[]>([]);
  const [coords, setCoords] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  const shown = trail.length > 0 ? trail[trail.length - 1]! : entry;
  const shownContext = trail.length > 0 ? contextFor?.(shown.id) : context;

  const place = (): void => {
    const node = triggerRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    const below = roomBelow > 260 || roomBelow > rect.top;
    setCoords({
      top: below ? rect.bottom + 8 : rect.top - 8,
      left: Math.min(Math.max(rect.left, 12), Math.max(window.innerWidth - 340, 12)),
      below,
    });
  };

  const cancelClose = (): void => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const show = (): void => {
    cancelClose();
    place();
    setOpen(true);
  };

  const hide = (): void => {
    cancelClose();
    setOpen(false);
    setPinned(false);
    setTrail([]);
  };

  /** Close unless the reader pinned it, and only after a beat. */
  const hideSoon = (): void => {
    if (pinned) return;
    cancelClose();
    closeTimer.current = setTimeout(hide, 140);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        hide();
        restoringFocus.current = true;
        triggerRef.current?.focus();
        restoringFocus.current = false;
      }
    };
    const onOutside = (event: MouseEvent): void => {
      const target = event.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      hide();
    };
    /**
     * Follow the word rather than abandon it.
     *
     * The card is positioned from the trigger's viewport rectangle, so a
     * scroll invalidates it and something has to happen. Closing was the
     * first answer and it was wrong twice over: a trackpad's momentum closed
     * a card the reader had just pinned, and merely bringing a word into
     * view — which is what happens when you click one near the bottom of the
     * page — dismissed it before it was read. Re-measuring keeps the card
     * attached to its word, which is what the reader expects it to do.
     *
     * It is dropped only once the word itself has left the viewport, where
     * a card pointing at nothing is worse than no card.
     */
    const onScroll = (): void => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect || rect.bottom < 0 || rect.top > window.innerHeight) {
        hide();
        return;
      }
      place();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onOutside);
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', place);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onOutside);
      window.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', place);
    };
    // Deliberately keyed on `open` alone. The handlers close over state that
    // changes on every render, but they only ever call setState functions and
    // refs, which are stable — re-subscribing on each render would tear down
    // and rebuild four listeners per keystroke for no behavioural difference.
  }, [open]);

  useEffect(() => cancelClose, []);

  const related = shown.related
    .map((id) => resolve?.(id) ?? null)
    .filter((value): value is TermDefinition => value !== null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={plainTrigger ? 'term term--plain' : 'term'}
        aria-expanded={open}
        aria-describedby={open ? panelId : undefined}
        onPointerEnter={(event) => {
          if (event.pointerType === 'mouse') show();
        }}
        onPointerLeave={(event) => {
          // Touch never closes on leave — the outside handler owns that.
          if (event.pointerType === 'mouse') hideSoon();
        }}
        onFocus={() => {
          if (!restoringFocus.current) show();
        }}
        onClick={(event) => {
          event.preventDefault();
          // A click on an already-pinned word dismisses it; anything else
          // pins. Note that on a desktop the hover has usually opened the
          // card already, so this is a pin rather than an open.
          if (pinned) {
            hide();
            return;
          }
          show();
          setPinned(true);
        }}
      >
        {children ?? entry.term}
      </button>
      {open && coords ? (
        <div
          ref={popoverRef}
          id={panelId}
          role="dialog"
          aria-label={shown.term}
          className="termcard"
          style={{
            top: coords.below ? coords.top : undefined,
            bottom: coords.below ? undefined : window.innerHeight - coords.top,
            left: coords.left,
          }}
          onPointerEnter={cancelClose}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') hideSoon();
          }}
        >
          <div className="termcard__head">
            {trail.length > 0 ? (
              <button
                type="button"
                className="termcard__back"
                onClick={() => setTrail((current) => current.slice(0, -1))}
              >
                ← back
              </button>
            ) : null}
            <strong className="termcard__term">{shown.term}</strong>
            <span className="termcard__plain">{shown.plain}</span>
            {pinned ? (
              <button
                type="button"
                className="termcard__close"
                onClick={hide}
                aria-label={`Close ${shown.term}`}
              >
                ×
              </button>
            ) : null}
          </div>
          {shown.literal ? (
            <p className="termcard__literal">
              literally <em>{shown.literal}</em>
            </p>
          ) : null}
          <p className="termcard__short">{shown.short}</p>
          {shownContext && shownContext.length > 0 ? (
            <div className="termcard__here">
              <span className="termcard__herelabel">In this chart</span>
              <ul>
                {shownContext.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="termcard__body">{shown.body}</p>
          {shown.whereInJade ? <p className="termcard__where">{shown.whereInJade}</p> : null}
          {related.length > 0 ? (
            <div className="termcard__related">
              <span className="termcard__herelabel">See also</span>
              <div className="termcard__chips">
                {related.map((next) => (
                  <button
                    key={next.id}
                    type="button"
                    className="termcard__chip"
                    onClick={() => setTrail((current) => [...current, next])}
                  >
                    {next.term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

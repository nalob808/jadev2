/**
 * A section that folds on a phone and is simply itself on a desktop.
 *
 * ## The problem this exists for
 *
 * Jade's long surfaces are multi-column on a desktop and single-column on a
 * phone, and that is not a small difference: the person sheet measured 14,000
 * pixels tall at 390px — fifty-two screens — and Today thirty-seven. Nobody
 * scrolls fifty-two screens, so in practice everything below the first two was
 * unreachable on the device most people have in their hand.
 *
 * The content is all worth having; it is a professional chart sheet and a
 * practitioner uses most of it. So the fix is not to cut anything, it is to
 * stop presenting all of it at once on the one device that can only show it in
 * single file. Closed, each section is a row you can read in a glance and skip;
 * open, it is exactly the section it always was.
 *
 * ## Why this adds no chrome
 *
 * It wraps sections that already have their own headings, panels and spacing.
 * Above `sm` it renders its children and nothing else — no border, no box, not
 * even a div that affects layout beyond a pass-through. That is what makes it
 * safe to wrap thirty existing sections without reviewing thirty desktop
 * layouts.
 *
 * ## Why a checkbox and not `<details>`
 *
 * The open state has to depend on the viewport. A `<details>` is open or
 * closed as a DOM property, which no media query can reach, so using one would
 * mean either collapsing the desktop layout too or shipping JavaScript that
 * measures the window and rewrites the DOM after first paint — and that
 * flashes.
 *
 * A hidden checkbox puts the state in CSS, where `sm:` can override it: above
 * the breakpoint the toggle is hidden and the body is forced visible. No
 * JavaScript runs on either device, it works before hydration, and the toggle
 * is a real form control, so keyboard and screen-reader support come for free.
 *
 * ## What `open` should be
 *
 * The first fold on a page is open and the rest are closed. A page that arrives
 * entirely closed looks broken and says nothing about what is in it; a page
 * where everything is open is the fifty-two screens again.
 */
export function Fold({
  id,
  title,
  hint,
  open = false,
  children,
}: {
  /**
   * Unique on the page. It ties the label to its checkbox, and it is also the
   * fragment a link can target: `#<id>` scrolls here *and* opens the fold,
   * via the `:target` rule in globals.css. Without that, a link from
   * elsewhere in the app would land on a closed row and look broken.
   */
  readonly id: string;
  readonly title: string;
  /** A few words on what is inside, so a fold can be judged without opening it. */
  readonly hint?: string | undefined;
  /** Open on arrival. True for the first fold on a page, false for the rest. */
  readonly open?: boolean;
  readonly children: React.ReactNode;
}): React.ReactElement {
  const control = `fold-${id}`;

  return (
    <div id={id} className="jade-fold-wrap scroll-mt-16 border-t border-[var(--rule)] sm:border-0">
      <input
        type="checkbox"
        id={control}
        className="jade-fold peer sr-only"
        defaultChecked={open}
      />

      {/*
        The whole row is the hit area. A 40px chevron on the right is a dart
        game on a moving train; a full-width row is not. Hidden above `sm`,
        where the section's own heading does this job.
      */}
      <label
        htmlFor={control}
        className="flex cursor-pointer select-none items-center gap-3 py-3.5 sm:hidden"
      >
        <span className="min-w-0 flex-1">
          <span className="block font-display text-[1.25rem] leading-tight">{title}</span>
          {hint ? (
            <span className="mt-0.5 block text-[13px] leading-snug text-[var(--ink-faint)]">
              {hint}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className="jade-fold-mark shrink-0 font-mono text-[14px] text-[var(--ink-faint)]"
        >
          ▾
        </span>
      </label>

      {/*
        `peer-checked:block sm:block` is the whole mechanism: closed on a phone
        unless ticked, unconditionally open from `sm` up.

        `pb-5 sm:pb-0` because an open fold needs to end somewhere; the wrapped
        section supplies its own top margin.
      */}
      <div className="jade-fold-body hidden pb-5 peer-checked:block sm:block sm:pb-0">
        {children}
      </div>
    </div>
  );
}

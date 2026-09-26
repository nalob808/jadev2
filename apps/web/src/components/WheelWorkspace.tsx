'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Wheel, Glyph, hasGlyph, type WheelPoint, type WheelAspect } from '@jade/ui';
import { AutoTerms, Scope, T } from './Glossary';
import { TransitScrubber, type ScrubberNatal } from './TransitScrubber';
import type { RingFrame } from '@/lib/transitRing';
import type { FocusFacts } from '@/lib/focusIndex';

/**
 * The wheel as a workspace rather than a figure on somebody's page.
 *
 * Everything on this screen reads one piece of state — which graha is focused —
 * so selecting Saturn in the wheel lights its row in the rail, swaps the panel,
 * and dims the rest of the chart together. Three separate widgets sharing a
 * page would each have needed their own; one focus makes it an instrument.
 *
 * Selection is held here rather than inside the wheel because the panel beside
 * it needs to read the same value. The wheel keeps its own internal state when
 * `focus` is not passed, which is what the printable report and the public
 * library still rely on.
 */

/**
 * Which surface is mounting the wheel.
 *
 * `workspace` is `/wheel`: the chart with the people rail beside it and the
 * overlay picker, because switching subject is the point of that page.
 * `inline` is the person page, where the subject is already decided and a rail
 * of other people would be an invitation to leave.
 *
 * Everything else — the layer toggles, click-to-isolate, the focus panel, the
 * dṛṣṭi, the aṣṭakavarga shading — is identical, which is the whole point.
 * Before this, the person page got a picture and `/wheel` got an instrument,
 * and a reader had to know which page they were on to know what a click would
 * do.
 */
export type WheelVariant = 'workspace' | 'inline';

export interface WorkspacePerson {
  readonly id: string;
  readonly name: string;
  readonly born: string;
}

/**
 * A public figure, offered for the outer ring.
 *
 * Deliberately a different shape from `WorkspacePerson`: a library figure is
 * not one of your people, does not count against the plan, and is addressed by
 * slug rather than by a workspace-scoped id. Keeping the types apart is what
 * stops the two lists getting merged by a later convenience.
 */
export interface LibraryFigure {
  readonly slug: string;
  readonly name: string;
  readonly born: string;
  /** Rodden grade — never dropped, so a guessed birth time is never presented as attested. */
  readonly rodden: string;
}

export function WheelWorkspace({
  people,
  currentId,
  overlayId,
  points,
  aspects,
  overlayPoints,
  overlayName,
  ascendant,
  ascendantSign,
  sarva,
  facts,
  lens,
  timeCaveat,
  variant = 'workspace',
  bhavaCusps,
  bhavaLabel,
  transitFrame,
  scrubberNatal,
  todayJd,
  figures = [],
  figureSlug = null,
  lensMismatch = null,
}: {
  people: readonly WorkspacePerson[];
  currentId: string;
  overlayId: string | null;
  points: readonly WheelPoint[];
  aspects: readonly WheelAspect[];
  overlayPoints: readonly WheelPoint[];
  overlayName: string | null;
  ascendant: number;
  ascendantSign: number;
  sarva: readonly number[];
  facts: Record<string, FocusFacts>;
  lens: string;
  /** Present when the birth time is uncertain, so the wheel says so. */
  timeCaveat: string | null;
  variant?: WheelVariant;
  bhavaCusps?: readonly number[];
  bhavaLabel?: string;
  /**
   * The sidereal frame the transit ring is computed in.
   *
   * All three of these travel together: without a frame there is nothing to
   * compute, without the natal Moon there is no daśā chain to update beside
   * it, and without a `todayJd` from the page there is no "today" to be off
   * from — this component has no clock of its own and must not grow one.
   * Omit them and the scrubber is simply absent, which is what the printable
   * report and the public library want.
   */
  transitFrame?: RingFrame;
  scrubberNatal?: ScrubberNatal;
  todayJd?: number;
  /** Public figures that can be loaded onto the outer ring. Timed ones only. */
  figures?: readonly LibraryFigure[];
  figureSlug?: string | null;
  /** Set when the figure's fixed lens differs from this workspace's. */
  lensMismatch?: string | null;
}): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /**
   * The selection lives in the URL, not in component state.
   *
   * Three things follow, and all three were missing before. A reload keeps
   * what you were looking at. The back button walks your selections rather
   * than leaving the page. And the address bar is a shareable reference to
   * one exact view — "look at her Saturn" becomes a link instead of a set of
   * instructions.
   *
   * `replace` rather than `push` on the *same* selection avoids stacking
   * duplicate history entries when a click lands on what is already chosen.
   */
  const focus = params.get('g');
  const focused = focus ? (facts[focus] ?? null) : null;

  const setFocus = useCallback(
    (next: string | null): void => {
      const query = new URLSearchParams(params.toString());
      if (next) query.set('g', next);
      else query.delete('g');
      const suffix = query.toString();
      // scroll: false — selecting a graha must not jump the page to the top,
      // which on a phone would throw away the wheel you were just touching.
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  /**
   * The scrubbed date, as whole days from today, in the URL beside the
   * selection.
   *
   * Same three reasons as `?g=`: a reload keeps the date, the back button walks
   * dates instead of leaving, and a link carries the exact view. Days rather
   * than an ISO date because the arithmetic that has to survive the round trip
   * is `today + n`, and a date in the URL would silently mean something
   * different tomorrow — a link saying "look at this" would drift by a day
   * every day. A malformed value is treated as today rather than throwing; the
   * URL is user-editable and a bad one must not blank the chart.
   */
  /**
   * The *presence* of `t` turns the transit ring on; its value is the date.
   *
   * So the natal chart alone stays the default view, and nine extra marks appear
   * on the circle because somebody asked for them. That matters twice over. The
   * ADHD brief's fourth rule — colour and motion are information or they are
   * removed — applies just as well to marks: a transit ring nobody asked for is
   * competing with the natal chart for the same attention. And the ephemeris
   * that computes the ring is about 80 KB of JavaScript, which is a fair price
   * for a scrubber that answers inside one animation frame and a bad one for a
   * reader who only wanted to look at a birth chart.
   *
   * `t=0` therefore means "transits, today" and no `t` at all means "no
   * transits" — a distinction a plain number could not carry.
   */
  const offsetRaw = params.get('t');
  const transitsRequested = offsetRaw !== null;
  const offsetParsed = Number.parseInt(offsetRaw ?? '0', 10);
  const offsetDays = Number.isFinite(offsetParsed) ? offsetParsed : 0;

  const setOffset = useCallback(
    (days: number | null): void => {
      const query = new URLSearchParams(params.toString());
      if (days === null) query.delete('t');
      else query.set('t', String(days));
      const suffix = query.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  /**
   * One ring, two claimants.
   *
   * The wheel has a single outer ring. An overlaid second chart and a scrubbed
   * transit ring both want it, and drawing both would produce a circle of
   * eighteen marks in which nobody could tell a transit from the other
   * person's natal Venus. Rather than pick silently, the overlay wins where it
   * is chosen — it is the more deliberate act — and the scrubber says why it
   * is not available (CLAUDE.md #3, applied to the interface).
   */
  const overlayHasRing = overlayPoints.length > 0;
  const scrubbable = !overlayHasRing && transitFrame !== undefined && todayJd !== undefined;
  const transitsOn = scrubbable && transitsRequested;

  /**
   * The ephemeris, fetched only once somebody wants transits.
   *
   * `astronomy-engine` is roughly 80 KB minified and it is the entire reason the
   * scrubber can answer locally at all. Importing it at module scope would put
   * it in the first load of every person page and of `/wheel`, including for the
   * readers who never touch the date control. So it arrives on demand, and the
   * control says so while it is in flight rather than looking broken for the
   * few hundred milliseconds it takes.
   */
  const [ringFn, setRingFn] = useState<
    ((jdUt: number, frame: RingFrame, ascendantSign: number) => WheelPoint[]) | null
  >(null);

  useEffect(() => {
    if (!transitsOn || ringFn) return;
    let cancelled = false;
    void import('@/lib/transitRing').then((module) => {
      // The wrapping arrow matters: `setState` treats a bare function as an
      // updater and would call it with the previous value.
      if (!cancelled) setRingFn(() => module.transitRing);
    });
    return () => {
      cancelled = true;
    };
  }, [transitsOn, ringFn]);

  const transitPoints = useMemo(
    () =>
      transitsOn && ringFn && transitFrame && todayJd !== undefined
        ? ringFn(todayJd + offsetDays, transitFrame, ascendantSign)
        : [],
    [transitsOn, ringFn, transitFrame, todayJd, offsetDays, ascendantSign],
  );

  const outerRing = overlayHasRing ? overlayPoints : transitPoints;

  const showRail = variant === 'workspace';

  /**
   * Navigate the workspace.
   *
   * `overlay` and `figure` are mutually exclusive by construction rather than
   * by convention — the wheel has one outer ring, and letting both into the URL
   * would make the page pick one silently.
   */
  const go = (personId: string, overlay: string | null, figure: string | null = null): void => {
    const query = new URLSearchParams({ person: personId });
    if (overlay) query.set('overlay', overlay);
    else if (figure) query.set('figure', figure);
    router.push(`/wheel?${query.toString()}`);
  };

  return (
    <div
      className={
        showRail
          ? 'grid gap-5 lg:grid-cols-[15rem_minmax(0,1fr)_19rem]'
          : 'grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]'
      }
    >
      {/* ------------------------------------------------------- the people */}
      {showRail ? (
        <aside className="order-2 lg:order-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Your people
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {people.map((person) => {
              const current = person.id === currentId;
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => go(person.id, overlayId)}
                    aria-current={current ? 'true' : undefined}
                    className={`w-full border px-3 py-2 text-left transition-colors ${
                      current
                        ? 'border-[var(--accent)] bg-[var(--surface)]'
                        : 'border-[var(--rule)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <span className="block font-display text-lg leading-tight">{person.name}</span>
                    <span className="block font-mono text-[10px] text-[var(--ink-faint)]">
                      {person.born}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ------------------------------------------------------ overlay */}
          <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
            Overlay a second chart
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            Their grahas ride the outer ring against this chart&rsquo;s houses.
          </p>
          <select
            value={overlayId ?? ''}
            onChange={(event) => go(currentId, event.target.value || null, null)}
            aria-label="Overlay another person's chart"
            className="mt-2 w-full border border-[var(--rule)] bg-[var(--surface)] px-2 py-1.5 text-sm"
          >
            <option value="">Nobody — this chart alone</option>
            {people
              .filter((person) => person.id !== currentId)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
          {overlayId ? (
            <Link
              href={`/relationships`}
              className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
            >
              Read them together →
            </Link>
          ) : null}

          {/* ------------------------------------------------- the library */}
          {figures.length > 0 ? (
            <>
              <p className="mt-5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
                <span>From the library</span>
                <span>{figures.length}</span>
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--ink-muted)]">
                A public chart on the outer ring, against this chart&rsquo;s houses. Not added to
                your people and not counted against your plan.
              </p>
              <select
                value={figureSlug ?? ''}
                onChange={(event) => go(currentId, null, event.target.value || null)}
                aria-label="Overlay a chart from the public library"
                className="mt-2 w-full border border-[var(--rule)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              >
                <option value="">Nobody from the library</option>
                {figures.map((figure) => (
                  <option key={figure.slug} value={figure.slug}>
                    {figure.name} · {figure.born.slice(0, 4)} · Rodden {figure.rodden}
                  </option>
                ))}
              </select>
              {figureSlug ? (
                <Link
                  href={`/charts/${figureSlug}`}
                  className="mt-2 inline-block font-mono text-[10px] uppercase tracking-wider text-[var(--accent)] underline underline-offset-2"
                >
                  Their own page →
                </Link>
              ) : null}
              <p className="mt-1.5 font-mono text-[9.5px] leading-relaxed text-[var(--ink-faint)]">
                Only figures with an attested birth time are listed — an untimed chart has no
                ascendant, so it has no houses to draw.
              </p>
            </>
          ) : null}
        </aside>
      ) : null}

      {/* -------------------------------------------------------- the wheel */}
      <div className="order-1 min-w-0 lg:order-2">
        {overlayName ? (
          <p className="mb-2 flex flex-wrap items-center gap-x-3 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-[var(--ink)]">inner · this chart</span>
            <span className="text-[var(--clay)]">outer · {overlayName}</span>
          </p>
        ) : transitsOn ? (
          <p className="mb-2 flex flex-wrap items-center gap-x-3 font-mono text-[10px] uppercase tracking-[0.14em]">
            <span className="text-[var(--ink)]">inner · natal, fixed</span>
            <span className="text-[var(--clay)]">
              outer · transits{offsetDays === 0 ? ', today' : ', moved'}
            </span>
          </p>
        ) : null}

        <Wheel
          points={points}
          aspects={aspects}
          transits={outerRing}
          ascendant={ascendant}
          ascendantSign={ascendantSign}
          sarva={sarva}
          bhavaCusps={bhavaCusps}
          bhavaLabel={bhavaLabel}
          focus={focus}
          onFocusChange={setFocus}
          size={900}
        />

        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          <AutoTerms>{lens}</AutoTerms>
        </p>
        {timeCaveat ? (
          <p className="mt-1 border-l-2 border-[var(--clay)] py-1 pl-2 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            {timeCaveat}
          </p>
        ) : null}
        {/* Two rings in two different frames is a correctness problem, so it is
            stated beside the chart rather than left for the reader to deduce. */}
        {lensMismatch ? (
          <p className="mt-1 border-l-2 border-[var(--clay)] bg-[var(--band-difficult-wash)] py-1 pl-2 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            {lensMismatch}
          </p>
        ) : null}

        {transitsOn && scrubberNatal && todayJd !== undefined ? (
          <TransitScrubber
            natal={scrubberNatal}
            todayJd={todayJd}
            offsetDays={offsetDays}
            loading={ringFn === null}
            onOffsetChange={setOffset}
            onDismiss={() => setOffset(null)}
          />
        ) : scrubbable ? (
          /* One obvious action, and it states what it will do rather than
             being an unlabelled icon. */
          <button
            type="button"
            onClick={() => setOffset(0)}
            className="mt-3 w-full border border-[var(--rule)] px-3 py-2 text-left hover:border-[var(--accent)]"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              Add the transit ring
            </span>
            <span className="mt-0.5 block text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
              Today&rsquo;s sky on the outer ring, with a date control to move it. The natal chart
              stays where it is.
            </span>
          </button>
        ) : overlayHasRing && transitFrame ? (
          <p className="mt-3 border border-dashed border-[var(--rule-strong)] p-2.5 text-[12px] leading-relaxed text-[var(--ink-muted)]">
            The transit scrubber is off while a second chart is overlaid — the wheel has one outer
            ring and they would be drawn on top of each other. Clear the overlay to move through
            time.
          </p>
        ) : null}
      </div>

      {/* -------------------------------------------------------- the panel */}
      <aside className="order-3 min-w-0">
        {focused ? (
          <FocusPanel facts={focused} onClear={() => setFocus(null)} />
        ) : (
          <div className="border border-dashed border-[var(--rule-strong)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
              Nothing selected
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--ink-muted)]">
              Tap any graha in the wheel and everything Jade knows about it gathers here — its
              dignity, its bindus, the yogas it forms, the periods it rules, and whatever you have
              written about it.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {Object.keys(facts)
                .filter((id) => id !== 'Ascendant')
                .map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setFocus(id)}
                      title={id}
                      className="flex h-9 w-9 items-center justify-center border border-[var(--rule)] text-[var(--ink-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {hasGlyph(id) ? <Glyph name={id} size={18} title={id} /> : null}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

const ORDINALS = [
  '1st',
  '2nd',
  '3rd',
  '4th',
  '5th',
  '6th',
  '7th',
  '8th',
  '9th',
  '10th',
  '11th',
  '12th',
];

function degrees(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

/**
 * Everything about the focused graha, in the order a practitioner asks for it:
 * where it is, what condition it is in, what it is bound up with, and what you
 * have already said about it.
 */
function FocusPanel({
  facts,
  onClear,
}: {
  facts: FocusFacts;
  onClear: () => void;
}): React.ReactElement {
  return (
    /* Everything in this panel is about the focused graha, so a term hovered
       inside it answers about that graha. Without this, hovering `Nakṣatra`
       in Saturn's panel would report the Moon's — which is the chart-wide
       answer, and the wrong one for the question being asked. */
    <Scope of={facts.id}>
      <div className="border border-[var(--accent)] bg-[var(--surface)]">
        <div className="flex items-center gap-2 border-b border-[var(--rule)] px-4 py-3">
          <span className="text-[var(--accent)]">
            {hasGlyph(facts.id) ? <Glyph name={facts.id} size={26} title={facts.id} /> : null}
          </span>
          <span className="font-display text-2xl leading-none">
            <T id={`graha-${facts.id.toLowerCase()}`} plainTrigger>
              {facts.id}
            </T>
          </span>
          {facts.runningNow ? (
            <span className="border border-[var(--jade)] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-[var(--jade)]">
              running
            </span>
          ) : null}
          <button
            type="button"
            onClick={onClear}
            className="ml-auto font-mono text-[10px] uppercase tracking-wider text-[var(--ink-faint)] hover:text-[var(--ink)]"
          >
            clear
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-[var(--rule)]">
          <Cell term="rasi" label="Sign" value={`${degrees(facts.degreesInSign)} ${facts.sign}`} />
          <Cell
            term="bhava"
            label="House"
            value={facts.house != null ? ORDINALS[facts.house - 1]! : 'not counted'}
          />
          <Cell term="nakshatra" label="Nakṣatra" value={`${facts.nakshatra} · ${facts.pada}`} />
          <Cell term="vimshottari" label="Nakṣatra lord" value={facts.nakshatraLord} />
          <Cell term="dignity" label="Dignity" value={facts.dignity ?? 'none stated'} />
          <Cell
            term="bindu"
            label="Bindus"
            value={
              facts.bindusInOwnSign != null
                ? `${facts.bindusInOwnSign} own · ${facts.sarvaOfSign} sarva`
                : '—'
            }
          />
        </dl>

        {facts.combustion || facts.retrograde ? (
          <p className="border-t border-[var(--rule)] px-4 py-2 font-mono text-[11px] text-[var(--clay)]">
            {facts.retrograde ? <span>retrograde</span> : null}
            {facts.retrograde && facts.combustion ? ' · ' : null}
            {facts.combustion ? <T id="combustion">{facts.combustion}</T> : null}
          </p>
        ) : null}

        {facts.yogas.length > 0 ? (
          <section className="border-t border-[var(--rule)] px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              <T id="yoga">Yogas</T> it forms
            </p>
            <ul className="mt-1.5 flex flex-col gap-2">
              {facts.yogas.map((yoga) => (
                <li key={yoga.id}>
                  <p className="text-[13.5px] font-medium">{yoga.name}</p>
                  <p className="font-mono text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
                    <AutoTerms>{yoga.factors.join(' · ')}</AutoTerms>
                  </p>
                  {yoga.cancellations && yoga.cancellations.length > 0 ? (
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--clay)]">
                      Cancelled by: <AutoTerms>{yoga.cancellations.join('; ')}</AutoTerms>
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {facts.periods.length > 0 ? (
          <section className="border-t border-[var(--rule)] px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              <T id="dasha">Periods</T> it rules
            </p>
            <ul className="mt-1.5 flex flex-col gap-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
              {facts.periods.slice(0, 6).map((period, index) => (
                <li key={`${period.level}-${index}`}>{period.level}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {facts.notes.length > 0 ? (
          <section className="border-t border-[var(--rule)] px-4 py-3">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
              What you wrote
            </p>
            <ul className="mt-1.5 flex flex-col gap-1.5">
              {facts.notes.slice(0, 4).map((note) => (
                <li key={note.id} className="text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                  {note.body}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Scope>
  );
}

function Cell({
  label,
  value,
  term,
}: {
  label: string;
  value: string;
  /** Glossary id, when the label is a technical word rather than a plain one. */
  term?: string;
}): React.ReactElement {
  return (
    <div className="bg-[var(--surface)] px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--ink-faint)]">
        {term ? <T id={term}>{label}</T> : label}
      </dt>
      <dd className="mt-0.5 text-[13px]">{value}</dd>
    </div>
  );
}

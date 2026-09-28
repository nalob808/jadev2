'use client';

import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { unixMsFromJd, type DashaPeriod, type Graha, type VimshottariResult } from '@jade/astro';
import {
  CONTROL_PRESSED,
  CONTROL_STYLE,
  MOTION_CSS,
  VISUALLY_HIDDEN,
  type InstrumentSelection,
} from './instrumentShared.js';

/**
 * A dated observation pinned to the daśā timeline.
 *
 * The UI package deliberately knows nothing about the database. The web app
 * currently supplies `life_events` here: those rows have an honest event date
 * and an explicit precision, while study notes do not yet have a date field.
 */
export interface DashaTimelineEvent {
  readonly id: string;
  readonly jd: number;
  readonly label: string;
  readonly detail?: string;
  readonly precision?: 'day' | 'month' | 'year';
}

/** A factual context band, such as named transits or aṣṭakavarga bindus. */
export interface DashaStrengthSegment {
  readonly id: string;
  readonly fromJd: number;
  readonly toJd: number;
  /** Normalised only for drawing height. It is never described as a verdict. */
  readonly value: number;
  readonly label: string;
  /** The named inputs behind the value, for grounded interpretation. */
  readonly factors?: readonly string[];
}

export interface DashaTimelineProps {
  readonly dashas: VimshottariResult;
  /** The shared instrument moment. */
  readonly jd: number;
  readonly selection?: InstrumentSelection | null;
  readonly onSelect?: (selection: InstrumentSelection | null) => void;
  /** Live values while the cursor is held. The URL adapter must not commit these. */
  readonly onScrub?: (jd: number) => void;
  /** The one committed value when the cursor is released. */
  readonly onScrubEnd?: (jd: number) => void;
  readonly events?: readonly DashaTimelineEvent[];
  readonly strength?: readonly DashaStrengthSegment[];
  readonly title?: string;
  readonly frameLabel?: string;
  readonly size?: number;
  /**
   * The range shown on first render; the full 120 years when omitted. Used to
   * open on the running period, and by the tests to render the finer levels
   * that only appear on zoom.
   */
  readonly initialWindow?: { readonly fromJd: number; readonly toJd: number };
}

interface TimelineWindow {
  readonly fromJd: number;
  readonly toJd: number;
}

interface PeriodRow {
  readonly period: DashaPeriod;
  readonly level: number;
}

const PLOT_X = 66;
const PLOT_W = 902;
const ROW_TOP = 42;
const ROW_H = 54;
const ROW_GAP = 8;
const STRENGTH_Y = 236;
const STRENGTH_H = 34;
const EVENT_BASELINE = 307;
const VIEW_W = 1000;
const VIEW_H = 334;
const MIN_SPAN_DAYS = 7;

const INK = 'var(--ink, #16222E)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const FAINT = 'var(--ink-faint, #7C8A95)';
const RULE = 'var(--rule, #C8CEC9)';
const SURFACE = 'var(--surface, #F9F9F4)';
const ACCENT = 'var(--accent, #33668F)';
const JADE = 'var(--jade, #2C7A64)';
const CLAY = 'var(--clay, #9E5B3A)';

const LORD_COLOUR: Record<Graha, string> = {
  Sun: 'var(--drishti-sun, #A86A30)',
  Moon: 'var(--drishti-moon, #4F8F79)',
  Mars: 'var(--drishti-mars, #B0553C)',
  Mercury: 'var(--drishti-mercury, #55606B)',
  Jupiter: 'var(--drishti-jupiter, #2C7A64)',
  Venus: 'var(--drishti-venus, #3D8F88)',
  Saturn: 'var(--drishti-saturn, #4F5570)',
  Rahu: 'var(--drishti-rahu, #7D5A8A)',
  Ketu: 'var(--drishti-ketu, #8A6A52)',
};

const spanOf = (range: TimelineWindow): number => range.toJd - range.fromJd;

function iso(jd: number): string {
  return new Date(unixMsFromJd(jd)).toISOString().slice(0, 10);
}

function humanSpan(days: number): string {
  if (days <= 14) return `${Math.round(days)} days`;
  if (days < 365) return `${Math.round(days / 30.4375)} months`;
  const years = days / 365.25;
  return `${years < 10 ? years.toFixed(1) : Math.round(years)} years`;
}

function sameLords(selection: InstrumentSelection | null | undefined, lords: readonly Graha[]) {
  return (
    selection?.kind === 'period' &&
    selection.lords.length === lords.length &&
    selection.lords.every((lord, index) => lord === lords[index])
  );
}

function flattenPeriods(periods: readonly DashaPeriod[], maxLevel: number): PeriodRow[] {
  const rows: PeriodRow[] = [];
  const visit = (items: readonly DashaPeriod[]): void => {
    for (const period of items) {
      if (period.level <= maxLevel) rows.push({ period, level: period.level });
      if (period.level < maxLevel && period.children) visit(period.children);
    }
  };
  visit(periods);
  return rows;
}

function shownLevels(days: number): number {
  if (days <= 3 * 365.25) return 3;
  if (days <= 35 * 365.25) return 2;
  return 1;
}

function clampWindow(fromJd: number, toJd: number, full: TimelineWindow): TimelineWindow {
  const fullSpan = spanOf(full);
  const wanted = Math.min(fullSpan, Math.max(MIN_SPAN_DAYS, toJd - fromJd));
  let from = fromJd;
  let to = from + wanted;
  if (from < full.fromJd) {
    from = full.fromJd;
    to = from + wanted;
  }
  if (to > full.toJd) {
    to = full.toJd;
    from = to - wanted;
  }
  return { fromJd: from, toJd: to };
}

/**
 * Vimśottarī as a proportional, zoomable timeline.
 *
 * Width is duration throughout: Rāhu's eighteen years occupy three times the
 * room of the Sun's six. Child rows appear because the time window has become
 * fine enough to read them, never because a table row was expanded. The
 * shared `jd` is the cursor, and the callbacks preserve the instrument store's
 * live-during-drag / one-commit-on-release contract.
 */
export function DashaTimeline({
  dashas,
  jd,
  selection = null,
  onSelect,
  onScrub,
  onScrubEnd,
  events = [],
  strength = [],
  title = 'Vimśottarī daśā timeline',
  frameLabel,
  size = 1100,
  initialWindow,
}: DashaTimelineProps): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const first = dashas.periods[0];
  const last = dashas.periods[dashas.periods.length - 1];
  if (!first || !last) throw new Error('DashaTimeline requires at least one mahādaśā');

  const full = useMemo<TimelineWindow>(
    () => ({ fromJd: first.startJd, toJd: last.endJd }),
    [first.startJd, last.endJd],
  );
  // `view`, not `window`: the global is needed nowhere here, but shadowing it
  // invites a later edit to reach for the browser's and get this.
  const [view, setView] = useState<TimelineWindow>(() =>
    initialWindow ? clampWindow(initialWindow.fromJd, initialWindow.toJd, full) : full,
  );
  const [dragJd, setDragJd] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const shownJd = dragJd ?? jd;
  const spanDays = spanOf(view);
  const maxLevel = shownLevels(spanDays);

  const rows = useMemo(
    () =>
      flattenPeriods(dashas.periods, maxLevel).filter(
        ({ period }) => period.endJd > view.fromJd && period.startJd < view.toJd,
      ),
    [dashas.periods, maxLevel, view.fromJd, view.toJd],
  );

  const xFor = (value: number): number => PLOT_X + ((value - view.fromJd) / spanDays) * PLOT_W;
  const jdForX = (x: number): number => view.fromJd + ((x - PLOT_X) / PLOT_W) * spanDays;
  const cursorX = Math.max(PLOT_X, Math.min(PLOT_X + PLOT_W, xFor(shownJd)));

  const zoom = (direction: 1 | -1): void => {
    const factor = direction === 1 ? 0.5 : 2;
    const centre =
      shownJd >= view.fromJd && shownJd <= view.toJd ? shownJd : (view.fromJd + view.toJd) / 2;
    const nextSpan = spanDays * factor;
    setView(clampWindow(centre - nextSpan / 2, centre + nextSpan / 2, full));
  };

  const pan = (direction: 1 | -1): void => {
    const shift = spanDays * 0.35 * direction;
    setView(clampWindow(view.fromJd + shift, view.toJd + shift, full));
  };

  const visiblePeriods = rows
    .filter(({ level }) => level === maxLevel)
    .map(({ period }) => period)
    .sort((a, b) => a.startJd - b.startJd);

  const stepPeriod = (direction: 1 | -1): void => {
    if (visiblePeriods.length === 0) return;
    const selectedIndex = visiblePeriods.findIndex((period) => sameLords(selection, period.lords));
    const containing = visiblePeriods.findIndex(
      (period) => shownJd >= period.startJd && shownJd < period.endJd,
    );
    const start = selectedIndex >= 0 ? selectedIndex : containing >= 0 ? containing : 0;
    const index = Math.max(0, Math.min(visiblePeriods.length - 1, start + direction));
    onSelect?.({ kind: 'period', lords: visiblePeriods[index]!.lords });
  };

  const commitJd = (next: number): void => {
    const clamped = Math.max(full.fromJd, Math.min(full.toJd, next));
    setDragJd(null);
    onScrubEnd?.(clamped);
    if (!onScrubEnd) onScrub?.(clamped);
  };

  const nudgeJd = (direction: 1 | -1): void => {
    const step = spanDays <= 60 ? 1 : Math.max(1, Math.round(spanDays / 120));
    commitJd(shownJd + direction * step);
  };

  const pointerJd = (event: ReactPointerEvent<SVGSVGElement>): number => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * VIEW_W;
    return Math.max(view.fromJd, Math.min(view.toJd, jdForX(x)));
  };

  const startDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    const target = event.target as Element;
    if (!target.closest('[data-cursor-hit]')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = pointerJd(event);
    setDragging(true);
    setDragJd(next);
    onScrub?.(next);
    event.preventDefault();
  };

  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!dragging) return;
    const next = pointerJd(event);
    setDragJd(next);
    onScrub?.(next);
  };

  const endDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (!dragging) return;
    const next = pointerJd(event);
    setDragging(false);
    commitJd(next);
  };

  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>): void => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') stepPeriod(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') stepPeriod(-1);
    else if (event.key === '[') nudgeJd(-1);
    else if (event.key === ']') nudgeJd(1);
    else if (event.key === 'Escape') onSelect?.(null);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const axisTicks = Array.from({ length: 6 }, (_, index) => {
    const at = view.fromJd + (spanDays * index) / 5;
    return { at, x: xFor(at) };
  });
  const clippedEvents = events.filter((event) => event.jd >= view.fromJd && event.jd <= view.toJd);
  const clippedStrength = strength.filter(
    (segment) => segment.toJd > view.fromJd && segment.fromJd < view.toJd,
  );

  return (
    <figure className="jade-instrument" style={{ margin: 0, maxWidth: size, width: '100%' }}>
      <style>{MOTION_CSS}</style>
      <div
        role="group"
        aria-label="Daśā timeline controls"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}
      >
        <button type="button" style={CONTROL_STYLE} onClick={() => stepPeriod(-1)}>
          ← Previous period
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => stepPeriod(1)}>
          Next period →
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => nudgeJd(-1)}>
          [ Earlier
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => nudgeJd(1)}>
          Later ]
        </button>
        <button
          type="button"
          style={CONTROL_STYLE}
          onClick={() => onSelect?.(null)}
          disabled={!selection}
        >
          Clear · Esc
        </button>
        <span style={{ flex: 1 }} />
        <button type="button" style={CONTROL_STYLE} onClick={() => pan(-1)}>
          Pan ←
        </button>
        <button
          type="button"
          style={spanDays >= spanOf(full) - 1 ? CONTROL_PRESSED : CONTROL_STYLE}
          onClick={() => setView(full)}
        >
          120y
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => zoom(-1)}>
          −
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => zoom(1)}>
          +
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => pan(1)}>
          Pan →
        </button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="group"
        aria-label={`${title}. Arrow keys step periods. Brackets scrub time. Escape clears.`}
        aria-describedby={`${uid}-status`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-visible-levels={maxLevel}
        data-window-days={spanDays.toFixed(4)}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          touchAction: dragging ? 'none' : 'pan-y',
          fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
          outlineOffset: 2,
        }}
      >
        <title>{title}</title>
        <rect x={PLOT_X} y={30} width={PLOT_W} height={280} fill={SURFACE} stroke={RULE} />

        {axisTicks.map((tick) => (
          <g key={tick.at} data-axis-jd={tick.at.toFixed(5)}>
            <line x1={tick.x} y1={30} x2={tick.x} y2={310} stroke={RULE} strokeWidth={0.7} />
            <text x={tick.x} y={22} textAnchor="middle" fontSize={10} fill={FAINT}>
              {iso(tick.at)}
            </text>
          </g>
        ))}

        {[1, 2, 3].slice(0, maxLevel).map((level) => (
          <text
            key={level}
            x={PLOT_X - 8}
            y={ROW_TOP + (level - 1) * (ROW_H + ROW_GAP) + ROW_H / 2}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill={FAINT}
            fontFamily="var(--font-mono, monospace)"
          >
            {level === 1 ? 'mahā' : level === 2 ? 'antara' : 'pratyantara'}
          </text>
        ))}

        <g data-layer="periods">
          {rows.map(({ period, level }) => {
            const from = Math.max(period.startJd, view.fromJd);
            const to = Math.min(period.endJd, view.toJd);
            const x = xFor(from);
            const width = Math.max(0.7, xFor(to) - x);
            const y = ROW_TOP + (level - 1) * (ROW_H + ROW_GAP);
            const selected = sameLords(selection, period.lords);
            const colour = LORD_COLOUR[period.lord];
            const label = period.lords.join('–');
            const clipped = from !== period.startJd || to !== period.endJd;
            return (
              <g
                key={`${period.lords.join('.')}:${period.startJd}`}
                role="button"
                tabIndex={0}
                aria-label={`${label}, ${iso(period.startJd)} to ${iso(period.endJd)}`}
                data-period-level={level}
                data-lords={period.lords.join('.')}
                data-start-jd={period.startJd.toFixed(5)}
                data-end-jd={period.endJd.toFixed(5)}
                data-duration-days={(period.endJd - period.startJd).toFixed(5)}
                data-clipped={clipped || undefined}
                data-selected={selected || undefined}
                onClick={() =>
                  onSelect?.(selected ? null : { kind: 'period', lords: period.lords })
                }
                style={{ cursor: 'pointer' }}
              >
                <title>{`${label} — ${iso(period.startJd)} to ${iso(period.endJd)}, ${humanSpan(
                  period.endJd - period.startJd,
                )}`}</title>
                <rect
                  x={x}
                  y={y}
                  width={width}
                  height={ROW_H}
                  fill={colour}
                  fillOpacity={selected ? 0.34 : level === 1 ? 0.2 : 0.12}
                  stroke={selected ? ACCENT : colour}
                  strokeWidth={selected ? 2 : 0.9}
                />
                {width > 34 ? (
                  <text
                    x={x + 5}
                    y={y + 19}
                    fontSize={Math.max(8, 13 - level)}
                    fontWeight={selected ? 650 : 500}
                    fill={INK}
                    pointerEvents="none"
                  >
                    {width > 92 ? label : period.lord}
                  </text>
                ) : null}
                {width > 82 ? (
                  <text x={x + 5} y={y + 36} fontSize={8.5} fill={MUTED} pointerEvents="none">
                    {humanSpan(period.endJd - period.startJd)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </g>

        <g data-layer="strength" aria-label="Context band">
          <text
            x={PLOT_X - 8}
            y={STRENGTH_Y + STRENGTH_H / 2}
            textAnchor="end"
            fontSize={9}
            fill={FAINT}
          >
            context
          </text>
          <rect
            x={PLOT_X}
            y={STRENGTH_Y}
            width={PLOT_W}
            height={STRENGTH_H}
            fill="none"
            stroke={RULE}
          />
          {clippedStrength.map((segment) => {
            const from = Math.max(segment.fromJd, view.fromJd);
            const to = Math.min(segment.toJd, view.toJd);
            const value = Math.max(0, Math.min(1, segment.value));
            const height = 5 + value * (STRENGTH_H - 7);
            return (
              <rect
                key={segment.id}
                x={xFor(from)}
                y={STRENGTH_Y + STRENGTH_H - height}
                width={Math.max(0.7, xFor(to) - xFor(from))}
                height={height}
                fill={JADE}
                fillOpacity={0.18 + value * 0.42}
                stroke={JADE}
                strokeWidth={0.7}
                data-strength={segment.id}
                data-value={value.toFixed(4)}
                data-from-jd={segment.fromJd.toFixed(5)}
                data-to-jd={segment.toJd.toFixed(5)}
              >
                <title>{`${segment.label}${segment.factors?.length ? ` — ${segment.factors.join('; ')}` : ''}`}</title>
              </rect>
            );
          })}
        </g>

        <g data-layer="life-events">
          {clippedEvents.map((event, index) => {
            const x = xFor(event.jd);
            const lift = (index % 3) * 9;
            return (
              <g
                key={event.id}
                data-life-event={event.id}
                data-jd={event.jd.toFixed(5)}
                data-precision={event.precision ?? 'day'}
              >
                <title>{`${event.label} — ${iso(event.jd)}${event.detail ? `. ${event.detail}` : ''}`}</title>
                <line
                  x1={x}
                  y1={EVENT_BASELINE - 22 - lift}
                  x2={x}
                  y2={EVENT_BASELINE}
                  stroke={CLAY}
                />
                <circle cx={x} cy={EVENT_BASELINE - 24 - lift} r={3.6} fill={CLAY} />
              </g>
            );
          })}
        </g>

        <g data-layer="cursor" data-jd={shownJd.toFixed(5)}>
          <line
            x1={cursorX}
            y1={31}
            x2={cursorX}
            y2={310}
            stroke={ACCENT}
            strokeWidth={2}
            pointerEvents="none"
          />
          <path
            d={`M ${cursorX - 6} 31 L ${cursorX + 6} 31 L ${cursorX} 41 Z`}
            fill={ACCENT}
            pointerEvents="none"
          />
          <rect
            data-cursor-hit
            x={cursorX - 10}
            y={28}
            width={20}
            height={285}
            fill="transparent"
            style={{ cursor: 'ew-resize' }}
          >
            <title>{`Drag the shared time cursor — ${iso(shownJd)}`}</title>
          </rect>
        </g>
      </svg>

      <figcaption
        id={`${uid}-status`}
        aria-live="polite"
        style={{ marginTop: 8, color: MUTED, fontSize: 12, lineHeight: 1.45 }}
      >
        <p style={{ margin: 0, color: INK }}>
          Cursor {iso(shownJd)} · showing {humanSpan(spanDays)} ·{' '}
          {maxLevel === 1
            ? 'mahādaśā'
            : maxLevel === 2
              ? 'mahādaśā and antardaśā'
              : 'mahādaśā, antardaśā and pratyantardaśā'}
        </p>
        <p style={{ margin: '3px 0 0' }}>
          Width is true duration · {dashas.yearLength} year ({dashas.dayLength} days)
          {frameLabel ? ` · ${frameLabel}` : ''}
        </p>
        <p style={{ margin: '3px 0 0', color: FAINT }}>
          The context band reports supplied transit or aṣṭakavarga facts. Its height is a data
          scale, not a judgement about a period.
        </p>
      </figcaption>

      <table style={VISUALLY_HIDDEN}>
        <caption>{title}: proportional periods in the current window</caption>
        <thead>
          <tr>
            <th scope="col">Level</th>
            <th scope="col">Lords</th>
            <th scope="col">Start</th>
            <th scope="col">End</th>
            <th scope="col">Duration in days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ period, level }) => (
            <tr key={`table:${period.lords.join('.')}:${period.startJd}`}>
              <td>{level}</td>
              <th scope="row">{period.lords.join('–')}</th>
              <td>{iso(period.startJd)}</td>
              <td>{iso(period.endJd)}</td>
              <td>{(period.endJd - period.startJd).toFixed(5)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={VISUALLY_HIDDEN}>
        <caption>Life events pinned to the timeline</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Event</th>
            <th scope="col">Precision</th>
            <th scope="col">Detail</th>
          </tr>
        </thead>
        <tbody>
          {clippedEvents.map((event) => (
            <tr key={`event-table:${event.id}`}>
              <td>{iso(event.jd)}</td>
              <th scope="row">{event.label}</th>
              <td>{event.precision ?? 'day'}</td>
              <td>{event.detail ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

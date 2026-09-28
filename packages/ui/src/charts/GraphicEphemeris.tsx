'use client';

import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  GRAPHIC_EPHEMERIS_MODULI,
  NAKSHATRA_IAST,
  foldLongitude,
  unixMsFromJd,
  type GraphicEphemerisBody,
  type GraphicEphemerisContact,
  type GraphicEphemerisFold,
  type GraphicEphemerisSeries,
  type GraphicEphemerisTrack,
} from '@jade/astro';
import { DRISHTI_TINT } from './Wheel.js';
import {
  CONTROL_PRESSED,
  CONTROL_STYLE,
  MOTION_CSS,
  VISUALLY_HIDDEN,
  dms,
  type InstrumentSelection,
} from './instrumentShared.js';

/**
 * The graphic ephemeris — time across, longitude up, one curve per graha,
 * natal points as horizontal lines. Where a curve crosses a line, a transit
 * contacts that natal point.
 *
 * The technique is sixty years old and exists everywhere as a static raster.
 * Here it is an instrument: hover a crossing to name it, click it to send
 * every other view to that moment, drag the cursor to scrub.
 *
 * ## The nakṣatra fold
 *
 * Three dials. 360° is the plain chart. 30°, the rāśi fold, stacks the signs
 * so a crossing is the same degree in any sign. And 13°20′ — the fold nothing
 * else offers — stacks the 27 nakṣatras, so a crossing is a transit at the
 * same point *within its nakṣatra* as the natal body: every nakṣatra-level
 * contact becomes a line crossing. This is the 45° dial of cosmobiology, moved
 * into the tradition that reasons in nakṣatras, and it is the default.
 *
 * ## What is drawn honestly
 *
 * Curves are split where they wrap on the dial rather than joined by a false
 * diagonal, and each piece runs to the edge it leaves by. Retrograde motion is
 * a curve running downward — the samples are never smoothed, so a station
 * reads as the curve turning back. Latitude is not plotted, and the caption
 * says so.
 */

export interface GraphicEphemerisProps {
  /** The tracks — shared by all three dials. */
  readonly series: GraphicEphemerisSeries;
  readonly fold: GraphicEphemerisFold;
  readonly onFoldChange?: (fold: GraphicEphemerisFold) => void;
  /** Contacts on the current dial; null while they are still being computed. */
  readonly contacts: readonly GraphicEphemerisContact[] | null;
  /** The instrument's moment — the cursor. */
  readonly jd: number;
  /** Commit a moment (a clicked crossing, a released drag). */
  readonly onJd?: (jd: number) => void;
  /** Live values during a drag; never committed. */
  readonly onScrub?: (jd: number) => void;
  readonly selection?: InstrumentSelection | null;
  readonly onSelect?: (selection: InstrumentSelection | null) => void;
  /** The frame, stated on screen. */
  readonly frameLabel: string;
  readonly title?: string;
}

const VIEW_W = 1000;
const VIEW_H = 440;
const PLOT_X = 56;
const PLOT_Y = 16;
const PLOT_W = 780;
const PLOT_H = 390;
const LEGEND_X = PLOT_X + PLOT_W + 18;

const INK = 'var(--ink, #16222E)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const FAINT = 'var(--ink-faint, #7C8A95)';
const RULE = 'var(--rule, #C8CEC9)';
const SURFACE = 'var(--surface, #F9F9F4)';
const ACCENT = 'var(--accent, #33668F)';

const FOLD_LABEL: Record<GraphicEphemerisFold, string> = {
  longitude: '360° · plain',
  rashi: '30° · rāśi fold',
  nakshatra: '13°20′ · nakṣatra fold',
};

const tintOf = (id: string): string => DRISHTI_TINT[id] ?? ACCENT;

/**
 * Which bodies a dial shows until the reader chooses otherwise.
 *
 * On a 13°20′ dial the Sun, Mercury and Venus wrap roughly every two weeks
 * and Mars every three: over a two-year span they draw a wall of near-vertical
 * lines and some two thousand crossings, and the slow contacts the fold exists
 * to show disappear under them. Found by rendering it, not by a test. The
 * dial practice this borrows from reads a tight modulus with slow bodies
 * only, so that is the default here — and every body keeps a toggle, so
 * nothing is withheld, only defaulted.
 */
export const DEFAULT_DIAL_BODIES: Record<
  GraphicEphemerisFold,
  readonly GraphicEphemerisBody[] | 'all'
> = {
  nakshatra: ['Jupiter', 'Saturn', 'Rahu', 'Ketu'],
  rashi: ['Mars', 'Jupiter', 'Saturn', 'Rahu', 'Ketu'],
  longitude: 'all',
};

function isoDate(jd: number): string {
  return new Date(unixMsFromJd(jd)).toISOString().slice(0, 10);
}

/** Gridlines for a dial: signs on the full circle, padas and navāṁśas on the folds. */
function gridFor(fold: GraphicEphemerisFold): number[] {
  const modulus = GRAPHIC_EPHEMERIS_MODULI[fold];
  const step = fold === 'longitude' ? 30 : fold === 'rashi' ? 10 / 3 : 10 / 3;
  return Array.from({ length: Math.round(modulus / step) + 1 }, (_, i) => i * step);
}

/**
 * One track as SVG path data on a dial, split at every wrap.
 *
 * Uses the unwrapped longitude, so the wrap is found exactly: where the curve
 * crosses a multiple of the modulus, the piece is drawn to that edge and the
 * next begins from the opposite edge at the same instant.
 */
export function foldedPath(
  track: GraphicEphemerisTrack,
  modulus: number,
  x: (jd: number) => number,
  y: (folded: number) => number,
): string {
  const parts: string[] = [];
  const samples = track.samples;
  if (samples.length === 0) return '';
  let band = Math.floor(samples[0]!.unwrappedLongitude / modulus);
  parts.push(
    `M ${x(samples[0]!.jdUt).toFixed(2)} ${y(samples[0]!.unwrappedLongitude - band * modulus).toFixed(2)}`,
  );
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    let nextBand = Math.floor(b.unwrappedLongitude / modulus);
    // A body can cross more than one edge in one step only on the nakṣatra dial
    // with a very coarse step; handle any number of them.
    while (nextBand !== band) {
      const up = nextBand > band;
      const edge = (up ? band + 1 : band) * modulus;
      const t = (edge - a.unwrappedLongitude) / (b.unwrappedLongitude - a.unwrappedLongitude);
      const jd = a.jdUt + t * (b.jdUt - a.jdUt);
      parts.push(`L ${x(jd).toFixed(2)} ${y(up ? modulus : 0).toFixed(2)}`);
      band += up ? 1 : -1;
      parts.push(`M ${x(jd).toFixed(2)} ${y(up ? 0 : modulus).toFixed(2)}`);
      nextBand = Math.floor(b.unwrappedLongitude / modulus);
    }
    parts.push(`L ${x(b.jdUt).toFixed(2)} ${y(b.unwrappedLongitude - band * modulus).toFixed(2)}`);
  }
  return parts.join(' ');
}

export function describeContact(contact: GraphicEphemerisContact): string {
  const dial =
    contact.fold === 'longitude'
      ? 'conjunction'
      : contact.fold === 'rashi'
        ? 'same degree of sign'
        : 'same point in nakṣatra';
  return `${contact.transiting}${contact.retrograde ? ' (retrograde)' : ''} on natal ${
    contact.natalPoint === 'Ascendant' ? 'Lagna' : contact.natalPoint
  } — ${dial}, in ${NAKSHATRA_IAST[contact.nakshatraIndex]} · ${isoDate(contact.jdUt)}`;
}

export function GraphicEphemeris({
  series,
  fold,
  onFoldChange,
  contacts,
  jd,
  onJd,
  onScrub,
  selection = null,
  onSelect,
  frameLabel,
  title = 'Graphic ephemeris',
}: GraphicEphemerisProps): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const [hovered, setHovered] = useState<GraphicEphemerisContact | null>(null);
  const [dragJd, setDragJd] = useState<number | null>(null);
  /** The reader's own choice of bodies, per dial, once they have made one. */
  const [chosen, setChosen] = useState<Partial<Record<GraphicEphemerisFold, readonly string[]>>>(
    {},
  );

  const modulus = GRAPHIC_EPHEMERIS_MODULI[fold];
  const { fromJd, toJd } = series.window;
  const x = (value: number): number => PLOT_X + ((value - fromJd) / (toJd - fromJd)) * PLOT_W;
  const y = (folded: number): number => PLOT_Y + PLOT_H - (folded / modulus) * PLOT_H;
  const jdAtX = (px: number): number =>
    Math.max(fromJd, Math.min(toJd, fromJd + ((px - PLOT_X) / PLOT_W) * (toJd - fromJd)));

  const focus = selection?.kind === 'graha' ? selection.id : null;
  const allBodies = series.tracks.map((track) => track.body);
  const defaults = DEFAULT_DIAL_BODIES[fold];
  const visibleList =
    chosen[fold] ??
    (defaults === 'all' ? allBodies : allBodies.filter((b) => defaults.includes(b)));
  /** A selected graha is always drawn — selecting it is asking to see it. */
  const visible = new Set<string>([...visibleList, ...(focus ? [focus] : [])]);
  const toggleBody = (body: string): void => {
    const next = visible.has(body) ? visibleList.filter((b) => b !== body) : [...visibleList, body];
    setChosen((previous) => ({ ...previous, [fold]: next }));
  };
  const involves = (contact: GraphicEphemerisContact): boolean =>
    focus === null || contact.transiting === focus || contact.natalPoint === focus;

  const paths = useMemo(
    () =>
      series.tracks.map((track) => ({
        body: track.body,
        d: foldedPath(
          track,
          modulus,
          (v) => PLOT_X + ((v - fromJd) / (toJd - fromJd)) * PLOT_W,
          (f) => PLOT_Y + PLOT_H - (f / modulus) * PLOT_H,
        ),
        retrogradeDays: track.samples.filter((s) => s.retrograde).length,
      })),
    [series.tracks, modulus, fromJd, toJd],
  );

  const shownJd = dragJd ?? jd;
  const cursorInView = shownJd >= fromJd && shownJd <= toJd;
  const shownContacts = (contacts ?? []).filter((contact) => visible.has(contact.transiting));
  const relevant = shownContacts.filter(involves);

  const jumpContact = (direction: 1 | -1): void => {
    const next =
      direction === 1
        ? relevant.find((c) => c.jdUt > jd + 1e-4)
        : [...relevant].reverse().find((c) => c.jdUt < jd - 1e-4);
    if (next) {
      setHovered(next);
      onJd?.(next.jdUt);
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowRight') jumpContact(1);
    else if (event.key === 'ArrowLeft') jumpContact(-1);
    else if (event.key === 'Escape') onSelect?.(null);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const svgX = (event: ReactPointerEvent<SVGSVGElement>): number => {
    const box = event.currentTarget.getBoundingClientRect();
    return ((event.clientX - box.left) / box.width) * VIEW_W;
  };
  const startDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if ((event.target as Element).closest('[data-contact]')) return;
    const px = svgX(event);
    if (px < PLOT_X || px > PLOT_X + PLOT_W) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const next = jdAtX(px);
    setDragJd(next);
    onScrub?.(next);
  };
  const moveDrag = (event: ReactPointerEvent<SVGSVGElement>): void => {
    if (dragJd === null) return;
    const next = jdAtX(svgX(event));
    setDragJd(next);
    onScrub?.(next);
  };
  const endDrag = (): void => {
    if (dragJd === null) return;
    const next = dragJd;
    setDragJd(null);
    onJd?.(next);
  };

  const natalOnDial = series.natal.map((point) => ({
    ...point,
    folded: foldLongitude(point.longitude, fold),
  }));
  // The legend column, spaced so no two labels overlap: sorted by height, then
  // pushed apart in one pass — a 1D problem, like the ring's labels.
  const legend = [...natalOnDial]
    .sort((a, b) => b.folded - a.folded)
    .reduce<Array<(typeof natalOnDial)[number] & { labelY: number }>>((out, point) => {
      const wanted = y(point.folded);
      const previous = out[out.length - 1];
      out.push({ ...point, labelY: previous ? Math.max(wanted, previous.labelY + 13) : wanted });
      return out;
    }, []);

  return (
    <figure className="jade-instrument" style={{ margin: 0 }}>
      <style>{`${MOTION_CSS}
        .jade-ge-contact:hover circle, .jade-ge-contact:focus circle { r: 5; stroke-width: 2; }
      `}</style>
      <div
        role="group"
        aria-label="Graphic ephemeris controls"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}
      >
        {(Object.keys(FOLD_LABEL) as GraphicEphemerisFold[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={fold === option}
            style={fold === option ? CONTROL_PRESSED : CONTROL_STYLE}
            onClick={() => onFoldChange?.(option)}
          >
            {FOLD_LABEL[option]}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        {allBodies.map((body) => (
          <button
            key={body}
            type="button"
            aria-pressed={visible.has(body)}
            data-body-toggle={body}
            style={{
              ...(visible.has(body) ? CONTROL_PRESSED : CONTROL_STYLE),
              borderColor: visible.has(body) ? tintOf(body) : undefined,
              color: visible.has(body) ? tintOf(body) : undefined,
            }}
            onClick={() => toggleBody(body)}
          >
            {body}
          </button>
        ))}
        <span style={{ flexBasis: '100%', height: 0 }} />
        <button type="button" style={CONTROL_STYLE} onClick={() => jumpContact(-1)}>
          ← Previous crossing
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => jumpContact(1)}>
          Next crossing →
        </button>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="group"
        tabIndex={0}
        aria-label={`${title}, ${FOLD_LABEL[fold]}. Left and right arrows jump to the previous or next crossing; drag to move through time.`}
        aria-describedby={`${uid}-readout`}
        onKeyDown={onKeyDown}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        data-fold={fold}
        data-modulus={modulus}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          touchAction: dragJd === null ? 'pan-y' : 'none',
          fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
        }}
      >
        <title>{title}</title>
        <rect x={PLOT_X} y={PLOT_Y} width={PLOT_W} height={PLOT_H} fill={SURFACE} stroke={RULE} />

        {/* ------------------------------------------------ gridlines */}
        <g data-layer="grid" pointerEvents="none">
          {gridFor(fold).map((value) => (
            <g key={value}>
              <line
                x1={PLOT_X}
                x2={PLOT_X + PLOT_W}
                y1={y(value)}
                y2={y(value)}
                stroke={RULE}
                strokeWidth={0.5}
              />
              <text
                x={PLOT_X - 6}
                y={y(value)}
                fontSize={9}
                fill={FAINT}
                textAnchor="end"
                dominantBaseline="central"
              >
                {dms(value)}
              </text>
            </g>
          ))}
          {Array.from({ length: 5 }, (_, i) => fromJd + ((toJd - fromJd) * i) / 4).map((at, i) => (
            <text
              key={at}
              x={x(at)}
              y={VIEW_H - 8}
              fontSize={9}
              fill={FAINT}
              textAnchor={i === 0 ? 'start' : i === 4 ? 'end' : 'middle'}
            >
              {isoDate(at)}
            </text>
          ))}
        </g>

        {/* --------------------------------------- natal reference lines */}
        <g data-layer="natal">
          {natalOnDial.map((point) => {
            const dim = focus !== null && point.id !== focus;
            return (
              <line
                key={point.id}
                data-natal={point.id}
                data-folded={point.folded.toFixed(6)}
                x1={PLOT_X}
                x2={PLOT_X + PLOT_W}
                y1={y(point.folded)}
                y2={y(point.folded)}
                stroke={tintOf(point.id)}
                strokeWidth={point.id === focus ? 1.8 : 1}
                strokeDasharray="5 3"
                opacity={dim ? 0.25 : 0.9}
              />
            );
          })}
        </g>

        {/* ------------------------------------------ transiting curves */}
        <g data-layer="tracks">
          {paths
            .filter(({ body }) => visible.has(body))
            .map(({ body, d, retrogradeDays }) => {
              const dim = focus !== null && body !== focus;
              return (
                <path
                  key={body}
                  data-track={body}
                  data-retrograde-samples={retrogradeDays}
                  d={d}
                  fill="none"
                  stroke={tintOf(body)}
                  strokeWidth={body === focus ? 2.4 : 1.4}
                  opacity={dim ? 0.18 : 0.95}
                  strokeLinejoin="round"
                  onClick={() => onSelect?.(body === focus ? null : { kind: 'graha', id: body })}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{`${body} (transit) — click to follow`}</title>
                </path>
              );
            })}
        </g>

        {/* --------------------------------------------------- contacts */}
        <g data-layer="contacts">
          {shownContacts.map((contact, index) => {
            const on = involves(contact);
            return (
              <g
                key={`${contact.transiting}-${contact.natalPoint}-${index}`}
                className="jade-ge-contact"
                data-contact
                data-transiting={contact.transiting}
                data-natal-point={contact.natalPoint}
                data-jd={contact.jdUt.toFixed(5)}
                data-folded={contact.foldedLongitude.toFixed(6)}
                data-nakshatra={contact.nakshatraIndex}
                opacity={on ? 1 : 0.15}
                onPointerEnter={() => setHovered(contact)}
                onFocus={() => setHovered(contact)}
                onClick={() => onJd?.(contact.jdUt)}
                style={{ cursor: 'pointer' }}
              >
                <title>{describeContact(contact)}</title>
                <circle
                  cx={x(contact.jdUt)}
                  cy={y(contact.foldedLongitude)}
                  r={3}
                  fill={SURFACE}
                  stroke={tintOf(contact.transiting)}
                  strokeWidth={1.4}
                />
              </g>
            );
          })}
        </g>

        {/* ----------------------------------------------------- legend */}
        <g data-layer="legend">
          {legend.map((point) => (
            <g
              key={point.id}
              data-legend={point.id}
              onClick={() =>
                onSelect?.(point.id === focus ? null : { kind: 'graha', id: point.id })
              }
              style={{ cursor: 'pointer' }}
            >
              <line
                x1={PLOT_X + PLOT_W}
                x2={LEGEND_X - 4}
                y1={y(point.folded)}
                y2={point.labelY}
                stroke={tintOf(point.id)}
                strokeWidth={0.6}
              />
              <rect
                x={LEGEND_X}
                y={point.labelY - 4}
                width={14}
                height={8}
                fill="none"
                stroke={tintOf(point.id)}
                strokeDasharray="3 2"
              />
              <text
                x={LEGEND_X + 20}
                y={point.labelY}
                fontSize={10}
                fill={point.id === focus ? ACCENT : INK}
                dominantBaseline="central"
              >
                {point.id === 'Ascendant' ? 'Lagna' : point.id} {dms(point.folded)}
              </text>
            </g>
          ))}
        </g>

        {/* ----------------------------------------------------- cursor */}
        {cursorInView ? (
          <line
            data-cursor-jd={shownJd.toFixed(5)}
            x1={x(shownJd)}
            x2={x(shownJd)}
            y1={PLOT_Y}
            y2={PLOT_Y + PLOT_H}
            stroke={ACCENT}
            strokeWidth={2}
            pointerEvents="none"
          />
        ) : null}
      </svg>

      <figcaption style={{ fontSize: 12, color: MUTED, marginTop: 6, lineHeight: 1.45 }}>
        <p
          id={`${uid}-readout`}
          aria-live="polite"
          style={{ margin: 0, color: INK, minHeight: '1.45em' }}
        >
          {contacts === null
            ? 'Finding the crossings on this dial…'
            : hovered
              ? describeContact(hovered)
              : `${relevant.length} crossings on this dial${focus ? ` involving ${focus}` : ''} · hover to name one, click to move every view to it`}
        </p>
        {!cursorInView ? (
          <p style={{ margin: '3px 0 0', color: 'var(--clay, #9E5B3A)' }}>
            The instrument&rsquo;s date is outside {isoDate(fromJd)} – {isoDate(toJd)}, the span
            drawn here.
          </p>
        ) : null}
        <p style={{ margin: '3px 0 0' }}>
          Solid: transiting grahas. Dashed: natal points, keyed at right. A downward run is
          retrograde motion. The Moon is omitted — it crosses every line daily.
          {defaults !== 'all' && !chosen[fold]
            ? ' This dial opens on the slow grahas; the faster ones wrap too often to read at this span — add them above.'
            : ''}
        </p>
        <p style={{ margin: '3px 0 0', color: FAINT }}>
          {frameLabel} · sidereal ecliptic longitude folded mod {dms(modulus)}; latitude not plotted
          · {series.frame.precisionClass} ephemeris — for the screen, not for a printed date
        </p>
      </figcaption>

      <table style={VISUALLY_HIDDEN}>
        <caption>
          {title}: crossings on the {FOLD_LABEL[fold]} dial
        </caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Transiting</th>
            <th scope="col">Natal point</th>
            <th scope="col">Nakṣatra</th>
            <th scope="col">Transit longitude</th>
          </tr>
        </thead>
        <tbody>
          {relevant.map((contact, index) => (
            <tr key={index}>
              <td>{isoDate(contact.jdUt)}</td>
              <th scope="row">{contact.transiting}</th>
              <td>{contact.natalPoint}</td>
              <td>{NAKSHATRA_IAST[contact.nakshatraIndex]}</td>
              <td>{dms(contact.transitLongitude % 30)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

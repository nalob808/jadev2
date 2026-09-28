'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { NAKSHATRA_IAST, NAKSHATRA_NAMES, SIGNS, nakshatraOf, type PointId } from '@jade/astro';
import { GlyphGroup, hasGlyph } from '../glyphs.js';
import { annulusSector, spread, svgNum, svgPolar } from './wheelGeometry.js';
import {
  CONTROL_PRESSED,
  CONTROL_STYLE,
  MOTION_CSS,
  VISUALLY_HIDDEN,
  dms,
  type InstrumentMark,
  type InstrumentSelection,
} from './instrumentShared.js';
import {
  NAKSHATRA_ARCMIN,
  NAKSHATRA_CELLS,
  PADA_ARCMIN,
  arcminToDegrees,
  fitLabel,
  signPosition,
  stepRingSelection,
  taraCells,
  type TaraCell,
} from './nakshatraRingLayout.js';
import { SIGN_ABBREVIATIONS } from './shared.js';

/**
 * The nakṣatra ring — the 27 lunar mansions and their 108 padas as a band.
 *
 * Nothing else in the category draws this. Astro-Seek gives the Arabic 28
 * mansions a graphic calendar and the Vedic 27 nothing; a search for an
 * interactive nakṣatra wheel returns Pinterest boards. Yet nakṣatra and pada
 * are load-bearing in Jyotiṣa — they start the Vimśottarī sequence, drive tārā
 * bala, muhūrta and matching — so a ring that makes them visible shows the
 * structure every other view is derived from. A reader can finally see *why*
 * their daśā begins where it does: the natal Moon sits in a cell, and the cell
 * names its lord.
 *
 * ## What is on the ring, and what is not
 *
 * Semantic level of detail rather than collision detection. At the default
 * zoom: the 12 signs, the 27 names and each lord. Pada numbers appear on zoom
 * or for the selected arc; the navāṁśa each pada falls in appears at the
 * closest zoom. Gaṇa, yoni and nāḍī are not on the ring at all — they belong
 * to the detail panel (`NakshatraDetail`), because 27 × 3 more labels would
 * be the crowding this design exists to avoid.
 *
 * Pada boundaries are the finest division drawn and are exact: every edge is
 * an integer number of arcminutes (see `nakshatraRingLayout.ts`), carried on
 * the element as `data-start-arcmin` so the tests can check it.
 *
 * ## Orientation
 *
 * The wheel's convention: longitude increases anticlockwise, and `rotation`
 * is the longitude placed at nine o'clock. Pass the ascendant to line the ring
 * up with a wheel beside it; the default puts 0° Aśvinī on the left.
 */

export interface NakshatraRingProps {
  /** Natal positions — fixed. */
  readonly natal: readonly InstrumentMark[];
  /** Transiting positions at the instrument's moment — these move. */
  readonly transits?: readonly InstrumentMark[];
  /**
   * Natal Moon, for tārā shading. Every cell is shaded by its tārā counted
   * from the janma nakṣatra; without a Moon the band is left plain.
   */
  readonly natalMoonLongitude?: number | null;
  readonly selection?: InstrumentSelection | null;
  readonly onSelect?: (selection: InstrumentSelection | null) => void;
  /** Longitude drawn at nine o'clock. */
  readonly rotation?: number;
  /** Maximum drawn width in pixels; fluid below it. */
  readonly size?: number;
  /** The named sidereal frame and node model, for example “Lahiri · mean nodes”. */
  readonly frameLabel: string;
  /** Ayanāṁśa used at the displayed moment, in degrees. Never inferred here. */
  readonly ayanamsaValue: number;
  /** What moment the transit marks show, in words. */
  readonly transitLabel?: string;
  readonly initialZoom?: Zoom;
  readonly title?: string;
}

export type Zoom = 1 | 2 | 4;
const ZOOMS: readonly Zoom[] = [1, 2, 4];

const C = 200;
const R_SIGN_OUT = 198;
const R_SIGN_IN = 186;
const R_TRANSIT = 179;
const R_BAND_OUT = 172;
const R_BAND_IN = 132;
const R_LABEL = 162;
const R_LORD = 142;
const R_PADA_OUT = 132;
const R_PADA_IN = 121;
const R_NATAL = 108;

const NAME_FONT = 6.4;
const SPAN_RAD = (NAKSHATRA_ARCMIN / 60) * (Math.PI / 180);

const TARA_FILL: Record<TaraCell['band'], string> = {
  favourable: 'var(--band-favourable-wash, #E2ECE8)',
  mixed: 'var(--band-mixed-wash, #F3EBD9)',
  difficult: 'var(--band-difficult-wash, #F0E4DD)',
};

const TARA_EDGE: Record<TaraCell['band'], string> = {
  favourable: 'var(--band-favourable, #2C7A64)',
  mixed: 'var(--band-mixed, #B98325)',
  difficult: 'var(--band-difficult, #9E5B3A)',
};

const ACCENT = 'var(--accent, #33668F)';
const INK = 'var(--ink, #16222E)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const FAINT = 'var(--ink-faint, #7C8A95)';
const RULE = 'var(--rule, #C8CEC9)';
const CLAY = 'var(--clay, #9E5B3A)';
const SURFACE = 'var(--surface, #F9F9F4)';

const norm = (a: number): number => ((a % 360) + 360) % 360;

/**
 * An arc for text to run along, oriented so the text is never upside down.
 *
 * `polar` runs anticlockwise from nine o'clock, so the lower half reads left
 * to right going anticlockwise and the upper half going clockwise.
 */
function labelArc(r: number, from: number, to: number): string {
  const mid = norm((from + to) / 2);
  const bottom = mid > 0 && mid < 180;
  const [x1, y1] = svgPolar(C, C, r, from);
  const [x2, y2] = svgPolar(C, C, r, to);
  return bottom
    ? `M ${x1} ${y1} A ${r} ${r} 0 0 0 ${x2} ${y2}`
    : `M ${x2} ${y2} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}

const isLowerHalf = (from: number, to: number): boolean => {
  const mid = norm((from + to) / 2);
  return mid > 0 && mid < 180;
};

function nakshatraOfSelection(selection: InstrumentSelection | null | undefined): number | null {
  if (!selection) return null;
  if (selection.kind === 'nakshatra') return selection.index;
  if (selection.kind === 'pada') return selection.nakshatra;
  return null;
}

export function NakshatraRing({
  natal,
  transits = [],
  natalMoonLongitude = null,
  selection = null,
  onSelect,
  rotation = 0,
  size = 560,
  frameLabel,
  ayanamsaValue,
  transitLabel,
  initialZoom = 1,
  title = 'Nakṣatra ring',
}: NakshatraRingProps): React.ReactElement {
  if (!frameLabel.trim()) throw new Error('NakshatraRing requires a named sidereal frame');
  if (!Number.isFinite(ayanamsaValue))
    throw new Error('NakshatraRing requires a finite ayanāṁśa value');

  const uid = useId().replace(/:/g, '');
  const [zoom, setZoom] = useState<Zoom>(initialZoom);

  const angleOf = (arcmin: number): number => arcminToDegrees(arcmin) - rotation;

  const taras = useMemo(
    () => (natalMoonLongitude === null ? null : taraCells(natalMoonLongitude)),
    [natalMoonLongitude],
  );

  const selectedNak = nakshatraOfSelection(selection);
  const selectedPada = selection?.kind === 'pada' ? selection.pada : null;
  const selectedGraha = selection?.kind === 'graha' ? selection.id : null;
  const selectedSign = selection?.kind === 'sign' ? selection.signIndex : null;
  /** A selected daśā period lights the three nakṣatras its lord rules. */
  const periodLord =
    selection?.kind === 'period' ? (selection.lords[selection.lords.length - 1] ?? null) : null;

  const grahaNakshatras = useMemo(() => {
    if (!selectedGraha) return new Set<number>();
    return new Set(
      [...natal, ...transits]
        .filter((mark) => mark.id === selectedGraha)
        .map((mark) => nakshatraOf(mark.longitude).index),
    );
  }, [selectedGraha, natal, transits]);

  /**
   * Where a zoom is centred: the selected arc, else the selected graha, else
   * the natal Moon, else 0° Aśvinī. The view follows what the reader chose.
   */
  const focusLongitude = useMemo(() => {
    if (selectedNak !== null) {
      const cell = NAKSHATRA_CELLS[selectedNak]!;
      const padaStart = selectedPada
        ? cell.startArcmin + (selectedPada - 1) * PADA_ARCMIN + PADA_ARCMIN / 2
        : cell.startArcmin + NAKSHATRA_ARCMIN / 2;
      return arcminToDegrees(padaStart);
    }
    const graha = selectedGraha ? natal.find((mark) => mark.id === selectedGraha) : undefined;
    if (graha) return graha.longitude;
    if (natalMoonLongitude !== null) return natalMoonLongitude;
    return NAKSHATRA_ARCMIN / 120;
  }, [selectedNak, selectedPada, selectedGraha, natal, natalMoonLongitude]);

  const viewBox = useMemo(() => {
    if (zoom === 1) return `0 0 ${C * 2} ${C * 2}`;
    const [x, y] = svgPolar(C, C, (R_BAND_OUT + R_PADA_IN) / 2, focusLongitude - rotation);
    const w = (C * 2) / zoom;
    return `${svgNum(x - w / 2)} ${svgNum(y - w / 2)} ${w} ${w}`;
  }, [zoom, focusLongitude, rotation]);

  /** Everything is sized for the screen, so it is divided by the zoom. */
  const u = (value: number): number => value / zoom;

  const placedNatal = useMemo(() => placeMarks(natal, rotation, zoom), [natal, rotation, zoom]);
  const placedTransits = useMemo(
    () => placeMarks(transits, rotation, zoom),
    [transits, rotation, zoom],
  );

  const select = (next: InstrumentSelection | null): void => onSelect?.(next);
  const toggleNak = (index: number): void =>
    select(selectedNak === index && selectedPada === null ? null : { kind: 'nakshatra', index });
  const togglePada = (nakshatra: number, pada: number): void =>
    select(
      selectedNak === nakshatra && selectedPada === pada
        ? { kind: 'nakshatra', index: nakshatra }
        : { kind: 'pada', nakshatra, pada },
    );

  /** Arrows step the selection; with Shift they step by pada. */
  const step = (direction: 1 | -1, byPada: boolean): void => {
    const graha = selectedGraha ? natal.find((mark) => mark.id === selectedGraha) : undefined;
    const focusNak =
      selectedNak ??
      (graha ? nakshatraOf(graha.longitude).index : null) ??
      (natalMoonLongitude !== null ? nakshatraOf(natalMoonLongitude).index : 0);
    const next = stepRingSelection(selectedNak, selectedPada, focusNak, direction, byPada);
    select(
      next.pada === null
        ? { kind: 'nakshatra', index: next.nakshatra }
        : { kind: 'pada', nakshatra: next.nakshatra, pada: next.pada },
    );
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const key = event.key;
    if (key === 'ArrowRight' || key === 'ArrowUp') step(1, event.shiftKey);
    else if (key === 'ArrowLeft' || key === 'ArrowDown') step(-1, event.shiftKey);
    else if (key === 'Escape') select(null);
    else if (key === '+' || key === '=') setZoom((z) => (z === 1 ? 2 : 4));
    else if (key === '-' || key === '_') setZoom((z) => (z === 4 ? 2 : 1));
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const selectedCell = selectedNak !== null ? NAKSHATRA_CELLS[selectedNak]! : null;
  const statusText = selectedCell
    ? `${selectedCell.name}${selectedPada ? `, pada ${selectedPada}` : ''} — ruled by ${selectedCell.lord}, ${signPosition(
        selectedCell.startArcmin + (selectedPada ? (selectedPada - 1) * PADA_ARCMIN : 0),
      )} to ${signPosition(
        selectedPada
          ? selectedCell.startArcmin + selectedPada * PADA_ARCMIN
          : selectedCell.endArcmin,
      )}`
    : 'No nakṣatra selected';

  const moonNak = natalMoonLongitude !== null ? nakshatraOf(natalMoonLongitude) : null;

  return (
    <figure className="jade-instrument" style={{ margin: 0, maxWidth: size, width: '100%' }}>
      <style>{MOTION_CSS}</style>

      {/* ---------------------------------------------------------- controls */}
      <div
        role="group"
        aria-label="Nakṣatra ring controls"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}
      >
        <button type="button" style={CONTROL_STYLE} onClick={() => step(-1, false)}>
          ← Previous
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => step(1, false)}>
          Next →
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => step(-1, true)}>
          ← Previous pāda
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => step(1, true)}>
          Next pāda →
        </button>
        <button
          type="button"
          style={CONTROL_STYLE}
          onClick={() => select(null)}
          disabled={!selection}
        >
          Clear · Esc
        </button>
        <span style={{ flex: 1 }} />
        {ZOOMS.map((z) => (
          <button
            key={z}
            type="button"
            aria-pressed={zoom === z}
            style={zoom === z ? CONTROL_PRESSED : CONTROL_STYLE}
            onClick={() => setZoom(z)}
          >
            {z}×
          </button>
        ))}
      </div>

      <svg
        viewBox={viewBox}
        role="group"
        aria-label={`${title}. Arrow keys step through nakṣatras, Shift+arrow through padas, Escape clears.`}
        aria-describedby={`${uid}-status`}
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-zoom={zoom}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          fontFamily: 'var(--font-display, "Barlow Condensed", "Barlow", sans-serif)',
          outlineOffset: 2,
        }}
      >
        <title>{title}</title>

        {/* ------------------------------------------------------- signs */}
        <g data-layer="signs">
          {SIGNS.map((sign, signIndex) => {
            const from = signIndex * 30 - rotation;
            const to = from + 30;
            const lit = selectedSign === signIndex;
            return (
              <g key={sign} data-sign={signIndex}>
                <path
                  d={annulusSector(C, C, R_SIGN_IN, R_SIGN_OUT, from, to)}
                  fill={lit ? ACCENT : SURFACE}
                  fillOpacity={lit ? 0.14 : 1}
                  stroke={RULE}
                  strokeWidth={u(0.6)}
                  onClick={() => select(lit ? null : { kind: 'sign', signIndex })}
                  style={{ cursor: 'pointer' }}
                >
                  <title>{sign}</title>
                </path>
                <path
                  id={`${uid}-s${signIndex}`}
                  d={labelArc(R_SIGN_IN + 6 - u(1.6), from, to)}
                  fill="none"
                />
                <text
                  fontSize={u(6)}
                  fill={MUTED}
                  letterSpacing="0.06em"
                  dominantBaseline="middle"
                  pointerEvents="none"
                >
                  <textPath href={`#${uid}-s${signIndex}`} startOffset="50%" textAnchor="middle">
                    {zoom === 1 ? SIGN_ABBREVIATIONS[signIndex] : sign}
                  </textPath>
                </text>
              </g>
            );
          })}
        </g>

        {/* --------------------------------------------------- nakṣatras */}
        <g data-layer="nakshatras">
          {NAKSHATRA_CELLS.map((cell) => {
            const from = angleOf(cell.startArcmin);
            const to = angleOf(cell.endArcmin);
            const tara = taras?.[cell.index] ?? null;
            const isSelected = selectedNak === cell.index;
            const isLit =
              isSelected ||
              grahaNakshatras.has(cell.index) ||
              (periodLord !== null && cell.lord === periodLord);
            const fit = fitLabel(cell.name, R_LABEL * SPAN_RAD * zoom, NAME_FONT);
            const lower = isLowerHalf(from, to);
            // Text "up" faces the centre on the lower half and away from it on
            // the upper, so the first line of a stacked label moves inward
            // below and outward above.
            const lineRadii =
              fit.lines.length === 1
                ? [R_LABEL]
                : lower
                  ? [R_LABEL - 4.2, R_LABEL + 4.2]
                  : [R_LABEL + 4.2, R_LABEL - 4.2];
            const showPadas = zoom >= 2 || isSelected;
            const [lx, ly] = svgPolar(C, C, R_LORD, (from + to) / 2);

            return (
              <g
                key={cell.index}
                data-nakshatra={cell.index}
                data-name={NAKSHATRA_NAMES[cell.index]}
                data-lord={cell.lord}
                data-start-arcmin={cell.startArcmin}
                data-end-arcmin={cell.endArcmin}
                data-tara={tara?.index}
                data-tara-band={tara?.band}
                data-selected={isSelected || undefined}
                data-lit={isLit || undefined}
                data-label-level={fit.level}
                data-label-width={fit.width.toFixed(2)}
                data-label-room={(R_LABEL * SPAN_RAD * zoom).toFixed(2)}
              >
                <path
                  d={annulusSector(C, C, R_BAND_IN, R_BAND_OUT, from, to)}
                  fill={tara ? TARA_FILL[tara.band] : SURFACE}
                  stroke={RULE}
                  strokeWidth={u(0.6)}
                  onClick={() => toggleNak(cell.index)}
                  style={{ cursor: 'pointer' }}
                >
                  <title>
                    {`${cell.name} — ${signPosition(cell.startArcmin)} to ${signPosition(cell.endArcmin)}, ruled by ${cell.lord}${
                      tara ? `. Tārā ${tara.index}, ${tara.name} (${tara.band})` : ''
                    }`}
                  </title>
                </path>
                {isLit ? (
                  <path
                    d={annulusSector(C, C, R_PADA_IN, R_BAND_OUT, from, to)}
                    fill={ACCENT}
                    fillOpacity={isSelected ? 0.12 : 0.06}
                    stroke={ACCENT}
                    strokeWidth={u(isSelected ? 1.4 : 0.9)}
                    strokeDasharray={isSelected ? undefined : `${u(2)} ${u(1.5)}`}
                    pointerEvents="none"
                    data-highlight={isSelected ? 'selected' : 'related'}
                  />
                ) : null}
                {fit.lines.map((line, i) => (
                  <g key={i}>
                    <path
                      id={`${uid}-n${cell.index}-${i}`}
                      d={labelArc(lineRadii[i]!, from, to)}
                      fill="none"
                    />
                    <text
                      fontSize={u(NAME_FONT)}
                      fill={isSelected ? ACCENT : INK}
                      fontWeight={isSelected ? 600 : 500}
                      dominantBaseline="middle"
                      pointerEvents="none"
                      data-label-line={i}
                    >
                      <textPath
                        href={`#${uid}-n${cell.index}-${i}`}
                        startOffset="50%"
                        textAnchor="middle"
                      >
                        {line}
                      </textPath>
                    </text>
                  </g>
                ))}
                {hasGlyph(cell.lord) ? (
                  <g pointerEvents="none" data-lord-glyph={cell.lord}>
                    <GlyphGroup name={cell.lord} x={lx} y={ly} size={u(8)} color={MUTED} />
                  </g>
                ) : null}

                {/* ------------------------------------------- the padas */}
                {cell.padas.map((pada) => {
                  const pFrom = angleOf(pada.startArcmin);
                  const pTo = angleOf(pada.endArcmin);
                  const padaSelected = isSelected && selectedPada === pada.pada;
                  const [px, py] = svgPolar(C, C, (R_PADA_IN + R_PADA_OUT) / 2, (pFrom + pTo) / 2);
                  const [nx, ny] = svgPolar(C, C, R_PADA_IN - u(6), (pFrom + pTo) / 2);
                  return (
                    <g
                      key={pada.pada}
                      data-pada={pada.pada}
                      data-start-arcmin={pada.startArcmin}
                      data-end-arcmin={pada.endArcmin}
                      data-navamsha={pada.navamshaSign}
                      data-selected={padaSelected || undefined}
                    >
                      <path
                        d={annulusSector(C, C, R_PADA_IN, R_PADA_OUT, pFrom, pTo)}
                        fill={padaSelected ? ACCENT : SURFACE}
                        fillOpacity={padaSelected ? 0.35 : 1}
                        stroke={RULE}
                        strokeWidth={u(pada.pada === 1 ? 0.6 : 0.35)}
                        onClick={() => togglePada(cell.index, pada.pada)}
                        style={{ cursor: 'pointer' }}
                      >
                        <title>{`${cell.name} pada ${pada.pada} — ${signPosition(pada.startArcmin)} to ${signPosition(pada.endArcmin)}, navāṁśa ${SIGNS[pada.navamshaSign]}`}</title>
                      </path>
                      {showPadas ? (
                        <text
                          x={px}
                          y={py}
                          fontSize={u(5.2)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={padaSelected ? INK : MUTED}
                          pointerEvents="none"
                          data-pada-number={pada.pada}
                        >
                          {pada.pada}
                        </text>
                      ) : null}
                      {zoom === 4 ? (
                        <text
                          x={nx}
                          y={ny}
                          fontSize={u(4.4)}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={FAINT}
                          pointerEvents="none"
                          data-navamsha-label={pada.navamshaSign}
                        >
                          {SIGN_ABBREVIATIONS[pada.navamshaSign]}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </g>

        {/* ------------------------------------------------ the marks */}
        <g data-layer="natal">
          {placedNatal.map(({ mark, angle, trueAngle }) => (
            <Mark
              key={`n-${mark.id}`}
              kind="natal"
              mark={mark}
              angle={angle}
              trueAngle={trueAngle}
              radius={R_NATAL}
              tickFrom={R_PADA_IN}
              tickTo={R_PADA_IN - u(5)}
              zoom={zoom}
              selected={selectedGraha === mark.id}
              dimmed={selectedGraha !== null && selectedGraha !== mark.id}
              onSelect={() =>
                select(selectedGraha === mark.id ? null : { kind: 'graha', id: mark.id })
              }
            />
          ))}
        </g>
        <g data-layer="transits">
          {placedTransits.map(({ mark, angle, trueAngle }) => (
            <Mark
              key={`t-${mark.id}`}
              kind="transit"
              mark={mark}
              angle={angle}
              trueAngle={trueAngle}
              radius={R_TRANSIT}
              tickFrom={R_BAND_OUT}
              tickTo={R_BAND_OUT + u(3)}
              zoom={zoom}
              selected={selectedGraha === mark.id}
              dimmed={selectedGraha !== null && selectedGraha !== mark.id}
              onSelect={() =>
                select(selectedGraha === mark.id ? null : { kind: 'graha', id: mark.id })
              }
            />
          ))}
        </g>

        {/* --------------------------------------------------- centre */}
        {zoom === 1 ? (
          <g pointerEvents="none" data-layer="centre">
            {selectedCell ? (
              <>
                <text
                  x={C}
                  y={C - 12}
                  textAnchor="middle"
                  fontSize={15}
                  fill={INK}
                  fontWeight={600}
                >
                  {selectedCell.name}
                  {selectedPada ? ` · ${selectedPada}` : ''}
                </text>
                <text x={C} y={C + 4} textAnchor="middle" fontSize={7.5} fill={MUTED}>
                  {signPosition(
                    selectedCell.startArcmin +
                      (selectedPada ? (selectedPada - 1) * PADA_ARCMIN : 0),
                  )}
                  {' – '}
                  {signPosition(
                    selectedPada
                      ? selectedCell.startArcmin + selectedPada * PADA_ARCMIN
                      : selectedCell.endArcmin,
                  )}
                </text>
                <text x={C} y={C + 16} textAnchor="middle" fontSize={7.5} fill={MUTED}>
                  lord {selectedCell.lord}
                  {taras
                    ? ` · tārā ${taras[selectedCell.index]!.index} ${taras[selectedCell.index]!.name}`
                    : ''}
                </text>
              </>
            ) : (
              <>
                <text x={C} y={C - 4} textAnchor="middle" fontSize={11} fill={MUTED}>
                  27 nakṣatras · 108 padas
                </text>
                <text x={C} y={C + 10} textAnchor="middle" fontSize={7} fill={FAINT}>
                  {moonNak
                    ? `janma ${NAKSHATRA_IAST[moonNak.index]} ${moonNak.pada}`
                    : 'select an arc'}
                </text>
              </>
            )}
          </g>
        ) : null}
      </svg>

      {/* ------------------------------------------------ legend + frame */}
      <figcaption
        style={{
          marginTop: 8,
          font: '11px/1.5 var(--font-mono, ui-monospace, monospace)',
          color: MUTED,
        }}
      >
        <p id={`${uid}-status`} aria-live="polite" style={{ margin: 0, color: INK }}>
          {statusText}
        </p>
        {taras && moonNak ? (
          <p style={{ margin: '4px 0 0', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <span>Tārā from the natal Moon in {NAKSHATRA_IAST[moonNak.index]}:</span>
            {(['favourable', 'mixed', 'difficult'] as const).map((band) => (
              <span key={band} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    background: TARA_FILL[band],
                    border: `1px solid ${TARA_EDGE[band]}`,
                    display: 'inline-block',
                  }}
                />
                {band}
              </span>
            ))}
          </p>
        ) : null}
        <p style={{ margin: '4px 0 0' }} data-position-legend="natal-transit">
          Inner marks natal, fixed · outer marks transit{transitLabel ? `, ${transitLabel}` : ''}
        </p>
        <p
          style={{ margin: '4px 0 0' }}
          data-coordinate-frame="sidereal-ecliptic"
          data-frame-label={frameLabel}
          data-ayanamsa-degrees={ayanamsaValue.toFixed(6)}
        >
          Sidereal · {frameLabel} · ayanāṁśa {ayanamsaValue.toFixed(4)}° · ecliptic longitude;
          celestial latitude is not plotted
        </p>
      </figcaption>

      {/* ------------------------------------------ the parallel table */}
      <table style={VISUALLY_HIDDEN}>
        <caption>{title}: the 27 nakṣatras with their lords, spans and occupants</caption>
        <thead>
          <tr>
            <th scope="col">Nakṣatra</th>
            <th scope="col">Lord</th>
            <th scope="col">From</th>
            <th scope="col">To</th>
            {taras ? <th scope="col">Tārā</th> : null}
            <th scope="col">Natal</th>
            <th scope="col">Transit</th>
          </tr>
        </thead>
        <tbody>
          {NAKSHATRA_CELLS.map((cell) => {
            const inCell = (marks: readonly InstrumentMark[]) =>
              marks
                .filter((mark) => nakshatraOf(mark.longitude).index === cell.index)
                .map(
                  (mark) =>
                    `${mark.id} ${dms(mark.longitude % 30)} pada ${nakshatraOf(mark.longitude).pada}${mark.retrograde ? ' retrograde' : ''}`,
                )
                .join(', ');
            return (
              <tr key={cell.index}>
                <th scope="row">{cell.name}</th>
                <td>{cell.lord}</td>
                <td>{signPosition(cell.startArcmin)}</td>
                <td>{signPosition(cell.endArcmin)}</td>
                {taras ? <td>{`${taras[cell.index]!.index} ${taras[cell.index]!.name}`}</td> : null}
                <td>{inCell(natal)}</td>
                <td>{inCell(transits)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </figure>
  );
}

function Mark({
  kind,
  mark,
  angle,
  trueAngle,
  radius,
  tickFrom,
  tickTo,
  zoom,
  selected,
  dimmed,
  onSelect,
}: {
  kind: 'natal' | 'transit';
  mark: InstrumentMark;
  angle: number;
  trueAngle: number;
  radius: number;
  tickFrom: number;
  tickTo: number;
  zoom: Zoom;
  selected: boolean;
  dimmed: boolean;
  onSelect: () => void;
}): React.ReactElement {
  const nak = nakshatraOf(mark.longitude);
  const [x, y] = svgPolar(C, C, radius, angle);
  const [t1x, t1y] = svgPolar(C, C, tickFrom, trueAngle);
  const [t2x, t2y] = svgPolar(C, C, tickTo, trueAngle);
  const colour = selected ? ACCENT : kind === 'transit' ? CLAY : INK;
  const glyphSize = (selected ? 13 : 11) / zoom;
  return (
    <g
      data-mark={kind}
      data-point={mark.id}
      data-longitude={mark.longitude.toFixed(4)}
      data-nakshatra={nak.index}
      data-pada={nak.pada}
      data-retrograde={mark.retrograde ? 'true' : undefined}
      opacity={dimmed ? 0.35 : 1}
      onClick={onSelect}
      style={{ cursor: 'pointer' }}
    >
      <title>
        {`${mark.id}${kind === 'transit' ? ' (transit)' : ''} — ${dms(mark.longitude % 30)} ${SIGNS[Math.floor(mark.longitude / 30)]}, ${NAKSHATRA_IAST[nak.index]} pada ${nak.pada}${mark.retrograde ? ', retrograde' : ''}`}
      </title>
      <line x1={t1x} y1={t1y} x2={t2x} y2={t2y} stroke={colour} strokeWidth={1.1 / zoom} />
      <circle
        cx={x}
        cy={y}
        r={svgNum(glyphSize * 0.75)}
        fill="var(--paper, #EFEFE9)"
        fillOpacity={0.85}
      />
      {hasGlyph(mark.id) ? (
        <GlyphGroup name={mark.id} x={x} y={y} size={glyphSize} color={colour} />
      ) : (
        <text
          x={x}
          y={y}
          fontSize={7 / zoom}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colour}
        >
          {glyphFallback(mark.id)}
        </text>
      )}
      {mark.retrograde ? (
        <text
          x={svgNum(x + glyphSize * 0.75)}
          y={svgNum(y + glyphSize * 0.55)}
          fontSize={4.6 / zoom}
          fill={colour}
          fontStyle="italic"
        >
          R
        </text>
      ) : null}
    </g>
  );
}

/**
 * Glyph angles, pushed apart where they would overlap; the tick keeps the true
 * longitude. A conjunction must stay legible without moving what it measures.
 */
function placeMarks(marks: readonly InstrumentMark[], rotation: number, zoom: Zoom) {
  const raw = marks.map((mark) => norm(mark.longitude - rotation));
  const nudged = spread(raw, 7 / zoom);
  return marks.map((mark, index) => ({ mark, angle: nudged[index]!, trueAngle: raw[index]! }));
}

const glyphFallback = (id: PointId): string => (id === 'Ascendant' ? 'As' : id.slice(0, 2));

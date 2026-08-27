'use client';

import { useMemo, useState } from 'react';
import { GLYPHS } from '../tokens.js';
import { angleFor, annulusSector, degreesLabel, polar, spread } from './wheelGeometry.js';

/**
 * The circular chart, and the one screen in Jade a practitioner operates
 * rather than reads.
 *
 * Everything here is drawn from real longitudes rather than from sign buckets.
 * That is the difference between this and the square diagrams: a North Indian
 * chart says Mars is in Scorpio, and this says Mars is at 3°12′ Scorpio,
 * eleven degrees off the cusp — which is what tells you whether an aspect is
 * close enough to matter.
 *
 * Two geometric decisions worth stating, because they are what make a wheel
 * either usable or wrong:
 *
 * **The ascendant is pinned to the left horizon and houses run
 * counterclockwise.** That is the convention every wheel in every tradition
 * uses, and getting it backwards produces a chart that looks entirely correct
 * and reads inside out. An earlier overlay wheel in this codebase did exactly
 * that — 4th at top, 10th at bottom — and it was found only by looking at a
 * rendering, never by a test.
 *
 * **Glyphs are pushed apart when they collide.** Two grahas within a couple of
 * degrees render on top of each other otherwise, which is common (conjunctions
 * are the whole point of some charts) and makes the diagram useless exactly
 * where it matters most.
 */

export interface WheelPoint {
  readonly id: string;
  /** Sidereal longitude, 0–360. */
  readonly longitude: number;
  readonly signIndex: number;
  readonly degreesInSign: number;
  readonly house: number;
  readonly retrograde?: boolean;
  /** Optional, for the detail readout. */
  readonly nakshatra?: string;
  readonly dignity?: string | null;
}

export interface WheelAspect {
  readonly from: string;
  readonly toSign: number;
  readonly distance: number;
  readonly strength: number;
}

export interface WheelProps {
  readonly points: readonly WheelPoint[];
  /** Sidereal longitude of the ascendant — the wheel is oriented from it. */
  readonly ascendant: number;
  readonly ascendantSign: number;
  readonly aspects?: readonly WheelAspect[];
  /** A second ring, for transits over a natal chart. */
  readonly transits?: readonly WheelPoint[];
  /**
   * Sarvāṣṭakavarga bindus per sign, index 0 = Aries. Twelve numbers summing
   * to 337. Given, the wheel can shade each sign by its count — which is what
   * transit work actually reads the wheel for.
   */
  readonly sarva?: readonly number[];
  /**
   * Bhāva cusp longitudes, twelve of them, for the chalit overlay.
   *
   * The square charts and this wheel both seat grahas by whole sign, where
   * house and sign are the same thing. Under any other frame they are not, and
   * a graha late in a sign can sit in the *next* bhāva — which changes what it
   * is read as doing. Drawn as a second, dashed set of spokes so the
   * difference is visible rather than asserted.
   */
  readonly bhavaCusps?: readonly number[];
  /** Names the frame `bhavaCusps` was computed in, so the overlay can say so. */
  readonly bhavaLabel?: string;
  readonly size?: number;
  readonly title?: string;
}

const SIGN_NAMES = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

const SIGN_GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const ELEMENT_OF_SIGN = ['fire', 'earth', 'air', 'water'] as const;

const ELEMENT_TINT: Record<string, string> = {
  fire: 'var(--jade, #2C7A64)',
  earth: 'var(--ink-muted, #4A5C6B)',
  air: 'var(--accent, #33668F)',
  water: 'var(--clay, #9E5B3A)',
};

type Toggle =
  | 'houses'
  | 'signs'
  | 'degrees'
  | 'aspects'
  | 'nakshatras'
  | 'transits'
  | 'elements'
  | 'sarva'
  | 'chalit';

const TOGGLE_LABELS: Record<Toggle, string> = {
  houses: 'House numbers',
  signs: 'Sign glyphs',
  degrees: 'Degrees',
  aspects: 'Dṛṣṭi',
  nakshatras: 'Nakṣatra divisions',
  transits: 'Transit ring',
  elements: 'Element tint',
  sarva: 'Aṣṭakavarga',
  chalit: 'Bhāva chalit',
};

export function Wheel({
  points,
  ascendant,
  ascendantSign,
  aspects = [],
  transits = [],
  sarva = [],
  bhavaCusps = [],
  bhavaLabel = 'equal from the lagna degree',
  size = 520,
  title,
}: WheelProps): React.ReactElement {
  const [on, setOn] = useState<Record<Toggle, boolean>>({
    houses: true,
    signs: true,
    degrees: false,
    aspects: false,
    nakshatras: false,
    transits: transits.length > 0,
    elements: true,
    sarva: false,
    chalit: false,
  });
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (key: Toggle): void => setOn((state) => ({ ...state, [key]: !state[key] }));

  const cx = 50;
  const cy = 50;
  const rOuter = 48;
  const rSign = 41;
  const rTransit = 37;
  const rGraha = on.transits && transits.length ? 30 : 33;
  const rInner = 21;

  // Cusps are whole-sign here, so house 1 starts at 0° of the rising sign —
  // which is behind the ascendant degree, not at it.
  const firstCuspLongitude = ascendantSign * 30;

  const placed = useMemo(() => {
    const raw = points.map((p) => angleFor(p.longitude, ascendant));
    const nudged = spread(raw, 7);
    return points.map((point, index) => ({ point, angle: nudged[index]!, trueAngle: raw[index]! }));
  }, [points, ascendant]);

  const placedTransits = useMemo(() => {
    const raw = transits.map((p) => angleFor(p.longitude, ascendant));
    const nudged = spread(raw, 7);
    return transits.map((point, index) => ({
      point,
      angle: nudged[index]!,
      trueAngle: raw[index]!,
    }));
  }, [transits, ascendant]);

  const selectedPoint = placed.find((p) => p.point.id === selected)?.point ?? null;
  const shownAspects = on.aspects ? aspects.filter((a) => !selected || a.from === selected) : [];

  return (
    <div className="flex flex-col gap-3">
      {/* ------------------------------------------------------------ controls */}
      <div role="group" aria-label="Chart layers" className="flex flex-wrap gap-1.5">
        {(Object.keys(TOGGLE_LABELS) as Toggle[])
          // A toggle for a layer with no data is a dead control.
          .filter((key) => key !== 'transits' || transits.length > 0)
          .filter((key) => key !== 'sarva' || sarva.length === 12)
          .filter((key) => key !== 'chalit' || bhavaCusps.length === 12)
          .map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={on[key]}
              onClick={() => toggle(key)}
              className={`border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                on[key]
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                  : 'border-[var(--rule)] text-[var(--ink-muted)] hover:border-[var(--accent-soft)] hover:text-[var(--ink)]'
              }`}
            >
              {TOGGLE_LABELS[key]}
            </button>
          ))}
        {selected ? (
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="border border-[var(--clay)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--clay)]"
          >
            Clear {selected}
          </button>
        ) : null}
      </div>

      {/* --------------------------------------------------------------- wheel */}
      <svg
        className="jade-chart"
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label={title ?? 'Circular chart with twelve houses'}
      >
        {/*
          Sarvāṣṭakavarga.
          
          Shaded by bindu count and labelled with the number. The opacity ramp
          is deliberately one hue rather than red-to-green: this is a density,
          and the moment it becomes a traffic light it is claiming that a
          transit through a low sign goes badly, which is not what the count
          says. The number is always drawn, so the shading is decoration on top
          of a figure rather than the figure itself.
        */}
        {on.sarva && sarva.length === 12
          ? Array.from({ length: 12 }, (_, signIndex) => {
              const bindus = sarva[signIndex] ?? 0;
              const start = angleFor(signIndex * 30, ascendant);
              // The classical range runs about 19–39 across the twelve.
              const t = Math.max(0, Math.min(1, (bindus - 18) / 20));
              const [tx, ty] = polar(cx, cy, rInner + 3.6, start + 15);
              return (
                <g key={`sarva-${signIndex}`}>
                  <path
                    d={annulusSector(cx, cy, rInner, rInner + 7, start, start + 30)}
                    fill="var(--accent, #33668F)"
                    opacity={0.08 + t * 0.42}
                  />
                  <text
                    x={tx}
                    y={ty}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={3}
                    fontWeight={600}
                    fill="var(--ink, #16222E)"
                  >
                    {bindus}
                  </text>
                </g>
              );
            })
          : null}

        {/*
          Bhāva chalit cusps, dashed so they read as a second opinion rather
          than as the frame everything else was drawn in.
        */}
        {on.chalit && bhavaCusps.length === 12
          ? bhavaCusps.map((cusp, houseIndex) => {
              const angle = angleFor(cusp, ascendant);
              const [x1, y1] = polar(cx, cy, rInner, angle);
              const [x2, y2] = polar(cx, cy, rOuter, angle);
              const [lx, ly] = polar(cx, cy, rInner - 2.4, angle + 15);
              return (
                <g key={`chalit-${houseIndex}`}>
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--clay, #9E5B3A)"
                    strokeWidth={0.35}
                    strokeDasharray="1.4 1"
                  />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={2.4}
                    fill="var(--clay, #9E5B3A)"
                  >
                    {houseIndex + 1}
                  </text>
                </g>
              );
            })
          : null}

        {/* Sign sectors */}
        {Array.from({ length: 12 }, (_, i) => {
          const signIndex = i;
          const start = angleFor(signIndex * 30, ascendant);
          const end = start + 30;
          const [x1, y1] = polar(cx, cy, rInner, start);
          const [x2, y2] = polar(cx, cy, rOuter, start);
          const element = ELEMENT_OF_SIGN[signIndex % 4]!;
          const [mx, my] = polar(cx, cy, (rSign + rOuter) / 2, start + 15);

          return (
            <g key={`sign-${signIndex}`}>
              {on.elements ? (
                <path
                  d={annulusSector(cx, cy, rSign, rOuter, start, end)}
                  fill={ELEMENT_TINT[element]}
                  opacity={0.07}
                />
              ) : null}
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--rule, #C8CEC9)"
                strokeWidth={0.3}
              />
              {on.signs ? (
                <text
                  x={mx}
                  y={my}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={3.6}
                  fill={ELEMENT_TINT[element]}
                >
                  {SIGN_GLYPHS[signIndex]}
                  {'︎'}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* Nakṣatra divisions — 27 arcs of 13°20′ */}
        {on.nakshatras
          ? Array.from({ length: 27 }, (_, i) => {
              const start = angleFor((i * 360) / 27, ascendant);
              const [x1, y1] = polar(cx, cy, rSign, start);
              const [x2, y2] = polar(cx, cy, rSign - 2.4, start);
              return (
                <line
                  key={`nak-${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--ink-faint, #7C8A95)"
                  strokeWidth={0.18}
                />
              );
            })
          : null}

        {/* Rings */}
        {[rOuter, rSign, rInner].map((r) => (
          <circle
            key={r}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke="var(--rule, #C8CEC9)"
            strokeWidth={0.35}
          />
        ))}

        {/* House cusps and numbers. Whole sign, so a cusp is a sign boundary. */}
        {Array.from({ length: 12 }, (_, i) => {
          const cuspLongitude = firstCuspLongitude + i * 30;
          const start = angleFor(cuspLongitude, ascendant);
          const [lx, ly] = polar(cx, cy, rInner, start + 15);
          return on.houses ? (
            <text
              key={`house-${i}`}
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={3}
              fill="var(--ink-faint, #7C8A95)"
              fontFamily="var(--font-mono, monospace)"
            >
              {i + 1}
            </text>
          ) : null;
        })}

        {/* The horizon: ascendant at the left, exactly. */}
        <g>
          <line
            x1={polar(cx, cy, rOuter, 0)[0]}
            y1={polar(cx, cy, rOuter, 0)[1]}
            x2={polar(cx, cy, rOuter, 180)[0]}
            y2={polar(cx, cy, rOuter, 180)[1]}
            stroke="var(--accent, #33668F)"
            strokeWidth={0.4}
            opacity={0.7}
          />
          <text
            x={polar(cx, cy, rOuter - 3.5, 0)[0]}
            y={polar(cx, cy, rOuter - 3.5, 0)[1]}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={2.6}
            fill="var(--accent, #33668F)"
            fontFamily="var(--font-mono, monospace)"
          >
            ASC
          </text>
        </g>

        {/* Dṛṣṭi — drawn to the midpoint of the aspected sign. */}
        {shownAspects.map((aspect, i) => {
          const source = placed.find((p) => p.point.id === aspect.from);
          if (!source) return null;
          const [x1, y1] = polar(cx, cy, rInner - 0.5, source.trueAngle);
          const [x2, y2] = polar(
            cx,
            cy,
            rInner - 0.5,
            angleFor(aspect.toSign * 30 + 15, ascendant),
          );
          return (
            <line
              key={`asp-${aspect.from}-${aspect.toSign}-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--accent, #33668F)"
              strokeWidth={aspect.strength >= 1 ? 0.3 : 0.18}
              opacity={aspect.strength >= 1 ? 0.55 : 0.3}
            />
          );
        })}

        {/* Transit ring */}
        {on.transits
          ? placedTransits.map(({ point, angle, trueAngle }) => {
              const [gx, gy] = polar(cx, cy, rTransit, angle);
              const [tx, ty] = polar(cx, cy, rSign - 0.6, trueAngle);
              const [tx2, ty2] = polar(cx, cy, rSign - 2, trueAngle);
              return (
                <g key={`t-${point.id}`} opacity={0.75}>
                  <line
                    x1={tx}
                    y1={ty}
                    x2={tx2}
                    y2={ty2}
                    stroke="var(--clay, #9E5B3A)"
                    strokeWidth={0.25}
                  />
                  <text
                    x={gx}
                    y={gy}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={3.2}
                    fill="var(--clay, #9E5B3A)"
                  >
                    {GLYPHS[point.id as keyof typeof GLYPHS] ?? point.id.slice(0, 2)}
                    {'︎'}
                  </text>
                </g>
              );
            })
          : null}

        {/* Natal grahas */}
        {placed.map(({ point, angle, trueAngle }) => {
          const [gx, gy] = polar(cx, cy, rGraha, angle);
          const [tickOuter, tickOuterY] = polar(cx, cy, rSign - 0.6, trueAngle);
          const [tickInner, tickInnerY] = polar(cx, cy, rSign - 2.6, trueAngle);
          const dim = selected !== null && selected !== point.id;

          return (
            <g
              key={point.id}
              opacity={dim ? 0.25 : 1}
              style={{ cursor: 'pointer', transition: 'opacity 180ms ease' }}
              onClick={() => setSelected(selected === point.id ? null : point.id)}
              role="button"
              tabIndex={0}
              aria-label={`${point.id} at ${degreesLabel(point.degreesInSign)} ${SIGN_NAMES[point.signIndex]}, house ${point.house}`}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelected(selected === point.id ? null : point.id);
                }
              }}
            >
              {/* The tick marks the true degree; the glyph may have been nudged. */}
              <line
                x1={tickOuter}
                y1={tickOuterY}
                x2={tickInner}
                y2={tickInnerY}
                stroke="var(--ink, #16222E)"
                strokeWidth={0.3}
              />
              {/*
                A real hit target. The glyph itself is a few pixels of ink, so
                pointer events land on the <svg> behind it instead — the graha
                becomes almost unclickable for a person and entirely
                unclickable for a test. This circle is invisible and catches
                the whole neighbourhood.
              */}
              <circle cx={gx} cy={gy} r={3.4} fill="transparent" />
              <text
                x={gx}
                y={gy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={4}
                fill={point.id === selected ? 'var(--accent, #33668F)' : 'var(--ink, #16222E)'}
              >
                {GLYPHS[point.id as keyof typeof GLYPHS] ?? point.id.slice(0, 2)}
                {'︎'}
              </text>
              {point.retrograde ? (
                <text
                  x={gx + 2.6}
                  y={gy - 2.2}
                  fontSize={2.2}
                  fill="var(--clay, #9E5B3A)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  R
                </text>
              ) : null}
              {on.degrees ? (
                <text
                  x={polar(cx, cy, rGraha - 4.4, angle)[0]}
                  y={polar(cx, cy, rGraha - 4.4, angle)[1]}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={2.1}
                  fill="var(--ink-faint, #7C8A95)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {degreesLabel(point.degreesInSign)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* ------------------------------------------------------------- readout */}
      <div className="min-h-[3.5rem] border-t border-[var(--rule)] pt-2">
        {selectedPoint ? (
          <div className="jade-fade flex flex-wrap items-baseline gap-x-4 gap-y-1 font-mono text-[11px]">
            <span className="text-[var(--accent)]">
              {GLYPHS[selectedPoint.id as keyof typeof GLYPHS]}
              {'︎'} {selectedPoint.id}
            </span>
            <span className="text-[var(--ink)]">
              {degreesLabel(selectedPoint.degreesInSign)} {SIGN_NAMES[selectedPoint.signIndex]}
            </span>
            <span className="text-[var(--ink-muted)]">house {selectedPoint.house}</span>
            {selectedPoint.nakshatra ? (
              <span className="text-[var(--ink-muted)]">{selectedPoint.nakshatra}</span>
            ) : null}
            {selectedPoint.dignity ? (
              <span className="text-[var(--jade)]">{selectedPoint.dignity.replace('_', ' ')}</span>
            ) : null}
            {selectedPoint.retrograde ? (
              <span className="text-[var(--clay)]">retrograde</span>
            ) : null}
          </div>
        ) : (
          <p className="font-mono text-[10.5px] leading-relaxed text-[var(--ink-faint)]">
            Click a graha to isolate it and its dṛṣṭi. The tick on the ring marks the exact degree —
            a glyph may sit slightly off it where two bodies would otherwise overlap.
          </p>
        )}
      </div>

      {/*
        A layer that changes the reading has to say what frame it is in. The
        chalit spokes especially: without the label they look like a correction
        to the house cusps rather than a different, named way of cutting them.
      */}
      {on.sarva || on.chalit ? (
        <div className="flex flex-col gap-1 border-l-2 border-[var(--rule-strong,#A9B2AE)] pl-3">
          {on.sarva ? (
            <p className="font-mono text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
              <span className="text-[var(--accent)]">Aṣṭakavarga</span> — sarva bindus per sign, 337
              across the twelve. The shading is density, not merit: a low count does not say a
              transit through that sign goes badly, only that fewer contributors marked it.
            </p>
          ) : null}
          {on.chalit ? (
            <p className="font-mono text-[10.5px] leading-relaxed text-[var(--ink-muted)]">
              <span className="text-[var(--clay)]">Bhāva chalit</span> — cusps {bhavaLabel}. Where a
              dashed spoke falls between a graha and its sign boundary, that graha sits in a
              different bhāva than the whole-sign house it is drawn in.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

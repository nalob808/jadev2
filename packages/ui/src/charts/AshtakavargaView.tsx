'use client';

import { useId, type KeyboardEvent } from 'react';
import {
  AV_CONTRIBUTORS,
  SARVA_TOTAL,
  SIGNS,
  unixMsFromJd,
  type AvContributor,
  type AvSubject,
  type KakshaSegment,
} from '@jade/astro';
import { GRAHA_NATURE } from '../glyphs.js';
import { annulusSector, svgNum, svgPolar } from './wheelGeometry.js';
import { SIGN_ABBREVIATIONS } from './shared.js';
import {
  CONTROL_STYLE,
  MOTION_CSS,
  VisuallyHidden,
  type InstrumentSelection,
} from './instrumentShared.js';

/**
 * Aṣṭakavarga as data graphics rather than an integer grid.
 *
 * Every other tool prints 8 contributors × 12 signs as a table of numbers,
 * which hides the one thing the technique is about: where the strength comes
 * from. Three views here, each answering a question the grid cannot:
 *
 *   SarvaProfile          which houses are strong — as a shape around the rāśi
 *                         ring, against the 337 ÷ 12 mean, values labelled
 *   ContributorMultiples  who supplies the bindus — eight small charts on one
 *                         scale, so a benefic 28 and a malefic 28 look different
 *   KakshaBand            when a slow transit is in a bindu-bearing 3°45′ kakṣā
 *                         — graphed until now only in Jagannātha Hora, on Windows
 *
 * All three read the instrument's selection: a selected sign is lit in every
 * view, and the kakṣā band's cursor is the instrument's `jd`.
 */

const INK = 'var(--ink, #16222E)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const FAINT = 'var(--ink-faint, #7C8A95)';
const RULE = 'var(--rule, #C8CEC9)';
const SURFACE = 'var(--surface, #F9F9F4)';
const ACCENT = 'var(--accent, #33668F)';
const ABOVE = 'var(--band-favourable, #2C7A64)';
const BELOW = 'var(--band-difficult, #9E5B3A)';
const BINDU = 'var(--band-favourable, #2C7A64)';
const NO_BINDU = 'var(--band-difficult-wash, #F0E4DD)';

const NATURE_TINT: Record<string, string> = {
  benefic: 'var(--nature-benefic, #2C7A64)',
  malefic: 'var(--nature-malefic, #9E5B3A)',
  neutral: 'var(--nature-neutral, #55606B)',
  angle: 'var(--accent, #33668F)',
};

/** The classical mean: 337 bindus over twelve signs, ≈ 28.08. */
export const SARVA_MEAN = SARVA_TOTAL / 12;

const selectedSignOf = (selection: InstrumentSelection | null | undefined): number | null =>
  selection?.kind === 'sign' ? selection.signIndex : null;

// ---------------------------------------------------------------------------
// SAV as a radial profile
// ---------------------------------------------------------------------------

/** Fixed radial domain, so two charts drawn side by side are comparable. */
const SAV_DOMAIN = 48;
const C = 150;
const R0 = 38;
const R_SPAN = 88;
const R_LABEL_RING = 138;
const radiusOf = (bindus: number): number =>
  R0 + (Math.min(bindus, SAV_DOMAIN) / SAV_DOMAIN) * R_SPAN;

export function SarvaProfile({
  sarva,
  rotation = 0,
  ascendantSign,
  selection = null,
  onSelect,
}: {
  /** Twelve counts, Aries first, summing to 337. */
  readonly sarva: readonly number[];
  /** Longitude at nine o'clock — the ascendant, to match the wheel. */
  readonly rotation?: number;
  readonly ascendantSign?: number;
  readonly selection?: InstrumentSelection | null;
  readonly onSelect?: (selection: InstrumentSelection | null) => void;
}): React.ReactElement {
  if (sarva.length !== 12) throw new Error('SarvaProfile needs twelve signs');
  const total = sarva.reduce((sum, value) => sum + value, 0);
  const selected = selectedSignOf(selection);
  const step = (direction: 1 | -1): void => {
    const from = selected ?? ascendantSign ?? 0;
    onSelect?.({
      kind: 'sign',
      signIndex: selected === null ? from : (from + direction + 12) % 12,
    });
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') step(1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') step(-1);
    else if (event.key === 'Escape') onSelect?.(null);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 300 300"
        role="group"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Sarvāṣṭakavarga by sign, as a radial profile. Arrow keys step signs."
        data-sarva-total={total}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
        }}
      >
        <title>Sarvāṣṭakavarga profile</title>
        <circle cx={C} cy={C} r={R0 + R_SPAN} fill="none" stroke={RULE} strokeWidth={0.5} />
        <circle cx={C} cy={C} r={R0} fill="none" stroke={RULE} strokeWidth={0.5} />
        {SIGNS.map((sign, signIndex) => {
          const from = signIndex * 30 - rotation;
          const to = from + 30;
          const bindus = sarva[signIndex]!;
          const isSelected = selected === signIndex;
          const above = bindus > SARVA_MEAN;
          // Outside both the bar and the mean ring, so a count never sits on the dashes.
          const [lx, ly] = svgPolar(
            C,
            C,
            Math.max(radiusOf(bindus), radiusOf(SARVA_MEAN)) + 9,
            from + 15,
          );
          const [sx, sy] = svgPolar(C, C, R_LABEL_RING, from + 15);
          return (
            <g
              key={sign}
              data-sav-sign={signIndex}
              data-bindus={bindus}
              data-radius={radiusOf(bindus).toFixed(4)}
              data-above-mean={above}
              data-selected={isSelected || undefined}
              onClick={() => onSelect?.(isSelected ? null : { kind: 'sign', signIndex })}
              style={{ cursor: 'pointer' }}
            >
              <title>{`${sign}: ${bindus} sarva bindus — ${above ? 'above' : 'at or below'} the ${SARVA_MEAN.toFixed(1)} mean`}</title>
              <path
                d={annulusSector(C, C, R0, R0 + R_SPAN, from, to)}
                fill={isSelected ? ACCENT : SURFACE}
                fillOpacity={isSelected ? 0.1 : 1}
                stroke={RULE}
                strokeWidth={0.4}
              />
              <path
                d={annulusSector(C, C, R0, radiusOf(bindus), from + 1.5, to - 1.5)}
                fill={above ? ABOVE : BELOW}
                fillOpacity={isSelected ? 0.75 : 0.45}
                stroke={isSelected ? ACCENT : 'none'}
                strokeWidth={1.2}
              />
              <text
                x={lx}
                y={ly}
                fontSize={9}
                fontWeight={600}
                textAnchor="middle"
                dominantBaseline="central"
                fill={INK}
              >
                {bindus}
              </text>
              <text
                x={sx}
                y={sy}
                fontSize={8}
                textAnchor="middle"
                dominantBaseline="central"
                fill={signIndex === ascendantSign ? ACCENT : MUTED}
                fontWeight={signIndex === ascendantSign ? 600 : 400}
              >
                {SIGN_ABBREVIATIONS[signIndex]}
              </text>
            </g>
          );
        })}
        <circle
          cx={C}
          cy={C}
          r={svgNum(radiusOf(SARVA_MEAN))}
          fill="none"
          stroke={INK}
          strokeWidth={0.7}
          strokeDasharray="3 2"
          pointerEvents="none"
          data-mean-ring={SARVA_MEAN.toFixed(4)}
        />
        <text x={C} y={C - 4} textAnchor="middle" fontSize={11} fill={INK} fontWeight={600}>
          {total}
        </text>
        <text x={C} y={C + 8} textAnchor="middle" fontSize={6.5} fill={FAINT}>
          dashed ring {SARVA_MEAN.toFixed(1)}
        </text>
      </svg>
      <figcaption style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
        Radius is bindus on a fixed 0–{SAV_DOMAIN} scale; the dashed ring is the {SARVA_TOTAL} ÷ 12
        mean. Lagna sign in blue.
      </figcaption>
      <VisuallyHidden>
        <table>
          <caption>Sarvāṣṭakavarga bindus by sign, total {total}</caption>
          <tbody>
            {SIGNS.map((sign, signIndex) => (
              <tr key={sign}>
                <th scope="row">{sign}</th>
                <td>{sarva[signIndex]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Who supplies the bindus — small multiples
// ---------------------------------------------------------------------------

/** Most bindus one contributor can give one sign: one per graha table. */
const CONTRIBUTOR_DOMAIN = 7;

export function ContributorMultiples({
  bySource,
  ascendantSign,
  selection = null,
  onSelect,
}: {
  /** From `sarvaByContributor`: bindus each contributor gave each sign. */
  readonly bySource: Record<AvContributor, readonly number[]>;
  readonly ascendantSign?: number;
  readonly selection?: InstrumentSelection | null;
  readonly onSelect?: (selection: InstrumentSelection | null) => void;
}): React.ReactElement {
  const selected = selectedSignOf(selection);
  const W = 132;
  const H = 62;
  const barW = 9;
  const plotH = 42;
  return (
    <figure style={{ margin: 0 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 10,
        }}
      >
        {AV_CONTRIBUTORS.map((contributor) => {
          const counts = bySource[contributor];
          const total = counts.reduce((sum, value) => sum + value, 0);
          const tint = NATURE_TINT[GRAHA_NATURE[contributor] ?? 'neutral'] ?? NATURE_TINT.neutral!;
          return (
            <svg
              key={contributor}
              viewBox={`0 0 ${W} ${H + 12}`}
              role="img"
              aria-label={`Bindus given by ${contributor}: ${total} in all`}
              data-contributor={contributor}
              data-total={total}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
                fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
              }}
            >
              <text x={2} y={9} fontSize={9} fill={INK} fontWeight={600}>
                {contributor === 'Ascendant' ? 'Lagna' : contributor}
              </text>
              <text x={W - 2} y={9} fontSize={8} fill={FAINT} textAnchor="end">
                {total}
              </text>
              <line
                x1={4}
                y1={14 + plotH}
                x2={W - 4}
                y2={14 + plotH}
                stroke={RULE}
                strokeWidth={0.5}
              />
              {counts.map((count, sign) => {
                const x = 6 + sign * (barW + 1.1);
                const h = (count / CONTRIBUTOR_DOMAIN) * plotH;
                const lit = selected === sign;
                return (
                  <g
                    key={sign}
                    data-sign={sign}
                    data-count={count}
                    onClick={() => onSelect?.(lit ? null : { kind: 'sign', signIndex: sign })}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>{`${contributor} gave ${SIGNS[sign]} ${count} of a possible 7`}</title>
                    <rect
                      x={x - 0.5}
                      y={14}
                      width={barW + 1}
                      height={plotH}
                      fill={lit ? ACCENT : 'transparent'}
                      fillOpacity={0.1}
                    />
                    <rect
                      x={x}
                      y={14 + plotH - h}
                      width={barW}
                      height={h}
                      fill={tint}
                      fillOpacity={lit ? 0.9 : 0.55}
                    />
                    <text
                      x={x + barW / 2}
                      y={H + 9}
                      fontSize={5.5}
                      textAnchor="middle"
                      fill={sign === ascendantSign ? ACCENT : FAINT}
                    >
                      {SIGN_ABBREVIATIONS[sign]!.slice(0, 2)}
                    </text>
                  </g>
                );
              })}
            </svg>
          );
        })}
      </div>
      <figcaption style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
        Each panel is one contributor, on one 0–7 scale; the eight panels for a sign add up to its
        sarva. Benefic contributors green, malefic rust, the Lagna blue.
      </figcaption>
      <VisuallyHidden>
        <table>
          <caption>Bindus given to each sign by each contributor</caption>
          <thead>
            <tr>
              <th scope="col">Contributor</th>
              {SIGNS.map((sign) => (
                <th key={sign} scope="col">
                  {sign}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AV_CONTRIBUTORS.map((contributor) => (
              <tr key={contributor}>
                <th scope="row">{contributor}</th>
                {bySource[contributor].map((count, sign) => (
                  <td key={sign}>{count}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// The kakṣā transit band
// ---------------------------------------------------------------------------

export interface KakshaRow {
  readonly subject: AvSubject;
  readonly segments: readonly KakshaSegment[];
}

const BAND_X = 64;
const BAND_W = 920;
const ROW_H = 30;
const ROW_GAP = 10;

function isoDate(jd: number): string {
  return new Date(unixMsFromJd(jd)).toISOString().slice(0, 10);
}

export function KakshaBand({
  rows,
  range,
  jd,
  onJd,
}: {
  readonly rows: readonly KakshaRow[];
  /** The span the rows were computed over. */
  readonly range: { readonly fromJd: number; readonly toJd: number };
  /** The instrument's moment — the cursor. */
  readonly jd: number;
  /** Jump the instrument to a moment (clicking a kakṣā enters it). */
  readonly onJd?: (jd: number) => void;
}): React.ReactElement {
  const uid = useId().replace(/:/g, '');
  const span = range.toJd - range.fromJd;
  const xOf = (value: number): number => BAND_X + ((value - range.fromJd) / span) * BAND_W;
  const inWindow = jd >= range.fromJd && jd <= range.toJd;
  const height = rows.length * (ROW_H + ROW_GAP) + 26;

  const edges = rows
    .flatMap((row) => row.segments.slice(1).map((segment) => segment.fromJd))
    .sort((a, b) => a - b);
  const jumpEdge = (direction: 1 | -1): void => {
    const next =
      direction === 1
        ? edges.find((edge) => edge > jd + 1e-6)
        : [...edges].reverse().find((edge) => edge < jd - 1e-6);
    if (next !== undefined) onJd?.(next);
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowRight') jumpEdge(1);
    else if (event.key === 'ArrowLeft') jumpEdge(-1);
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const current = rows.map((row) => ({
    subject: row.subject,
    segment: row.segments.find((segment) => jd >= segment.fromJd && jd < segment.toJd) ?? null,
  }));

  return (
    <figure className="jade-instrument" style={{ margin: 0 }}>
      <style>{MOTION_CSS}</style>
      <div
        role="group"
        aria-label="Kakṣā band controls"
        style={{ display: 'flex', gap: 6, marginBottom: 6 }}
      >
        <button type="button" style={CONTROL_STYLE} onClick={() => jumpEdge(-1)}>
          ← Previous kakṣā change
        </button>
        <button type="button" style={CONTROL_STYLE} onClick={() => jumpEdge(1)}>
          Next kakṣā change →
        </button>
      </div>
      <svg
        viewBox={`0 0 1000 ${height}`}
        role="group"
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-label="Kakṣā transit band. Left and right arrows jump the date to the previous or next kakṣā change."
        aria-describedby={`${uid}-now`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          fontFamily: 'var(--font-display, "Barlow Condensed", sans-serif)',
        }}
      >
        <title>Kakṣā transit band</title>
        {rows.map((row, rowIndex) => {
          const y = 8 + rowIndex * (ROW_H + ROW_GAP);
          return (
            <g key={row.subject} data-kaksha-row={row.subject}>
              <text
                x={BAND_X - 8}
                y={y + ROW_H / 2}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={12}
                fill={INK}
              >
                {row.subject}
              </text>
              {row.segments.map((segment) => {
                const x = xOf(segment.fromJd);
                const w = Math.max(0.4, xOf(segment.toJd) - x);
                return (
                  <g
                    key={segment.fromJd}
                    data-kaksha-segment
                    data-sign={segment.signIndex}
                    data-kaksha={segment.kakshaIndex}
                    data-lord={segment.lord}
                    data-bindu={segment.hasBindu}
                    data-from-jd={segment.fromJd.toFixed(5)}
                    data-to-jd={segment.toJd.toFixed(5)}
                    onClick={() => onJd?.(segment.fromJd)}
                    style={{ cursor: 'pointer' }}
                  >
                    <title>
                      {`${row.subject} in ${SIGNS[segment.signIndex]}, kakṣā ${segment.kakshaIndex + 1} (${segment.lord === 'Ascendant' ? 'Lagna' : segment.lord}) — ${
                        segment.hasBindu ? 'bindu' : 'no bindu'
                      } in ${row.subject}'s own aṣṭakavarga · ${isoDate(segment.fromJd)} to ${isoDate(segment.toJd)}`}
                    </title>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={ROW_H}
                      fill={segment.hasBindu ? BINDU : NO_BINDU}
                      fillOpacity={segment.hasBindu ? 0.55 : 1}
                      stroke={SURFACE}
                      strokeWidth={0.6}
                    />
                    {w > 16 ? (
                      <text
                        x={x + w / 2}
                        y={y + ROW_H / 2}
                        fontSize={9}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill={INK}
                        pointerEvents="none"
                      >
                        {segment.lord === 'Ascendant' ? 'La' : segment.lord.slice(0, 2)}
                      </text>
                    ) : null}
                  </g>
                );
              })}
            </g>
          );
        })}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const at = range.fromJd + span * f;
          return (
            <text
              key={f}
              x={xOf(at)}
              y={height - 4}
              fontSize={9}
              fill={FAINT}
              textAnchor={f === 0 ? 'start' : f === 1 ? 'end' : 'middle'}
            >
              {isoDate(at)}
            </text>
          );
        })}
        {inWindow ? (
          <line
            x1={xOf(jd)}
            x2={xOf(jd)}
            y1={2}
            y2={height - 16}
            stroke={ACCENT}
            strokeWidth={2}
            data-cursor-jd={jd.toFixed(5)}
            pointerEvents="none"
          />
        ) : null}
      </svg>
      <figcaption style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
        <p id={`${uid}-now`} aria-live="polite" style={{ margin: 0, color: INK }}>
          {inWindow
            ? current
                .map(({ subject, segment }) =>
                  segment
                    ? `${subject}: ${SIGNS[segment.signIndex]} kakṣā ${segment.kakshaIndex + 1} (${segment.lord === 'Ascendant' ? 'Lagna' : segment.lord}), ${segment.hasBindu ? 'bindu' : 'no bindu'}`
                    : `${subject}: —`,
                )
                .join(' · ')
            : `The cursor is outside ${isoDate(range.fromJd)} – ${isoDate(range.toJd)}, the span computed here.`}
        </p>
        <p style={{ margin: '3px 0 0' }}>
          Each sign is eight kakṣās of 3°45′, lords Saturn, Jupiter, Mars, Sun, Venus, Mercury,
          Moon, Lagna. Green: the lord gave that sign a bindu in the graha&rsquo;s own
          bhinnāṣṭakavarga.
        </p>
      </figcaption>
      <VisuallyHidden>
        <table>
          <caption>Kakṣā transits</caption>
          <thead>
            <tr>
              <th scope="col">Graha</th>
              <th scope="col">From</th>
              <th scope="col">To</th>
              <th scope="col">Sign</th>
              <th scope="col">Kakṣā lord</th>
              <th scope="col">Bindu</th>
            </tr>
          </thead>
          <tbody>
            {rows.flatMap((row) =>
              row.segments.map((segment) => (
                <tr key={`${row.subject}-${segment.fromJd}`}>
                  <th scope="row">{row.subject}</th>
                  <td>{isoDate(segment.fromJd)}</td>
                  <td>{isoDate(segment.toJd)}</td>
                  <td>{SIGNS[segment.signIndex]}</td>
                  <td>{segment.lord}</td>
                  <td>{segment.hasBindu ? 'yes' : 'no'}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </VisuallyHidden>
    </figure>
  );
}

import { GLYPHS, SIGN_GLYPHS } from '../tokens.js';

const SIZE = 420;
const CENTRE = SIZE / 2;

/** Two rings, so the pair can be read at once without either being buried. */
const OUTER_RADIUS = 196;
const RING_SPLIT = 150;
const INNER_RADIUS = 104;

const RULE = 'var(--rule, #D8DEE3)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const INK = 'var(--ink, #1A2A36)';
const ACCENT = 'var(--accent, #33668F)';
const CLAY = 'var(--clay, #9E5B3A)';

export interface WheelPlacement {
  readonly id: string;
  readonly signIndex: number;
  /** 0–30 within the sign, so grahas in one sign do not stack on one point. */
  readonly degreesInSign: number;
}

/**
 * The synastry overlay wheel — both charts on one round, in two rings.
 *
 * Whole-sign, twelve equal segments, so a sign is a wedge rather than a
 * variable slice. The **first person's ascendant sign is put at the left**, the
 * traditional first house position, and the second person's grahas are drawn
 * into the same wedges. That is the point of the picture: it shows where one
 * chart's grahas fall in the *other's* houses, which is how Jyotiṣa reads a
 * pair, without needing two charts side by side and a finger on each.
 *
 * The rings are drawn in two different colours rather than two shades of one,
 * because a reader has to be able to say which is which at a glance, and the
 * one thing the picture must never do is let the two charts be confused.
 */
export function OverlayWheel({
  ascendantSign,
  a,
  b,
  labelA,
  labelB,
}: {
  /** The first person's ascendant sign. The wheel is oriented to it. */
  readonly ascendantSign: number;
  readonly a: readonly WheelPlacement[];
  readonly b: readonly WheelPlacement[];
  readonly labelA: string;
  readonly labelB: string;
}): React.ReactElement {
  // The ascendant sits at nine o'clock and the houses run **anticlockwise** from
  // it, which puts the fourth at the bottom and the tenth at the top. That is
  // the wheel convention, and getting it backwards produces a chart that looks
  // entirely plausible and is upside down.
  const angleFor = (signIndex: number, degreesInSign: number): number => {
    const house = (((signIndex - ascendantSign) % 12) + 12) % 12;
    return ((180 + house * 30 + degreesInSign) * Math.PI) / 180;
  };

  const at = (radius: number, angle: number): { x: number; y: number } => ({
    x: CENTRE + radius * Math.cos(angle),
    y: CENTRE - radius * Math.sin(angle),
  });

  const spokes = Array.from({ length: 12 }, (_, house) => {
    const angle = ((180 + house * 30) * Math.PI) / 180;
    return [at(INNER_RADIUS, angle), at(OUTER_RADIUS, angle)] as const;
  });

  const houseLabels = Array.from({ length: 12 }, (_, house) => {
    const angle = ((180 + house * 30 + 15) * Math.PI) / 180;
    const sign = (ascendantSign + house) % 12;
    return { house: house + 1, sign, ...at(INNER_RADIUS - 24, angle) };
  });

  /**
   * One ring of grahas.
   *
   * Grahas within a few degrees of each other are pushed apart radially rather
   * than left to overlap. A conjunction is exactly the configuration a reader
   * most wants to see, and it is the one where the glyphs collide — so the
   * picture has to handle it, not hope it does not happen.
   */
  const ring = (
    placements: readonly WheelPlacement[],
    radius: number,
    colour: string,
    band: number,
  ): React.ReactElement[] => {
    const ordered = [...placements].sort(
      (m, n) => m.signIndex * 30 + m.degreesInSign - (n.signIndex * 30 + n.degreesInSign),
    );
    const lanes: number[] = [];
    return ordered.map((p) => {
      const absolute = p.signIndex * 30 + p.degreesInSign;
      // Walk out a lane at a time until this glyph is clear of its neighbours.
      let lane = 0;
      while (lanes[lane] !== undefined && Math.abs(absolute - lanes[lane]!) < 7) lane += 1;
      lanes[lane] = absolute;
      // Lanes alternate inward and outward from the ring's centre line and are
      // clamped to the band, so a stack of five conjunct grahas spreads inside
      // its own ring instead of wandering into the house labels.
      const step = Math.ceil(lane / 2) * 14 * (lane % 2 === 1 ? 1 : -1);
      const limit = band / 2 - 8;
      const offset = Math.max(-limit, Math.min(limit, step));
      const angle = angleFor(p.signIndex, p.degreesInSign);
      const { x, y } = at(radius + offset, angle);
      return (
        <text
          key={`${colour}-${p.id}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={colour}
          style={{ fontSize: '15px' }}
        >
          {GLYPHS[p.id as keyof typeof GLYPHS] ?? p.id.slice(0, 2)}
        </text>
      );
    });
  };

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Synastry overlay: ${labelA} in the outer ring, ${labelB} in the inner ring, on ${labelA}'s houses.`}
        style={{ width: '100%', height: 'auto', maxWidth: `${SIZE}px` }}
      >
        <circle cx={CENTRE} cy={CENTRE} r={OUTER_RADIUS} fill="none" stroke={RULE} />
        <circle cx={CENTRE} cy={CENTRE} r={RING_SPLIT} fill="none" stroke={RULE} />
        <circle cx={CENTRE} cy={CENTRE} r={INNER_RADIUS} fill="none" stroke={RULE} />

        {spokes.map(([from, to], i) => (
          <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={RULE} />
        ))}

        {houseLabels.map((h) => (
          <g key={h.house}>
            <text
              x={h.x}
              y={h.y - 7}
              textAnchor="middle"
              dominantBaseline="central"
              fill={MUTED}
              style={{ fontSize: '10px', fontVariantNumeric: 'tabular-nums' }}
            >
              {h.house}
            </text>
            <text
              x={h.x}
              y={h.y + 7}
              textAnchor="middle"
              dominantBaseline="central"
              fill={MUTED}
              style={{ fontSize: '12px' }}
            >
              {SIGN_GLYPHS[h.sign]}
            </text>
          </g>
        ))}

        {ring(a, (OUTER_RADIUS + RING_SPLIT) / 2, ACCENT, OUTER_RADIUS - RING_SPLIT)}
        {ring(b, (RING_SPLIT + INNER_RADIUS) / 2, CLAY, RING_SPLIT - INNER_RADIUS)}

        <text
          x={CENTRE}
          y={CENTRE - 8}
          textAnchor="middle"
          fill={ACCENT}
          style={{ fontSize: '11px' }}
        >
          {labelA}
        </text>
        <text
          x={CENTRE}
          y={CENTRE + 10}
          textAnchor="middle"
          fill={CLAY}
          style={{ fontSize: '11px' }}
        >
          {labelB}
        </text>
        <text
          x={CENTRE}
          y={CENTRE + 28}
          textAnchor="middle"
          fill={MUTED}
          style={{ fontSize: '9px' }}
        >
          houses are {labelA}&rsquo;s
        </text>
      </svg>
      <figcaption style={{ marginTop: '8px', fontSize: '12px', color: INK }}>
        <span style={{ color: ACCENT }}>{labelA}</span> outside,{' '}
        <span style={{ color: CLAY }}>{labelB}</span> inside, both laid on {labelA}&rsquo;s houses.
        Swap the pair to read it the other way round.
      </figcaption>
    </figure>
  );
}

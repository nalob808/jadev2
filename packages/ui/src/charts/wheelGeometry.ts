/**
 * Geometry for the circular chart.
 *
 * Pure and separate from the component so it can be tested without a renderer.
 * The wheel's two historical failure modes are both geometric — houses running
 * the wrong way round, and conjunct glyphs drawn on top of each other — and
 * neither is catchable by a test that only renders markup.
 */

/**
 * Longitude to screen angle, measured counterclockwise from the ascendant.
 *
 * The ascendant sits at the left horizon and longitude increases
 * counterclockwise. This is the convention every wheel uses, and reversing it
 * produces a chart that looks entirely correct and reads inside out — the
 * exact bug that shipped once in this codebase's overlay wheel, found only by
 * looking at a picture.
 */
export function angleFor(longitude: number, ascendant: number): number {
  return (((longitude - ascendant) % 360) + 360) % 360;
}

/**
 * Screen coordinates for an angle measured from the ascendant.
 *
 * The `+` here is the whole ballgame, and it was a `-` for the first draft of
 * this file. With `180 - angle` the wheel runs *clockwise* on screen: the
 * ascendant still lands correctly at the left horizon, so the chart looks
 * entirely plausible, but the 4th house sits at the top and the 10th at the
 * bottom and every house is mirrored. That is precisely the bug that shipped
 * once in this codebase's overlay wheel and was caught only by a person
 * looking at a picture.
 *
 * With `180 + angle`: angle 0 → left horizon, 90 → bottom, 180 → right, 270 →
 * top. Counterclockwise, which is what every wheel in every tradition does.
 */
export function polar(cx: number, cy: number, radius: number, angleDeg: number): [number, number] {
  const radians = ((180 + angleDeg) * Math.PI) / 180;
  return [cx + radius * Math.cos(radians), cy - radius * Math.sin(radians)];
}

/** An arc along one radius, drawn counterclockwise from `from` to `to`. */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const large = (to - from + 360) % 360 > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 0 ${x2} ${y2}`;
}

/**
 * A filled band between two radii, spanning an angular sector.
 *
 * Written as an explicit four-command path rather than assembled from arcs,
 * because a sector built by string-splicing two `arcPath` results is
 * unreadable and silently wrong at the sweep flags.
 */
export function annulusSector(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  from: number,
  to: number,
): string {
  const large = (to - from + 360) % 360 > 180 ? 1 : 0;
  const [ox1, oy1] = polar(cx, cy, rOuter, from);
  const [ox2, oy2] = polar(cx, cy, rOuter, to);
  const [ix2, iy2] = polar(cx, cy, rInner, to);
  const [ix1, iy1] = polar(cx, cy, rInner, from);
  return [
    `M ${ox1} ${oy1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 0 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${rInner} ${rInner} 0 ${large} 1 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

/**
 * Push colliding glyphs apart.
 *
 * Walks the points in angular order and separates any pair closer than
 * `minGap`. Conjunctions are precisely the configurations a practitioner most
 * wants to inspect, so letting two grahas render as one smudge fails the
 * diagram's only job exactly where it matters most.
 *
 * Returns a new array in the caller's original order; the input is untouched.
 */
export function spread(angles: readonly number[], minGap: number): number[] {
  const out = [...angles];
  const order = angles.map((angle, index) => ({ angle, index })).sort((a, b) => a.angle - b.angle);

  for (let i = 1; i < order.length; i += 1) {
    const previousIndex = order[i - 1]!.index;
    const currentIndex = order[i]!.index;
    const previous = out[previousIndex]!;
    const current = out[currentIndex]!;
    if (current - previous < minGap) out[currentIndex] = previous + minGap;
  }
  return out;
}

/** "12°04′", the reading a practitioner expects rather than a decimal. */
export function degreesLabel(value: number): string {
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  // 29.999° must not render as 29°60′.
  const [d, m] = minutes === 60 ? [whole + 1, 0] : [whole, minutes];
  return `${d}°${String(m).padStart(2, '0')}′`;
}

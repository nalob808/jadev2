import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { GRAHA_DRISHTI, signsAspectedBy, type Graha } from '@jade/astro';
import { DRISHTI_TINT, Wheel, type WheelAspect, type WheelPoint } from '@jade/ui';

/**
 * Phase 16.2's acceptance, asserted in the DOM rather than by screenshot.
 *
 * The phase says so explicitly, and the reason is worth keeping: a screenshot
 * test of a chart fails on every legitimate palette change and passes on a
 * dṛṣṭi drawn in the wrong colour, because a human has to look at it either
 * way. The encoding is the thing being promised — a line's colour names its
 * source, its dash says whether the aspect is special — so the encoding is what
 * gets asserted.
 *
 * Rendered with `renderToStaticMarkup`, which needs no jsdom: the wheel is pure
 * SVG and its output is the whole contract.
 */

const ASCENDANT_SIGN = 0;

/** One graha per sign from Aries, so every line has somewhere distinct to go. */
const POINTS: readonly WheelPoint[] = (
  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const
).map((id, index) => ({
  id,
  longitude: index * 30 + 15,
  signIndex: index,
  degreesInSign: 15,
  house: index + 1,
  retrograde: false,
}));

const ASPECTS: readonly WheelAspect[] = POINTS.flatMap((point, index) =>
  signsAspectedBy(point.id as Graha, index, { includeNodes: true }),
);

function draw(focus?: string | null): string {
  return renderToStaticMarkup(
    <Wheel
      points={POINTS}
      aspects={ASPECTS}
      ascendant={ASCENDANT_SIGN * 30}
      ascendantSign={ASCENDANT_SIGN}
      focus={focus}
      onFocusChange={() => {}}
      /* The dṛṣṭi layer is off by default, so without this every assertion
         below runs against zero lines and passes having checked nothing.
         It did exactly that on the first run of this file. */
      initialLayers={{ aspects: true }}
    />,
  );
}

/** Every `<line>` carrying dṛṣṭi data, as a loose attribute bag. */
function drishtiLines(markup: string): Record<string, string>[] {
  return [...markup.matchAll(/<line\b[^>]*data-drishti-from[^>]*>/g)].map((match) => {
    const tag = match[0];
    const attributes: Record<string, string> = {};
    for (const attribute of tag.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]!] = attribute[2]!;
    }
    return attributes;
  });
}

describe('the dṛṣṭi encoding', () => {
  /**
   * The wheel hides the dṛṣṭi layer until it is switched on, and the toggle is
   * internal state. Rather than drive it, the tests below assert the encoding
   * on whatever lines are drawn — so this first one establishes that the
   * fixture actually produces some, and the rest are not vacuously passing.
   */
  const markup = draw();
  const lines = drishtiLines(markup);

  it('draws one line per aspect, so the rest of this file means something', () => {
    // Four grahas cast only the seventh; Mars, Jupiter, Saturn, Rāhu and Ketu
    // cast three each. The count is derived rather than written down, so adding
    // a dṛṣṭi to the table cannot leave this fixture quietly behind.
    const expected = Object.values(GRAHA_DRISHTI).reduce(
      (total, distances) => total + distances.length,
      0,
    );
    expect(ASPECTS).toHaveLength(expected);
    expect(lines).toHaveLength(expected);
  });

  it('gives every graha that can cast a dṛṣṭi its own colour', () => {
    for (const graha of Object.keys(GRAHA_DRISHTI)) {
      expect(DRISHTI_TINT[graha], graha).toBeDefined();
    }
    // Total *and* distinct: two grahas sharing a hue is the failure this is
    // guarding against, since it silently undoes the whole feature.
    const used = Object.keys(GRAHA_DRISHTI).map((graha) => DRISHTI_TINT[graha]);
    expect(new Set(used).size).toBe(used.length);
  });

  it('gives Mars and Jupiter different colours', () => {
    // The phase's own wording. Mars is malefic and Jupiter benefic, so the
    // nature tints alone would have satisfied this one — which is exactly why
    // the previous test, on all nine, is the one that matters.
    expect(DRISHTI_TINT.Mars).not.toBe(DRISHTI_TINT.Jupiter);
    expect(DRISHTI_TINT.Mars).not.toBe(DRISHTI_TINT.Saturn);
    expect(DRISHTI_TINT.Saturn).not.toBe(DRISHTI_TINT.Sun);
  });

  it('dashes the special dṛṣṭis and leaves the seventh solid', () => {
    for (const line of lines) {
      const distance = Number(line['data-drishti-distance']);
      const special = line['data-drishti-special'] === 'true';
      expect(special, `distance ${distance}`).toBe(distance !== 7);
      if (special) {
        expect(
          line['stroke-dasharray'],
          `${line['data-drishti-from']} to ${distance}`,
        ).toBeTruthy();
      } else {
        expect(line['stroke-dasharray'], `${line['data-drishti-from']} to ${distance}`).toBeFalsy();
      }
    }
  });

  it("draws Jupiter's 5th and 9th dashed and its 7th solid", () => {
    const jupiter = lines.filter((line) => line['data-drishti-from'] === 'Jupiter');
    expect(jupiter.map((line) => Number(line['data-drishti-distance'])).sort()).toEqual([5, 7, 9]);
    for (const line of jupiter) {
      const distance = Number(line['data-drishti-distance']);
      expect(Boolean(line['stroke-dasharray']), `Jupiter to the ${distance}`).toBe(distance !== 7);
    }
  });

  it('colours each line by the graha that cast it', () => {
    for (const line of lines) {
      const from = line['data-drishti-from']!;
      expect(line.stroke, from).toBe(DRISHTI_TINT[from]);
    }
  });

  it('desaturates the other lines on selection rather than deleting them', () => {
    const focused = drishtiLines(draw('Saturn'));
    // The context has to survive: Mars's lines are still drawn.
    expect(focused.some((line) => line['data-drishti-from'] !== 'Saturn')).toBe(true);
    const saturn = focused.filter((line) => line['data-drishti-from'] === 'Saturn');
    const others = focused.filter((line) => line['data-drishti-from'] !== 'Saturn');
    const faintest = Math.min(...saturn.map((line) => Number(line.opacity)));
    const boldest = Math.max(...others.map((line) => Number(line.opacity)));
    expect(boldest).toBeLessThan(faintest);
    // Dimmed, not hidden — an opacity of zero would be deletion by another name.
    expect(boldest).toBeGreaterThan(0);
  });
});

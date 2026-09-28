import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NakshatraRing, SarvaProfile, type NakshatraRingZoom } from '@jade/ui';

/**
 * The instrument charts that use trigonometry write no coordinate with more
 * than three decimals — the hydration rule `wheelPrecision.test.tsx` pins for
 * the wheel, applied to the nakṣatra ring and the sarva profile. (The daśā
 * timeline, kakṣā band and graphic ephemeris place everything by linear
 * arithmetic, which prints identically on every engine.)
 *
 * Rotations and longitudes are deliberately awkward, so the trig produces long
 * tails wherever rounding is missing.
 */

const NUMERIC_ATTRIBUTES = ['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'viewBox'];

function emittedCoordinates(markup: string): string[] {
  const out: string[] = [];
  for (const [, name, value] of markup.matchAll(/\s([a-zA-Z0-9-]+)="([^"]*)"/g)) {
    const source = NUMERIC_ATTRIBUTES.includes(name!)
      ? value!
      : name === 'transform'
        ? [...value!.matchAll(/translate\(([^)]*)\)/g)].map((m) => m[1]).join(' ')
        : '';
    out.push(...(source.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []));
  }
  return out;
}

const offenders = (numbers: string[]) =>
  numbers.filter((n) => /e/i.test(n) || (n.split('.')[1]?.length ?? 0) > 3);

const MARKS = (
  ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const
).map((id, i) => ({ id, longitude: (i * 41.37 + 7.123) % 360, retrograde: i % 3 === 0 }));

describe('instrument chart coordinate precision', () => {
  for (const zoom of [1, 4] as NakshatraRingZoom[]) {
    it(`nakṣatra ring at ${zoom}×`, () => {
      const numbers = emittedCoordinates(
        renderToStaticMarkup(
          <NakshatraRing
            natal={MARKS}
            transits={MARKS.map((m) => ({ ...m, longitude: (m.longitude + 97.31) % 360 }))}
            natalMoonLongitude={47.777}
            rotation={123.456}
            initialZoom={zoom}
            selection={{ kind: 'pada', nakshatra: 5, pada: 3 }}
            frameLabel="lahiri · mean nodes"
            ayanamsaValue={24.2}
          />,
        ),
      );
      expect(numbers.length).toBeGreaterThan(500);
      expect(offenders(numbers)).toEqual([]);
    });
  }

  it('sarva profile', () => {
    const numbers = emittedCoordinates(
      renderToStaticMarkup(
        <SarvaProfile
          sarva={[28, 31, 25, 30, 27, 29, 33, 24, 26, 30, 28, 26]}
          rotation={211.789}
          ascendantSign={7}
          selection={{ kind: 'sign', signIndex: 3 }}
        />,
      ),
    );
    expect(numbers.length).toBeGreaterThan(100);
    expect(offenders(numbers)).toEqual([]);
  });
});

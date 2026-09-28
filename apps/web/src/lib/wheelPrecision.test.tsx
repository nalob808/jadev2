import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Wheel, type WheelAspect, type WheelPoint } from '@jade/ui';

/**
 * Every coordinate the wheel writes into markup has at most three decimals.
 *
 * The wheel is server-rendered and hydrated, and Node's `Math.cos`/`Math.sin`
 * and the browser's disagree in the last digit — `8.34732007723425` on the
 * server, `8.347320077234258` in the client. Unrounded, that was a "Prop `d`
 * did not match" warning on every page that server-renders the wheel. The fix
 * is rounding at emission (`svgNum` / `svgPolar`); this pins it, so a new
 * layer that calls `polar` directly fails here rather than in a browser
 * console nobody is watching.
 *
 * Longitudes are deliberately awkward — nothing on a multiple of 30 — so the
 * trig produces long tails wherever rounding is missing.
 */

const IDS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'];

const point = (id: string, longitude: number, retrograde = false): WheelPoint => ({
  id,
  longitude,
  signIndex: Math.floor(longitude / 30),
  degreesInSign: longitude % 30,
  house: 1,
  retrograde,
});

const POINTS = IDS.map((id, i) => point(id, (i * 41.37 + 7.123) % 360, i % 3 === 0));
const TRANSITS = IDS.map((id, i) => point(id, (i * 37.91 + 3.777) % 360));
const ASPECTS: WheelAspect[] = IDS.map((from, i) => ({
  from,
  toSign: (i + 6) % 12,
  distance: 7,
  strength: 1,
}));
const SARVA = [28, 31, 25, 30, 27, 29, 33, 24, 26, 30, 28, 26];
const CUSPS = Array.from({ length: 12 }, (_, i) => (i * 30 + 17.456) % 360);

/** Attributes that carry coordinates or lengths. */
const NUMERIC_ATTRIBUTES = ['d', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r'];

/** Every number the markup writes into a coordinate-bearing attribute. */
function emittedCoordinates(markup: string): string[] {
  const out: string[] = [];
  for (const [, name, value] of markup.matchAll(/\s([a-zA-Z0-9-]+)="([^"]*)"/g)) {
    // In a transform only the translation is a coordinate; `scale` is a ratio
    // of two constants and is identical on every engine.
    const source = NUMERIC_ATTRIBUTES.includes(name!)
      ? value!
      : name === 'transform'
        ? [...value!.matchAll(/translate\(([^)]*)\)/g)].map((m) => m[1]).join(' ')
        : '';
    out.push(...(source.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []));
  }
  return out;
}

describe('wheel coordinate precision', () => {
  const markup = renderToStaticMarkup(
    <Wheel
      points={POINTS}
      ascendant={123.456}
      ascendantSign={4}
      aspects={ASPECTS}
      transits={TRANSITS}
      sarva={SARVA}
      bhavaCusps={CUSPS}
      initialLayers={{
        houses: true,
        signs: true,
        degrees: true,
        aspects: true,
        nakshatras: true,
        transits: true,
        elements: true,
        sarva: true,
        chalit: true,
      }}
    />,
  );
  const numbers = emittedCoordinates(markup);

  it('checks a real amount of geometry, so the assertion below is not vacuous', () => {
    // Every layer on: sign sectors, sarva sectors, chalit spokes, 27 nakṣatra
    // ticks, dṛṣṭi, both rings of glyphs. Several hundred numbers at least.
    expect(numbers.length).toBeGreaterThan(500);
  });

  it('writes no coordinate with more than three decimals', () => {
    const offenders = numbers.filter((n) => /e/i.test(n) || (n.split('.')[1]?.length ?? 0) > 3);
    expect(offenders).toEqual([]);
  });
});

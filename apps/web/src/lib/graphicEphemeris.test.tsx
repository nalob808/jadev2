import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AstronomyEngineProvider,
  foldLongitude,
  graphicEphemerisSeries,
  type GraphicEphemerisFold,
} from '@jade/astro';
import { GraphicEphemeris, foldedPath } from '@jade/ui';

/**
 * The graphic ephemeris drawing (brief §3), asserted in the DOM.
 *
 * The core's contacts are tested in packages/astro; this is about whether the
 * picture tells the truth about them — every crossing drawn on its natal line,
 * curves split at the dial's edge rather than slashed across it, and the
 * cursor where the instrument says.
 */

const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
const frame = {
  ayanamsa: 'lahiri' as const,
  nodeType: 'mean' as const,
  positionBasis: 'apparent' as const,
};
const WINDOW = { fromJd: 2_460_310.5, toJd: 2_460_857.5 };
const NATAL = [
  { id: 'Moon' as const, longitude: 45.25 },
  { id: 'Sun' as const, longitude: 322.7 },
  { id: 'Ascendant' as const, longitude: 187.9 },
];
const SERIES = graphicEphemerisSeries(provider, WINDOW, frame, {
  bodies: ['Sun', 'Mars', 'Jupiter', 'Saturn', 'Rahu'],
  natal: NATAL,
  stepDays: 1,
  toleranceDays: 1e-4,
});
const CURSOR = 2_460_500.5;

function draw(
  fold: GraphicEphemerisFold,
  selection: { kind: 'graha'; id: 'Saturn' } | null = null,
) {
  return renderToStaticMarkup(
    <GraphicEphemeris
      series={SERIES}
      fold={fold}
      contacts={SERIES.contacts[fold]!}
      jd={CURSOR}
      selection={selection}
      frameLabel="lahiri · mean nodes"
    />,
  );
}

function tagsWith(markup: string, marker: string): Record<string, string>[] {
  const pattern = new RegExp(`<[a-z]+\\b[^>]*\\b${marker}(="[^"]*")?[\\s>/][^>]*>?`, 'g');
  return [...markup.matchAll(pattern)].map((match) => {
    const attributes: Record<string, string> = {};
    for (const attribute of match[0].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]!] = attribute[2]!;
    }
    return attributes;
  });
}

describe('the graphic ephemeris drawing', () => {
  it('defaults nothing: it draws the dial it is given, with its modulus', () => {
    expect(draw('nakshatra')).toContain(`data-modulus="${360 / 27}"`);
    expect(draw('rashi')).toContain('data-modulus="30"');
  });

  it('draws one curve per body and one dashed line per natal point', () => {
    const markup = draw('nakshatra');
    expect(tagsWith(markup, 'data-track').map((t) => t['data-track'])).toEqual([
      'Sun',
      'Mars',
      'Jupiter',
      'Saturn',
      'Rahu',
    ]);
    const lines = tagsWith(markup, 'data-natal');
    expect(lines.map((l) => l['data-natal'])).toEqual(['Moon', 'Sun', 'Ascendant']);
    expect(lines.every((l) => l['stroke-dasharray'])).toBe(true);
    expect(tagsWith(markup, 'data-legend')).toHaveLength(3);
  });

  it('seats every crossing on its natal point’s line, on every dial', () => {
    for (const fold of ['longitude', 'rashi', 'nakshatra'] as const) {
      const markup = draw(fold);
      const lines = new Map(
        tagsWith(markup, 'data-natal').map((l) => [l['data-natal'], l['data-folded']]),
      );
      const contacts = tagsWith(markup, 'data-contact');
      expect(contacts.length, fold).toBe(SERIES.contacts[fold]!.length);
      expect(contacts.length, fold).toBeGreaterThan(0);
      for (const contact of contacts) {
        expect(contact['data-folded']).toBe(lines.get(contact['data-natal-point']));
      }
    }
  });

  it('names each crossing on hover: body, natal point, nakṣatra and date', () => {
    const markup = draw('nakshatra');
    const first = SERIES.contacts.nakshatra![0]!;
    const date = new Date((first.jdUt - 2440587.5) * 86400000).toISOString().slice(0, 10);
    expect(markup).toMatch(
      new RegExp(`<title>${first.transiting}[^<]*natal[^<]*in [^<]*· ${date}</title>`),
    );
  });

  it('puts the cursor on the instrument’s moment', () => {
    expect(draw('nakshatra')).toContain(`data-cursor-jd="${CURSOR.toFixed(5)}"`);
  });

  it('dims what the selection does not involve rather than deleting it', () => {
    const markup = draw('nakshatra', { kind: 'graha', id: 'Saturn' });
    const tracks = tagsWith(markup, 'data-track');
    expect(Number(tracks.find((t) => t['data-track'] === 'Saturn')!.opacity)).toBeGreaterThan(0.9);
    const others = tracks.filter((t) => t['data-track'] !== 'Saturn');
    expect(others.every((t) => Number(t.opacity) > 0 && Number(t.opacity) < 0.3)).toBe(true);
  });

  it('marks the retrograde stretch it will not smooth away', () => {
    const saturn = tagsWith(draw('longitude'), 'data-track').find(
      (t) => t['data-track'] === 'Saturn',
    )!;
    expect(Number(saturn['data-retrograde-samples'])).toBeGreaterThan(60);
  });

  it('mirrors the crossings in a hidden table', () => {
    const markup = draw('rashi');
    const table = markup.slice(markup.indexOf('<table'), markup.indexOf('</table>'));
    expect(table.match(/<th scope="row">/g)).toHaveLength(SERIES.contacts.rashi!.length);
  });
});

describe('folded curves', () => {
  const x = (jd: number) => jd - WINDOW.fromJd;
  const y = (folded: number) => folded;

  it('splits at every wrap instead of drawing a false diagonal across the dial', () => {
    const modulus = 360 / 27;
    const sun = SERIES.tracks.find((t) => t.body === 'Sun')!;
    const d = foldedPath(sun, modulus, x, y);
    const moves = d.match(/M/g)!.length;
    // The Sun moves ~1°/day: over ~547 days it crosses ~40 nakṣatra edges.
    const first = sun.samples[0]!.unwrappedLongitude;
    const last = sun.samples[sun.samples.length - 1]!.unwrappedLongitude;
    const wraps = Math.floor(last / modulus) - Math.floor(first / modulus);
    expect(moves).toBe(1 + wraps);
    // No drawn segment spans more than a day's motion vertically.
    const points = [...d.matchAll(/([ML]) ([\d.-]+) ([\d.-]+)/g)].map((m) => ({
      cmd: m[1]!,
      x: Number(m[2]),
      y: Number(m[3]),
    }));
    for (let i = 1; i < points.length; i += 1) {
      if (points[i]!.cmd === 'L')
        expect(Math.abs(points[i]!.y - points[i - 1]!.y)).toBeLessThan(1.1);
    }
    // And every point stays on the dial.
    expect(points.every((p) => p.y >= -1e-6 && p.y <= modulus + 1e-6)).toBe(true);
  });

  it('ends each piece on the edge it leaves by', () => {
    const modulus = 30;
    const mars = SERIES.tracks.find((t) => t.body === 'Mars')!;
    const d = foldedPath(mars, modulus, x, y);
    const pieces = d.split('M').slice(1, -1);
    for (const piece of pieces) {
      const lastY = Number(piece.trim().split(' ').at(-1));
      expect([0, modulus]).toContain(Math.round(lastY * 1e6) / 1e6);
    }
    expect(foldLongitude(mars.samples[0]!.longitude, 'rashi')).toBeLessThan(30);
  });
});

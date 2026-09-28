import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AstronomyEngineProvider,
  AV_CONTRIBUTORS,
  SARVA_TOTAL,
  ashtakavarga,
  kakshaTransit,
  kakshaTransitSeries,
  sarvaByContributor,
  siderealLongitudeAt,
  type SignPlacement,
} from '@jade/astro';
import { ContributorMultiples, KakshaBand, SARVA_MEAN, SarvaProfile } from '@jade/ui';

/**
 * Aṣṭakavarga as data graphics (brief §4), asserted in the DOM.
 *
 * Every number drawn comes from a real `ashtakavarga()` result, and the first
 * test in each block proves the layer under test is actually rendered.
 */

const PLACEMENT: SignPlacement = {
  Sun: 8,
  Moon: 3,
  Mars: 0,
  Mercury: 8,
  Jupiter: 2,
  Venus: 9,
  Saturn: 10,
  Ascendant: 5,
};
const RESULT = ashtakavarga(PLACEMENT);

function tagsWith(markup: string, marker: string): Record<string, string>[] {
  const pattern = new RegExp(`<[a-z]+\\b[^>]*\\b${marker}(="[^"]*")?[\\s>][^>]*>?`, 'g');
  return [...markup.matchAll(pattern)].map((match) => {
    const attributes: Record<string, string> = {};
    for (const attribute of match[0].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]!] = attribute[2]!;
    }
    return attributes;
  });
}

describe('the sarva radial profile', () => {
  const markup = renderToStaticMarkup(
    <SarvaProfile
      sarva={RESULT.sarva}
      ascendantSign={5}
      selection={{ kind: 'sign', signIndex: 4 }}
    />,
  );
  const wedges = tagsWith(markup, 'data-sav-sign');

  it('draws twelve wedges totalling 337', () => {
    expect(wedges).toHaveLength(12);
    expect(markup).toContain(`data-sarva-total="${SARVA_TOTAL}"`);
  });

  it('labels each wedge with its actual count', () => {
    wedges.forEach((wedge, sign) => {
      expect(Number(wedge['data-bindus'])).toBe(RESULT.sarva[sign]);
      expect(markup).toContain(`>${RESULT.sarva[sign]}</text>`);
    });
  });

  it('scales radius linearly with bindus, so the shape is honest', () => {
    const points = wedges.map((w) => [Number(w['data-bindus']), Number(w['data-radius'])] as const);
    const [a, b] = [points[0]!, points.find((p) => p[0] !== points[0]![0])!];
    const slope = (b[1] - a[1]) / (b[0] - a[0]);
    for (const [bindus, radius] of points) {
      expect(radius).toBeCloseTo(a[1] + (bindus - a[0]) * slope, 3);
    }
  });

  it('draws the 337 ÷ 12 mean ring and flags each sign against it', () => {
    expect(markup).toContain(`data-mean-ring="${SARVA_MEAN.toFixed(4)}"`);
    for (const wedge of wedges) {
      expect(wedge['data-above-mean']).toBe(
        String(Number(wedge['data-bindus']) > SARVA_TOTAL / 12),
      );
    }
  });

  it('lights the selected sign', () => {
    expect(wedges.filter((w) => w['data-selected']).map((w) => w['data-sav-sign'])).toEqual(['4']);
  });
});

describe('who supplies the bindus', () => {
  const bySource = sarvaByContributor(RESULT);
  const markup = renderToStaticMarkup(<ContributorMultiples bySource={bySource} />);
  const panels = tagsWith(markup, 'data-contributor');

  it('draws one small chart per contributor, eight in all', () => {
    expect(panels.map((p) => p['data-contributor'])).toEqual([...AV_CONTRIBUTORS]);
  });

  it('adds back up to the sarva, sign by sign', () => {
    const bars = tagsWith(markup, 'data-count');
    expect(bars).toHaveLength(8 * 12);
    for (let sign = 0; sign < 12; sign += 1) {
      const total = bars
        .filter((bar) => Number(bar['data-sign']) === sign)
        .reduce((sum, bar) => sum + Number(bar['data-count']), 0);
      expect(total, `sign ${sign}`).toBe(RESULT.sarva[sign]);
    }
  });

  it('shows each contributor’s own total', () => {
    for (const panel of panels) {
      const contributor = panel['data-contributor'] as (typeof AV_CONTRIBUTORS)[number];
      expect(Number(panel['data-total'])).toBe(bySource[contributor].reduce((a, b) => a + b, 0));
    }
  });
});

describe('the kakṣā band', () => {
  const provider = new AstronomyEngineProvider({ nodeType: 'mean' });
  const frame = { ayanamsa: 'lahiri' as const };
  const range = { fromJd: 2_460_310.5, toJd: 2_460_676.5 }; // 2024
  const rows = (['Saturn', 'Jupiter'] as const).map((subject) => ({
    subject,
    segments: kakshaTransitSeries(provider, subject, range, frame, RESULT),
  }));
  const cursor = 2_460_500.5;
  const markup = renderToStaticMarkup(<KakshaBand rows={rows} range={range} jd={cursor} />);
  const cells = tagsWith(markup, 'data-kaksha-segment');

  it('draws every computed segment for both grahas', () => {
    expect(cells).toHaveLength(rows[0]!.segments.length + rows[1]!.segments.length);
    expect(cells.length).toBeGreaterThan(4);
  });

  it('shades each cell by the bindu in the graha’s own BAV', () => {
    const drawn = cells.map((cell) => cell['data-bindu']);
    const computed = rows.flatMap((row) => row.segments.map((s) => String(s.hasBindu)));
    expect(drawn).toEqual(computed);
    // And the flag is the core's judgement at that moment in the sky.
    for (const row of rows) {
      for (const segment of row.segments) {
        const mid = (segment.fromJd + segment.toJd) / 2;
        const truth = kakshaTransit(
          row.subject,
          siderealLongitudeAt(provider, row.subject, mid, frame),
          RESULT,
        );
        expect(segment.hasBindu).toBe(truth.hasBindu);
      }
    }
  });

  it('uses both states, so the shading is not vacuous', () => {
    const states = new Set(cells.map((cell) => cell['data-bindu']));
    expect(states).toEqual(new Set(['true', 'false']));
  });

  it('puts the cursor on the instrument’s moment', () => {
    expect(markup).toContain(`data-cursor-jd="${cursor.toFixed(5)}"`);
  });

  it('says so when the cursor leaves the computed span, rather than drawing nothing', () => {
    const outside = renderToStaticMarkup(
      <KakshaBand rows={rows} range={range} jd={range.toJd + 400} />,
    );
    expect(outside).not.toContain('data-cursor-jd');
    expect(outside).toContain('outside');
  });
});

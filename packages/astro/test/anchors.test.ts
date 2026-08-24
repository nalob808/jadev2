import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ANCHOR_KINDS,
  anchorId,
  availableAnchors,
  describeAnchor,
  isAnchorKind,
  parseAnchorId,
  type Anchor,
} from '../src/notes/anchors.js';
import { computeChart } from '../src/chart.js';
import { AstronomyEngineProvider } from '../src/ephemeris/astronomyEngine.js';
import { vimshottari } from '../src/dashas/vimshottari.js';

interface GoldenCase {
  label: string;
  jdUt: number;
  location: { latitude: number; longitude: number };
}

const golden = JSON.parse(
  readFileSync(new URL('./fixtures/swisseph-golden.json', import.meta.url), 'utf8'),
) as { cases: GoldenCase[] };

const reference = golden.cases.find((c) => c.label === 'v0-reference-chart')!;
const provider = new AstronomyEngineProvider({ nodeType: 'mean' });

const place = reference.location;
const chart = computeChart(provider, { jdUt: reference.jdUt, location: place });

const dasha = vimshottari(chart.points.Moon!.longitude, reference.jdUt, { levels: 2 });
const anchors = availableAnchors(chart, dasha.periods);

function of(kind: string): Anchor[] {
  return anchors.filter((a) => a.kind === kind);
}

describe('anchor identity', () => {
  // This is the whole design. A chart id changes whenever the ayanamsa
  // changes, so a note pinned to one would be orphaned by a settings change.
  it('never contains a degree, a date, or a chart id', () => {
    for (const anchor of anchors) {
      expect(anchor.key).not.toMatch(/°|′/);
      expect(anchor.key).not.toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(anchor.key).not.toMatch(/^[0-9a-f]{32,}$/);
    }
  });

  it('is identical for the same chart computed twice', () => {
    const again = availableAnchors(
      computeChart(provider, { jdUt: reference.jdUt, location: place }),
      dasha.periods,
    );
    expect(again.map((a) => anchorId(a.kind, a.key))).toEqual(
      anchors.map((a) => anchorId(a.kind, a.key)),
    );
  });

  // Mars the graha and Mars the dasha lord are different things to write
  // about, so the kind has to be part of the id.
  it('separates the same key under different kinds', () => {
    expect(anchorId('graha', 'Mars')).not.toBe(anchorId('dasha', 'Mars'));
  });

  it('round-trips through parseAnchorId', () => {
    for (const anchor of anchors) {
      const id = anchorId(anchor.kind, anchor.key);
      const parsed = parseAnchorId(id);
      expect(parsed, id).not.toBeNull();
      expect(parsed!.kind).toBe(anchor.kind);
      if (anchor.kind !== 'chart') expect(parsed!.key).toBe(anchor.key);
    }
  });

  it('refuses nonsense rather than throwing', () => {
    expect(parseAnchorId('')).toBeNull();
    expect(parseAnchorId('nope:Mars')).toBeNull();
    expect(parseAnchorId('graha:')).toBeNull();
    expect(parseAnchorId(':Mars')).toBeNull();
  });

  it('ids are unique within one chart', () => {
    const ids = anchors.map((a) => anchorId(a.kind, a.key));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('what is offered', () => {
  it('offers the whole chart first, so a plain note is the easy path', () => {
    expect(anchors[0]!.kind).toBe('chart');
  });

  it('offers every graha in the chart', () => {
    const keys = of('graha').map((a) => a.key);
    for (const graha of ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']) {
      expect(keys).toContain(graha);
    }
    // The nodes are the thing the v0 prototype left out entirely.
    expect(keys).toContain('Rahu');
    expect(keys).toContain('Ketu');
  });

  it('offers twelve houses and twelve signs', () => {
    expect(of('house')).toHaveLength(12);
    expect(of('sign')).toHaveLength(12);
    expect(of('house').map((a) => a.key)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
      '12',
    ]);
  });

  it('offers all sixteen vargas', () => {
    expect(of('varga')).toHaveLength(16);
    expect(of('varga').map((a) => a.key)).toContain('D9');
  });

  // Twenty-seven nakshatras would bury the handful this chart actually uses.
  it('offers only the nakṣatras something occupies', () => {
    const offered = of('nakshatra').map((a) => a.key);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.length).toBeLessThan(27);
    const occupied = new Set(Object.values(chart.points).map((p) => p.nakshatra.name));
    expect(new Set(offered)).toEqual(occupied);
  });

  it('offers every yoga the chart actually has', () => {
    expect(
      of('yoga')
        .map((a) => a.key)
        .sort(),
    ).toEqual(chart.yogas.map((y) => y.id).sort());
  });

  it('offers daśā periods when a daśā is supplied, and none when it is not', () => {
    expect(of('dasha').length).toBeGreaterThan(0);
    expect(availableAnchors(chart).filter((a) => a.kind === 'dasha')).toEqual([]);
  });

  it('lists a mahādaśā immediately above its own antardaśās', () => {
    const keys = of('dasha').map((a) => a.key);
    const maha = keys.find((k) => !k.includes('/'))!;
    const firstChild = keys.indexOf(
      `${maha}/`.length ? keys.find((k) => k.startsWith(`${maha}/`))! : maha,
    );
    expect(firstChild).toBe(keys.indexOf(maha) + 1);
  });
});

describe('labels and detail', () => {
  it('every anchor has a non-empty label', () => {
    for (const anchor of anchors) {
      expect(anchor.label.trim(), anchorId(anchor.kind, anchor.key)).not.toBe('');
      expect(anchor.label).not.toContain('undefined');
      expect(anchor.label).not.toContain('NaN');
    }
  });

  it('detail never leaks into identity', () => {
    // Two charts of different people share anchor ids but not details.
    const other = computeChart(provider, {
      jdUt: reference.jdUt + 4000,
      location: { latitude: 19.076, longitude: 72.8777 },
    });
    const mine = anchors.find((a) => a.kind === 'graha' && a.key === 'Mars')!;
    const theirs = availableAnchors(other).find((a) => a.kind === 'graha' && a.key === 'Mars')!;
    expect(anchorId(mine.kind, mine.key)).toBe(anchorId(theirs.kind, theirs.key));
    expect(mine.detail).not.toBe(theirs.detail);
  });

  it('renders degrees as degrees and minutes, never a decimal', () => {
    const mars = anchors.find((a) => a.kind === 'graha' && a.key === 'Mars')!;
    expect(mars.detail).toMatch(/^\d{1,2}°\d{2}′ /);
  });

  // 59.99° must not render as 59°60′.
  it('carries minutes correctly at the top of a degree', () => {
    const nearly = computeChart(provider, { jdUt: reference.jdUt, location: place });
    for (const anchor of availableAnchors(nearly).filter((a) => a.kind === 'graha')) {
      expect(anchor.detail).not.toContain('′60');
      expect(anchor.detail).not.toContain('°60′');
    }
  });

  it('says which house is empty rather than leaving it blank', () => {
    const details = of('house').map((a) => a.detail ?? '');
    expect(details.every((d) => d.length > 0)).toBe(true);
    expect(details.some((d) => d.includes('empty'))).toBe(true);
  });
});

describe('describeAnchor, for rows with no chart to hand', () => {
  it('describes every kind without falling through', () => {
    const samples: Array<[string, string]> = [
      ['chart', ''],
      ['graha', 'Mars'],
      ['house', '7'],
      ['sign', 'Scorpio'],
      ['nakshatra', 'Pushya'],
      ['yoga', 'gajakesari'],
      ['dasha', 'Venus/Saturn'],
      ['varga', 'D9'],
    ];
    for (const [kind, key] of samples) {
      const text = describeAnchor(kind as (typeof ANCHOR_KINDS)[number], key);
      expect(text.trim()).not.toBe('');
      expect(text).not.toContain('undefined');
    }
  });

  it('turns a daśā chain into something readable', () => {
    expect(describeAnchor('dasha', 'Venus/Saturn')).toBe('Venus → Saturn daśā');
  });

  it('survives a house number that should not exist', () => {
    expect(describeAnchor('house', '19')).toBe('House 19');
  });
});

describe('isAnchorKind', () => {
  it('accepts every kind and nothing else', () => {
    for (const kind of ANCHOR_KINDS) expect(isAnchorKind(kind)).toBe(true);
    expect(isAnchorKind('transit')).toBe(false);
    expect(isAnchorKind('')).toBe(false);
  });
});

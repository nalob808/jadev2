import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AstronomyEngineProvider,
  GANA_OF_NAKSHATRA,
  NADI_OF_NAKSHATRA,
  TARAS,
  VIMSHOTTARI_LORDS,
  YONI_OF_NAKSHATRA,
  nakshatraOf,
  skyNow,
  type PointId,
} from '@jade/astro';
import {
  NakshatraDetail,
  NakshatraRing,
  stepRingSelection,
  type InstrumentMark,
  type InstrumentSelection,
  type NakshatraRingZoom,
} from '@jade/ui';

/**
 * The nakṣatra ring's encoding, asserted in the DOM (brief §2 and §6).
 *
 * The same discipline as `drishtiEncoding.test.tsx`, including its lesson: the
 * first assertion in each block establishes that the thing being checked is
 * actually drawn, so nothing below passes by examining an empty layer.
 */

/** Every opening tag that carries `marker`, as an attribute bag. */
function tagsWith(markup: string, marker: string): Record<string, string>[] {
  const pattern = new RegExp(`<[a-z]+\\b[^>]*\\b${marker}="[^"]*"[^>]*>`, 'g');
  return [...markup.matchAll(pattern)].map((match) => {
    const attributes: Record<string, string> = {};
    for (const attribute of match[0].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]!] = attribute[2]!;
    }
    return attributes;
  });
}

// A real sky rather than invented numbers, so the nodes' opposition and the
// retrograde flags come from the engine that feeds the page.
const JD = 2_460_676.5; // 2025-01-01 00:00 UT
const BODIES: PointId[] = [
  'Sun',
  'Moon',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];
const SKY: InstrumentMark[] = skyNow(
  new AstronomyEngineProvider({ nodeType: 'mean' }),
  JD,
  { ayanamsa: 'lahiri' },
  BODIES,
  'mean',
).map((p) => ({ id: p.id, longitude: p.longitude, retrograde: p.retrograde }));

/** A natal Moon in Rohiṇī, 45° — the fourth nakṣatra. */
const NATAL_MOON = 45;
const NATAL: InstrumentMark[] = [
  { id: 'Moon', longitude: NATAL_MOON },
  { id: 'Sun', longitude: 100.5 },
  { id: 'Saturn', longitude: 300.2, retrograde: true },
];
const AYANAMSA_VALUE = 24.2067;

function draw(
  options: { selection?: InstrumentSelection | null; zoom?: NakshatraRingZoom } = {},
): string {
  return renderToStaticMarkup(
    <NakshatraRing
      natal={NATAL}
      transits={SKY}
      natalMoonLongitude={NATAL_MOON}
      selection={options.selection ?? null}
      initialZoom={options.zoom ?? 1}
      onSelect={() => {}}
      frameLabel="Lahiri · mean nodes"
      ayanamsaValue={AYANAMSA_VALUE}
    />,
  );
}

const cells = (markup: string) => tagsWith(markup, 'data-lord');
const padas = (markup: string) =>
  tagsWith(markup, 'data-navamsha').filter((tag) => tag['data-pada'] !== undefined);

describe('the nakṣatra ring boundaries', () => {
  const markup = draw();

  it('draws 27 nakṣatras and 108 padas', () => {
    expect(cells(markup)).toHaveLength(27);
    expect(padas(markup)).toHaveLength(108);
  });

  it('puts every nakṣatra edge on an exact multiple of 13°20′', () => {
    cells(markup).forEach((cell, index) => {
      expect(Number(cell['data-start-arcmin'])).toBe(index * 800);
      expect(Number(cell['data-end-arcmin'])).toBe((index + 1) * 800);
    });
  });

  it('puts every pada edge on an exact multiple of 3°20′', () => {
    padas(markup).forEach((pada, index) => {
      expect(Number(pada['data-start-arcmin'])).toBe(index * 200);
      expect(Number(pada['data-end-arcmin'])).toBe((index + 1) * 200);
      expect(Number(pada['data-pada'])).toBe((index % 4) + 1);
    });
  });

  it('gets Rohiṇī exactly right: 10°00′ to 23°20′ Taurus, padas at 3°20′', () => {
    const rohini = cells(markup)[3]!;
    expect(rohini['data-name']).toBe('Rohini');
    expect(Number(rohini['data-start-arcmin'])).toBe(40 * 60);
    expect(Number(rohini['data-end-arcmin'])).toBe(53 * 60 + 20);
    const starts = padas(markup)
      .slice(12, 16)
      .map((pada) => Number(pada['data-start-arcmin']) / 60);
    expect(starts).toEqual([40, 40 + 10 / 3, 40 + 20 / 3, 50]);
  });

  it('agrees with the core’s nakshatraOf on both sides of every pada edge', () => {
    for (const pada of padas(markup)) {
      const start = Number(pada['data-start-arcmin']) / 60;
      const inside = nakshatraOf(start + 1e-7);
      expect(inside.index * 4 + inside.pada - 1).toBe(Number(pada['data-start-arcmin']) / 200);
      if (start > 0) {
        const before = nakshatraOf(start - 1e-7);
        expect(before.index * 4 + before.pada - 1).toBe(
          Number(pada['data-start-arcmin']) / 200 - 1,
        );
      }
    }
  });

  it('names each nakṣatra’s ruling graha in Vimśottarī order', () => {
    cells(markup).forEach((cell, index) => {
      expect(cell['data-lord']).toBe(VIMSHOTTARI_LORDS[index % 9]);
    });
    expect(tagsWith(markup, 'data-lord-glyph')).toHaveLength(27);
  });

  it('maps each pada to its navāṁśa, 108 onto 12 nine times', () => {
    padas(markup).forEach((pada, index) => {
      expect(Number(pada['data-navamsha'])).toBe(index % 12);
    });
  });
});

describe('the nakṣatra ring labels', () => {
  it('fits every label inside its own arc at every zoom', () => {
    for (const zoom of [1, 2, 4] as const) {
      const labelled = cells(draw({ zoom }));
      expect(labelled).toHaveLength(27);
      for (const cell of labelled) {
        expect(
          Number(cell['data-label-width']),
          `${cell['data-name']} at ${zoom}×`,
        ).toBeLessThanOrEqual(Number(cell['data-label-room']));
      }
    }
  });

  it('shows all 27 names in full once zoomed in', () => {
    for (const cell of cells(draw({ zoom: 4 }))) {
      expect(cell['data-label-level'], cell['data-name']).toBe('full');
    }
  });

  it('writes the names in IAST, not ASCII', () => {
    const markup = draw({ zoom: 4 });
    for (const name of ['Aśvinī', 'Kṛttikā', 'Rohiṇī', 'Jyeṣṭhā', 'Śatabhiṣā']) {
      expect(markup).toContain(`>${name}<`);
    }
  });

  it('hides pada numbers at the default zoom', () => {
    expect(tagsWith(draw(), 'data-pada-number')).toHaveLength(0);
  });

  it('reveals pada numbers for the selected arc only', () => {
    const shown = tagsWith(
      draw({ selection: { kind: 'nakshatra', index: 3 } }),
      'data-pada-number',
    );
    expect(shown.map((tag) => tag['data-pada-number'])).toEqual(['1', '2', '3', '4']);
  });

  it('reveals every pada number on zoom, and navāṁśas at the closest zoom', () => {
    expect(tagsWith(draw({ zoom: 2 }), 'data-pada-number')).toHaveLength(108);
    expect(tagsWith(draw({ zoom: 2 }), 'data-navamsha-label')).toHaveLength(0);
    expect(tagsWith(draw({ zoom: 4 }), 'data-navamsha-label')).toHaveLength(108);
  });
});

describe('tārā shading', () => {
  const shaded = cells(draw());

  it('counts from the natal Moon’s nakṣatra, janma first', () => {
    // Rohiṇī is the fourth nakṣatra, so it is janma, and the count wraps.
    expect(shaded[3]!['data-tara']).toBe('1');
    expect(shaded[4]!['data-tara']).toBe('2');
    expect(shaded[2]!['data-tara']).toBe('9');
  });

  it('repeats the nine tārās three times across the 27', () => {
    const janma = shaded
      .filter((cell) => cell['data-tara'] === '1')
      .map((cell) => cell['data-nakshatra']);
    expect(janma).toEqual(['3', '12', '21']);
  });

  it('shades each cell with its tārā’s classical band', () => {
    for (const cell of shaded) {
      const tara = TARAS[Number(cell['data-tara']) - 1]!;
      expect(cell['data-tara-band']).toBe(tara.band);
    }
  });

  it('leaves the band plain without a natal Moon', () => {
    const plain = renderToStaticMarkup(
      <NakshatraRing natal={[]} frameLabel="Lahiri · mean nodes" ayanamsaValue={AYANAMSA_VALUE} />,
    );
    expect(cells(plain).every((cell) => cell['data-tara'] === undefined)).toBe(true);
  });
});

describe('the plotted positions', () => {
  const markup = draw();
  const natal = tagsWith(markup, 'data-mark').filter((tag) => tag['data-mark'] === 'natal');
  const transit = tagsWith(markup, 'data-mark').filter((tag) => tag['data-mark'] === 'transit');

  it('plots every natal and transiting body', () => {
    expect(natal.map((tag) => tag['data-point'])).toEqual(['Moon', 'Sun', 'Saturn']);
    expect(transit.map((tag) => tag['data-point'])).toEqual(BODIES);
  });

  it('places each mark in the nakṣatra and pada the core computes', () => {
    for (const tag of [...natal, ...transit]) {
      const expected = nakshatraOf(Number(tag['data-longitude']));
      expect(Number(tag['data-nakshatra'])).toBe(expected.index);
      expect(Number(tag['data-pada'])).toBe(expected.pada);
    }
  });

  it('draws Rāhu and Ketu exactly opposite', () => {
    const rahu = Number(transit.find((tag) => tag['data-point'] === 'Rahu')!['data-longitude']);
    const ketu = Number(transit.find((tag) => tag['data-point'] === 'Ketu')!['data-longitude']);
    const separation = (((rahu - ketu) % 360) + 360) % 360;
    expect(separation).toBeCloseTo(180, 3);
  });

  it('marks retrograde bodies', () => {
    expect(natal.find((tag) => tag['data-point'] === 'Saturn')!['data-retrograde']).toBe('true');
    // The mean nodes are always retrograde; the engine says so and so must the ring.
    expect(transit.find((tag) => tag['data-point'] === 'Rahu')!['data-retrograde']).toBe('true');
  });
});

describe('selection', () => {
  it('marks the selected nakṣatra and pada', () => {
    const markup = draw({ selection: { kind: 'pada', nakshatra: 3, pada: 2 } });
    const selected = tagsWith(markup, 'data-selected');
    expect(selected.map((tag) => [tag['data-nakshatra'] ?? 'pada', tag['data-pada']])).toEqual([
      ['3', undefined],
      ['pada', '2'],
    ]);
  });

  it('lights the three nakṣatras a selected daśā lord rules', () => {
    const lit = cells(draw({ selection: { kind: 'period', lords: ['Mercury', 'Saturn'] } }))
      .filter((cell) => cell['data-lit'])
      .map((cell) => cell['data-name']);
    expect(lit).toEqual(['Pushya', 'Anuradha', 'Uttara Bhadrapada']);
  });

  it('carries a parallel table of all 27 for screen readers', () => {
    const markup = draw();
    const table = markup.slice(markup.indexOf('<table'), markup.indexOf('</table>'));
    expect(table.match(/<th scope="row">/g)).toHaveLength(27);
  });

  it('provides visible controls for stepping both directions at both levels', () => {
    const markup = draw();
    for (const label of ['← Previous', 'Next →', '← Previous pāda', 'Next pāda →']) {
      expect(markup).toContain(`>${label}</button>`);
    }
  });

  it('wraps nakṣatra navigation in both directions', () => {
    expect(stepRingSelection(0, null, 0, -1, false)).toEqual({ nakshatra: 26, pada: null });
    expect(stepRingSelection(26, null, 0, 1, false)).toEqual({ nakshatra: 0, pada: null });
  });

  it('enters a selected nakṣatra from the correct pāda and wraps all 108', () => {
    expect(stepRingSelection(3, null, 0, -1, true)).toEqual({ nakshatra: 3, pada: 4 });
    expect(stepRingSelection(3, null, 0, 1, true)).toEqual({ nakshatra: 3, pada: 1 });
    expect(stepRingSelection(0, 1, 0, -1, true)).toEqual({ nakshatra: 26, pada: 4 });
    expect(stepRingSelection(26, 4, 0, 1, true)).toEqual({ nakshatra: 0, pada: 1 });
  });
});

describe('the stated frame', () => {
  it('shows the named sidereal frame, numeric ayanāṁśa and latitude treatment', () => {
    const markup = draw();
    const frame = tagsWith(markup, 'data-coordinate-frame');
    expect(frame).toHaveLength(1);
    expect(frame[0]).toMatchObject({
      'data-coordinate-frame': 'sidereal-ecliptic',
      'data-frame-label': 'Lahiri · mean nodes',
      'data-ayanamsa-degrees': AYANAMSA_VALUE.toFixed(6),
    });
    expect(markup).toContain(`ayanāṁśa ${AYANAMSA_VALUE.toFixed(4)}°`);
    expect(markup).toContain('ecliptic longitude; celestial latitude is not plotted');
  });

  it('refuses to render an unnamed or non-finite frame', () => {
    expect(() =>
      renderToStaticMarkup(<NakshatraRing natal={[]} frameLabel=" " ayanamsaValue={24} />),
    ).toThrow(/named sidereal frame/);
    expect(() =>
      renderToStaticMarkup(<NakshatraRing natal={[]} frameLabel="Lahiri" ayanamsaValue={NaN} />),
    ).toThrow(/finite ayanāṁśa/);
  });
});

describe('the detail panel', () => {
  it('shows gaṇa, yoni and nāḍī from the kūṭa tables', () => {
    for (const index of [0, 3, 17, 26]) {
      const markup = renderToStaticMarkup(
        <NakshatraDetail index={index} natalMoonLongitude={45} />,
      );
      const gana = GANA_OF_NAKSHATRA[index]!;
      const yoni = YONI_OF_NAKSHATRA[index]!;
      const nadi = NADI_OF_NAKSHATRA[index]!;
      expect(markup.toLowerCase()).toContain(yoni);
      expect(markup).toMatch(/data-attribute="Gaṇa"[^>]*>[^<]+/);
      expect(markup.toLowerCase()).toContain(
        { deva: 'deva', manushya: 'manuṣya', rakshasa: 'rākṣasa' }[gana],
      );
      expect(markup.toLowerCase()).toContain(
        { adi: 'ādi', madhya: 'madhya', antya: 'antya' }[nadi],
      );
    }
  });
});

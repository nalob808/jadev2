import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NAKSHATRA_IAST as CORE_NAKSHATRAS, nakshatraOf } from '@jade/astro';
import {
  SphereFallback,
  SphereFrameCaption,
  SpherePositionsTable,
  SphereStage,
  latitudeLabel,
} from '@/components/SphereLens';
import {
  NAKSHATRA_IAST,
  labelOpacity,
  motionPolicy,
  orbitPosition,
  poleOffset,
  poleScreenLongitudes,
  sphereBodies,
  sphereKeyAction,
  zoomPosition,
} from './sky3d';
import { detectWebgl, prepareSphereCanvas } from './sphereSupport';
import { transitRing, type RingFrame } from './transitRing';

/**
 * The Sphere lens acceptance (docs/briefs/17-sphere-to-production.md).
 *
 * The scene itself needs WebGL and cannot run here. Everything the brief asks
 * to be proven is therefore held in functions and components that do not:
 * the table and the render share one `sphereBodies()` array, the camera's
 * keyboard and motion policy are pure, and the fallback is ordinary markup.
 */

const LAHIRI: RingFrame = { ayanamsa: 'lahiri', nodeType: 'mean' };
const JD = 2_461_311.5; // 2026-09-28 UT

function rows(markup: string): Record<string, string>[] {
  return [...markup.matchAll(/<tr\b[^>]*data-body="[^"]*"[^>]*>/g)].map((match) => {
    const attributes: Record<string, string> = {};
    for (const attribute of match[0].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]!] = attribute[2]!;
    }
    return attributes;
  });
}

describe('gate 1 — the positions table is the sphere in text', () => {
  const bodies = sphereBodies(JD, LAHIRI);
  const markup = renderToStaticMarkup(<SpherePositionsTable bodies={bodies} />);
  const table = rows(markup);

  it('has a row for each of the nine bodies the sphere places', () => {
    expect(table.map((row) => row['data-body'])).toEqual(bodies.map((body) => body.id));
    expect(table).toHaveLength(9);
  });

  it("carries sphereBodies()' numbers, field by field", () => {
    table.forEach((row, index) => {
      const body = bodies[index]!;
      expect(Number(row['data-longitude'])).toBe(body.longitude);
      expect(Number(row['data-latitude'])).toBe(body.latitude);
      expect(row['data-retrograde']).toBe(String(body.retrograde));
      expect(row['data-nakshatra']).toBe(body.nakshatra);
      expect(Number(row['data-pada'])).toBe(nakshatraOf(body.longitude).pada);
    });
  });

  it('shows latitude, the number the wheel has nowhere to put', () => {
    expect(markup).toContain('Latitude');
    const tilted = bodies.find((body) => Math.abs(body.latitude) > 0.5)!;
    expect(markup).toContain(latitudeLabel(tilted.latitude));
    expect(latitudeLabel(4.034)).toBe('4°02′ N');
    expect(latitudeLabel(-6.5)).toBe('6°30′ S');
  });

  it('keeps Rāhu and Ketu exactly opposite on both node types', () => {
    for (const nodeType of ['mean', 'true'] as const) {
      const pair = sphereBodies(JD, { ayanamsa: 'lahiri', nodeType });
      const rahu = pair.find((body) => body.id === 'Rahu')!;
      const ketu = pair.find((body) => body.id === 'Ketu')!;
      expect((((rahu.longitude - ketu.longitude) % 360) + 360) % 360).toBeCloseTo(180, 9);
    }
  });
});

describe('gate 2 — keyboard', () => {
  it('makes the canvas focusable, named, and touch-captured on its own', () => {
    const attributes: Record<string, string> = {};
    const canvas = {
      tabIndex: -1,
      className: '',
      style: { touchAction: 'auto' },
      setAttribute: (name: string, value: string) => {
        attributes[name] = value;
      },
    };
    prepareSphereCanvas(canvas, 'The sky');
    expect(canvas.tabIndex).toBe(0);
    expect(canvas.className).toBe('jade-sphere-canvas');
    expect(canvas.style.touchAction).toBe('none');
    expect(attributes['aria-label']).toBe('The sky');
  });

  it('moves the camera on an arrow key, keeping its distance', () => {
    const start: [number, number, number] = [0, 5, 20];
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const action = sphereKeyAction(key);
      expect(action?.kind, key).toBe('orbit');
      if (action?.kind !== 'orbit') continue;
      const next = orbitPosition(start, action.azimuth, action.polar);
      expect(next, key).not.toEqual(start);
      expect(Math.hypot(...next)).toBeCloseTo(Math.hypot(...start), 9);
    }
  });

  it('zooms within the limits, calls the views, and lets Escape leave', () => {
    const inward = sphereKeyAction('+');
    expect(inward?.kind).toBe('zoom');
    if (inward?.kind === 'zoom') {
      expect(Math.hypot(...zoomPosition([0, 0, 10], inward.factor, 0.05, 60))).toBeCloseTo(8, 9);
      expect(Math.hypot(...zoomPosition([0, 0, 0.06], inward.factor, 0.05, 60))).toBe(0.05);
    }
    expect(['1', '2', '3', '4'].map((key) => sphereKeyAction(key))).toEqual([
      { kind: 'view', view: 'centre' },
      { kind: 'view', view: 'outside' },
      { kind: 'view', view: 'pole' },
      { kind: 'view', view: 'lagna' },
    ]);
    expect(sphereKeyAction('Escape')).toEqual({ kind: 'leave' });
    // Time keys are the page's, not the canvas's.
    expect(sphereKeyAction('[')).toBeNull();
  });
});

describe('gate 3 — prefers-reduced-motion', () => {
  it('turns damping off and makes views jump, with no transition', () => {
    expect(motionPolicy(true)).toEqual({ damping: false, flightMs: 0 });
    expect(motionPolicy(false)).toEqual({ damping: true, flightMs: 900 });
  });
});

describe('gate 4 — without WebGL', () => {
  it('detects no WebGL, whether the context is null or getContext throws', () => {
    expect(detectWebgl(() => ({ getContext: () => null }))).toBe(false);
    expect(
      detectWebgl(() => ({
        getContext: () => {
          throw new Error('blocked');
        },
      })),
    ).toBe(false);
    expect(detectWebgl(() => null)).toBe(false);
    expect(detectWebgl(() => ({ getContext: (kind) => (kind === 'webgl' ? {} : null) }))).toBe(
      true,
    );
  });

  it('renders the wheel and the positions table, and does not throw', () => {
    const bodies = sphereBodies(JD, LAHIRI);
    const natal = {
      points: transitRing(2_452_221.147, LAHIRI, 0),
      ascendant: 170,
      ascendantSign: 5,
    };
    const markup = renderToStaticMarkup(
      <SphereStage
        stage="no-webgl"
        scene={<p>the scene</p>}
        fallback={(reason) => (
          <SphereFallback
            natal={natal}
            transits={transitRing(JD, LAHIRI, 5)}
            bodies={bodies}
            reason={reason}
          />
        )}
      />,
    );
    expect(markup).not.toContain('the scene');
    expect(markup).toContain('data-sphere-fallback="no-webgl"');
    expect(markup).toContain('needs WebGL');
    expect(markup).toMatch(/<svg\b/); // the wheel
    expect(rows(markup)).toHaveLength(9); // the table
  });
});

describe('the lens it is cast in', () => {
  it('states the ayanāṁśa and node type actually used', () => {
    for (const frame of [
      { ayanamsa: 'lahiri', nodeType: 'mean' },
      // Fagan–Bradley's J2000 value as a custom offset: the core has fitted
      // Lahiri and custom only, and refuses the unfitted modes outright.
      { ayanamsa: 'custom', customAyanamsaAtJ2000: 24.736, nodeType: 'true' },
    ] as RingFrame[]) {
      const markup = renderToStaticMarkup(<SphereFrameCaption frame={frame} jd={JD} />);
      expect(markup).toContain(`data-ayanamsa="${frame.ayanamsa}"`);
      expect(markup).toContain(`${frame.ayanamsa} ayanāṁśa`);
      expect(markup).toContain(`${frame.nodeType} nodes`);
      expect(markup).toContain('precision class interactive');
    }
  });

  it('prints a custom offset, so "custom" alone never stands for a zodiac', () => {
    const markup = renderToStaticMarkup(
      <SphereFrameCaption
        frame={{ ayanamsa: 'custom', customAyanamsaAtJ2000: 24.736, nodeType: 'mean' }}
        jd={JD}
      />,
    );
    expect(markup).toContain('24°44′ at J2000');
  });

  it('puts Spica at 180° under Lahiri and says where it lands otherwise', () => {
    const lahiri = renderToStaticMarkup(<SphereFrameCaption frame={LAHIRI} jd={JD} />);
    expect(lahiri).toMatch(/Spica at (29°59′ Virgo|0°00′ Libra)/);
    const fagan = renderToStaticMarkup(
      <SphereFrameCaption
        frame={{ ayanamsa: 'custom', customAyanamsaAtJ2000: 24.736, nodeType: 'mean' }}
        jd={JD}
      />,
    );
    expect(fagan).not.toMatch(/Spica at (29°59′ Virgo|0°00′ Libra)/);
  });
});

describe('the lagna-aligned pole view', () => {
  it('puts the ascendant on the left, as the wheel does, and runs anticlockwise', () => {
    for (const ascendant of [0, 45.5, 123.456, 180, 271.9, 359.99]) {
      const screen = poleScreenLongitudes(poleOffset(ascendant));
      expect(screen.left).toBeCloseTo(ascendant, 9);
      expect(screen.top).toBeCloseTo((ascendant + 270) % 360, 9); // 10th-house side
      expect(screen.right).toBeCloseTo((ascendant + 180) % 360, 9);
    }
  });

  it('matches the unrotated pole view when the ascendant is at 180°', () => {
    const [x, z] = poleOffset(180);
    expect(x).toBeCloseTo(0, 12);
    expect(z).toBeCloseTo(1, 12);
  });
});

describe('loose ends', () => {
  it('uses the core’s nakṣatra names — one spelling in the codebase', () => {
    expect(NAKSHATRA_IAST).toBe(CORE_NAKSHATRAS);
  });

  it('fades crowded labels harder on a narrow screen', () => {
    for (const room of [1, 1.1, 1.2, 1.3, 1.4]) {
      expect(labelOpacity(room, true)).toBeLessThanOrEqual(labelOpacity(room));
    }
    expect(labelOpacity(1.1, true)).toBe(0);
    expect(labelOpacity(1.6, true)).toBe(1);
  });
});

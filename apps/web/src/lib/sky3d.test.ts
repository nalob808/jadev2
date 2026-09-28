import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { jdFromUnixMs, norm360, wrap180 } from '@jade/astro';
import { transitRing, type RingFrame } from './transitRing';
import {
  NAMED_STARS,
  bodyPath,
  decodeStars,
  directionOf,
  eclipticFromEquatorial,
  equinoxSiderealLongitude,
  labelOpacity,
  sphereBodies,
  starFrameShift,
} from './sky3d';

/**
 * The 3D sphere spike. Its drawing is not tested; its astronomy is, because
 * the one thing a sky has to get right is where things are in it.
 */

const frame: RingFrame = { ayanamsa: 'lahiri', nodeType: 'mean' };
const JD = jdFromUnixMs(Date.UTC(2026, 8, 25, 12, 0, 0));

function siderealStar(
  ra: number,
  dec: number,
  jd: number,
): { longitude: number; latitude: number } {
  const ecliptic = eclipticFromEquatorial(ra, dec);
  return {
    longitude: norm360(ecliptic.longitude + starFrameShift(jd, frame)),
    latitude: ecliptic.latitude,
  };
}

describe('the star frame', () => {
  it('puts Citrā/Spica at 180° — the definition of the Lahiri ayanāṁśa', () => {
    const spica = NAMED_STARS.find((star) => star.label.includes('Spica'))!;
    const { longitude, latitude } = siderealStar(spica.ra, spica.dec, JD);
    // Lahiri fixes Spica at 180° to within a few arcminutes; proper motion
    // and aberration, which this frame ignores, are well under that.
    expect(Math.abs(wrap180(longitude - 180))).toBeLessThan(0.1);
    // Spica sits about 2° south of the ecliptic.
    expect(latitude).toBeCloseTo(-2.05, 1);
  });

  it('puts Rohiṇī/Aldebaran in Vṛṣabha, in Rohiṇī nakṣatra', () => {
    const aldebaran = NAMED_STARS.find((star) => star.label.includes('Aldebaran'))!;
    const { longitude } = siderealStar(aldebaran.ra, aldebaran.dec, JD);
    expect(Math.floor(longitude / 30)).toBe(1); // Vṛṣabha
    expect(Math.floor(longitude / (360 / 27))).toBe(3); // Rohiṇī
  });

  it('holds the stars still in the sidereal frame across two centuries', () => {
    // The whole premise of a sidereal zodiac. If precession and the
    // ayanāṁśa did not track each other, the stars would slide along the
    // band as the scrubber moved, and every star-planet comparison would
    // depend on the date.
    const early = starFrameShift(jdFromUnixMs(Date.UTC(1900, 0, 1)), frame);
    const late = starFrameShift(jdFromUnixMs(Date.UTC(2100, 0, 1)), frame);
    expect(Math.abs(late - early)).toBeLessThan(0.01);
  });

  it('puts the tropical equinox one ayanāṁśa behind Aśvinī 0°', () => {
    // ~24.2° of Lahiri in 2026, so the equinox sits near 335.8° sidereal.
    expect(equinoxSiderealLongitude(JD, frame)).toBeGreaterThan(335);
    expect(equinoxSiderealLongitude(JD, frame)).toBeLessThan(336.5);
  });
});

describe('the scene axes', () => {
  it('runs longitude counter-clockwise seen from the north ecliptic pole', () => {
    const [x0, y0, z0] = directionOf(0, 0);
    const [x90, , z90] = directionOf(90, 0);
    expect([x0, y0, z0].map((v) => Math.round(v * 1e9) / 1e9)).toEqual([1, 0, -0]);
    // From +Y looking down with −Z up the screen, 90° is straight up the screen.
    expect(x90).toBeCloseTo(0, 12);
    expect(z90).toBeCloseTo(-1, 12);
    expect(directionOf(123, 90)[1]).toBeCloseTo(1, 12);
  });
});

describe('the bodies', () => {
  const bodies = sphereBodies(JD, frame);
  const ring = transitRing(JD, frame, 0);

  it('agree exactly with the 2D ring', () => {
    for (const body of bodies) {
      const point = ring.find((candidate) => candidate.id === body.id)!;
      expect(body.longitude, body.id).toBe(point.longitude);
      expect(body.retrograde, body.id).toBe(point.retrograde ?? false);
    }
  });

  it('keep Rāhu and Ketu exactly opposite, on both node types', () => {
    for (const nodeType of ['mean', 'true'] as const) {
      const pair = sphereBodies(JD, { ...frame, nodeType });
      const rahu = pair.find((body) => body.id === 'Rahu')!;
      const ketu = pair.find((body) => body.id === 'Ketu')!;
      expect(Math.abs(wrap180(ketu.longitude - rahu.longitude)), nodeType).toBeCloseTo(180, 9);
      expect(rahu.latitude).toBe(0);
      expect(ketu.latitude).toBe(0);
    }
  });

  it('give each body a latitude inside its physical range', () => {
    const sun = bodies.find((body) => body.id === 'Sun')!;
    expect(Math.abs(sun.latitude)).toBeLessThan(0.001);
    const limits: Partial<Record<string, number>> = {
      Moon: 5.4,
      Mercury: 7.1,
      Venus: 9.1,
      Mars: 7.0,
      Jupiter: 1.6,
      Saturn: 2.8,
    };
    for (const [id, limit] of Object.entries(limits)) {
      const body = bodies.find((candidate) => candidate.id === id)!;
      expect(Math.abs(body.latitude), id).toBeLessThan(limit!);
    }
  });

  it('draw a path whose centre sample is the body itself', () => {
    const path = bodyPath('Mars', JD, frame, 60, 2);
    expect(path).toHaveLength(61);
    const mars = bodies.find((body) => body.id === 'Mars')!;
    expect(Math.abs(wrap180(path[30]!.longitude - mars.longitude))).toBeLessThan(1e-9);
    expect(path[30]!.latitude).toBeCloseTo(mars.latitude, 9);
  });
});

describe('the star catalogue file', () => {
  const path = fileURLToPath(new URL('../../public/sky/bsc-v6.0.bin', import.meta.url));
  const bytes = readFileSync(path);
  const stars = decodeStars(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length));

  it('holds the naked-eye sky, brightest first', () => {
    expect(stars.count).toBe(5080);
    // Sirius, V −1.46.
    expect(stars.mag[0]).toBeCloseTo(-1.46, 1);
    expect(stars.ra[0]).toBeCloseTo(101.29, 1);
    expect(stars.dec[0]).toBeCloseTo(-16.72, 1);
    expect(Math.max(...stars.mag)).toBeLessThanOrEqual(6.0 + 1 / 60);
  });

  it('round-trips Spica to within the packing resolution', () => {
    let best = Infinity;
    for (let index = 0; index < stars.count; index += 1) {
      const distance = Math.hypot(stars.ra[index]! - 201.298, stars.dec[index]! + 11.161);
      best = Math.min(best, distance);
    }
    expect(best).toBeLessThan(0.01);
  });
});

describe('label fading', () => {
  it('is fully off when labels overlap and fully on with room to spare', () => {
    expect(labelOpacity(0.5)).toBe(0);
    expect(labelOpacity(0.95)).toBe(0);
    expect(labelOpacity(1.35)).toBe(1);
    expect(labelOpacity(3)).toBe(1);
  });

  it('fades monotonically in between, so rotation cannot make it flicker', () => {
    let last = -1;
    for (let room = 0.9; room <= 1.4; room += 0.01) {
      const value = labelOpacity(room);
      expect(value).toBeGreaterThanOrEqual(last);
      last = value;
    }
  });
});

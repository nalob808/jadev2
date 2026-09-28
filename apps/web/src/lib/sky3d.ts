import {
  ayanamsa,
  centuriesFromJ2000,
  jdTtFromJdUt,
  NAKSHATRA_SPAN,
  norm360,
  type PointId,
} from '@jade/astro';
import { providerFor, transitRing, type RingFrame } from './transitRing';

/**
 * The maths behind the 3D celestial sphere spike. No three.js in here, so all
 * of it can be tested in node.
 *
 * ## The frame
 *
 * The scene is drawn in the **sidereal ecliptic of date**: the ecliptic is the
 * horizontal (XZ) plane, +Y is the north ecliptic pole, and sidereal 0° —
 * the start of Aśvinī — lies on +X. Longitude increases counter-clockwise seen
 * from the north pole, which is how the sky actually turns and how the 2D
 * wheel runs.
 *
 * Everything is placed in that one frame. The planets arrive in it already —
 * their longitudes come from `transitRing`, the very function that draws the
 * 2D scrubber's outer ring, so the two views cannot drift apart. The stars do
 * not: the catalogue is J2000 equatorial, so each one is rotated onto the
 * J2000 ecliptic, carried forward by general precession, and has the same
 * ayanāṁśa removed. For Lahiri the net shift is almost exactly constant,
 * which is the definition of a sidereal zodiac: the stars stay put and the
 * equinox slides under them. The test pins Citrā/Spica at 180°, which is the
 * definition of Lahiri — if any axis, sign or epoch in here were wrong, that
 * is the assertion that would catch it.
 *
 * ## Precision class
 *
 * Interactive, like the ring it extends (see `transitRing.ts`). The star frame
 * additionally ignores proper motion, annual aberration and the slow tilt of
 * the ecliptic itself — together under about a minute of arc across a
 * century either side of J2000, invisible at any zoom this scene offers. This
 * is a picture. Nothing in it is saved, printed, or used to state a date.
 */

/** Mean obliquity of the ecliptic at J2000.0, degrees (IAU 2006). */
const OBLIQUITY_J2000 = 23.439279444;

const RAD = Math.PI / 180;

/* ------------------------------------------------------------------- stars */

export interface StarCatalogue {
  readonly count: number;
  /** J2000 right ascension, degrees. */
  readonly ra: Float32Array;
  /** J2000 declination, degrees. */
  readonly dec: Float32Array;
  /** Visual magnitude. */
  readonly mag: Float32Array;
  /** Colour temperature in kelvin, 0 where the catalogue has none. */
  readonly kelvin: Float32Array;
}

/** Reads the packed file written by `scripts/build-star-catalogue.ts`. */
export function decodeStars(buffer: ArrayBuffer): StarCatalogue {
  const view = new DataView(buffer);
  const magic = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3),
  );
  if (magic !== 'JBS1') throw new Error(`star catalogue: bad header '${magic}'`);
  const count = view.getUint32(4, true);
  if (buffer.byteLength !== 8 + count * 6) {
    throw new Error(`star catalogue: ${buffer.byteLength} bytes for ${count} stars`);
  }
  const ra = new Float32Array(count);
  const dec = new Float32Array(count);
  const mag = new Float32Array(count);
  const kelvin = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * 6;
    ra[index] = (view.getUint16(at, true) / 65536) * 360;
    dec[index] = (view.getInt16(at + 2, true) / 32767) * 90;
    mag[index] = view.getUint8(at + 4) / 30 - 1.5;
    kelvin[index] = view.getUint8(at + 5) * 100;
  }
  return { count, ra, dec, mag, kelvin };
}

/** J2000 equatorial → J2000 ecliptic, degrees. */
export function eclipticFromEquatorial(
  raDeg: number,
  decDeg: number,
  obliquityDeg = OBLIQUITY_J2000,
): { longitude: number; latitude: number } {
  const ra = raDeg * RAD;
  const dec = decDeg * RAD;
  const eps = obliquityDeg * RAD;
  const sinBeta = Math.sin(dec) * Math.cos(eps) - Math.cos(dec) * Math.sin(eps) * Math.sin(ra);
  const y = Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps);
  const x = Math.cos(ra);
  return {
    longitude: norm360(Math.atan2(y, x) / RAD),
    latitude: Math.asin(Math.max(-1, Math.min(1, sinBeta))) / RAD,
  };
}

/**
 * Degrees to add to a J2000 ecliptic longitude to get a sidereal longitude of
 * date: general precession in longitude since J2000, minus the mean ayanāṁśa.
 *
 * Mean, not true, on both sides. Nutation moves the equinox and therefore the
 * tropical longitude and the true ayanāṁśa by the same Δψ, so it cancels out
 * of a sidereal longitude exactly — which is why the planets' true-equinox
 * positions and the stars' mean-equinox ones meet in the same frame.
 */
export function starFrameShift(jdUt: number, frame: RingFrame): number {
  const jdTt = jdTtFromJdUt(jdUt);
  const t = centuriesFromJ2000(jdTt);
  const precessionArcsec = 5028.796195 * t + 1.1054348 * t * t;
  const meanAyanamsa = ayanamsa(jdTt, {
    mode: frame.ayanamsa,
    customAtJ2000: frame.customAyanamsaAtJ2000,
    includeNutation: false,
  });
  return precessionArcsec / 3600 - meanAyanamsa;
}

/**
 * Where tropical 0° — the vernal equinox of date — sits on the sidereal band.
 * The gap between it and Aśvinī 0° *is* the ayanāṁśa, drawn.
 */
export function equinoxSiderealLongitude(jdUt: number, frame: RingFrame): number {
  return norm360(
    -ayanamsa(jdTtFromJdUt(jdUt), {
      mode: frame.ayanamsa,
      customAtJ2000: frame.customAyanamsaAtJ2000,
      includeNutation: true,
    }),
  );
}

/* --------------------------------------------------------------- the frame */

/**
 * Unit vector for a sidereal ecliptic longitude and latitude, in scene axes.
 * λ = 0 → +X, λ = 90° → −Z, north ecliptic pole → +Y.
 */
export function directionOf(longitudeDeg: number, latitudeDeg: number): [number, number, number] {
  const lambda = longitudeDeg * RAD;
  const beta = latitudeDeg * RAD;
  return [Math.cos(beta) * Math.cos(lambda), Math.sin(beta), -Math.cos(beta) * Math.sin(lambda)];
}

/* -------------------------------------------------------------- the bodies */

export interface SphereBody {
  readonly id: PointId;
  /** Sidereal longitude — identical to the 2D ring's, by construction. */
  readonly longitude: number;
  /** Ecliptic latitude. Zero for the nodes, which lie on the ecliptic by definition. */
  readonly latitude: number;
  readonly retrograde: boolean;
  readonly nakshatra: string;
}

/**
 * The nine bodies at `jdUt`, with latitude.
 *
 * Longitude, retrograde and nakṣatra come straight from `transitRing`, so the
 * sphere shows exactly what the wheel's outer ring shows. The only thing
 * added is latitude — the one number the wheel has nowhere to put. The house
 * `transitRing` computes is discarded: the sphere has no lagna.
 */
export function sphereBodies(jdUt: number, frame: RingFrame): SphereBody[] {
  const provider = providerFor(frame.nodeType);
  return transitRing(jdUt, frame, 0).map((point) => ({
    id: point.id as PointId,
    longitude: point.longitude,
    latitude:
      point.id === 'Rahu' || point.id === 'Ketu'
        ? 0
        : provider.position(point.id as PointId, jdUt).latitude,
    retrograde: point.retrograde ?? false,
    nakshatra: point.nakshatra ?? '',
  }));
}

/** Bodies that get a path drawn. The Moon's is just the band; the nodes' a slow slide. */
export const PATH_BODIES: readonly PointId[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

/**
 * A body's track across the sky, `spanDays` either side of `centreJd`.
 *
 * This is the retrograde loop as geometry: longitude runs backwards through a
 * station while latitude keeps changing, so the track closes into a loop or a
 * zigzag rather than doubling back along itself. The shape is real — the wheel
 * can only show the backwards half of it.
 *
 * Ecliptic of date at each sample, with the ayanāṁśa of that sample removed —
 * the same recipe `siderealLongitudeAt` uses, without the speed the provider
 * would otherwise compute three times per sample.
 */
export function bodyPath(
  id: PointId,
  centreJd: number,
  frame: RingFrame,
  spanDays: number,
  stepDays: number,
): { longitude: number; latitude: number }[] {
  const provider = providerFor(frame.nodeType);
  const samples: { longitude: number; latitude: number }[] = [];
  for (let offset = -spanDays; offset <= spanDays + 1e-9; offset += stepDays) {
    const jd = centreJd + offset;
    const position = provider.position(id, jd);
    const shift = ayanamsa(jdTtFromJdUt(jd), {
      mode: frame.ayanamsa,
      customAtJ2000: frame.customAyanamsaAtJ2000,
      includeNutation: true,
    });
    samples.push({ longitude: norm360(position.longitude - shift), latitude: position.latitude });
  }
  return samples;
}

/* ------------------------------------------------------------------ labels */

/** Rāśi names in IAST. Romanised on purpose — see the spike doc on Devanagari shaping. */
export const RASHI_IAST = [
  'Meṣa',
  'Vṛṣabha',
  'Mithuna',
  'Karka',
  'Siṁha',
  'Kanyā',
  'Tulā',
  'Vṛścika',
  'Dhanus',
  'Makara',
  'Kumbha',
  'Mīna',
] as const;

export const NAKSHATRA_IAST = [
  'Aśvinī',
  'Bharaṇī',
  'Kṛttikā',
  'Rohiṇī',
  'Mṛgaśirā',
  'Ārdrā',
  'Punarvasu',
  'Puṣya',
  'Āśleṣā',
  'Maghā',
  'Pūrva Phalgunī',
  'Uttara Phalgunī',
  'Hasta',
  'Citrā',
  'Svātī',
  'Viśākhā',
  'Anurādhā',
  'Jyeṣṭhā',
  'Mūla',
  'Pūrva Āṣāḍhā',
  'Uttara Āṣāḍhā',
  'Śravaṇa',
  'Dhaniṣṭhā',
  'Śatabhiṣā',
  'Pūrva Bhādrapadā',
  'Uttara Bhādrapadā',
  'Revatī',
] as const;

/** Midpoint longitudes, where each label is anchored. */
export const RASHI_CENTRES = RASHI_IAST.map((_, index) => index * 30 + 15);
export const NAKSHATRA_CENTRES = NAKSHATRA_IAST.map(
  (_, index) => index * NAKSHATRA_SPAN + NAKSHATRA_SPAN / 2,
);

/**
 * A handful of named stars, so a reader can check the sky against what they
 * know. Mostly yogatārās, with the modern name alongside. J2000 from the same
 * catalogue the point cloud is built from.
 */
export const NAMED_STARS: readonly {
  readonly label: string;
  readonly ra: number;
  readonly dec: number;
}[] = [
  { label: 'Rohiṇī · Aldebaran', ra: 68.98, dec: 16.509 },
  { label: 'Maghā · Regulus', ra: 152.093, dec: 11.967 },
  { label: 'Citrā · Spica', ra: 201.298, dec: -11.161 },
  { label: 'Svātī · Arcturus', ra: 213.915, dec: 19.182 },
  { label: 'Jyeṣṭhā · Antares', ra: 247.352, dec: -26.432 },
  { label: 'Punarvasu · Pollux', ra: 116.329, dec: 28.026 },
  { label: 'Kṛttikā · Pleiades', ra: 56.871, dec: 24.105 },
  { label: 'Ārdrā · Betelgeuse', ra: 88.793, dec: 7.407 },
];

/** Hermite smoothstep, clamped. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * How visible a label on the ring should be, from how much room it has.
 *
 * The labels sit on a circle, so crowding is one-dimensional: the only
 * neighbours a label can collide with are the ones either side of it. `room`
 * is the on-screen distance to the nearer neighbour divided by the space the
 * two labels need (half of each one's width plus a gap). Below 1 they overlap;
 * the label fades out over the band just above that, so rotating the camera
 * dissolves it instead of switching it off — binary visibility flickers at the
 * threshold, a fade cannot.
 */
export function labelOpacity(room: number): number {
  return smoothstep(0.95, 1.35, room);
}

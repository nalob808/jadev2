import {
  ayanamsa,
  centuriesFromJ2000,
  jdTtFromJdUt,
  NAKSHATRA_IAST,
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

/**
 * Nakṣatra names come from the core (`NAKSHATRA_IAST` in packages/astro), so
 * there is one spelling of each in the codebase. Re-exported for the scene.
 */
export { NAKSHATRA_IAST };

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
export function labelOpacity(room: number, narrow = false): number {
  // On a phone the same 27 nakṣatra names share about a third of the width,
  // and a label at 95% of its room still reads as touching. Narrow screens ask
  // for clear air before a label shows at all.
  return narrow ? smoothstep(1.15, 1.6, room) : smoothstep(0.95, 1.35, room);
}

/** Below this canvas width, labels use the narrow-screen fade. */
export const NARROW_CANVAS_PX = 520;

/* ------------------------------------------------------------ the camera */

export type SphereView = 'centre' | 'outside' | 'pole' | 'lagna';

/**
 * How the camera moves, given `prefers-reduced-motion`.
 *
 * Reduced motion turns off orbit inertia and makes view changes jump rather
 * than fly. It removes no feature: dragging is direct manipulation and stays,
 * and every view is still one key or one button away.
 */
export function motionPolicy(reduced: boolean): { damping: boolean; flightMs: number } {
  return reduced ? { damping: false, flightMs: 0 } : { damping: true, flightMs: 900 };
}

/**
 * The horizontal offset that orients the pole view, as a unit [x, z].
 *
 * Looking down from the north ecliptic pole with the camera nudged towards
 * direction φ, screen-right is longitude φ and longitude runs anticlockwise
 * (right → up → left). So screen-left is φ + 180°, and putting the ascendant
 * on the left — where the wheel puts it — is φ = ascendant − 180°. One
 * rotation about +Y, which is what lets the sphere and the wheel be read in
 * the same frame.
 */
export function poleOffset(leftLongitude: number): [number, number] {
  const phi = (leftLongitude - 180) * RAD;
  return [Math.sin(phi), Math.cos(phi)];
}

/**
 * Which longitudes sit at screen-right, screen-top and screen-left for a pole
 * view with camera offset [x, z]. The inverse of `poleOffset`, derived from
 * the camera basis (forward ≈ −Y, up ≈ −offset), for the test to hold it to.
 */
export function poleScreenLongitudes(offset: [number, number]): {
  right: number;
  top: number;
  left: number;
} {
  const phi = Math.atan2(offset[0], offset[1]) / RAD;
  return { right: norm360(phi), top: norm360(phi + 90), left: norm360(phi + 180) };
}

export type SphereKeyAction =
  | { readonly kind: 'orbit'; readonly azimuth: number; readonly polar: number }
  | { readonly kind: 'zoom'; readonly factor: number }
  | { readonly kind: 'view'; readonly view: SphereView }
  | { readonly kind: 'leave' };

/** Degrees per arrow press. */
const ORBIT_STEP = 6;

/**
 * The keyboard map for the canvas. Arrows orbit, + and − zoom, 1–4 are the
 * four views, Escape hands focus back to the page so a keyboard user is never
 * trapped in the canvas. Everything else is left to the browser.
 */
export function sphereKeyAction(key: string): SphereKeyAction | null {
  switch (key) {
    case 'ArrowLeft':
      return { kind: 'orbit', azimuth: -ORBIT_STEP, polar: 0 };
    case 'ArrowRight':
      return { kind: 'orbit', azimuth: ORBIT_STEP, polar: 0 };
    case 'ArrowUp':
      return { kind: 'orbit', azimuth: 0, polar: -ORBIT_STEP };
    case 'ArrowDown':
      return { kind: 'orbit', azimuth: 0, polar: ORBIT_STEP };
    case '+':
    case '=':
      return { kind: 'zoom', factor: 0.8 };
    case '-':
    case '_':
      return { kind: 'zoom', factor: 1.25 };
    case '1':
      return { kind: 'view', view: 'centre' };
    case '2':
      return { kind: 'view', view: 'outside' };
    case '3':
      return { kind: 'view', view: 'pole' };
    case '4':
      return { kind: 'view', view: 'lagna' };
    case 'Escape':
      return { kind: 'leave' };
    default:
      return null;
  }
}

/**
 * Orbit a camera position about the origin by azimuth and polar steps, in
 * degrees, keeping its distance. The polar angle stays clear of the poles, as
 * OrbitControls keeps it, so the view never flips.
 */
export function orbitPosition(
  position: readonly [number, number, number],
  azimuthDeg: number,
  polarDeg: number,
): [number, number, number] {
  const [x, y, z] = position;
  const radius = Math.hypot(x, y, z) || 1;
  const polar = Math.acos(Math.max(-1, Math.min(1, y / radius)));
  const azimuth = Math.atan2(x, z);
  const nextPolar = Math.max(0.01, Math.min(Math.PI - 0.01, polar + polarDeg * RAD));
  const nextAzimuth = azimuth + azimuthDeg * RAD;
  return [
    radius * Math.sin(nextPolar) * Math.sin(nextAzimuth),
    radius * Math.cos(nextPolar),
    radius * Math.sin(nextPolar) * Math.cos(nextAzimuth),
  ];
}

/** Scale the camera's distance, clamped to the controls' limits. */
export function zoomPosition(
  position: readonly [number, number, number],
  factor: number,
  min: number,
  max: number,
): [number, number, number] {
  const radius = Math.hypot(...position) || 1;
  const next = Math.max(min, Math.min(max, radius * factor));
  return position.map((value) => (value / radius) * next) as [number, number, number];
}

import * as Astronomy from 'astronomy-engine';
import type { EclipticPosition, EphemerisProvider } from './provider.js';
import type { PointId } from '../types.js';
import { atan2Deg, norm360, wrap180 } from '../angles.js';
import { jdTtFromJdUt, unixMsFromJd } from '../time.js';
import { delaunayArguments, nutation } from '../nutation.js';
import { centuriesFromJ2000 } from '../time.js';

const BODY_MAP: Partial<Record<PointId, Astronomy.Body>> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

function timeFromJd(jdUt: number): Astronomy.AstroTime {
  return Astronomy.MakeTime(new Date(unixMsFromJd(jdUt)));
}

/** Apparent geocentric ecliptic-of-date longitude and latitude of a real body. */
function eclipticOfDate(
  body: Astronomy.Body,
  time: Astronomy.AstroTime,
): {
  longitude: number;
  latitude: number;
  distance: number;
} {
  const vector = Astronomy.GeoVector(body, time, true);
  const rotated = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(time), vector);
  const distance = Math.hypot(rotated.x, rotated.y, rotated.z);
  return {
    longitude: norm360(atan2Deg(rotated.y, rotated.x)),
    latitude: (Math.asin(rotated.z / distance) * 180) / Math.PI,
    distance,
  };
}

/** Mean lunar node, apparent longitude (mean node + nutation in longitude). */
function meanNodeApparent(jdUt: number): number {
  const jdTt = jdTtFromJdUt(jdUt);
  const omega = delaunayArguments(centuriesFromJ2000(jdTt))[4];
  return norm360(omega + nutation(jdTt).dPsi);
}

/**
 * True (osculating) lunar node: the ascending node of the Moon's instantaneous
 * orbital plane. Computed from the Moon's geocentric state vector — the
 * ascending-node direction is (ẑ × h) where h = r × v.
 *
 * This is the same definition Swiss Ephemeris uses for SE_TRUE_NODE.
 */
function trueNodeApparent(jdUt: number): number {
  const time = timeFromJd(jdUt);
  const h = 0.005; // days; central difference for velocity
  const rotation = Astronomy.Rotation_EQJ_ECT(time);
  const at = (offsetDays: number): Astronomy.Vector => {
    const t = time.AddDays(offsetDays);
    return Astronomy.RotateVector(rotation, Astronomy.GeoVector(Astronomy.Body.Moon, t, false));
  };
  const r = at(0);
  const before = at(-h);
  const after = at(h);
  const v = {
    x: (after.x - before.x) / (2 * h),
    y: (after.y - before.y) / (2 * h),
    z: (after.z - before.z) / (2 * h),
  };
  // h = r × v
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  const hz = r.x * v.y - r.y * v.x;
  // ascending node direction n = ẑ × h = (-hy, hx, 0)
  void hz;
  return norm360(atan2Deg(hx, -hy));
}

function nodeLongitude(id: 'Rahu' | 'Ketu', jdUt: number, nodeType: 'mean' | 'true'): number {
  const rahu = nodeType === 'mean' ? meanNodeApparent(jdUt) : trueNodeApparent(jdUt);
  return id === 'Rahu' ? rahu : norm360(rahu + 180);
}

export interface AstronomyEngineOptions {
  readonly nodeType?: 'mean' | 'true';
}

/**
 * The MIT-licensed provider. Good enough to build the entire product against,
 * and the only one that can run in a browser tab today.
 *
 * Measured against Swiss Ephemeris — see packages/astro/test/accuracy.test.ts
 * for the tolerances this provider is actually held to in CI.
 */
export class AstronomyEngineProvider implements EphemerisProvider {
  readonly id = 'astronomy-engine' as const;
  readonly precisionClass = 'interactive' as const;

  private readonly nodeType: 'mean' | 'true';

  constructor(options: AstronomyEngineOptions = {}) {
    this.nodeType = options.nodeType ?? 'mean';
  }

  position(body: PointId, jdUt: number): EclipticPosition {
    if (body === 'Rahu' || body === 'Ketu') {
      const longitude = nodeLongitude(body, jdUt, this.nodeType);
      const dt = 0.5;
      const speed =
        wrap180(
          nodeLongitude(body, jdUt + dt, this.nodeType) -
            nodeLongitude(body, jdUt - dt, this.nodeType),
        ) /
        (2 * dt);
      return { longitude, latitude: 0, distance: 0, speed };
    }

    const mapped = BODY_MAP[body];
    if (!mapped) {
      throw new Error(
        `AstronomyEngineProvider cannot compute '${body}'. Angles are derived in points.ts, not here.`,
      );
    }

    const time = timeFromJd(jdUt);
    const now = eclipticOfDate(mapped, time);
    const dt = body === 'Moon' ? 0.02 : 0.5;
    const before = eclipticOfDate(mapped, timeFromJd(jdUt - dt));
    const after = eclipticOfDate(mapped, timeFromJd(jdUt + dt));
    const speed = wrap180(after.longitude - before.longitude) / (2 * dt);

    return {
      longitude: now.longitude,
      latitude: now.latitude,
      distance: now.distance,
      speed,
    };
  }

  greenwichApparentSiderealTime(jdUt: number): number {
    return norm360(Astronomy.SiderealTime(timeFromJd(jdUt)) * 15);
  }

  trueObliquity(jdUt: number): number {
    return nutation(jdTtFromJdUt(jdUt)).trueObliquity;
  }
}

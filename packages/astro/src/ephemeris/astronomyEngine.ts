import * as Astronomy from 'astronomy-engine';
import type { EclipticPosition, EphemerisProvider } from './provider.js';
import type { PointId, PositionBasis } from '../types.js';
import { atan2Deg, norm360, wrap180 } from '../angles.js';
import { jdFromUnixMs, jdTtFromJdUt, unixMsFromJd } from '../time.js';
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

  position(body: PointId, jdUt: number, basis: PositionBasis = 'apparent'): EclipticPosition {
    if (basis !== 'apparent') {
      // Refusing is the correct answer here. The geometric route available to
      // this provider — differencing heliocentric vectors — agrees with
      // SEFLG_TRUEPOS to 0.35" on the Sun but drifts past 20" on the outer
      // planets, and astronomy-engine's GeoMoon is not a geometric position at
      // all. Since the whole point of the setting is to close a gap of at most
      // 55", an implementation wrong by 20" would silently replace one
      // disagreement with another. Use the swisseph provider, where this is
      // one flag.
      throw new Error(
        `positionBasis '${basis}' is not available on the astronomy-engine provider. ` +
          'True (geometric) positions require the swisseph provider — see docs/07-accuracy.md.',
      );
    }
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

  sunriseSunset(
    jdUt: number,
    latitude: number,
    longitude: number,
  ): { sunrise: number | null; sunset: number | null } {
    const observer = new Astronomy.Observer(latitude, longitude, 0);
    // Search from the start of the LOCAL civil day, so the pair belongs to one
    // day rather than straddling two. Julian Days begin at noon UT, and local
    // time runs about longitude/360 of a day ahead of UT, hence both terms.
    const localOffset = longitude / 360;
    const localDayNumber = Math.floor(jdUt + localOffset + 0.5);
    const localMidnight = localDayNumber - 0.5 - localOffset;
    const from = timeFromJd(localMidnight);

    const find = (direction: 1 | -1): number | null => {
      const found = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, direction, from, 1);
      return found ? jdFromUnixMs(found.date.getTime()) : null;
    };

    return { sunrise: find(+1), sunset: find(-1) };
  }
}

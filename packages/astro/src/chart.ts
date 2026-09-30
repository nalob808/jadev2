import type { EphemerisProvider } from './ephemeris/provider.js';
import { HouseSystemUndefinedError, computeAngles, houseCusps, houseOfCusps } from './houses.js';
import { nakshatraOf } from './nakshatra.js';
import { ayanamsa } from './sidereal/ayanamsa.js';
import { jdTtFromJdUt } from './time.js';
import { allVargas, isVargottama, type VargaId } from './vargas.js';
import { combustionOf, dignityOf, type Combustion, type Dignity } from './dignity.js';
import { panchangaOf, type Panchanga } from './panchanga.js';
import { norm360 } from './angles.js';
import { retrogradeFrom } from './motion.js';
import {
  ashtakavarga as computeAshtakavarga,
  AV_CONTRIBUTORS,
  type AshtakavargaResult,
  type SignPlacement,
} from './ashtakavarga.js';
import { detectYogas, type YogaChart, type YogaHit, type YogaOptions } from './yogas.js';
import {
  DEFAULT_SETTINGS,
  GRAHAS,
  OUTERS,
  SIGNS,
  type BirthMoment,
  type ChartSettings,
  type HouseSystem,
  type PointId,
  type PointPosition,
} from './types.js';

export interface ComputedChart {
  readonly meta: {
    readonly astroVersion: string;
    readonly provider: string;
    readonly precisionClass: string;
    readonly jdUt: number;
    readonly jdTt: number;
    readonly ayanamsaMode: string;
    readonly ayanamsaValue: number;
    readonly settings: ChartSettings;
  };
  readonly points: Record<string, PointPosition>;
  /** Dignity and combustion per graha. Absent for the angles and the nodes. */
  readonly dignity: Record<string, Dignity | null>;
  readonly combustion: Record<string, Combustion | null>;
  /** The five limbs. `vara` is null above the Arctic Circle, where there is no sunrise. */
  readonly panchanga: Panchanga;
  readonly sunrise: number | null;
  readonly sunset: number | null;
  readonly houses: {
    /** The system the cusps were actually drawn in. */
    readonly system: string;
    /**
     * The system the settings asked for.
     *
     * Equal to `system` except where the requested one has no answer for this
     * chart — Placidus above the polar circles — in which case `note` says so.
     * Two fields rather than one because a chart has to be able to state that
     * it is not what was asked for; quietly returning the substitute is the
     * failure CLAUDE.md #3 names.
     */
    readonly requested: string;
    readonly cusps: number[];
    readonly ascendantSign: number;
    /** Why `system` differs from `requested`, in a sentence fit to show. */
    readonly note: string | null;
  };
  readonly vargas: Record<string, Record<VargaId, number>>;
  readonly vargottama: string[];
  /** Bhinnāṣṭakavarga per graha plus the ascendant, and the sarva totals. */
  readonly ashtakavarga: AshtakavargaResult;
  /** Named combinations, each carrying the placements that produced it. */
  readonly yogas: readonly YogaHit[];
}

/** Bumped whenever any calculation changes. Stored on every cached chart. */
export const ASTRO_VERSION = '0.6.0';

/**
 * Compute a full sidereal chart.
 *
 * Pure: the only inputs are the birth moment, the settings, and the provider.
 * Nothing here reads a clock, a database, or the network.
 */
export function computeChart(
  provider: EphemerisProvider,
  moment: BirthMoment,
  settings: ChartSettings = DEFAULT_SETTINGS,
  yogaOptions: YogaOptions = {},
): ComputedChart {
  const { jdUt, location } = moment;
  const jdTt = jdTtFromJdUt(jdUt);

  const ayanamsaValue = ayanamsa(jdTt, {
    mode: settings.ayanamsa,
    customAtJ2000: settings.customAyanamsaAtJ2000,
    includeNutation: true,
  });

  const angles = computeAngles(provider, jdUt, location);
  const siderealAscendant = norm360(angles.ascendantTropical - ayanamsaValue);

  /*
   * The houses, before any graha is placed, because every graha needs them.
   *
   * A quadrant system can have no answer at this latitude. When that happens
   * the chart is drawn in whole sign and says which system it is in and why,
   * rather than either failing outright — leaving somebody born in Tromsø with
   * no chart at all — or substituting in silence.
   */
  const houseFrame = { angles, latitude: location.latitude, ayanamsa: ayanamsaValue };
  let houseSystem: HouseSystem = settings.houseSystem;
  let houseNote: string | null = null;
  let cusps: number[];
  try {
    cusps = houseCusps(houseSystem, houseFrame);
  } catch (error) {
    if (!(error instanceof HouseSystemUndefinedError)) throw error;
    houseNote = `${error.message}. Drawn in whole sign instead.`;
    houseSystem = 'whole_sign';
    cusps = houseCusps(houseSystem, houseFrame);
  }

  const bodies: PointId[] = [...GRAHAS, ...(settings.includeOuters ? OUTERS : [])];
  const points: Record<string, PointPosition> = {};

  const place = (id: PointId, tropicalLongitude: number, latitude: number, speed: number): void => {
    const longitude = norm360(tropicalLongitude - ayanamsaValue);
    const signIndex = Math.floor(longitude / 30);
    points[id] = {
      id,
      longitude,
      tropicalLongitude: norm360(tropicalLongitude),
      latitude,
      speed,
      /**
       * Retrogression is apparent motion, and two bodies never have it.
       *
       * The Sun and the Moon cannot appear to move backwards from the Earth —
       * the Sun because its apparent motion *is* the Earth's orbit, the Moon
       * because it always outpaces it. Reading it off the sign of a finite
       * difference is correct arithmetic that admits an impossible answer, so
       * the impossible answer is closed off here rather than left for every
       * surface downstream to remember. The angles are not bodies and do not
       * have the condition at all.
       */
      retrograde: retrogradeFrom(id, speed, settings.nodeType),
      signIndex,
      sign: SIGNS[signIndex]!,
      degreesInSign: longitude - signIndex * 30,
      nakshatra: nakshatraOf(longitude),
      house: houseOfCusps(longitude, cusps),
    };
  };

  for (const body of bodies) {
    const p = provider.position(body, jdUt, settings.positionBasis);
    place(body, p.longitude, p.latitude, p.speed);
  }
  place('Ascendant', angles.ascendantTropical, 0, 0);
  place('Midheaven', angles.midheavenTropical, 0, 0);

  // Dignity and combustion, both measured against the Sun's final position.
  const sunLongitude = points.Sun!.longitude;
  const dignity: Record<string, Dignity | null> = {};
  const combustion: Record<string, Combustion | null> = {};
  for (const [id, position] of Object.entries(points)) {
    if (id === 'Ascendant' || id === 'Midheaven') continue;
    dignity[id] = dignityOf(id as (typeof GRAHAS)[number], position.longitude);
    combustion[id] = combustionOf(
      id as (typeof GRAHAS)[number],
      position.longitude,
      sunLongitude,
      position.retrograde,
    );
  }

  const { sunrise, sunset } = provider.sunriseSunset(jdUt, location.latitude, location.longitude);
  const panchanga = panchangaOf(sunLongitude, points.Moon!.longitude, jdUt, sunrise);

  const vargas: Record<string, Record<VargaId, number>> = {};
  const vargottama: string[] = [];
  for (const [id, position] of Object.entries(points)) {
    vargas[id] = allVargas(position.longitude);
    if (isVargottama(position.longitude)) vargottama.push(id);
  }

  // Aṣṭakavarga needs only the eight sign positions, so it is computed from
  // the finished points rather than from longitudes again.
  const placement = Object.fromEntries(
    AV_CONTRIBUTORS.map((c) => [c, points[c]!.signIndex]),
  ) as SignPlacement;

  const yogaChart: YogaChart = {
    ascendantSign: Math.floor(siderealAscendant / 30),
    signOf: Object.fromEntries(
      Object.entries(points).map(([id, p]) => [id, p.signIndex]),
    ) as YogaChart['signOf'],
    degreeOf: Object.fromEntries(
      Object.entries(points).map(([id, p]) => [id, p.degreesInSign]),
    ) as YogaChart['degreeOf'],
  };

  return {
    meta: {
      astroVersion: ASTRO_VERSION,
      provider: provider.id,
      precisionClass: provider.precisionClass,
      jdUt,
      jdTt,
      ayanamsaMode: settings.ayanamsa,
      ayanamsaValue,
      settings,
    },
    points,
    dignity,
    combustion,
    panchanga,
    sunrise,
    sunset,
    houses: {
      system: houseSystem,
      requested: settings.houseSystem,
      cusps,
      ascendantSign: Math.floor(siderealAscendant / 30),
      note: houseNote,
    },
    vargas,
    vargottama,
    ashtakavarga: computeAshtakavarga(placement),
    yogas: detectYogas(yogaChart, yogaOptions),
  };
}

import type { EphemerisProvider } from './ephemeris/provider.js';
import { computeAngles, houseOf, wholeSignCusps } from './houses.js';
import { nakshatraOf } from './nakshatra.js';
import { ayanamsa } from './sidereal/ayanamsa.js';
import { jdTtFromJdUt } from './time.js';
import { allVargas, isVargottama, type VargaId } from './vargas.js';
import { combustionOf, dignityOf, type Combustion, type Dignity } from './dignity.js';
import { panchangaOf, type Panchanga } from './panchanga.js';
import { norm360 } from './angles.js';
import {
  DEFAULT_SETTINGS,
  GRAHAS,
  OUTERS,
  SIGNS,
  type BirthMoment,
  type ChartSettings,
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
    readonly system: string;
    readonly cusps: number[];
    readonly ascendantSign: number;
  };
  readonly vargas: Record<string, Record<VargaId, number>>;
  readonly vargottama: string[];
}

/** Bumped whenever any calculation changes. Stored on every cached chart. */
export const ASTRO_VERSION = '0.2.0';

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
      retrograde: speed < 0,
      signIndex,
      sign: SIGNS[signIndex]!,
      degreesInSign: longitude - signIndex * 30,
      nakshatra: nakshatraOf(longitude),
      house: houseOf(longitude, siderealAscendant, settings.houseSystem),
    };
  };

  for (const body of bodies) {
    const p = provider.position(body, jdUt);
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
      system: settings.houseSystem,
      cusps: wholeSignCusps(siderealAscendant),
      ascendantSign: Math.floor(siderealAscendant / 30),
    },
    vargas,
    vargottama,
  };
}

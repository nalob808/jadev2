import { createHash } from 'node:crypto';
import {
  ASTRO_VERSION,
  AstronomyEngineProvider,
  computeChart,
  jdFromUnixMs,
  type ChartSettings,
  type ComputedChart,
} from '@jade/astro';
import { getCachedChart, putCachedChart, type BirthEvent, type SettingsProfile } from '@jade/db';
import { getDatabase } from './db.js';

/**
 * Turn a stored settings profile into the calculation core's settings.
 * Explicit and total — no silent defaults (CLAUDE.md, non-negotiable #3).
 */
export function toChartSettings(profile: SettingsProfile): ChartSettings {
  return {
    ayanamsa: profile.ayanamsa,
    customAyanamsaAtJ2000: profile.customAyanamsaAtJ2000 ?? undefined,
    nodeType: profile.nodeType,
    houseSystem: profile.houseSystem,
    includeOuters: profile.includeOuters,
  };
}

/**
 * The cache key.
 *
 * A chart is a pure function of the moment, the place, the lens and the
 * version of the maths — so hashing those gives a key that can never go
 * stale. Fix a bug in the varga rules, bump ASTRO_VERSION, and every affected
 * chart is simply a cache miss.
 *
 * The workspace is part of the hash, and that is not an accident. Two
 * practices can hold the same birth data — a public figure, a shared client,
 * a couple who both use Jade — and without the workspace in the key they
 * collide on the primary key while row-level security hides the existing row
 * from the second one. The result is a permanent cache miss that recomputes
 * on every page load and never explains why. Scoping the key also means a
 * chart's mere existence can never leak across tenants.
 */
export function chartCacheKey(
  workspaceId: string,
  birthEvent: BirthEvent,
  settings: ChartSettings,
): string {
  const canonical = JSON.stringify({
    workspaceId,
    utc:
      birthEvent.utcDatetime instanceof Date
        ? birthEvent.utcDatetime.toISOString()
        : String(birthEvent.utcDatetime),
    lat: birthEvent.latitude,
    lon: birthEvent.longitude,
    elevation: birthEvent.elevationM,
    settings: {
      ayanamsa: settings.ayanamsa,
      custom: settings.customAyanamsaAtJ2000 ?? null,
      nodes: settings.nodeType,
      houses: settings.houseSystem,
      outers: settings.includeOuters,
    },
    astroVersion: ASTRO_VERSION,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

const provider = new AstronomyEngineProvider();

export async function getOrComputeChart(
  workspaceId: string,
  birthEvent: BirthEvent,
  profile: SettingsProfile,
): Promise<{ chart: ComputedChart; cacheHit: boolean; id: string }> {
  const settings = toChartSettings(profile);
  const id = chartCacheKey(workspaceId, birthEvent, settings);
  const database = getDatabase();

  const cached = (await getCachedChart(database, workspaceId, id)) as ComputedChart | null;
  if (cached) return { chart: cached, cacheHit: true, id };

  const utcMs =
    birthEvent.utcDatetime instanceof Date
      ? birthEvent.utcDatetime.getTime()
      : new Date(birthEvent.utcDatetime).getTime();

  const chart = computeChart(
    provider,
    {
      jdUt: jdFromUnixMs(utcMs),
      location: {
        latitude: birthEvent.latitude,
        longitude: birthEvent.longitude,
        elevation: birthEvent.elevationM,
      },
    },
    settings,
  );

  await putCachedChart(database, workspaceId, {
    id,
    birthEventId: birthEvent.id,
    settingsProfileId: profile.id,
    astroVersion: ASTRO_VERSION,
    computed: chart,
  });

  return { chart, cacheHit: false, id };
}

/**
 * Import the full place atlas.
 *
 *   pnpm add -w -D all-the-cities geo-tz
 *   DIRECT_DATABASE_URL=... pnpm places:import
 *
 * Loads ~135,000 cities (GeoNames, population ≥ 1000) and resolves each one's
 * IANA time zone from timezone boundary polygons rather than from a country
 * guess — which matters for places like Ann Arbor, which is America/Detroit
 * and not America/New_York.
 *
 * The two data packages are deliberately NOT in package.json: geo-tz alone is
 * ~70 MB, and nothing but this script needs them. Install them when you run
 * it, then remove them again if you like.
 *
 * Attribution: place data is from GeoNames and is licensed CC BY 4.0. The
 * credit belongs in the app footer and on /licenses.
 */
import { sql } from 'drizzle-orm';
import { createDatabase } from '../packages/db/src/client.js';
import { places } from '../packages/db/src/schema.js';

interface City {
  cityId: number;
  name: string;
  country: string;
  adminCode?: string;
  population: number;
  loc: { coordinates: [number, number] };
}

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DIRECT_DATABASE_URL first. See .env.example.');
  process.exit(1);
}

let cities: City[];
let findTimezone: (lat: number, lon: number) => string[];
try {
  cities = (await import('all-the-cities')).default as unknown as City[];
  findTimezone = (await import('geo-tz')).find;
} catch {
  console.error('Missing data packages. Run:\n\n  pnpm add -w -D all-the-cities geo-tz\n');
  process.exit(1);
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const database = createDatabase(url, { max: 1 });
const BATCH = 1000;
let written = 0;
let skipped = 0;

for (let start = 0; start < cities.length; start += BATCH) {
  const rows = cities.slice(start, start + BATCH).flatMap((city) => {
    const [longitude, latitude] = city.loc.coordinates;
    const zones = findTimezone(latitude, longitude);
    if (!zones.length) {
      skipped += 1;
      return [];
    }
    return [
      {
        geonameId: city.cityId,
        name: city.name,
        searchName: normalize(city.name),
        admin1: city.adminCode ?? null,
        countryCode: city.country,
        latitude,
        longitude,
        elevationM: 0,
        timezoneId: zones[0]!,
        population: city.population ?? 0,
      },
    ];
  });

  if (rows.length) {
    await database.insert(places).values(rows).onConflictDoNothing({ target: places.geonameId });
    written += rows.length;
  }
  if (start % (BATCH * 20) === 0) {
    console.warn(`${written.toLocaleString()} / ${cities.length.toLocaleString()}`);
  }
}

await database.execute(sql`analyze places`);
console.warn(
  `Done. ${written.toLocaleString()} places written, ${skipped} skipped with no time zone.`,
);
process.exit(0);

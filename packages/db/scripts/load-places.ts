/**
 * Load the atlas.
 *
 * `pnpm db:seed` inserts twenty-one places, which is enough to run the tests
 * and nothing like enough to find where somebody was born. This script fills
 * the table properly. `package.json` has referenced it as `places:import`
 * since the beginning; the file never existed, which is why every search in
 * Jade has been running against twenty-one cities.
 *
 * ## Where the data comes from, and why not GeoNames directly
 *
 * GeoNames is the source everyone uses and the obvious thing to fetch. It is
 * also a large download that has to be unzipped and parsed, and it is not
 * reachable from every environment this repo gets built in. `all-the-cities`
 * packages the same GeoNames extract — every settlement over 1,000 people,
 * with its GeoNames id intact — as an npm dependency, which makes this script
 * reproducible offline and turns a fragile network step into a lockfile entry.
 *
 * ## The timezone is derived, not looked up
 *
 * GeoNames ships a timezone column; this extract does not. So the zone comes
 * from `tz-lookup`, which resolves a coordinate against the tz boundary data
 * offline. That is not a downgrade. The zone Jade needs is the one governing
 * *the coordinate*, which is exactly what a boundary lookup answers, and it
 * stays right for a town sitting near a zone line — where a per-city column
 * is only as good as whoever filled it in.
 *
 * A place whose zone will not resolve is skipped rather than defaulted. A
 * chart cast in the wrong zone is wrong by hours, and constitution #3 forbids
 * exactly the silent default that would cause it.
 */

import { sql } from 'drizzle-orm';
import cities from 'all-the-cities';
import tzlookup from 'tz-lookup';
import { createDatabase } from '../src/client.js';
import { requireDatabaseUrl } from '../src/loadEnv.js';
import { places } from '../src/schema.js';

/**
 * US state codes to names.
 *
 * The extract gives `adminCode` as a two-letter code for US rows. Two letters
 * is what people type and the full name is what they read, so the table stores
 * the name and the search accepts either — "ann arbor mi" and "ann arbor
 * michigan" both have to work, because both are things a person actually
 * types.
 */
const US_STATES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  PR: 'Puerto Rico',
  VI: 'U.S. Virgin Islands',
  GU: 'Guam',
  AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
};

/** Diacritics stripped, lower-cased. What search matches against. */
function searchNameOf(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Which of the world's settlements to load.
 *
 * Every one in the United States, because that is where Jade's users are and
 * a birthplace search that cannot find Ypsilanti is not a birthplace search.
 * Elsewhere, everywhere over fifteen thousand people — which keeps the table
 * small enough to stay fast without a dedicated search service, while still
 * covering the cities a client is realistically born in.
 *
 * The floor is a knob, not a principle. Lower it the first time somebody
 * cannot find their village.
 */
const WORLD_POPULATION_FLOOR = 15_000;

interface Row {
  geonameId: number;
  name: string;
  searchName: string;
  admin1: string | null;
  countryCode: string;
  latitude: number;
  longitude: number;
  elevationM: number;
  timezoneId: string;
  population: number;
}

function rowsFrom(): { rows: Row[]; skipped: number } {
  const rows: Row[] = [];
  let skipped = 0;

  for (const city of cities) {
    const isUS = city.country === 'US';
    if (!isUS && city.population < WORLD_POPULATION_FLOOR) continue;

    // GeoJSON order. Getting this backwards puts the chart in the wrong
    // hemisphere and looks entirely plausible while doing it.
    const [longitude, latitude] = city.loc.coordinates;
    if (latitude === undefined || longitude === undefined) {
      skipped += 1;
      continue;
    }

    let timezoneId: string;
    try {
      timezoneId = tzlookup(latitude, longitude);
    } catch {
      skipped += 1;
      continue;
    }

    rows.push({
      geonameId: city.cityId,
      name: city.name,
      searchName: searchNameOf(city.name),
      admin1: isUS
        ? (US_STATES[city.adminCode ?? ''] ?? city.adminCode ?? null)
        : (city.adminCode ?? null),
      countryCode: city.country,
      latitude,
      longitude,
      elevationM: 0,
      timezoneId,
      population: city.population,
    });
  }

  return { rows, skipped };
}

async function main(): Promise<void> {
  const url = requireDatabaseUrl('direct');
  const database = createDatabase(url, { max: 1 });

  const { rows, skipped } = rowsFrom();
  const us = rows.filter((row) => row.countryCode === 'US').length;
  console.warn(
    `Prepared ${rows.length} place(s) — ${us} in the US, ${rows.length - us} elsewhere. ${skipped} skipped for want of a timezone.`,
  );

  /**
   * Written in batches, upserting on the GeoNames id.
   *
   * Upsert rather than insert-if-absent, so re-running picks up a corrected
   * name or a moved coordinate, and so the script is safe over a database
   * that already holds the seed rows.
   */
  const BATCH = 1_000;
  let written = 0;
  for (let index = 0; index < rows.length; index += BATCH) {
    const batch = rows.slice(index, index + BATCH);
    await database
      .insert(places)
      .values(batch)
      .onConflictDoUpdate({
        target: places.geonameId,
        set: {
          name: sql`excluded.name`,
          searchName: sql`excluded.search_name`,
          admin1: sql`excluded.admin1`,
          latitude: sql`excluded.latitude`,
          longitude: sql`excluded.longitude`,
          timezoneId: sql`excluded.timezone_id`,
          population: sql`excluded.population`,
        },
      });
    written += batch.length;
    if (written % 20_000 === 0) console.warn(`  …${written}`);
  }

  const result = await database.execute<{ count: string }>(
    sql`select count(*)::text as count from places`,
  );
  console.warn(`Atlas loaded. The table now holds ${result[0]?.count ?? '?'} place(s).`);
  await database.end?.();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

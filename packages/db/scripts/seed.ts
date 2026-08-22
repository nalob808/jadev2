/**
 * Seed the starter place list.
 *
 *   pnpm --filter @jade/db seed
 *
 * Idempotent. Run `pnpm places:import` afterwards for the full GeoNames set.
 */
import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/client.js';
import { places } from '../src/schema.js';
import { SEED_PLACES } from '../src/seedPlaces.js';

import { requireDatabaseUrl } from '../src/loadEnv.js';

let url: string;
try {
  url = requireDatabaseUrl('direct');
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const database = createDatabase(url, { max: 1 });

let inserted = 0;
for (const place of SEED_PLACES) {
  const existing = await database
    .select({ id: places.id })
    .from(places)
    .where(
      sql`${places.searchName} = ${place.searchName} and ${places.countryCode} = ${place.countryCode}`,
    )
    .limit(1);
  if (existing.length === 0) {
    await database.insert(places).values({ ...place, elevationM: place.elevationM ?? 0 });
    inserted += 1;
  }
}

console.warn(`Seeded ${inserted} new place(s); ${SEED_PLACES.length - inserted} already present.`);
process.exit(0);

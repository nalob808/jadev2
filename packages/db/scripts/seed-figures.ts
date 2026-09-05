import { sql } from 'drizzle-orm';
import { createDatabase } from '../src/client.js';
import { requireDatabaseUrl } from '../src/loadEnv.js';
import { publicFigures } from '../src/schema.js';
import { PUBLIC_FIGURES } from '../data/publicFigures.js';

/**
 * Seed or update the public chart library.
 *
 * Upserts on slug, so this is also how a record is corrected: edit
 * `data/publicFigures.ts` and run it again. Slugs are the published URL, so a
 * changed slug creates a new figure rather than renaming one — which is the
 * safe direction, since somebody may have linked to the old page.
 */
async function main(): Promise<void> {
  let url: string;
  try {
    url = requireDatabaseUrl('direct');
  } catch (error) {
    console.error((error as Error).message);
    process.exit(1);
  }
  const database = createDatabase(url, { max: 1 });

  let written = 0;
  for (const figure of PUBLIC_FIGURES) {
    await database
      .insert(publicFigures)
      .values(figure)
      .onConflictDoUpdate({
        target: publicFigures.slug,
        set: {
          displayName: figure.displayName,
          sortName: figure.sortName,
          alsoKnownAs: figure.alsoKnownAs ?? null,
          summary: figure.summary,
          birthDate: figure.birthDate,
          birthTime: figure.birthTime ?? null,
          rodden: figure.rodden,
          timeSource: figure.timeSource ?? null,
          placeName: figure.placeName,
          latitude: figure.latitude,
          longitude: figure.longitude,
          timezoneId: figure.timezoneId,
          diedOn: figure.diedOn ?? null,
          tags: figure.tags,
          sourceUrl: figure.sourceUrl ?? null,
          provenanceNote: figure.provenanceNote ?? null,
          updatedAt: new Date(),
        },
      });
    written += 1;
  }

  const [counts] = await database.execute<{ total: number; timed: number }>(sql`
    select count(*)::int as total,
           count(birth_time)::int as timed
      from public_figures`);

  console.log(
    `Seeded ${written} figure(s). Library holds ${counts?.total ?? 0}, of which ` +
      `${counts?.timed ?? 0} have an attested birth time.`,
  );
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});

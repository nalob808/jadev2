import { sql } from 'drizzle-orm';
import type { Database } from './client.js';
import journal from '../migrations/meta/_journal.json' with { type: 'json' };

/**
 * Is the database schema as new as the code that is talking to it?
 *
 * This exists because of a real gap. A Vercel deploy never touches the
 * database — the build compiles, the deploy succeeds, the health check goes
 * green, and every signed-in page then throws `column "position_basis" does
 * not exist` because a migration was never run. The site looks fine from the
 * outside and is broken for everyone who logs in.
 *
 * So the code carries the number of migrations it was built with, and asks the
 * database how many it has applied. `behind` means someone deployed without
 * migrating; `ahead` means the database was migrated for a newer deploy that
 * has not shipped yet, which is normal for a minute and a problem for an hour.
 *
 * Nothing here reveals anything about the data — only counts and a tag.
 */
export interface SchemaStatus {
  readonly expected: number;
  readonly applied: number;
  readonly latestExpected: string;
  readonly state: 'current' | 'behind' | 'ahead' | 'unknown';
  readonly detail?: string;
}

const entries = (journal as { entries: { tag: string }[] }).entries;
export const EXPECTED_MIGRATIONS = entries.length;
export const LATEST_MIGRATION = entries[entries.length - 1]?.tag ?? 'none';

export async function schemaStatus(db: Database): Promise<SchemaStatus> {
  const base = {
    expected: EXPECTED_MIGRATIONS,
    latestExpected: LATEST_MIGRATION,
  };
  try {
    const rows = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
    );
    const applied = Number(rows[0]?.n ?? 0);
    const state =
      applied === EXPECTED_MIGRATIONS
        ? 'current'
        : applied < EXPECTED_MIGRATIONS
          ? 'behind'
          : 'ahead';
    return {
      ...base,
      applied,
      state,
      ...(state === 'behind'
        ? {
            detail:
              `The database is ${EXPECTED_MIGRATIONS - applied} migration(s) behind this deploy. ` +
              'Run `pnpm db:migrate`. Signed-in pages will fail until you do.',
          }
        : {}),
    };
  } catch (error) {
    // A database that has never been migrated at all has no drizzle schema, so
    // the query itself fails. That is still a useful answer.
    return {
      ...base,
      applied: 0,
      state: 'unknown',
      detail: `Could not read the migration table: ${(error as Error).message}`,
    };
  }
}

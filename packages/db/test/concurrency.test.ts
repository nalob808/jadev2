import { beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDatabase, type Database } from '../src/client.js';
import { bootstrapUser } from '../src/queries.js';
import { workspaces } from '../src/schema.js';

/**
 * A first sign-in fires more than one request at once — the page and its data
 * fetch. Before the advisory lock, that produced either a unique-violation on
 * the email index or two workspaces for one person, and it only showed up
 * when a real browser hit a real server.
 */
const url = process.env.TEST_DATABASE_URL;
const describeWithDb = url ? describe : describe.skip;

/**
 * Guard: these tests TRUNCATE every table. Pointing TEST_DATABASE_URL at a
 * database holding real charts would destroy them, and the variable is one
 * careless copy-paste away from a production connection string.
 *
 * So: the URL must look like a test database, or you must say out loud that
 * you meant it.
 */
function assertSafeToTruncate(connectionString: string): void {
  const looksLikeTest = /test|localhost|127\.0\.0\.1|_dev\b/i.test(connectionString);
  if (!looksLikeTest && process.env.ALLOW_DESTRUCTIVE_TESTS !== '1') {
    throw new Error(
      'TEST_DATABASE_URL does not look like a test database, and these tests truncate every table. ' +
        'Point it at a scratch database, or set ALLOW_DESTRUCTIVE_TESTS=1 if you are certain.',
    );
  }
}

let database: Database;

beforeAll(async () => {
  if (!url) return;
  assertSafeToTruncate(url);
  database = createDatabase(url, { max: 10 });
  await database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls','on',true)`);
    await tx.execute(
      sql`truncate charts, birth_events, subjects, settings_profiles, memberships, workspaces, users cascade`,
    );
  });
});

describeWithDb('concurrent first sign-in', () => {
  it('eight simultaneous bootstraps yield exactly one user and one workspace', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        bootstrapUser(database, { email: 'race@example.com', name: 'Race' }),
      ),
    );

    const workspaceIds = new Set(results.map((r) => r.workspaceId));
    const userIds = new Set(results.map((r) => r.userId));
    expect(userIds.size).toBe(1);
    expect(workspaceIds.size).toBe(1);
    expect(results.filter((r) => r.created)).toHaveLength(1);

    const rows = await database.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.bypass_rls','on',true)`);
      return tx.select().from(workspaces);
    });
    expect(rows).toHaveLength(1);
  });
});

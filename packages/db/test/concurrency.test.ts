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

let database: Database;

beforeAll(async () => {
  if (!url) return;
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

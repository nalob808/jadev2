import { sql } from 'drizzle-orm';
import type { Database } from './client.js';

/**
 * Row-level security binding.
 *
 * Every policy in the migration reads `app.workspace_id` from the session.
 * This helper sets it for the duration of one transaction, so a query that
 * forgets its `where workspace_id = …` returns nothing rather than another
 * practice's client list.
 *
 * Application-level scoping is still expected — this is the net beneath it,
 * and the reason the net exists is that one missing WHERE clause in a product
 * holding other people's birth data is a breach, not a bug.
 */
export async function withWorkspace<T>(
  database: Database,
  workspaceId: string,
  work: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.workspace_id', ${workspaceId}, true)`);
    return work(tx);
  });
}

/**
 * Escape hatch for migrations, the places table, and background jobs that
 * legitimately span workspaces. Named so it is obvious in a diff.
 */
export async function asServiceRole<T>(
  database: Database,
  work: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
): Promise<T> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);
    return work(tx);
  });
}

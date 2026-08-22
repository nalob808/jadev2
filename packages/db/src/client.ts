import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDatabase>;

/**
 * The connection. Pooled for the app, direct for migrations.
 *
 * `prepare: false` is required by transaction-mode poolers (Neon's pooled
 * endpoint, Supabase's pgbouncer). Leaving it on produces intermittent
 * "prepared statement already exists" errors that only show up under load,
 * which is the worst possible time to discover them.
 */
export function createDatabase(connectionString: string, options: { max?: number } = {}) {
  const sql = postgres(connectionString, {
    max: options.max ?? 10,
    prepare: false,
    onnotice: (notice) => {
      // Drizzle's migrator runs CREATE SCHEMA/TABLE IF NOT EXISTS, and
      // Postgres answers with an "already exists, skipping" NOTICE on every
      // subsequent run. postgres.js prints those by default, so a perfectly
      // successful `pnpm db:migrate` looks like it threw two errors.
      // Everything above NOTICE still surfaces.
      const benign = notice.code === '42P06' || notice.code === '42P07';
      if (notice.severity === 'NOTICE' && benign) return;
      console.warn(`[postgres ${notice.severity}] ${notice.message}`);
    },
  });
  return drizzle(sql, { schema });
}

export { schema };

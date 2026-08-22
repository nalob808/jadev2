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
  });
  return drizzle(sql, { schema });
}

export { schema };

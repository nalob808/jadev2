import { createDatabase, type Database } from '@jade/db';
import { env } from './env.js';

/**
 * One connection pool per server process. Next's dev server reloads modules
 * on every edit, so the pool is stashed on globalThis — otherwise a morning
 * of editing exhausts the database's connection limit.
 */
const globalForDb = globalThis as unknown as { jadeDb?: Database };

export function getDatabase(): Database {
  if (!globalForDb.jadeDb) {
    globalForDb.jadeDb = createDatabase(env.databaseUrl, { max: 5 });
  }
  return globalForDb.jadeDb;
}

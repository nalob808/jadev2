/**
 * Apply pending migrations.
 *
 *   pnpm --filter @jade/db migrate
 *
 * Runs over DIRECT_DATABASE_URL, never the pooled endpoint — poolers in
 * transaction mode cannot hold the advisory locks a migration needs.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('Set DIRECT_DATABASE_URL (or DATABASE_URL) first. See .env.example.');
  process.exit(1);
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const sql = postgres(url, { max: 1 });

try {
  await migrate(drizzle(sql), { migrationsFolder });
  console.warn('Migrations applied.');
} finally {
  await sql.end();
}

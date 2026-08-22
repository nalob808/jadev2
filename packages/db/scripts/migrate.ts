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
import { requireDatabaseUrl } from '../src/loadEnv.js';

let url: string;
try {
  url = requireDatabaseUrl('direct');
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
const sql = postgres(url, {
  max: 1,
  onnotice: (notice) => {
    // See the note in src/client.ts — "already exists, skipping" on a re-run
    // is success, not failure.
    if (notice.code === '42P06' || notice.code === '42P07') return;
    console.warn(`[postgres ${notice.severity}] ${notice.message}`);
  },
});

try {
  await migrate(drizzle(sql), { migrationsFolder });
  console.warn('Migrations applied.');
} finally {
  await sql.end();
}

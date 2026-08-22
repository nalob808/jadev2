/**
 * Provision a non-bypassing application role.
 *
 *   pnpm db:app-role
 *
 * Why this exists: managed Postgres providers hand you an owner role with
 * BYPASSRLS. Neon's `neondb_owner` is a member of `neon_superuser`, which
 * carries it. A role with that attribute skips every row-level security
 * policy unconditionally — so an app connecting as the owner has no tenant
 * isolation at all, however carefully the policies are written.
 *
 * The fix is a second role: the owner keeps owning the schema and running
 * migrations, and the app connects as a plain role that cannot bypass
 * anything. Run this once, then put the printed URL in DATABASE_URL and leave
 * DIRECT_DATABASE_URL pointing at the owner.
 *
 * Safe to re-run: it updates the password and re-grants rather than failing.
 */
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import postgres from 'postgres';
import { requireDatabaseUrl } from '../src/loadEnv.js';

/**
 * With --write, DATABASE_URL in the root .env.local is updated in place, so
 * the new password never has to travel through a clipboard, a chat window or
 * a terminal scrollback.
 */
const WRITE = process.argv.includes('--write');

function updateEnvFile(newUrl: string): string | null {
  let dir = process.cwd();
  for (let depth = 0; depth < 5; depth += 1) {
    if (existsSync(resolve(dir, 'pnpm-workspace.yaml'))) break;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  const path = resolve(dir, '.env.local');
  if (!existsSync(path)) return null;

  const line = `DATABASE_URL="${newUrl}"`;
  const contents = readFileSync(path, 'utf8');
  const updated = /^DATABASE_URL=.*$/m.test(contents)
    ? contents.replace(/^DATABASE_URL=.*$/m, line)
    : `${contents.trimEnd()}\n${line}\n`;
  writeFileSync(path, updated);
  return path;
}

const ROLE = process.env.JADE_APP_ROLE ?? 'jade_app';

let ownerUrl: string;
try {
  ownerUrl = requireDatabaseUrl('direct');
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const password = process.env.JADE_APP_PASSWORD ?? randomBytes(24).toString('base64url');
const sql = postgres(ownerUrl, { max: 1, prepare: false, onnotice: () => {} });

try {
  const [me] = await sql<{ db: string; user: string; cancreate: boolean }[]>`
    select current_database() as db, current_user as user,
           (select rolcreaterole from pg_roles where rolname = current_user) as cancreate`;

  if (!me?.cancreate) {
    console.error(
      `\n${me?.user} cannot create roles on ${me?.db}.\n` +
        'Connect as the database owner (DIRECT_DATABASE_URL) and try again.\n',
    );
    process.exit(1);
  }

  const exists = await sql`select 1 from pg_roles where rolname = ${ROLE}`;
  try {
    if (exists.length === 0) {
      await sql.unsafe(
        // NOSUPERUSER is deliberately absent: only a superuser may set that
        // attribute at all, and a role created by a non-superuser cannot be one
        // anyway. NOBYPASSRLS is the attribute that actually matters here.
        `create role "${ROLE}" login password '${password.replace(/'/g, "''")}' nobypassrls nocreatedb nocreaterole`,
      );
      console.log(`created role ${ROLE}`);
    } else {
      await sql.unsafe(
        `alter role "${ROLE}" login password '${password.replace(/'/g, "''")}' nobypassrls`,
      );
      console.log(`updated role ${ROLE} (password rotated)`);
    }
  } catch (error) {
    // Most often: the role already exists but was created by someone else, so
    // this connection lacks ADMIN OPTION on it. Say that, rather than printing
    // a raw driver error object.
    console.error(
      `\nCould not create or alter role "${ROLE}".\n` +
        `  ${(error as Error).message}\n\n` +
        `  If the role already exists and belongs to another account, either grant\n` +
        `  admin on it, drop it, or pick a different name:\n` +
        `      JADE_APP_ROLE=jade_web pnpm db:app-role\n`,
    );
    process.exit(1);
  }

  // Exactly what the app needs and nothing more: no DDL, no ownership.
  await sql.unsafe(`grant connect on database "${me!.db}" to "${ROLE}"`);
  await sql.unsafe(`grant usage on schema public to "${ROLE}"`);
  await sql.unsafe(
    `grant select, insert, update, delete on all tables in schema public to "${ROLE}"`,
  );
  await sql.unsafe(`grant usage, select on all sequences in schema public to "${ROLE}"`);
  // Tables created by future migrations are covered automatically.
  await sql.unsafe(
    `alter default privileges for role "${me!.user}" in schema public grant select, insert, update, delete on tables to "${ROLE}"`,
  );
  await sql.unsafe(
    `alter default privileges for role "${me!.user}" in schema public grant usage, select on sequences to "${ROLE}"`,
  );

  const [check] = await sql<{ rolbypassrls: boolean; rolsuper: boolean }[]>`
    select rolbypassrls, rolsuper from pg_roles where rolname = ${ROLE}`;
  if (check?.rolbypassrls || check?.rolsuper) {
    console.error(`\n${ROLE} still has bypass privileges. Refusing to recommend it.\n`);
    process.exit(1);
  }

  const appUrl = new URL(ownerUrl);
  appUrl.username = ROLE;
  appUrl.password = password;

  console.log(`\n${ROLE} can neither bypass RLS nor act as superuser.`);

  if (WRITE) {
    const written = updateEnvFile(appUrl.toString());
    if (written) {
      console.log(`\nDATABASE_URL updated in ${written}.`);
      console.log('DIRECT_DATABASE_URL is untouched — migrations still run as the owner.\n');
      console.log('Restart the dev server (Next reads env files only at boot), then:');
      console.log('  pnpm db:doctor\n');
    } else {
      console.log('\nCould not find a .env.local at the repo root. Set this yourself:\n');
      console.log(`DATABASE_URL="${appUrl.toString()}"\n`);
    }
  } else {
    console.log('\nPut this in DATABASE_URL (the app), and leave DIRECT_DATABASE_URL as it is');
    console.log('(migrations need the owner):\n');
    console.log(`DATABASE_URL="${appUrl.toString()}"\n`);
    console.log('Or re-run with --write and Jade will edit .env.local for you.\n');
  }
} finally {
  await sql.end({ timeout: 5 });
}

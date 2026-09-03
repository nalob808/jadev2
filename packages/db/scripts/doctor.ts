/**
 * Database health check.
 *
 *   pnpm db:doctor
 *
 * Answers the question you cannot answer by reading code: is the row-level
 * security that isolates one practice from another actually in force on THIS
 * database, with THIS role?
 *
 * It matters because the answer is provider-specific. A role with SUPERUSER
 * or BYPASSRLS skips every policy unconditionally, and the isolation tests
 * would still pass locally while production quietly had none.
 */
import postgres from 'postgres';
import { requireDatabaseUrl } from '../src/loadEnv.js';

/**
 * Checks DATABASE_URL — the connection the *app* uses at runtime.
 *
 * Not DIRECT_DATABASE_URL: that one is the schema owner and is supposed to be
 * privileged, since migrations need it. An earlier version of this script
 * checked the owner, which meant it would have kept reporting failure even
 * after the fix landed.
 */
let url: string;
try {
  url = requireDatabaseUrl('pooled');
} catch (error) {
  console.error((error as Error).message);
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

const PASS = '  ok  ';
const FAIL = ' FAIL ';
const WARN = ' warn ';
let failures = 0;

function report(status: string, label: string, detail = ''): void {
  if (status === FAIL) failures += 1;
  console.log(`[${status}] ${label}${detail ? ` — ${detail}` : ''}`);
}

try {
  const [server] = await sql<{ version: string; db: string; user: string }[]>`
    select version() as version, current_database() as db, current_user as user`;
  console.log(`\n${server!.version.split(' on ')[0]}`);
  console.log(`database ${server!.db} as ${server!.user}`);
  console.log('checking DATABASE_URL — the role the app connects as at runtime\n');

  // --- 1. The role must not be able to skip policies -----------------------
  const [role] = await sql<{ rolsuper: boolean; rolbypassrls: boolean }[]>`
    select rolsuper, rolbypassrls from pg_roles where rolname = current_user`;

  if (role?.rolsuper) {
    report(
      FAIL,
      'role is a SUPERUSER',
      'superusers bypass every RLS policy; workspaces are NOT isolated',
    );
  } else if (role?.rolbypassrls) {
    report(
      FAIL,
      'role has BYPASSRLS',
      'this role skips every RLS policy; workspaces are NOT isolated',
    );
  } else {
    report(PASS, 'role cannot bypass row-level security');
  }

  // Membership is informational, not a failure. Verified against Postgres 16:
  // BYPASSRLS is a role ATTRIBUTE and is not inherited through membership —
  // a member of a BYPASSRLS role still has its inserts refused and its reads
  // filtered. Neon grants neondb_owner membership in neon_superuser, which
  // carries the attribute, so this line tells you which situation you are in.
  const bypassGroups = await sql<{ rolname: string }[]>`
    select r.rolname from pg_roles r
    where r.rolbypassrls
      and pg_has_role(current_user, r.oid, 'USAGE')
      and r.rolname <> current_user`;
  if (bypassGroups.length > 0) {
    report(
      WARN,
      'role is a member of',
      `${bypassGroups.map((r) => r.rolname).join(', ')} (has BYPASSRLS). Not inherited, so the probe below is the real answer.`,
    );
  }

  // --- 2. RLS enabled AND forced on every workspace-scoped table -----------
  //
  // This list is maintained by hand and has already fallen behind twice, so
  // the check below also fails on any *unlisted* workspace-scoped table. A
  // new table that nobody adds here is exactly the one whose policy nobody
  // wrote either, and a doctor that only checks the tables it was told about
  // reports a clean bill of health for precisely the wrong database.
  const expected = [
    'subjects',
    'birth_events',
    'charts',
    'settings_profiles',
    'memberships',
    'relationships',
    'watches',
    'watch_hits',
    'notes',
    'life_events',
    'upgrade_intents',
  ];
  const tables = await sql<{ relname: string; enabled: boolean; forced: boolean }[]>`
    select relname, relrowsecurity as enabled, relforcerowsecurity as forced
    from pg_class where relname = any(${expected}) and relkind = 'r'`;

  for (const name of expected) {
    const row = tables.find((t) => t.relname === name);
    if (!row) report(FAIL, `table ${name}`, 'missing — run pnpm db:migrate');
    else if (!row.enabled) report(FAIL, `RLS on ${name}`, 'not enabled');
    else if (!row.forced)
      report(FAIL, `RLS on ${name}`, 'enabled but not FORCED, so the owning role bypasses it');
    else report(PASS, `RLS forced on ${name}`);
  }

  // Tables that carry a workspace_id but are deliberately NOT workspace-scoped
  // under RLS. Each needs a reason, and the reason is printed, so this cannot
  // become a quiet dumping ground for tables somebody could not get working.
  const EXEMPT: Record<string, string> = {
    stripe_events:
      'written by the Stripe webhook, which has no session to bind; holds no personal data',
  };

  // Anything else carrying a workspace_id that the list above does not
  // mention. Finding one is not a warning: an unlisted table is a table whose
  // policy was never reviewed, holding data scoped to a practice.
  const unlisted = await sql<{ table_name: string }[]>`
    select c.relname as table_name
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join information_schema.columns col
        on col.table_name = c.relname and col.table_schema = n.nspname
     where n.nspname = 'public'
       and c.relkind = 'r'
       and col.column_name = 'workspace_id'
       and c.relname <> all(${expected})
     order by c.relname`;

  for (const row of unlisted) {
    const reason = EXEMPT[row.table_name];
    if (reason) {
      report(WARN, `table ${row.table_name}`, `intentionally not workspace-scoped — ${reason}`);
      continue;
    }
    report(
      FAIL,
      `table ${row.table_name}`,
      'is workspace-scoped but is not checked by this script — add it to `expected` in ' +
        'packages/db/scripts/doctor.ts and confirm its RLS policy exists, or to `EXEMPT` ' +
        'with a reason if it genuinely should not be isolated',
    );
  }

  // --- 3. A live probe, because configuration can lie ----------------------
  //
  // This provisions its own row rather than depending on you having added a
  // person first. An earlier version reported "inconclusive" on an empty
  // table, which meant the one check that actually proves isolation was the
  // one most likely to be skipped.
  const PROBE = 'jade-db-doctor-probe';
  const stranger = '00000000-0000-4000-8000-000000000000';

  const cleanup = async (): Promise<void> => {
    await sql.begin(async (tx) => {
      await tx`select set_config('app.bypass_rls', 'on', true)`;
      await tx`delete from subjects using workspaces
               where subjects.workspace_id = workspaces.id and workspaces.slug = ${PROBE}`;
      await tx`delete from workspaces where slug = ${PROBE}`;
    });
  };

  await cleanup(); // in case an earlier run was interrupted

  try {
    const probeWorkspace = await sql.begin(async (tx) => {
      await tx`select set_config('app.bypass_rls', 'on', true)`;
      const [workspace] = await tx<{ id: string }[]>`
        insert into workspaces (name, slug) values ('Doctor probe', ${PROBE}) returning id`;
      await tx`insert into subjects (workspace_id, display_name)
               values (${workspace!.id}, 'Doctor probe')`;
      return workspace!.id;
    });

    const asStranger = await sql.begin(async (tx) => {
      await tx`select set_config('app.workspace_id', ${stranger}, true)`;
      return tx`select count(*)::int as n from subjects where display_name = 'Doctor probe'`;
    });
    const strangerSees = (asStranger as unknown as { n: number }[])[0]!.n;
    report(
      strangerSees === 0 ? PASS : FAIL,
      'isolation probe',
      strangerSees === 0
        ? 'a different workspace cannot see the probe row'
        : 'a DIFFERENT WORKSPACE CAN READ THIS ROW — workspaces are not isolated',
    );

    const unbound =
      await sql`select count(*)::int as n from subjects where display_name = 'Doctor probe'`;
    const unboundSees = (unbound as unknown as { n: number }[])[0]!.n;
    report(
      unboundSees === 0 ? PASS : FAIL,
      'isolation probe',
      unboundSees === 0
        ? 'a connection with no workspace bound sees nothing'
        : 'an UNSCOPED QUERY RETURNED THE ROW — a missing WHERE clause would leak data',
    );

    const asOwner = await sql.begin(async (tx) => {
      await tx`select set_config('app.workspace_id', ${probeWorkspace}, true)`;
      return tx`select count(*)::int as n from subjects where display_name = 'Doctor probe'`;
    });
    const ownerSees = (asOwner as unknown as { n: number }[])[0]!.n;
    report(
      ownerSees === 1 ? PASS : FAIL,
      'isolation probe',
      ownerSees === 1
        ? 'the owning workspace can see its own row'
        : 'the owning workspace CANNOT see its own row — policies are too strict',
    );
  } finally {
    await cleanup();
  }

  // --- 4. Data that should be there ---------------------------------------
  const [places] = await sql<{ n: number }[]>`select count(*)::int as n from places`;
  if (!places || places.n === 0) report(FAIL, 'places', 'empty — run pnpm db:seed');
  else if (places.n < 1000)
    report(WARN, 'places', `${places.n} seeded; run pnpm places:import for the full atlas`);
  else report(PASS, 'places', `${places.n.toLocaleString()} loaded`);

  const [trgm] = await sql<{ n: number }[]>`
    select count(*)::int as n from pg_extension where extname = 'pg_trgm'`;
  report(
    trgm && trgm.n > 0 ? PASS : FAIL,
    'pg_trgm extension',
    trgm && trgm.n > 0 ? '' : 'place search will be slow',
  );

  console.log(
    failures === 0
      ? '\nAll checks passed.\n'
      : `\n${failures} check(s) failed. Workspace isolation may not hold — do not put real client data in this database until they pass.\n`,
  );
} finally {
  await sql.end({ timeout: 5 });
}

process.exit(failures === 0 ? 0 : 1);

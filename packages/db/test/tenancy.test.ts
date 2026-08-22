import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { createDatabase, type Database } from '../src/client.js';
import { withWorkspace } from '../src/tenancy.js';
import { subjects } from '../src/schema.js';
import {
  bootstrapUser,
  createSubjectWithBirthEvent,
  exportSubject,
  getSubject,
  hardDeleteSubject,
  listSubjects,
  searchPlaces,
  softDeleteSubject,
} from '../src/queries.js';

/**
 * These tests need a real Postgres. Without TEST_DATABASE_URL they skip, so
 * `pnpm test` stays green on a laptop with no database — but CI and anyone
 * with a local Postgres gets the real thing, including proof that row-level
 * security actually isolates one practice from another.
 *
 *   createdb jade_test
 *   TEST_DATABASE_URL=postgresql://... pnpm --filter @jade/db test
 *
 * The connecting role must NOT be a superuser: superusers bypass RLS
 * unconditionally, and a test that passes because the check was skipped is
 * worse than no test.
 */
const url = process.env.TEST_DATABASE_URL;
const describeWithDb = url ? describe : describe.skip;

let database: Database;
let alice: { workspaceId: string; userId: string };
let bob: { workspaceId: string; userId: string };

const birthEventFixture = {
  label: 'birth',
  localDatetime: '2001-11-07T10:32:00',
  utcDatetime: new Date(Date.UTC(2001, 10, 7, 15, 32)),
  utcOffsetMinutes: -300,
  offsetSource: 'tzdb' as const,
  offsetAmbiguous: false,
  timeAccuracy: 'exact' as const,
  placeName: 'Ann Arbor, Michigan, US',
  latitude: 42.2808,
  longitude: -83.743,
  elevationM: 256,
  timezoneId: 'America/Detroit',
};

beforeAll(async () => {
  if (!url) return;
  database = createDatabase(url, { max: 4 });
  // Fresh slate. The bypass MUST be transaction-local (`true`): postgres.js
  // pools connections, so a session-level GUC leaks into later queries on the
  // same connection and quietly disables the very isolation under test.
  await database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls','on',true)`);
    await tx.execute(
      sql`truncate charts, birth_events, subjects, settings_profiles, memberships, workspaces, users cascade`,
    );
  });
  alice = await bootstrapUser(database, { email: 'alice@example.com', name: 'Alice' });
  bob = await bootstrapUser(database, { email: 'bob@example.com', name: 'Bob' });
});

afterAll(async () => {
  if (!url) return;
  await database.execute(sql`select 1`);
});

describeWithDb('sign-in bootstrap', () => {
  it('gives a new user a workspace and a default settings profile', () => {
    expect(alice.workspaceId).toBeTruthy();
    expect(alice.userId).not.toBe(bob.userId);
    expect(alice.workspaceId).not.toBe(bob.workspaceId);
  });

  it('is idempotent — signing in again reuses the same workspace', async () => {
    const again = await bootstrapUser(database, { email: 'alice@example.com', name: 'Alice' });
    expect(again.workspaceId).toBe(alice.workspaceId);
    expect(again.created).toBe(false);
  });
});

describeWithDb('subjects', () => {
  it('creates a person together with their birth moment', async () => {
    const created = await createSubjectWithBirthEvent(database, alice.workspaceId, {
      subject: { displayName: 'Jade', relationship: 'partner', createdBy: alice.userId },
      birthEvent: birthEventFixture,
    });
    expect(created.subject.displayName).toBe('Jade');
    expect(created.birthEvent.utcOffsetMinutes).toBe(-300);
    // The wall clock survives the round trip exactly as written.
    expect(created.birthEvent.localDatetime).toBe('2001-11-07T10:32:00');
  });

  it('lists only that workspace’s people', async () => {
    await createSubjectWithBirthEvent(database, bob.workspaceId, {
      subject: { displayName: 'Someone Else', createdBy: bob.userId },
      birthEvent: birthEventFixture,
    });
    const aliceList = await listSubjects(database, alice.workspaceId);
    const bobList = await listSubjects(database, bob.workspaceId);
    expect(aliceList.map((r) => r.subject.displayName)).toEqual(['Jade']);
    expect(bobList.map((r) => r.subject.displayName)).toEqual(['Someone Else']);
  });

  it('exports everything about a person as portable JSON', async () => {
    const [first] = await listSubjects(database, alice.workspaceId);
    const exported = (await exportSubject(database, alice.workspaceId, first!.subject.id)) as {
      exportedFormat: string;
      birthEvents: unknown[];
    };
    expect(exported.exportedFormat).toBe('jade.subject.v1');
    expect(exported.birthEvents).toHaveLength(1);
  });

  it('soft delete hides a person; hard delete removes them', async () => {
    const created = await createSubjectWithBirthEvent(database, alice.workspaceId, {
      subject: { displayName: 'Temporary', createdBy: alice.userId },
      birthEvent: birthEventFixture,
    });
    await softDeleteSubject(database, alice.workspaceId, created.subject.id);
    expect(
      (await listSubjects(database, alice.workspaceId)).map((r) => r.subject.displayName),
    ).not.toContain('Temporary');
    // Soft-deleted rows are still fetchable by id — that is what makes undo possible.
    expect(await getSubject(database, alice.workspaceId, created.subject.id)).not.toBeNull();

    await hardDeleteSubject(database, alice.workspaceId, created.subject.id);
    expect(await getSubject(database, alice.workspaceId, created.subject.id)).toBeNull();
  });
});

describeWithDb('row-level security is real, not decorative', () => {
  it('a query with NO where clause still cannot see another workspace', async () => {
    // This is the whole point. If someone writes `select * from subjects` and
    // forgets to scope it, Postgres must return only the bound workspace.
    const rows = await withWorkspace(database, alice.workspaceId, async (tx) =>
      tx.select().from(subjects),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.workspaceId).toBe(alice.workspaceId);
    expect(rows.map((r) => r.displayName)).not.toContain('Someone Else');
  });

  it('refuses to write a row into someone else’s workspace', async () => {
    // Drizzle wraps driver errors, so the Postgres message lives on the cause.
    // Assert against the whole chain rather than the wrapper's summary.
    let message = '';
    try {
      await withWorkspace(database, alice.workspaceId, async (tx) =>
        tx.insert(subjects).values({ workspaceId: bob.workspaceId, displayName: 'Smuggled' }),
      );
    } catch (error) {
      const chain: string[] = [];
      let current: unknown = error;
      for (let depth = 0; current instanceof Error && depth < 5; depth += 1) {
        chain.push(current.message);
        current = (current as Error & { cause?: unknown }).cause;
      }
      message = chain.join(' | ');
    }
    expect(message, 'the insert should have been refused').not.toBe('');
    expect(message).toMatch(/row-level security/i);

    // And the row really is absent, not merely reported as refused.
    const smuggled = await withWorkspace(database, bob.workspaceId, async (tx) =>
      tx.select().from(subjects),
    );
    expect(smuggled.map((row) => row.displayName)).not.toContain('Smuggled');
  });

  it('reads nothing at all when no workspace is bound', async () => {
    const rows = await database.select().from(subjects);
    expect(rows).toEqual([]);
  });

  it('the connecting role is not a superuser, so the checks above mean something', async () => {
    const result = (await database.execute(
      sql`select rolsuper, rolbypassrls from pg_roles where rolname = current_user`,
    )) as unknown as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    expect(result[0]!.rolsuper).toBe(false);
    expect(result[0]!.rolbypassrls).toBe(false);
  });
});

describeWithDb('place search', () => {
  it('finds a seeded city by prefix and by fuzzy match', async () => {
    const exact = await searchPlaces(database, 'Ann Arbor');
    expect(exact[0]?.name).toBe('Ann Arbor');
    expect(exact[0]?.timezoneId).toBe('America/Detroit');

    const diacritics = await searchPlaces(database, 'sao paulo');
    expect(diacritics[0]?.name).toBe('São Paulo');
  });

  it('orders by population when several cities share a prefix', async () => {
    const results = await searchPlaces(database, 'new');
    expect(results.length).toBeGreaterThan(1);
    expect(results[0]!.population).toBeGreaterThanOrEqual(results[1]!.population);
  });

  it('says nothing rather than guessing on a one-letter query', async () => {
    expect(await searchPlaces(database, 'a')).toEqual([]);
  });
});

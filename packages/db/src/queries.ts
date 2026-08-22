import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import type { Database } from './client.js';
import { withWorkspace } from './tenancy.js';
import {
  birthEvents,
  charts,
  memberships,
  places,
  settingsProfiles,
  subjects,
  users,
  workspaces,
  type NewBirthEvent,
  type NewSubject,
} from './schema.js';

/**
 * Every query in here is workspace-scoped in the application layer AND runs
 * inside `withWorkspace`, so the database refuses cross-tenant rows even if
 * one of these forgets a WHERE clause. Belt and braces, on purpose.
 */

// ---------------------------------------------------------------------------
// Sign-in: find or create the user, and give a first-time user a workspace
// ---------------------------------------------------------------------------

export interface BootstrapResult {
  userId: string;
  workspaceId: string;
  settingsProfileId: string;
  created: boolean;
}

/**
 * Idempotent sign-in. Called on every authenticated request's first touch;
 * safe to call repeatedly, and creates a workspace plus a default "House
 * style" settings profile the first time someone appears.
 */
export async function bootstrapUser(
  database: Database,
  input: { email: string; name?: string | null; avatarUrl?: string | null },
): Promise<BootstrapResult> {
  return database.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.bypass_rls', 'on', true)`);

    // Serialise per-email. Two requests can land at once on a first sign-in —
    // a page load and its data fetch — and without this both create a
    // workspace, or race on the unique email index. Advisory locks are held
    // for the transaction and released automatically.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${input.email}))`);

    // Upsert rather than select-then-insert, so a concurrent writer that beat
    // the lock still yields a row instead of a unique-violation.
    const user = (
      await tx
        .insert(users)
        .values({
          email: input.email,
          name: input.name ?? null,
          avatarUrl: input.avatarUrl ?? null,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            name: sql`coalesce(excluded.name, ${users.name})`,
            avatarUrl: sql`coalesce(excluded.avatar_url, ${users.avatarUrl})`,
          },
        })
        .returning()
    )[0]!;

    const existingMembership = await tx
      .select()
      .from(memberships)
      .where(eq(memberships.userId, user.id))
      .limit(1);

    if (existingMembership[0]) {
      const profile = await tx
        .select()
        .from(settingsProfiles)
        .where(
          and(
            eq(settingsProfiles.workspaceId, existingMembership[0].workspaceId),
            eq(settingsProfiles.isDefault, true),
          ),
        )
        .limit(1);
      return {
        userId: user.id,
        workspaceId: existingMembership[0].workspaceId,
        settingsProfileId: profile[0]!.id,
        created: false,
      };
    }

    const displayName = input.name?.trim() || input.email.split('@')[0]!;
    const workspace = (
      await tx
        .insert(workspaces)
        .values({ name: `${displayName}'s practice`, slug: slugify(displayName, user.id) })
        .returning()
    )[0]!;

    await tx
      .insert(memberships)
      .values({ userId: user.id, workspaceId: workspace.id, role: 'owner' });

    const profile = (
      await tx
        .insert(settingsProfiles)
        .values({ workspaceId: workspace.id, name: 'House style', isDefault: true })
        .returning()
    )[0]!;

    await tx
      .update(workspaces)
      .set({ defaultSettingsProfileId: profile.id })
      .where(eq(workspaces.id, workspace.id));

    return {
      userId: user.id,
      workspaceId: workspace.id,
      settingsProfileId: profile.id,
      created: true,
    };
  });
}

function slugify(name: string, salt: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${base || 'practice'}-${salt.slice(0, 8)}`;
}

// ---------------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------------

export interface SubjectWithPrimaryEvent {
  subject: typeof subjects.$inferSelect;
  birthEvent: typeof birthEvents.$inferSelect | null;
}

export async function listSubjects(
  database: Database,
  workspaceId: string,
): Promise<SubjectWithPrimaryEvent[]> {
  return withWorkspace(database, workspaceId, async (tx) => {
    const rows = await tx
      .select({ subject: subjects, birthEvent: birthEvents })
      .from(subjects)
      .leftJoin(
        birthEvents,
        and(eq(birthEvents.subjectId, subjects.id), eq(birthEvents.isPrimary, true)),
      )
      .where(and(eq(subjects.workspaceId, workspaceId), isNull(subjects.deletedAt)))
      .orderBy(desc(subjects.updatedAt));
    return rows;
  });
}

export async function getSubject(
  database: Database,
  workspaceId: string,
  subjectId: string,
): Promise<SubjectWithPrimaryEvent | null> {
  return withWorkspace(database, workspaceId, async (tx) => {
    const rows = await tx
      .select({ subject: subjects, birthEvent: birthEvents })
      .from(subjects)
      .leftJoin(
        birthEvents,
        and(eq(birthEvents.subjectId, subjects.id), eq(birthEvents.isPrimary, true)),
      )
      .where(and(eq(subjects.id, subjectId), eq(subjects.workspaceId, workspaceId)))
      .limit(1);
    return rows[0] ?? null;
  });
}

/** Create a person and their birth moment together — they are never useful apart. */
export async function createSubjectWithBirthEvent(
  database: Database,
  workspaceId: string,
  input: {
    subject: Omit<NewSubject, 'workspaceId'>;
    birthEvent: Omit<NewBirthEvent, 'workspaceId' | 'subjectId'>;
  },
): Promise<SubjectWithPrimaryEvent> {
  return withWorkspace(database, workspaceId, async (tx) => {
    const subject = (
      await tx
        .insert(subjects)
        .values({ ...input.subject, workspaceId })
        .returning()
    )[0]!;
    const birthEvent = (
      await tx
        .insert(birthEvents)
        .values({ ...input.birthEvent, workspaceId, subjectId: subject.id, isPrimary: true })
        .returning()
    )[0]!;
    return { subject, birthEvent };
  });
}

export async function updateSubject(
  database: Database,
  workspaceId: string,
  subjectId: string,
  patch: Partial<NewSubject>,
): Promise<void> {
  await withWorkspace(database, workspaceId, async (tx) => {
    await tx
      .update(subjects)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(subjects.id, subjectId), eq(subjects.workspaceId, workspaceId)));
  });
}

/** Soft delete — recoverable, and what the UI's "remove" does. */
export async function softDeleteSubject(
  database: Database,
  workspaceId: string,
  subjectId: string,
): Promise<void> {
  await withWorkspace(database, workspaceId, async (tx) => {
    await tx
      .update(subjects)
      .set({ deletedAt: new Date() })
      .where(and(eq(subjects.id, subjectId), eq(subjects.workspaceId, workspaceId)));
  });
}

/**
 * Hard delete. Separate, explicit, and irreversible — this is what a data
 * deletion request must actually do. Cascades remove the birth events and
 * cached charts with it.
 */
export async function hardDeleteSubject(
  database: Database,
  workspaceId: string,
  subjectId: string,
): Promise<void> {
  await withWorkspace(database, workspaceId, async (tx) => {
    await tx
      .delete(subjects)
      .where(and(eq(subjects.id, subjectId), eq(subjects.workspaceId, workspaceId)));
  });
}

/** Everything Jade holds about one person, as portable JSON. No hostage-taking. */
export async function exportSubject(
  database: Database,
  workspaceId: string,
  subjectId: string,
): Promise<unknown> {
  return withWorkspace(database, workspaceId, async (tx) => {
    const subject = (
      await tx.select().from(subjects).where(eq(subjects.id, subjectId)).limit(1)
    )[0];
    if (!subject) return null;
    const events = await tx.select().from(birthEvents).where(eq(birthEvents.subjectId, subjectId));
    return { exportedFormat: 'jade.subject.v1', subject, birthEvents: events };
  });
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

/**
 * Place search. Prefix matches first, then trigram similarity, population
 * breaking ties — someone typing "Springfield" almost always means the big one.
 */
export async function searchPlaces(
  database: Database,
  query: string,
  limit = 8,
): Promise<(typeof places.$inferSelect)[]> {
  const normalized = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (normalized.length < 2) return [];

  return database
    .select()
    .from(places)
    .where(
      sql`${places.searchName} like ${normalized + '%'} or ${places.searchName} % ${normalized}`,
    )
    .orderBy(
      sql`case when ${places.searchName} = ${normalized} then 0
               when ${places.searchName} like ${normalized + '%'} then 1
               else 2 end`,
      desc(places.population),
    )
    .limit(limit);
}

// ---------------------------------------------------------------------------
// Charts — content-addressed cache
// ---------------------------------------------------------------------------

export async function getCachedChart(
  database: Database,
  workspaceId: string,
  chartId: string,
): Promise<unknown | null> {
  return withWorkspace(database, workspaceId, async (tx) => {
    const rows = await tx.select().from(charts).where(eq(charts.id, chartId)).limit(1);
    return rows[0]?.computed ?? null;
  });
}

export async function putCachedChart(
  database: Database,
  workspaceId: string,
  input: {
    id: string;
    birthEventId: string;
    settingsProfileId: string | null;
    astroVersion: string;
    computed: unknown;
  },
): Promise<void> {
  await withWorkspace(database, workspaceId, async (tx) => {
    await tx
      .insert(charts)
      .values({
        id: input.id,
        workspaceId,
        birthEventId: input.birthEventId,
        settingsProfileId: input.settingsProfileId,
        astroVersion: input.astroVersion,
        computed: input.computed as object,
      })
      .onConflictDoNothing();
  });
}

export async function getSettingsProfile(
  database: Database,
  workspaceId: string,
  profileId: string,
): Promise<typeof settingsProfiles.$inferSelect | null> {
  return withWorkspace(database, workspaceId, async (tx) => {
    const rows = await tx
      .select()
      .from(settingsProfiles)
      .where(eq(settingsProfiles.id, profileId))
      .limit(1);
    return rows[0] ?? null;
  });
}

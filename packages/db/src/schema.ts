import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Jade's schema. Two ideas drive it (docs/02-domain-model.md):
 *
 *  1. A subject is not a chart. People have several birth events — recorded,
 *     rectified, relocated. Charts are derived and disposable; subjects and
 *     their events are precious.
 *  2. Every row that can belong to a practice carries `workspace_id`, and
 *     Postgres itself enforces who may read it. Row-level security is in the
 *     migration, not just in application code.
 */

// ---------------------------------------------------------------------------
// Enumerations. Closed sets, validated by the database rather than by hope.
// ---------------------------------------------------------------------------

export const membershipRole = pgEnum('membership_role', [
  'owner',
  'astrologer',
  'assistant',
  'viewer',
]);

export const subjectKind = pgEnum('subject_kind', ['person', 'entity', 'event', 'mundane']);

export const subjectRelationship = pgEnum('subject_relationship', [
  'self',
  'partner',
  'family',
  'friend',
  'client',
  'public_figure',
  'other',
]);

export const subjectPrivacy = pgEnum('subject_privacy', ['private', 'workspace', 'shared']);

/** How sharply a reported life event is dated. Drives the transit window. */
export const lifeEventPrecision = pgEnum('life_event_precision', ['day', 'month', 'year']);

/** Where a UTC offset came from. Never inferred after the fact. */
export const offsetSource = pgEnum('offset_source', ['tzdb', 'manual', 'lmt']);

/** How precisely the birth time is known — drives the ascendant confidence band. */
export const timeAccuracy = pgEnum('time_accuracy', ['exact', 'min5', 'min30', 'hour2', 'unknown']);

export const ayanamsaMode = pgEnum('ayanamsa_mode', [
  'lahiri',
  'lahiri_true_chitra',
  'raman',
  'krishnamurti',
  'yukteshwar',
  'fagan_bradley',
  'suryasiddhanta',
  'custom',
]);

export const nodeType = pgEnum('node_type', ['mean', 'true']);

/**
 * Apparent (light-time, aberration and deflection applied — the astronomical
 * standard) or true (geometric, which is what Jagannātha Hora computes). They
 * differ by up to 55 arcseconds. Persisted with the profile because a chart
 * must always be able to say which one produced it.
 */
export const positionBasis = pgEnum('position_basis', ['apparent', 'true']);

export const houseSystem = pgEnum('house_system', ['whole_sign', 'equal', 'sripati', 'placidus']);

export const chartStyle = pgEnum('chart_style', ['north', 'south', 'east', 'western_wheel']);

/**
 * What a note is fastened to.
 *
 * These are the factor *names* Jade computes, never chart rows — see
 * `packages/astro/src/notes/anchors.ts` for why identity has to survive a
 * settings change.
 */
export const noteAnchorKind = pgEnum('note_anchor_kind', [
  'chart',
  'graha',
  'house',
  'sign',
  'nakshatra',
  'yoga',
  'dasha',
  'varga',
]);

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  }),
);

/** One practice. Owns subjects, sessions, branding and the subscription. */
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    plan: text('plan').notNull().default('free'),
    /**
     * Why this workspace is on that tier: 'default', 'grandfathered',
     * 'stripe', or 'manual'. Billing must consult this before downgrading —
     * "no active subscription" is not the same fact as "should be free", and
     * conflating them cancels every comped and grandfathered account at once.
     */
    planSource: text('plan_source').notNull().default('default'),
    /** Stripe's customer id. One customer, one workspace — enforced by a unique index. */
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    /**
     * Stripe's own status word, stored verbatim: 'active', 'trialing',
     * 'past_due', 'canceled', 'incomplete', 'unpaid'. Not a boolean — a card
     * that failed once is not a cancelled subscription, and collapsing the two
     * either cuts off someone about to pay or keeps a lapsed account in.
     */
    subscriptionStatus: text('subscription_status'),
    subscriptionPeriodEnd: timestamp('subscription_period_end', { withTimezone: true }),
    defaultSettingsProfileId: uuid('default_settings_profile_id'),
    /**
     * IANA zone the practice reads its clock in. NULL means unset — the UI
     * renders UTC and says so rather than guessing, which is the same rule the
     * astrology settings follow. Deliberately not on `settings_profiles`: the
     * lens and the wall clock are unrelated and must not be able to disagree.
     */
    homeZoneId: text('home_zone_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('workspaces_slug_idx').on(table.slug),
  }),
);

export const memberships = pgTable(
  'memberships',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    role: membershipRole('role').notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.workspaceId] }),
    workspaceIdx: index('memberships_workspace_idx').on(table.workspaceId),
  }),
);

// ---------------------------------------------------------------------------
// Places — GeoNames-derived, shared across every workspace
// ---------------------------------------------------------------------------

export const places = pgTable(
  'places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    geonameId: integer('geoname_id'),
    name: text('name').notNull(),
    /** Lower-cased, diacritics stripped. What search actually matches against. */
    searchName: text('search_name').notNull(),
    admin1: text('admin1'),
    countryCode: text('country_code').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    elevationM: integer('elevation_m'),
    timezoneId: text('timezone_id').notNull(),
    population: integer('population').notNull().default(0),
  },
  (table) => ({
    geonameIdx: uniqueIndex('places_geoname_idx').on(table.geonameId),
    searchIdx: index('places_search_idx').on(table.searchName),
    populationIdx: index('places_population_idx').on(table.population),
  }),
);

// ---------------------------------------------------------------------------
// The astrological lens
// ---------------------------------------------------------------------------

export const settingsProfiles = pgTable(
  'settings_profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    ayanamsa: ayanamsaMode('ayanamsa').notNull().default('lahiri'),
    customAyanamsaAtJ2000: doublePrecision('custom_ayanamsa_at_j2000'),
    nodeType: nodeType('node_type').notNull().default('mean'),
    houseSystem: houseSystem('house_system').notNull().default('whole_sign'),
    positionBasis: positionBasis('position_basis').notNull().default('apparent'),
    chartStyle: chartStyle('chart_style').notNull().default('north'),
    includeOuters: boolean('include_outers').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('settings_profiles_workspace_idx').on(table.workspaceId),
  }),
);

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export const subjects = pgTable(
  'subjects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    kind: subjectKind('kind').notNull().default('person'),
    displayName: text('display_name').notNull(),
    givenNames: text('given_names'),
    familyName: text('family_name'),
    pronouns: text('pronouns'),
    photoUrl: text('photo_url'),
    relationship: subjectRelationship('relationship').notNull().default('other'),
    isClient: boolean('is_client').notNull().default(false),
    tags: text('tags').array().notNull().default([]),
    notesSummary: text('notes_summary'),
    privacy: subjectPrivacy('privacy').notNull().default('workspace'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete. Hard delete is a separate, explicit action. */
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => ({
    workspaceIdx: index('subjects_workspace_idx').on(table.workspaceId),
    nameIdx: index('subjects_name_idx').on(table.workspaceId, table.displayName),
  }),
);

/**
 * A dated, timed, located moment belonging to a subject.
 *
 * `localDatetime` is TEXT on purpose. It is a wall-clock reading off a birth
 * certificate, not an instant, and every driver disagrees about how to
 * round-trip `timestamp without time zone`. Storing the exact characters
 * removes an entire class of silent one-hour bugs. The instant lives in
 * `utcDatetime`, and the two are reconciled by `utcOffsetMinutes` — which is
 * always stored with the record of how it was resolved.
 */
export const birthEvents = pgTable(
  'birth_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default('birth'),
    isPrimary: boolean('is_primary').notNull().default(true),

    localDatetime: text('local_datetime').notNull(),
    utcDatetime: timestamp('utc_datetime', { withTimezone: true }).notNull(),
    utcOffsetMinutes: integer('utc_offset_minutes').notNull(),
    offsetSource: offsetSource('offset_source').notNull(),
    /** True when the wall time was genuinely undecidable — the UI must say so. */
    offsetAmbiguous: boolean('offset_ambiguous').notNull().default(false),
    offsetNote: text('offset_note'),
    timeAccuracy: timeAccuracy('time_accuracy').notNull().default('exact'),

    placeId: uuid('place_id').references(() => places.id, { onDelete: 'set null' }),
    placeName: text('place_name').notNull(),
    latitude: doublePrecision('latitude').notNull(),
    longitude: doublePrecision('longitude').notNull(),
    elevationM: integer('elevation_m').notNull().default(0),
    timezoneId: text('timezone_id').notNull(),

    sourceNote: text('source_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index('birth_events_subject_idx').on(table.subjectId),
    workspaceIdx: index('birth_events_workspace_idx').on(table.workspaceId),
  }),
);

/**
 * Life events, the evidence a rectification is fitted to.
 *
 * Attached to the subject rather than to a birth event, because they outlive
 * any particular candidate: you rectify, adopt a new birth event, gather two
 * more events, and rectify again against the same log.
 *
 * `occurredOn` is a date and `precision` says how much of it to believe. A
 * client reports a day, a month or a year — never a time — and recording that
 * honestly is what stops the scorer treating "sometime in 1997" as sharp
 * evidence.
 */
export const lifeEvents = pgTable(
  'life_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    /** Matches LifeEventKind in @jade/astro. Text so the vocabulary can grow. */
    kind: text('kind').notNull(),
    occurredOn: date('occurred_on').notNull(),
    precision: lifeEventPrecision('precision').notNull().default('day'),
    note: text('note'),
    /** Excluded from a sweep without being deleted. */
    enabled: boolean('enabled').notNull().default(true),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index('life_events_subject_idx').on(table.subjectId, table.occurredOn),
    workspaceIdx: index('life_events_workspace_idx').on(table.workspaceId),
  }),
);

/**
 * Computed charts. Derived, never authored.
 *
 * The primary key is a hash of (birth event + settings + calculation package
 * version), so a chart can never be stale: change the maths and every
 * affected row is simply a cache miss.
 */
export const charts = pgTable(
  'charts',
  {
    id: text('id').primaryKey(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    birthEventId: uuid('birth_event_id')
      .notNull()
      .references(() => birthEvents.id, { onDelete: 'cascade' }),
    settingsProfileId: uuid('settings_profile_id').references(() => settingsProfiles.id, {
      onDelete: 'set null',
    }),
    astroVersion: text('astro_version').notNull(),
    computed: jsonb('computed').notNull(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    birthEventIdx: index('charts_birth_event_idx').on(table.birthEventId),
    workspaceIdx: index('charts_workspace_idx').on(table.workspaceId),
  }),
);

/**
 * A relationship between two subjects in the same workspace.
 *
 * Stored as a pair with a canonical order — `subjectAId < subjectBId` by uuid —
 * so a couple can only be recorded once regardless of who was added first.
 * The unique index enforces it; the check constraint keeps the ordering honest
 * and stops a subject being related to itself.
 */
export const relationshipKind = pgEnum('relationship_kind', [
  'partner',
  'family',
  'friend',
  'professional',
  'other',
]);

export const relationships = pgTable(
  'relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectAId: uuid('subject_a_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    subjectBId: uuid('subject_b_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    kind: relationshipKind('kind').notNull().default('partner'),
    label: text('label'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('relationships_workspace_idx').on(table.workspaceId),
    pairIdx: uniqueIndex('relationships_pair_idx').on(
      table.workspaceId,
      table.subjectAId,
      table.subjectBId,
    ),
  }),
);

/**
 * A standing rule that fires when the sky does something to one subject.
 *
 * `rule` is the discriminated union from `@jade/astro` stored as jsonb. It is
 * deliberately not spread into columns: the shape differs per kind, the set of
 * kinds will grow, and a migration per new rule kind is a tax with no benefit.
 * The application validates it on the way in.
 */
export const watches = pgTable(
  'watches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    label: text('label'),
    rule: jsonb('rule').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    /** How far ahead each evaluation looks. */
    horizonDays: integer('horizon_days').notNull().default(120),
    lastEvaluatedAt: timestamp('last_evaluated_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('watches_workspace_idx').on(table.workspaceId),
    subjectIdx: index('watches_subject_idx').on(table.subjectId),
  }),
);

/**
 * One event a watch has already found.
 *
 * `hitKey` is derived from the rule and the event, never from the time the
 * evaluation ran, so re-running a nightly job over an overlapping window finds
 * the same keys and the unique index quietly refuses the duplicates. That is
 * what stops a practitioner being told the same thing every morning for four
 * months.
 */
export const watchHits = pgTable(
  'watch_hits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    watchId: uuid('watch_id')
      .notNull()
      .references(() => watches.id, { onDelete: 'cascade' }),
    hitKey: text('hit_key').notNull(),
    occursAt: timestamp('occurs_at', { withTimezone: true }).notNull(),
    title: text('title').notNull(),
    factors: text('factors').array().notNull().default([]),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('watch_hits_workspace_idx').on(table.workspaceId),
    occursIdx: index('watch_hits_occurs_idx').on(table.workspaceId, table.occursAt),
    uniqueHit: uniqueIndex('watch_hits_key_idx').on(table.watchId, table.hitKey),
  }),
);

export type User = typeof users.$inferSelect;
export type Workspace = typeof workspaces.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type NewSubject = typeof subjects.$inferInsert;
export type BirthEvent = typeof birthEvents.$inferSelect;
export type NewBirthEvent = typeof birthEvents.$inferInsert;
export type Place = typeof places.$inferSelect;
export type SettingsProfile = typeof settingsProfiles.$inferSelect;
export type Chart = typeof charts.$inferSelect;
export type Watch = typeof watches.$inferSelect;
export type NewWatch = typeof watches.$inferInsert;
export type WatchHit = typeof watchHits.$inferSelect;
export type Relationship = typeof relationships.$inferSelect;
export type NewRelationship = typeof relationships.$inferInsert;

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------

/**
 * A note, either about a person or about a technique.
 *
 * `subjectId` null means the latter — a note about kendras rather than about
 * anyone's kendras. Both live here so there is one place to search.
 *
 * `anchorLabel` is denormalised on purpose. The notes index lists notes from
 * every person at once and cannot compute a chart per row, so the label is
 * stored as it read when written. It is a caption, never an identity: the
 * anchor is `anchorKind` + `anchorKey`.
 */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
    anchorKind: noteAnchorKind('anchor_kind').notNull().default('chart'),
    anchorKey: text('anchor_key'),
    anchorLabel: text('anchor_label'),
    body: text('body').notNull(),
    tags: text('tags').array().notNull().default([]),
    pinned: boolean('pinned').notNull().default(false),
    /**
     * Which consultation this was written during. A LINK, not an anchor —
     * `anchorKind` names a stable factor ("Mars", "the 7th"), and a row id is
     * not one. See migration 0011.
     */
    sessionId: uuid('session_id'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('notes_workspace_idx').on(table.workspaceId),
    subjectIdx: index('notes_subject_idx').on(table.workspaceId, table.subjectId),
    anchorIdx: index('notes_anchor_idx').on(
      table.workspaceId,
      table.anchorKind,
      table.anchorKey,
      table.updatedAt,
    ),
  }),
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

/**
 * Recorded presses on the upgrade wall.
 *
 * Not analytics. Until checkout exists this is the only honest thing a wall
 * can offer — "tell me when this opens" — and the rows are both the demand
 * signal that says which gate to build billing around first and the list of
 * people to write to on the day it opens.
 */
export const upgradeIntents = pgTable(
  'upgrade_intents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    /** The tier they were on when refused. */
    fromPlan: text('from_plan').notNull(),
    /** The cheapest tier that would have let them through. */
    wantedPlan: text('wanted_plan').notNull(),
    /** Which capability refused them, if it was a capability. */
    capability: text('capability'),
    /** Which exhausted count refused them, if it was a count. */
    counted: text('counted'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdx: index('upgrade_intents_workspace_idx').on(table.workspaceId),
    wantedIdx: index('upgrade_intents_wanted_idx').on(table.wantedPlan, table.createdAt),
  }),
);

export type UpgradeIntent = typeof upgradeIntents.$inferSelect;

/**
 * Every Stripe webhook we have received.
 *
 * The primary key is Stripe's own event id, and that is the whole idempotency
 * mechanism: Stripe retries until it gets a 2xx and delivers out of order under
 * load, so the same event *will* arrive twice. Insert first, act second — a
 * crash between the two must leave the event unprocessed rather than recorded
 * as done.
 *
 * Not workspace-scoped under RLS, deliberately: the webhook has no session to
 * bind, and the table holds no personal data. See migration 0010.
 */
export const stripeEvents = pgTable(
  'stripe_events',
  {
    id: text('id').primaryKey(),
    type: text('type').notNull(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    handledAt: timestamp('handled_at', { withTimezone: true }),
    /** What the handler decided, in words, for reading back months later. */
    outcome: text('outcome'),
  },
  (table) => ({
    receivedIdx: index('stripe_events_received_idx').on(table.receivedAt),
  }),
);

export type StripeEvent = typeof stripeEvents.$inferSelect;

/**
 * A consultation.
 *
 * `scheduledFor` is a real instant, unlike birth data — which stores a wall
 * clock as text because the characters on the certificate are the record. A
 * consultation is the opposite: an instant two people must both turn up for.
 * The two differ on purpose.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    durationMinutes: integer('duration_minutes').notNull().default(60),
    /** 'first' | 'follow_up' | 'muhurta' | 'other' */
    kind: text('kind').notNull().default('follow_up'),
    /** 'scheduled' | 'held' | 'cancelled' */
    status: text('status').notNull().default('scheduled'),
    location: text('location'),
    feeCents: integer('fee_cents'),
    currency: text('currency').notNull().default('USD'),
    /** The practitioner's own jottings. Never shown to a client. */
    prepNote: text('prep_note'),
    summary: text('summary'),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    whenIdx: index('sessions_workspace_when_idx').on(table.workspaceId, table.scheduledFor),
    subjectIdx: index('sessions_subject_when_idx').on(table.subjectId, table.scheduledFor),
  }),
);

export type Session = typeof sessions.$inferSelect;

/**
 * Something to come back to.
 *
 * `sessionId` is nullable and SET NULL on delete: the thing to revisit
 * outlives the consultation that raised it, and losing it because a session
 * record was tidied away would be the most annoying loss this feature could
 * produce.
 */
export const followUps = pgTable(
  'follow_ups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    subjectId: uuid('subject_id')
      .notNull()
      .references(() => subjects.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id').references(() => sessions.id, { onDelete: 'set null' }),
    body: text('body').notNull(),
    /** Nullable: plenty of follow-ups are "next time" rather than a date. */
    dueOn: date('due_on'),
    doneAt: timestamp('done_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    subjectIdx: index('follow_ups_subject_idx').on(table.subjectId, table.doneAt, table.dueOn),
    workspaceIdx: index('follow_ups_workspace_idx').on(table.workspaceId),
  }),
);

export type FollowUp = typeof followUps.$inferSelect;

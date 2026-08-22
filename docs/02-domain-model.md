# 02 — Domain model

The schema _is_ the product. If this is right, features are easy; if it's wrong, everything
downstream fights you. Two ideas drive it:

1. **A subject is not a chart.** People have several birth events (recorded, rectified,
   relocated). Charts are derived and disposable; subjects and events are precious.
2. **Everything a practitioner writes is attachable to a computed factor.** A note isn't just
   text on a person — it's text on _"Śani antardaśā, 7th house, transit Jupiter opposing natal
   Moon, 12 March 2027."_ That link is what makes the prediction ledger possible later.

## Core tables (Drizzle / Postgres)

```
workspaces           one practice
  id, name, slug, brand (logo, colors, footer), plan, stripe_customer_id,
  default_settings_profile_id, created_at

users
  id, email, name, avatar_url, created_at

memberships          user ↔ workspace, many-to-many
  user_id, workspace_id, role: owner|astrologer|assistant|viewer

subjects             a person, entity, or event a chart can be cast for
  id, workspace_id, kind: person|entity|event|mundane,
  display_name, given_names, family_name, pronouns, photo_url,
  relationship_to_owner: self|partner|family|friend|client|public_figure,
  is_client boolean, tags text[], notes_summary,
  privacy: private|workspace|shared, created_by, created_at, deleted_at

birth_events         a moment. a subject may have several
  id, subject_id, label ('birth', 'rectified 2026-03', 'relocated: Lisbon'),
  is_primary boolean,
  local_datetime timestamp,      -- as written on the certificate
  utc_datetime  timestamptz,     -- resolved
  utc_offset_minutes int,
  offset_source: tzdb|manual|lmt,
  time_accuracy: exact|min5|min30|hour2|unknown,
  place_id → places, lat, lon, elevation_m, tz_id,
  source_note ('birth certificate', 'mother's memory'), created_at

places               GeoNames-derived, plus user-created
  id, geoname_id, name, admin1, country_code, lat, lon, elevation_m, tz_id, population

settings_profiles    the astrological "lens"
  id, workspace_id, name ('House style', 'KP', 'Raman'),
  ayanamsa: lahiri|lahiri_true_chitra|raman|krishnamurti|yukteshwar|fagan_bradley|custom,
  ayanamsa_custom_offset numeric,
  node_type: mean|true,
  house_system: whole_sign|equal|sripati|placidus|koch|campanus|topocentric,
  chart_style: north|south|east|western_wheel,
  dasha_defaults jsonb, orbs jsonb, include_outers boolean,
  varga_scheme: parashari|jaimini, is_default boolean

charts               DERIVED. content-addressed cache
  id (= sha256 of inputs), workspace_id, birth_event_id, settings_profile_id,
  astro_version, computed jsonb, computed_at

readings             a saved analytical view
  id, workspace_id, subject_id, chart_id, title,
  techniques text[] ('d9','ashtakavarga','vimshottari:3'),
  layout jsonb, body_md, created_by, created_at, updated_at

relationships        pairs of subjects
  id, workspace_id, subject_a_id, subject_b_id,
  kind: partnership|marriage|family|business|friendship,
  started_on date, notes, computed jsonb (kutas, synastry, shared timeline cache)

sessions             a consultation
  id, workspace_id, subject_id, scheduled_at, duration_min,
  status: scheduled|prepped|held|followed_up|cancelled,
  prep jsonb (auto-generated prep sheet snapshot), transcript_url,
  notes_md, deliverable_report_id, price_cents, invoice_url

notes                the connective tissue
  id, workspace_id, subject_id, session_id?,
  body_md, created_at,
  anchors jsonb[]  -- [{type:'dasha', lords:['Sa','Ve'], from, to},
                   --  {type:'transit', body:'Sa', aspect:'conjunction', target:'natal Moon', exact_at},
                   --  {type:'house', n:7}, {type:'yoga', id:'gaja_kesari'}]

predictions          the ledger — the moat
  id, workspace_id, subject_id, note_id?,
  statement, window_start, window_end, confidence 1-5,
  factors jsonb (same anchor shape as notes),
  outcome: pending|hit|partial|miss|unclear, outcome_note, resolved_at

life_events          what actually happened (for rectification + research)
  id, subject_id, occurred_on, precision: day|month|year,
  category: relationship|career|health|relocation|loss|windfall|other,
  description, is_verified

watches              standing alert rules
  id, workspace_id, scope: subject|all_clients|workspace,
  subject_id?, rule jsonb, channels: email|push|digest,
  next_evaluation_at, last_fired_at, enabled

alerts               fired instances
  id, watch_id, subject_id, fires_at, exact_at, payload jsonb, read_at

reports              generated deliverables
  id, workspace_id, subject_id, session_id?, template,
  params jsonb, pdf_url, share_token, share_expires_at, view_count

share_links          read-only client portal access
  id, workspace_id, subject_id, token, scopes text[], expires_at, revoked_at

audit_log
  id, workspace_id, actor_user_id, action, entity, entity_id, ip, created_at
```

## The computed chart blob

`charts.computed` is one JSON document, versioned by `astro_version`. Shape:

```ts
type ComputedChart = {
  meta: { astroVersion: string; provider: string; jdUT: number; ayanamsaValue: number };
  points: Record<PointId, {           // Su Mo Ma Me Ju Ve Sa Ra Ke Ur Ne Pl Asc MC + upagrahas
    lonSidereal: number; lonTropical: number; lat: number; speed: number;
    retrograde: boolean; combust: boolean | null; sign: number; degInSign: number;
    nakshatra: { index: number; pada: number; lord: PointId };
    house: number; navamsaSign: number;
    dignity: 'exalted'|'moolatrikona'|'own'|'friend'|'neutral'|'enemy'|'debilitated';
    avastha: { baladi: string; jagradadi: string; deeptadi: string };
  }>;
  houses: { system: HouseSystem; cusps: number[]; bhavaMadhya: number[] };
  vargas: Record<VargaId, Record<PointId, { sign: number; lord: PointId; house: number }>>;
  aspects: { grahaDrishti: Drishti[]; rasiDrishti: Drishti[] };
  strength: { ashtakavarga: { bav: Record<PointId, number[]>; sav: number[] };
              shadbala: Record<PointId, ShadbalaBreakdown> };
  yogas: Array<{ id: string; name: string; strength: number; participants: PointId[];
                 cancelledBy?: string[]; classicalSource: string }>;
  dashas: Record<DashaSystem, DashaNode[]>;   // nested to 5 levels, lazily expanded
  panchang: { tithi; nakshatra; yoga; karana; vara; sunrise; sunset; rahuKala; ... };
  jaimini: { charaKarakas: Record<Karaka, PointId>; arudhas: Record<string, number> };
};
```

Nested dashas are computed lazily by level (a full 5-level Vimśottarī tree is ~100k nodes —
compute mahā and antara eagerly, deeper levels on demand).

## What Phase 2 actually shipped, and what it deliberately did not

Implemented: workspaces, users, memberships, places, settings profiles,
subjects, birth events and the content-addressed chart cache — with row-level
security **forced** on every workspace-scoped table, so a query that forgets
its `WHERE workspace_id` returns nothing rather than another practice's client
list. Proven by tests, not asserted (`packages/db/test/tenancy.test.ts`).

**Column-level encryption of birth data is not in Phase 2.** Saying so plainly
rather than quietly skipping it: Neon and Supabase both encrypt at rest at the
storage layer, and RLS covers the application-bug threat, but neither protects
against a leaked database dump. Encrypting `local_datetime`, `utc_datetime`,
`latitude` and `longitude` breaks ordering and range queries, so it needs an
envelope-encryption design rather than a column type change. It belongs before
the first paying customer — it is on the checklist in `docs/06-launch.md` under
"Before you take money", not in this phase.

Three lessons from building it are worth keeping, because each one cost real
debugging time:

1. **`FORCE ROW LEVEL SECURITY` is not optional.** Without it the table owner —
   which is the role the app connects as on both Neon and Supabase — bypasses
   every policy, and RLS looks enabled while protecting nothing.
2. **Session GUCs leak across pooled connections.** `set_config(..., false)`
   sets a value for the whole session, and postgres.js reuses connections, so
   a service-role bypass set that way silently disables isolation for whatever
   query runs next. Everything in `tenancy.ts` uses transaction-local scope.
3. **`jsonb` does not preserve key order.** A freshly computed chart renders in
   the right order and the cached one comes back shuffled. Display order is
   explicit (`POINT_DISPLAY_ORDER`), never the object's key order.

## Access rules

- Every query is scoped by `workspace_id`. Enforce with Postgres RLS, not just app code.
- `subjects.privacy = private` means only `created_by` sees it, even inside the workspace.
- Client share links resolve to a _projection_ of a subject — never the raw row.

/**
 * What each tier includes.
 *
 * One table, read by two places that must never disagree: the public pricing
 * page and the server-side gate. A tier list maintained twice is a tier list
 * that eventually sells something the product does not deliver, and the person
 * who discovers the gap is always a paying customer.
 *
 * ## What may and may not be gated
 *
 * The pricing page says "accuracy is not a paid feature", and that is a
 * promise about *correctness*, not about scope. It means every tier computes
 * the same chart to the same standard — the same ayanāṁśa maths, the same
 * ephemeris, the same rounding. It does not mean every technique is free.
 *
 * So: gating which pages a workspace may open is fine. Gating how many people
 * it may keep is fine. Computing a *different*, cheaper, less accurate chart
 * for a free workspace is never fine, and nothing in this file can express it
 * — the matrix names pages and counts, and has no vocabulary for precision.
 * Keep it that way. Constitution item 1.
 *
 * ## Cumulative by construction
 *
 * A plan declares only what it *adds*. "Everything in Seeker" is then true
 * because `capabilitiesOf` walks the ladder, not because someone remembered to
 * copy the bullets down. Reordering `PLANS` reorders the ladder, which is why
 * the order is load-bearing and commented as such.
 */

export const PLAN_IDS = ['free', 'seeker', 'practitioner', 'professional', 'institute'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type CapabilityId =
  | 'relationships'
  | 'reports'
  | 'rectification'
  | 'watches'
  | 'sessions'
  | 'varshaphala'
  | 'branding'
  | 'shareLinks'
  | 'muhurta'
  | 'predictionLedger'
  | 'api'
  | 'seats';

export interface Capability {
  readonly id: CapabilityId;
  /** How the tier list names it. */
  readonly label: string;
  /** The headline on the wall when a workspace hits it. Names the thing, not the tier. */
  readonly locked: string;
  /** One sentence on the wall explaining what the feature actually does. */
  readonly blurb: string;
  /**
   * False while the feature is still being built. The pricing page renders
   * these with a marker automatically, so a tier can never quietly advertise
   * something that does not exist — which is the failure this flag was added
   * to make structurally impossible.
   */
  readonly built: boolean;
}

/**
 * Note what is *not* in this list: export.
 *
 * Constitution item 4 requires that Jade always support export and hard
 * delete, and "always" does not mean "on the tiers that paid for it". A
 * person's birth data is theirs; holding it behind a subscription is the
 * lock-in that desktop Jyotiṣa software is notorious for and one of the
 * reasons to build this at all. Export is therefore a permanent feature of
 * every tier, including Free, and there is deliberately no capability key
 * here that could be used to switch it off.
 */
export const CAPABILITIES: Readonly<Record<CapabilityId, Capability>> = {
  relationships: {
    id: 'relationships',
    label: 'Relationships and synastry',
    locked: 'Relationships are a Seeker feature',
    blurb:
      'Two charts side by side, with the classical inter-chart factors — tārā bala counted in both directions, house overlays, and the daśās running for each person at the same moment.',
    built: true,
  },
  reports: {
    id: 'reports',
    label: 'Printable reports',
    locked: 'Reports are a Seeker feature',
    blurb:
      'A print-ready chart, daśā and transit report you can hand to somebody, with or without your notes included.',
    built: true,
  },
  rectification: {
    id: 'rectification',
    label: 'Birth time rectification',
    locked: 'Rectification is a Seeker feature',
    blurb:
      'Sweep a window of candidate birth times against a log of dated life events, ranked by named classical rules, with the rules that ranked nothing reported as such.',
    built: true,
  },
  watches: {
    id: 'watches',
    label: 'Transit alerts',
    locked: 'Transit alerts are a Practitioner feature',
    blurb: 'Standing rules that tell you when a sky condition becomes true for someone.',
    built: false,
  },
  sessions: {
    id: 'sessions',
    label: 'Sessions and prep sheets',
    locked: 'Sessions are a Practitioner feature',
    blurb: 'The consultation itself — prep, notes taken during, and follow-ups.',
    built: false,
  },
  varshaphala: {
    id: 'varshaphala',
    label: 'Varṣaphala',
    locked: 'Varṣaphala is a Practitioner feature',
    blurb: 'The annual chart, with muntha, the year lord, and its own daśā.',
    built: false,
  },
  branding: {
    id: 'branding',
    label: 'Branded reports',
    locked: 'Branded reports are a Professional feature',
    blurb: 'Your name and mark on what you hand a client, instead of ours.',
    built: false,
  },
  shareLinks: {
    id: 'shareLinks',
    label: 'Client share links',
    locked: 'Share links are a Professional feature',
    blurb: 'A link a client can open, without an account and without seeing your other work.',
    built: false,
  },
  muhurta: {
    id: 'muhurta',
    label: 'Muhūrta engine',
    locked: 'Muhūrta is a Professional feature',
    blurb: 'Search a date range for moments that satisfy the conditions you specify.',
    built: false,
  },
  predictionLedger: {
    id: 'predictionLedger',
    label: 'Prediction ledger',
    locked: 'The prediction ledger is a Professional feature',
    blurb:
      'Write down what you expect and when, then have it come back to you scored — the only honest way to get better.',
    built: false,
  },
  api: {
    id: 'api',
    label: 'API access',
    locked: 'The API is a Professional feature',
    blurb:
      'Jade’s calculations from your own code — charts, daśās and transits over HTTP, with the same ayanāṁśa settings your workspace uses.',
    built: false,
  },
  seats: {
    id: 'seats',
    label: 'Student seats and teacher review',
    locked: 'Seats are an Institute feature',
    blurb: 'Shared chart libraries, student seats, and teacher review of student readings.',
    built: false,
  },
};

/** Things a plan is allowed a certain number of, rather than simply allowed. */
export type CountedId = 'people' | 'notes';

export interface Counted {
  readonly id: CountedId;
  readonly one: string;
  readonly many: string;
  /** The wall's headline once the count is spent. */
  readonly locked: string;
}

export const COUNTED: Readonly<Record<CountedId, Counted>> = {
  people: {
    id: 'people',
    one: 'person',
    many: 'people',
    locked: 'You have used every person on the free tier',
  },
  notes: {
    id: 'notes',
    one: 'note',
    many: 'notes',
    locked: 'You have used every note on the free tier',
  },
};

export interface Plan {
  readonly id: PlanId;
  readonly name: string;
  /** Who the tier is for, in the customer's own terms. */
  readonly who: string;
  readonly monthly: number;
  readonly yearly: number;
  /** `null` is unlimited. Never 0 — a tier that allows nothing is a bug, not a tier. */
  readonly limits: Readonly<Record<CountedId, number | null>>;
  /** Only what this tier adds. Everything below it is inherited by `capabilitiesOf`. */
  readonly adds: readonly CapabilityId[];
  /** Ungated selling points — things every tier can do, worth saying out loud. */
  readonly highlights: readonly string[];
  /** No self-serve checkout; the CTA is a conversation. */
  readonly contactOnly?: boolean;
}

/**
 * The ladder, cheapest first. **Order is load-bearing** — `capabilitiesOf`
 * inherits downward and `cheapestPlanWith` searches upward.
 */
export const PLANS: readonly Plan[] = [
  {
    id: 'free',
    name: 'Free',
    who: 'Casting your own chart',
    monthly: 0,
    yearly: 0,
    limits: { people: 3, notes: 10 },
    adds: [],
    // Full depth, deliberately. The free tier is not a crippled calculator —
    // it is the whole calculator, pointed at your own household. What Seeker
    // sells is doing this work *for other people*, which is the moment it
    // stops being a hobby and starts being worth nine dollars.
    highlights: [
      'All sixteen vargas',
      'Yogas with their cancellations',
      'Vimśottarī daśā to five levels',
      'Aṣṭakavarga and ṣaḍbala',
      'Today’s sky and the week ahead',
      'Every ayanāṁśa, stated on the chart',
      'Export anyone’s data, on every tier, forever',
    ],
  },
  {
    id: 'seeker',
    name: 'Seeker',
    who: 'The astrologically fluent',
    monthly: 9,
    yearly: 79,
    limits: { people: null, notes: null },
    adds: ['relationships', 'reports', 'rectification'],
    highlights: ['Unlimited people', 'Unlimited anchored study notes'],
  },
  {
    id: 'practitioner',
    name: 'Practitioner',
    who: 'Serious students and part-time readers',
    monthly: 49,
    yearly: 429,
    limits: { people: null, notes: null },
    adds: ['watches', 'sessions', 'varshaphala'],
    highlights: ['Everything in Seeker'],
  },
  {
    id: 'professional',
    name: 'Professional',
    who: 'Working astrologers',
    monthly: 99,
    yearly: 890,
    limits: { people: null, notes: null },
    adds: ['branding', 'shareLinks', 'muhurta', 'predictionLedger', 'api'],
    highlights: ['Everything in Practitioner'],
  },
  {
    id: 'institute',
    name: 'Institute',
    who: 'Schools and courses',
    monthly: 300,
    yearly: 3000,
    limits: { people: null, notes: null },
    adds: ['seats'],
    highlights: ['Everything in Professional'],
    contactOnly: true,
  },
];

const BY_ID = new Map<string, Plan>(PLANS.map((plan) => [plan.id, plan]));

export const FREE: Plan = BY_ID.get('free')!;

export function isKnownPlan(raw: string | null | undefined): raw is PlanId {
  return typeof raw === 'string' && BY_ID.has(raw);
}

/**
 * The plan for a stored string.
 *
 * Total by design: an unrecognised value resolves to Free rather than throwing
 * or granting everything. Both alternatives are worse — a throw takes down
 * every page for that workspace, and granting everything turns one typo into
 * free Professional. Free is the recoverable direction.
 *
 * It is not, however, a *silent* fallback. `isKnownPlan` is false for the same
 * input, and Settings prints the raw stored value when it is unrecognised, so
 * a workspace that has been mis-flagged says so on screen instead of quietly
 * losing features its owner paid for. Constitution item 3, applied to billing.
 */
export function planFor(raw: string | null | undefined): Plan {
  return (typeof raw === 'string' ? BY_ID.get(raw) : undefined) ?? FREE;
}

function rank(id: PlanId): number {
  return PLANS.findIndex((plan) => plan.id === id);
}

/** Everything a plan can do, including everything inherited from cheaper tiers. */
export function capabilitiesOf(plan: Plan): readonly CapabilityId[] {
  const ceiling = rank(plan.id);
  return PLANS.slice(0, ceiling + 1).flatMap((step) => step.adds);
}

export function allows(plan: Plan, capability: CapabilityId): boolean {
  return capabilitiesOf(plan).includes(capability);
}

export function limitOf(plan: Plan, counted: CountedId): number | null {
  return plan.limits[counted];
}

/**
 * Whether one more would be allowed.
 *
 * Takes the count *before* the addition, so the caller asks "may I add another"
 * rather than "have I already broken the rule" — the second phrasing is how
 * off-by-one gates get written.
 */
export function canAddAnother(plan: Plan, counted: CountedId, current: number): boolean {
  const limit = limitOf(plan, counted);
  return limit === null || current < limit;
}

/** The cheapest tier that unlocks a capability. What the upgrade wall points at. */
export function cheapestPlanWith(capability: CapabilityId): Plan {
  return PLANS.find((plan) => plan.adds.includes(capability)) ?? PLANS[PLANS.length - 1]!;
}

/** The cheapest tier that would allow one more of something. */
export function cheapestPlanAllowing(counted: CountedId, current: number): Plan | null {
  return PLANS.find((plan) => canAddAnother(plan, counted, current)) ?? null;
}

/** The next rung up, for a plain "upgrade" prompt. Null at the top. */
export function nextPlanAfter(plan: Plan): Plan | null {
  return PLANS[rank(plan.id) + 1] ?? null;
}

/** Tiers shown as cards on the pricing page — Institute is presented separately. */
export const SELF_SERVE: readonly Plan[] = PLANS.filter((plan) => !plan.contactOnly);

/** Everything a tier lists, gated bullets and ungated ones together. */
export function bulletsFor(plan: Plan): ReadonlyArray<{ text: string; built: boolean }> {
  return [
    ...plan.highlights.map((text) => ({ text, built: true })),
    ...plan.adds.map((id) => ({ text: CAPABILITIES[id].label, built: CAPABILITIES[id].built })),
  ];
}

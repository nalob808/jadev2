import { redirect } from 'next/navigation';
import { countNotes, countSubjects, getWorkspacePlan } from '@jade/db';
import { getDatabase } from './db.js';
import {
  canAddAnother,
  allows,
  limitOf,
  planFor,
  isKnownPlan,
  type CapabilityId,
  type CountedId,
  type Plan,
} from './plans.js';

/**
 * The gate.
 *
 * Three rules govern everything in this file.
 *
 * **Enforcement is server-side or it is decoration.** Hiding a link stops
 * nobody. Every gate here runs inside a page body or a server action, before
 * any work is done, so typing the URL by hand lands on the wall rather than on
 * the feature. The e2e suite navigates directly to gated URLs for exactly this
 * reason.
 *
 * **A gate refuses a page, never a calculation.** Nothing here is reachable
 * from `packages/astro`, and nothing here can change what a chart says. A free
 * workspace gets the same degrees as a Professional one; it just cannot open
 * as many pages. Constitution item 1.
 *
 * **Refusal explains itself and names its price.** A gate that says "upgrade"
 * without saying what was blocked, what that feature does, or which tier has
 * it, is a dead end. Every redirect below carries enough in the query string
 * for the wall to say all three.
 */

export interface Entitlement {
  readonly plan: Plan;
  /**
   * The string actually in the database. Differs from `plan.id` only when the
   * column holds something unrecognised, which the settings page surfaces
   * rather than swallowing.
   */
  readonly stored: string | null;
  readonly recognised: boolean;
  /** Why the workspace is on this tier: 'default', 'grandfathered', 'stripe', 'manual'. */
  readonly source: string;
}

export async function getEntitlement(workspaceId: string): Promise<Entitlement> {
  const row = await getWorkspacePlan(getDatabase(), workspaceId);
  const stored = row?.plan ?? null;
  return {
    plan: planFor(stored),
    stored,
    recognised: isKnownPlan(stored),
    source: row?.source ?? 'default',
  };
}

/** Convenience for the common case: just the plan. */
export async function getPlan(workspaceId: string): Promise<Plan> {
  return (await getEntitlement(workspaceId)).plan;
}

function wall(params: Record<string, string>): never {
  redirect(`/upgrade?${new URLSearchParams(params).toString()}`);
}

/**
 * Refuse unless the workspace has a capability.
 *
 * Returns the plan on success so a caller that needs it does not read the
 * column twice. Never returns on failure — `redirect` throws.
 */
export async function requireCapability(
  workspaceId: string,
  capability: CapabilityId,
): Promise<Plan> {
  const plan = await getPlan(workspaceId);
  if (!allows(plan, capability)) wall({ need: capability, on: plan.id });
  return plan;
}

/** Whether a capability is available, for deciding how to *render* — not for gating. */
export async function hasCapability(
  workspaceId: string,
  capability: CapabilityId,
): Promise<boolean> {
  return allows(await getPlan(workspaceId), capability);
}

export interface Usage {
  readonly used: number;
  readonly limit: number | null;
  readonly room: boolean;
}

export async function usageOf(workspaceId: string, counted: CountedId): Promise<Usage> {
  const plan = await getPlan(workspaceId);
  const used = await currentCount(workspaceId, counted);
  return { used, limit: limitOf(plan, counted), room: canAddAnother(plan, counted, used) };
}

async function currentCount(workspaceId: string, counted: CountedId): Promise<number> {
  const database = getDatabase();
  return counted === 'people'
    ? countSubjects(database, workspaceId)
    : countNotes(database, workspaceId);
}

/**
 * Refuse unless there is room for one more.
 *
 * The count is taken here rather than passed in. A caller that has already
 * loaded a list is tempted to pass its length, and the two drift the moment a
 * list is filtered or paginated — which is how a limit of three quietly
 * becomes a limit of however many fitted on the page.
 */
export async function requireRoomFor(workspaceId: string, counted: CountedId): Promise<void> {
  const plan = await getPlan(workspaceId);
  const used = await currentCount(workspaceId, counted);
  if (!canAddAnother(plan, counted, used)) {
    wall({ full: counted, used: String(used), on: plan.id });
  }
}

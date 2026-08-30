import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  PLANS,
  SELF_SERVE,
  allows,
  bulletsFor,
  canAddAnother,
  capabilitiesOf,
  cheapestPlanAllowing,
  cheapestPlanWith,
  isKnownPlan,
  limitOf,
  nextPlanAfter,
  planFor,
  type CapabilityId,
} from './plans.js';

/**
 * The pricing matrix.
 *
 * Most of what is asserted here is not "does the table say what I typed" — it
 * is the set of invariants that make the table safe to change. Somebody moving
 * a feature between tiers a year from now should be told by a failing test if
 * they have broken one, because none of them are visible in a diff of the
 * table alone.
 */

const free = planFor('free');
const seeker = planFor('seeker');
const practitioner = planFor('practitioner');
const professional = planFor('professional');

describe('planFor', () => {
  it('resolves every known tier', () => {
    for (const plan of PLANS) expect(planFor(plan.id).id).toBe(plan.id);
  });

  it('degrades to free rather than throwing or granting everything', () => {
    // Both alternatives are worse: a throw takes every page down for that
    // workspace, and granting everything turns one typo into free Professional.
    for (const bad of ['', 'Free', 'pro', 'enterprise', null, undefined]) {
      expect(planFor(bad).id).toBe('free');
    }
  });

  it('does not pretend the fallback was recognised', () => {
    // The pair is the whole mechanism: the app keeps working *and* the UI can
    // tell a customer their workspace is mis-flagged.
    expect(planFor('enterprise').id).toBe('free');
    expect(isKnownPlan('enterprise')).toBe(false);
    expect(isKnownPlan('free')).toBe(true);
  });
});

describe('the ladder', () => {
  it('never takes a capability away as the price goes up', () => {
    for (let i = 1; i < PLANS.length; i += 1) {
      const cheaper = capabilitiesOf(PLANS[i - 1]!);
      const dearer = capabilitiesOf(PLANS[i]!);
      for (const capability of cheaper) {
        expect(dearer, `${PLANS[i]!.id} dropped ${capability}`).toContain(capability);
      }
    }
  });

  it('never lowers a limit as the price goes up', () => {
    for (const counted of ['people', 'notes'] as const) {
      for (let i = 1; i < PLANS.length; i += 1) {
        const cheaper = limitOf(PLANS[i - 1]!, counted);
        const dearer = limitOf(PLANS[i]!, counted);
        if (cheaper === null) expect(dearer).toBeNull();
        else if (dearer !== null) expect(dearer).toBeGreaterThanOrEqual(cheaper);
      }
    }
  });

  it('gets more expensive on the way up', () => {
    for (let i = 1; i < PLANS.length; i += 1) {
      expect(PLANS[i]!.monthly).toBeGreaterThan(PLANS[i - 1]!.monthly);
    }
  });

  it('declares every capability on exactly one tier', () => {
    const declared = PLANS.flatMap((plan) => plan.adds);
    expect(new Set(declared).size).toBe(declared.length);
    // And every capability in the dictionary is sold somewhere — an orphan is
    // a feature no tier can ever reach.
    for (const id of Object.keys(CAPABILITIES) as CapabilityId[]) {
      expect(declared, `${id} is on no tier`).toContain(id);
    }
  });

  it('never offers a tier that allows nothing', () => {
    for (const plan of PLANS) {
      for (const counted of ['people', 'notes'] as const) {
        const limit = limitOf(plan, counted);
        if (limit !== null) expect(limit).toBeGreaterThan(0);
      }
    }
  });
});

describe('what free includes', () => {
  it('is three people and ten notes', () => {
    expect(limitOf(free, 'people')).toBe(3);
    expect(limitOf(free, 'notes')).toBe(10);
  });

  it('gates no capability of its own', () => {
    expect(capabilitiesOf(free)).toHaveLength(0);
  });

  it('cannot gate export at all', () => {
    // Constitution item 4: export is available on every tier, always. The
    // guarantee is structural — there is no key to switch off — so this
    // asserts the absence of the vocabulary rather than a value.
    expect(Object.keys(CAPABILITIES)).not.toContain('export');
    expect(PLANS.flatMap((plan) => plan.adds)).not.toContain('export');
  });
});

describe('allows', () => {
  it('refuses on free and permits from seeker up', () => {
    for (const capability of ['relationships', 'reports', 'rectification'] as const) {
      expect(allows(free, capability)).toBe(false);
      expect(allows(seeker, capability)).toBe(true);
      expect(allows(practitioner, capability)).toBe(true);
      expect(allows(professional, capability)).toBe(true);
    }
  });

  it('keeps practitioner features off seeker', () => {
    expect(allows(seeker, 'sessions')).toBe(false);
    expect(allows(practitioner, 'sessions')).toBe(true);
  });
});

describe('counting', () => {
  it('asks whether one more is allowed, not whether the rule is already broken', () => {
    expect(canAddAnother(free, 'people', 2)).toBe(true);
    expect(canAddAnother(free, 'people', 3)).toBe(false);
    expect(canAddAnother(free, 'people', 4)).toBe(false);
  });

  it('never refuses on an unlimited tier', () => {
    expect(canAddAnother(seeker, 'people', 100_000)).toBe(true);
  });
});

describe('where the wall points', () => {
  it('names the cheapest tier with a capability, not the dearest', () => {
    expect(cheapestPlanWith('reports').id).toBe('seeker');
    expect(cheapestPlanWith('sessions').id).toBe('practitioner');
    expect(cheapestPlanWith('api').id).toBe('professional');
  });

  it('names the cheapest tier that would allow one more', () => {
    expect(cheapestPlanAllowing('people', 3)?.id).toBe('seeker');
    // Below the limit the honest answer is the tier they already have.
    expect(cheapestPlanAllowing('people', 1)?.id).toBe('free');
  });

  it('walks up one rung and stops at the top', () => {
    expect(nextPlanAfter(free)?.id).toBe('seeker');
    expect(nextPlanAfter(PLANS[PLANS.length - 1]!)).toBeNull();
  });
});

describe('what the tier cards render', () => {
  it('gives every tier something to say', () => {
    for (const plan of PLANS) expect(bulletsFor(plan).length).toBeGreaterThan(0);
  });

  it('marks unfinished features so a card cannot over-promise', () => {
    // The mechanism the pricing page relies on: an unbuilt capability is
    // flagged by the data, not by someone remembering a footnote.
    expect(bulletsFor(practitioner).some((bullet) => !bullet.built)).toBe(true);
    for (const bullet of bulletsFor(seeker)) expect(bullet.built).toBe(true);
  });

  it('sells nothing on the paid entry tier that does not exist yet', () => {
    // Seeker is the only tier anyone can be charged for today, so it is the
    // only one where an unbuilt bullet would be taking money for a promise.
    for (const id of seeker.adds) expect(CAPABILITIES[id].built, id).toBe(true);
  });

  it('keeps the contact-only tier off the self-serve cards', () => {
    expect(SELF_SERVE.map((plan) => plan.id)).not.toContain('institute');
    expect(PLANS.map((plan) => plan.id)).toContain('institute');
  });

  it('writes every capability a sentence a customer could act on', () => {
    for (const capability of Object.values(CAPABILITIES)) {
      expect(capability.label.length).toBeGreaterThan(3);
      expect(capability.blurb.length).toBeGreaterThan(40);
      // The headline names the feature, never a bare "Upgrade".
      expect(capability.locked.toLowerCase()).not.toBe('upgrade');
      expect(capability.locked.toLowerCase()).not.toBe('upgrade to continue');
    }
  });
});

import postgres from 'postgres';

/**
 * Put a test workspace on a tier.
 *
 * Every other spec in this suite was written before tiers existed, and each
 * signs in as a brand-new email — which now means a brand-new workspace on
 * Free. Without this helper the whole suite would quietly stop testing what it
 * was written to test and start testing the upgrade wall over and over.
 *
 * So the rule for this directory is: a spec that is not *about* entitlements
 * calls `setPlan(email, 'professional')` right after signing in, and a spec
 * that is about entitlements does not.
 *
 * The update goes straight to the database rather than through the app,
 * because no UI can set a tier and there should not be one — a page that can
 * promote its own workspace is a page an attacker can promote their workspace
 * with. When Stripe lands, its webhook writes this column and this helper
 * still stands in for it in tests.
 */
export async function setPlan(
  email: string,
  plan: 'free' | 'seeker' | 'practitioner' | 'professional',
): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error('setPlan needs TEST_DATABASE_URL');

  const sql = postgres(url, { max: 1 });
  try {
    // The workspace is created lazily, by `bootstrapUser`, during the first
    // request that carries the session cookie. Landing on /home means that
    // request has *started*; it does not guarantee the row is committed by the
    // time this connection looks for it. So poll rather than assume — the
    // alternative is a test that fails perhaps one run in twenty, which is
    // worse than a slow one because it teaches you to re-run instead of look.
    const deadline = Date.now() + 15_000;
    for (;;) {
      const updated = await sql.begin(async (tx) => {
        // `app.bypass_rls` is the same escape hatch bootstrapUser uses.
        // Without it the workspaces row is invisible to this connection and
        // the UPDATE would silently affect nothing, which looks identical to
        // a passing test.
        await tx`select set_config('app.bypass_rls', 'on', true)`;
        return tx`
          UPDATE workspaces w
             SET plan = ${plan}, plan_source = 'manual'
            FROM memberships m
            JOIN users u ON u.id = m.user_id
           WHERE m.workspace_id = w.id
             AND u.email = ${email}
          RETURNING w.id`;
      });
      if (updated.length > 0) return;
      if (Date.now() > deadline) {
        throw new Error(`setPlan found no workspace for ${email} after 15s`);
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

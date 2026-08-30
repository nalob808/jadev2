import { expect, test, type Page } from '@playwright/test';
import { setPlan } from './plan';

/**
 * The gate.
 *
 * The one thing worth proving in a browser is that these are *gates* and not
 * hidden links. Every refusal below is reached by navigating straight to the
 * URL, because that is what somebody with a bookmark, a shared link or a
 * little curiosity will do, and a check that only runs when you click through
 * the navigation is not a check.
 *
 * The other half of the spec is the promises the gate must keep: that a
 * refusal explains itself, that export is never refused, and that nothing is
 * deleted when a limit is reached.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-plan-${Date.now()}-${(seq += 1)}@example.com`;

async function signInFree(page: Page): Promise<string> {
  const email = nextEmail();
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  // A workspace created after the migration starts on Free by column default.
  // Asserted rather than assumed — if grandfathering ever widened to catch new
  // sign-ups, every test below would pass while testing nothing.
  await page.goto('/settings');
  await expect(page.getByText('Free', { exact: true })).toBeVisible({ timeout: 30_000 });
  return email;
}

async function addPerson(page: Page, name: string): Promise<string> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', '1994-03-11');
  await page.fill('#time', '07:45');
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  return page.url();
}

test('a gated page refuses a direct URL, not just a hidden link', async ({ page }) => {
  await signInFree(page);

  await page.goto('/relationships');
  await expect(page).toHaveURL(/\/upgrade\?/, { timeout: 20_000 });
  await expect(
    page.getByRole('heading', { name: /Relationships are a Seeker feature/ }),
  ).toBeVisible();
});

test('a refusal says what was blocked, what it does, and what it costs', async ({ page }) => {
  await signInFree(page);
  const person = await addPerson(page, 'Walled Subject');

  await page.goto(`${person}/rectify`);
  await expect(page).toHaveURL(/\/upgrade\?/, { timeout: 20_000 });

  // 1. named as the feature, never a bare "upgrade"
  await expect(
    page.getByRole('heading', { name: /Rectification is a Seeker feature/ }),
  ).toBeVisible();
  // 2. what the feature actually does
  await expect(page.getByText(/candidate birth times/)).toBeVisible();
  // 3. the cheapest tier with it, and its price
  await expect(page.getByText('The cheapest tier with it')).toBeVisible();
  await expect(page.getByText(/Seeker · \$9\/mo/)).toBeVisible();
  // 4. where they stand now
  await expect(page.getByText('Your tier', { exact: true })).toBeVisible();

  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).not.toContain('upgrade to continue');
});

test('reports are refused on free and open once the tier changes', async ({ page }) => {
  const email = await signInFree(page);
  const person = await addPerson(page, 'Report Subject');

  await page.goto(`${person}/report`);
  await expect(page).toHaveURL(/\/upgrade\?/, { timeout: 20_000 });

  // The same URL, the same workspace, one column different.
  await setPlan(email, 'seeker');
  await page.goto(`${person}/report`);
  await expect(page).not.toHaveURL(/\/upgrade/, { timeout: 30_000 });
  await expect(page.getByRole('button', { name: /Print/ })).toBeVisible({ timeout: 30_000 });
});

test('the people limit is announced before it is enforced', async ({ page }) => {
  await signInFree(page);

  await addPerson(page, 'One');
  await page.goto('/people');
  await expect(page.getByText('1 of 3 people · Free')).toBeVisible({ timeout: 20_000 });

  await addPerson(page, 'Two');
  await addPerson(page, 'Three');

  await page.goto('/people');
  await expect(page.getByText('3 of 3 people · Free')).toBeVisible({ timeout: 20_000 });

  // Nothing was deleted to make room, and nothing is hidden. Scoped to the
  // heading — the limit meter says "of 3 people" a few pixels away.
  await expect(page.getByRole('heading', { name: '3 people' })).toBeVisible();

  // The form itself refuses, not just the button that leads to it.
  await page.goto('/people/new');
  await expect(page).toHaveURL(/\/upgrade\?full=people/, { timeout: 20_000 });
  await expect(
    page.getByText(/The limit is on adding, not on keeping|limit is on adding/),
  ).toBeVisible();
});

test('export is never refused, on any tier', async ({ page }) => {
  // Constitution item 4. This is the one capability that must survive every
  // pricing decision, so it is asserted on the cheapest tier there is.
  await signInFree(page);
  const person = await addPerson(page, 'Portable Subject');
  const id = person.split('/').pop()!;

  const response = await page.request.get(`/api/people/${id}/export`);
  expect(response.status()).toBe(200);
  const body = (await response.json()) as { exportedFormat: string };
  expect(body.exportedFormat).toBe('jade.subject.v1');
});

test('wanting a tier is recorded rather than pretended', async ({ page }) => {
  await signInFree(page);

  await page.goto('/upgrade?need=reports');
  const ask = page.getByRole('button', { name: /Tell me when Seeker opens/ });
  await expect(ask).toBeVisible({ timeout: 20_000 });

  // No fake checkout anywhere on the wall.
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of ['card number', 'pay now', 'buy now', 'start your subscription']) {
    expect(body, `the wall said "${phrase}"`).not.toContain(phrase);
  }
  expect(body).toContain('checkout is not open yet');

  await ask.click();
  await expect(page.getByText(/Noted\./)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/no card has been asked for/)).toBeVisible();
});

test('an unrecognised tier is shown, not silently downgraded', async ({ page }) => {
  const email = await signInFree(page);
  // Exactly what a mistyped Stripe price mapping would write.
  await setPlan(email, 'enterprise' as 'free');

  await page.goto('/settings');
  await expect(page.getByText(/is not a tier Jade knows/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('enterprise')).toBeVisible();
});

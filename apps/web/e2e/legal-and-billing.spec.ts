import { expect, test, type Page } from '@playwright/test';
import { setPlan } from './plan';

/**
 * The legal pages, and the wall's honesty when checkout does not exist.
 *
 * The billing assertions here are deliberately about the *unconfigured* state,
 * because that is the state this code ships in and the one that is easy to get
 * wrong: a half-built payment flow that renders a Buy button leading nowhere
 * is worse than no button at all. The configured path needs live Stripe keys
 * and is covered by the unit tests on `resolvePlanChange` instead, which is
 * where the decisions that can take somebody's product away actually live.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-legal-${Date.now()}-${(seq += 1)}@example.com`;

async function signInFree(page: Page): Promise<string> {
  const email = nextEmail();
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  return email;
}

test('the terms carry the never-predict rule in writing', async ({ page }) => {
  // Constitution item 6 requires this to be enforced in the interpretation
  // layer AND in the terms. The first half is unit-tested; this is the second.
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What Jade will not do' })).toBeVisible();

  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('does not predict death, disease, or legal outcomes');
  expect(body).toContain('not medical, legal');
});

test('the terms say cancelling never deletes anything', async ({ page }) => {
  await page.goto('/terms');
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('cancelling never deletes anything');
  expect(body).toContain('jade never receives or stores your card number');
});

test('the privacy policy states the encryption position accurately', async ({ page }) => {
  // The one sentence on this site most tempting to overstate. It must name the
  // gap rather than let a reader infer field-level encryption we do not have.
  await page.goto('/privacy');
  const body = (await page.locator('body').innerText()).toLowerCase();

  expect(body).toContain('does not currently encrypt birth data at the field level');
  // And it must not make the bare claim on its own.
  expect(body).not.toContain('your data is encrypted.');
  expect(body).not.toContain('fully encrypted');
  expect(body).not.toContain('end-to-end encrypted');
});

test('the privacy policy promises export on every tier', async ({ page }) => {
  await page.goto('/privacy');
  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('every tier, including the free one');
  expect(body).toContain('your data is not leverage');
  // No birth data to model vendors without separate consent.
  expect(body).toContain('no birth data is sent to any ai');
});

test('both legal pages are reachable from the site footer', async ({ page }) => {
  await page.goto('/pricing');
  await page.getByRole('link', { name: 'Privacy Policy' }).first().click();
  await expect(page).toHaveURL(/\/privacy$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
});

test('with no Stripe keys the wall offers no checkout it cannot honour', async ({ page }) => {
  await signInFree(page);
  await page.goto('/upgrade?need=reports');

  const body = (await page.locator('body').innerText()).toLowerCase();
  expect(body).toContain('checkout is not open');
  // Specifically: no button that would take a card and fail.
  await expect(page.getByRole('button', { name: /\$9\/month/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Tell me when Seeker opens/ })).toBeVisible();
});

test('settings shows no billing controls until there is a customer', async ({ page }) => {
  const email = await signInFree(page);
  await setPlan(email, 'seeker');
  await page.goto('/settings');
  // The tier is shown, but "Manage billing" would open a portal for a customer
  // that does not exist.
  await expect(page.getByText('Seeker', { exact: true })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Manage billing' })).toHaveCount(0);
});

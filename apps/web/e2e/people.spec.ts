import { expect, test } from '@playwright/test';

/**
 * The Phase 2 promise, end to end: sign in, add a person, get a correct chart.
 *
 * Two of the assertions here exist because the bugs they catch were invisible
 * to typecheck, lint and unit tests, and only appeared when a browser drove
 * the real app:
 *
 *  - the submit button dropped its own form submission, because disabling it
 *    synchronously in the click handler beat the browser to the punch;
 *  - a concurrent first sign-in created the user twice.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

const EMAIL = `e2e-${Date.now()}@example.com`;

test('sign in, add a person, and see their chart', async ({ page }) => {
  await page.goto('/sign-in');
  await page.fill('#email', EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByText('Nobody here yet')).toBeVisible();

  await page.goto('/people/new');
  await page.fill('#displayName', 'Reference Chart');
  await page.fill('#date', '2001-11-07');
  await page.fill('#time', '10:32');
  await page.fill('#place-search', 'Ann Arb');

  const option = page.locator('ul li button').first();
  await expect(option).toContainText('Ann Arbor');
  await expect(option).toContainText('America/Detroit');
  await option.click();

  // Regression: this click must actually submit the form.
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  // The chart must match the values the @jade/astro accuracy suite pins to
  // Swiss Ephemeris — this is the whole pipeline agreeing end to end.
  // Named, because the page now carries two tables — the positions and the
  // twelve houses — and an unqualified `tbody` matches both.
  const table = page.getByRole('table', { name: 'Graha positions' }).locator('tbody');
  await expect(table).toContainText('29°48′ Scorpio'); // Ascendant
  await expect(table).toContainText('10°08′ Cancer'); // Moon
  await expect(table).toContainText('Pushya');
  await expect(table).toContainText('Rahu'); // absent from the v0 prototype entirely
  await expect(table).toContainText('Ketu');

  // First render computes; the reload must be served from the content-addressed cache.
  await expect(page.getByText('computed')).toBeVisible();
  await page.reload();
  await expect(page.getByText('cached')).toBeVisible();
});

test('a person appears in the list and can be exported', async ({ page }) => {
  await page.goto('/sign-in');
  await page.fill('#email', EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByText('Reference Chart')).toBeVisible();

  const href = await page
    .getByText('Reference Chart')
    .locator('xpath=ancestor::a')
    .getAttribute('href');
  const response = await page.request.get(`/api/people/${href!.split('/').pop()}/export`);
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { exportedFormat: string; birthEvents: unknown[] };
  expect(body.exportedFormat).toBe('jade.subject.v1');
  expect(body.birthEvents).toHaveLength(1);
});

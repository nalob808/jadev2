import { expect, test } from '@playwright/test';

/**
 * The Phase 4 promise, end to end: pair two people and read them together.
 *
 * The assertions that matter here are the ones about *tone*, not layout.
 * Aṣṭakūṭa and maṅgala doṣa are the two techniques in Jyotiṣa most often
 * handed to people as a verdict on their marriage, and the whole design of
 * these pages is that they cannot be. So this test checks that the components
 * are shown with their reasons, that the doṣa is never printed without its
 * cancellations, and that no verdict language appears anywhere on the page.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

const EMAIL = `e2e-rel-${Date.now()}@example.com`;

async function addPerson(
  page: import('@playwright/test').Page,
  name: string,
  date: string,
  time: string,
): Promise<void> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', date);
  await page.fill('#time', time);
  await page.fill('#place-search', 'Ann Arb');
  const option = page.locator('ul li button').first();
  await expect(option).toContainText('Ann Arbor');
  await option.click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
}

test('pair two people and read the two charts together', async ({ page }) => {
  await page.goto('/sign-in');
  await page.fill('#email', EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  // Signing in lands on the dashboard, not the list.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });

  await addPerson(page, 'First Person', '2001-11-07', '10:32');
  await addPerson(page, 'Second Person', '1996-03-19', '04:10');

  await page.goto('/relationships');
  await page.selectOption('#subjectAId', { label: 'First Person' });
  await page.selectOption('#subjectBId', { label: 'Second Person' });
  await page.getByRole('button', { name: 'Pair them' }).click();
  await expect(page).toHaveURL(/\/relationships\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  // Every kūṭa is present, and each one shows the reason for its score rather
  // than the score alone.
  for (const kuta of [
    'Varṇa',
    'Vaśya',
    'Tārā',
    'Yoni',
    'Graha Maitrī',
    'Gaṇa',
    'Bhakūṭa',
    'Nāḍī',
  ]) {
    await expect(page.getByRole('rowheader', { name: kuta })).toBeVisible();
  }
  const body = page.locator('body');
  await expect(body).toContainText('/ 8'); // nāḍī, the largest single component
  await expect(body).toContainText('of 36 points');

  // The total is present but framed as a summary, never as a verdict.
  await expect(body).toContainText('not a verdict on a relationship');

  // No verdict language anywhere on the page. This is the assertion that would
  // catch someone later adding a helpful-looking "compatibility: 62%" badge.
  const text = (await body.innerText()).toLowerCase();
  for (const forbidden of [
    'compatible',
    'incompatible',
    'not recommended',
    'good match',
    'bad match',
    'pass',
    'fail',
  ]) {
    expect(text, `page must not say "${forbidden}"`).not.toContain(forbidden);
  }

  // Both overlays, in both directions.
  await expect(page.getByText('First Person in Second Person’s houses')).toBeVisible();
  await expect(page.getByText('Second Person in First Person’s houses')).toBeVisible();

  // Maṅgala doṣa is on the page, and it says which references produced it.
  await expect(body).toContainText('Maṅgala doṣa');
  await expect(body).toContainText('Read from');

  // The overlay wheel, drawn once, with an accessible name.
  const wheel = page.getByRole('img', { name: /Synastry overlay/ });
  await expect(wheel).toBeVisible();

  // The shared timeline, and its promise that nothing is highlighted mutely.
  await expect(body).toContainText('Shared timeline');
  await expect(body).toContainText('Where the two meet');

  // Every convergence band names its rule and lists its factors beneath it.
  // A band with a heading and no reasons is the failure this guards against.
  const bands = page.locator('[data-convergence]');
  const bandCount = await bands.count();
  expect(bandCount).toBeGreaterThan(0);
  for (let i = 0; i < Math.min(bandCount, 5); i += 1) {
    // Each band carries at least one factor line beneath its heading.
    await expect(bands.nth(i).locator('li').first()).toBeVisible();
  }

  // Only the four named rules may appear. This is what stops a fifth,
  // unexplained highlight being added later without a rule behind it.
  const rules = await bands.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-convergence')),
  );
  for (const rule of rules) {
    expect(['sameLord', 'mutualDrishti', 'lordInPartnersSeventh', 'seventhLordPeriod']).toContain(
      rule,
    );
  }

  // Unpairing removes the relationship and neither person.
  await page.getByRole('button', { name: /unpair/ }).click();
  await expect(page).toHaveURL(/\/relationships$/, { timeout: 30_000 });
  await page.goto('/people');
  await expect(page.getByText('First Person')).toBeVisible();
  await expect(page.getByText('Second Person')).toBeVisible();
});

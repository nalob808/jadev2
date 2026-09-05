import { expect, test } from '@playwright/test';

/**
 * The public chart library.
 *
 * Two things are worth a browser here, and the second is the important one.
 *
 * The library must work with no account at all — that is its whole purpose as a
 * front door, so every assertion below runs signed out.
 *
 * And it must never draw an ascendant it cannot stand behind. Nineteen of the
 * twenty seeded figures have no attested birth time, so the untimed page is the
 * common case rather than an edge case, and the failure it guards against —
 * assuming noon and rendering a confident lagna — is invisible to a reader by
 * construction. Only a test can catch it.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

test('the library opens with no account', async ({ page }) => {
  await page.goto('/charts');
  await expect(page.getByRole('heading', { name: 'Charts you can check' })).toBeVisible({
    timeout: 30_000,
  });
  // Never bounced to sign-in.
  await expect(page).toHaveURL(/\/charts$/);
  await expect(page.getByRole('link', { name: /Ramanujan/ }).first()).toBeVisible();
});

test('it states the lens it computed with', async ({ page }) => {
  // Constitution item 3. These pages have no settings profile to read, so the
  // default has to be visible rather than merely fixed.
  await page.goto('/charts');
  await expect(page.getByText(/Lahiri ayanāṁśa/).first()).toBeVisible({ timeout: 30_000 });
});

test('an untimed figure gets no lagna, and is told why', async ({ page }) => {
  await page.goto('/charts/srinivasa-ramanujan');
  await expect(page.getByRole('heading', { name: 'Srinivasa Ramanujan' })).toBeVisible({
    timeout: 30_000,
  });

  // The refusal, stated.
  await expect(page.getByText(/No ascendant is shown/)).toBeVisible();
  await expect(page.getByText(/travels the entire zodiac in a day/)).toBeVisible();

  // And no computed lagna anywhere — not in a glance tile, not in a table.
  // Asserted on the labels rather than on the word "ascendant", because the
  // disclosure above legitimately uses that word; a substring check would be
  // satisfied by deleting the honesty, which is the wrong thing to enforce.
  await expect(page.getByText('Lagna')).toHaveCount(0);
  await expect(page.getByText('Daśā at birth')).toHaveCount(0);
  // The house column belongs to timed charts only.
  await expect(page.getByRole('columnheader', { name: 'House' })).toHaveCount(0);
});

test('an untimed figure still shows what the date does settle', async ({ page }) => {
  await page.goto('/charts/srinivasa-ramanujan');
  await expect(page.getByText('Settled by the date alone')).toBeVisible({ timeout: 30_000 });
  // Saturn barely moves in a day, so it is certain and must be listed.
  await expect(page.getByRole('rowheader', { name: /Saturn/ })).toBeVisible();
  // And the missing time is framed as the thing rectification exists for.
  await expect(page.getByText(/A missing time is a question, not a dead end/)).toBeVisible();
});

test('a timed figure gets the glance and a full chart', async ({ page }) => {
  // Einstein is the one AA-rated record in the seed roster.
  await page.goto('/charts/albert-einstein');
  await expect(page.getByRole('heading', { name: 'Albert Einstein' })).toBeVisible({
    timeout: 30_000,
  });

  await expect(page.getByText('Lagna')).toBeVisible();
  await expect(page.getByText('Nakṣatra').first()).toBeVisible();
  await expect(page.getByText('Daśā at birth')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'House' })).toBeVisible();

  // Real degrees, so it could only be this chart.
  const body = await page.locator('body').innerText();
  expect(body).toMatch(/\d+°\d{2}′/);
});

test('every chart shows how well its time is attested', async ({ page }) => {
  // The rating is part of the birth data, not a footnote about it.
  await page.goto('/charts/albert-einstein');
  await expect(page.getByText('How well the time is known')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('From a birth certificate or register')).toBeVisible();

  await page.goto('/charts/mohandas-gandhi');
  await expect(page.getByText('No birth time is recorded')).toBeVisible({ timeout: 30_000 });
  // And where sources disagree, the page says that rather than picking one.
  await expect(page.getByText(/disagree with one another/)).toBeVisible();
});

test('born-on-this-day is walkable and 404s on a real non-date', async ({ page }) => {
  await page.goto('/charts/born/12/22');
  await expect(page.getByRole('heading', { name: '22 December' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: /Ramanujan/ }).first()).toBeVisible();
  await page.getByRole('link', { name: /day after/ }).click();
  await expect(page).toHaveURL(/\/charts\/born\/12\/23$/, { timeout: 20_000 });

  const bad = await page.goto('/charts/born/13/40');
  expect(bad?.status()).toBe(404);
});

test('browsing by what they did', async ({ page }) => {
  await page.goto('/charts/tag/scientist');
  await expect(page.getByRole('heading', { name: 'Scientists' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('link', { name: /Einstein/ }).first()).toBeVisible();
});

test('the library cannot show a private person', async ({ page }) => {
  // The structural guarantee from migration 0012: these pages never query the
  // subjects table, so a client cannot appear here however the code changes.
  // Asserted through the front door — the e2e suite creates people named
  // "… Subject" and "… Client" in other specs against this same database.
  await page.goto('/charts');
  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const leak of ['subject', 'client', 'e2e-']) {
    expect(body, `the library listed something named with "${leak}"`).not.toContain(leak);
  }
});

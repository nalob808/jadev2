import { expect, test } from '@playwright/test';

/**
 * The list controls and the settings page.
 *
 * Two of these guard specific mistakes rather than features. The disabled
 * house systems must stay unselectable, because `houseOf` throws on them and
 * the database enum would accept the write — the crash would arrive later, on
 * a chart page, for a setting that appeared to save. And a view chosen in the
 * UI must survive a reload, because the whole reason the state lives in the
 * URL is that component state does not.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

const EMAIL = `e2e-views-${Date.now()}@example.com`;

const PEOPLE = [
  { name: 'Zoya Batra', date: '1975-11-30', time: '23:15', place: 'Ann Arb' },
  { name: 'Arun Mehta', date: '2001-11-07', time: '10:32', place: 'Ann Arb' },
];

async function signIn(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('#email', EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/people$/);
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage();
  await signIn(page);
  for (const entry of PEOPLE) {
    await page.goto('/people/new');
    await page.fill('#displayName', entry.name);
    await page.fill('#date', entry.date);
    await page.fill('#time', entry.time);
    await page.fill('#place-search', entry.place);
    await page.locator('ul li button').first().click();
    await page.getByRole('button', { name: 'Add person' }).click();
    await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  }
  await page.close();
});

test('search, sort and view live in the URL and survive a reload', async ({ page }) => {
  await signIn(page);

  // Search narrows the list and reports what it hid.
  await page.fill('#people-search', 'zoya');
  await expect(page).toHaveURL(/q=zoya/, { timeout: 10_000 });
  await expect(page.getByText('Arun Mehta')).toHaveCount(0);
  await expect(page.getByText('1 of 2')).toBeVisible();

  // Clearing restores everyone.
  await page.getByRole('button', { name: 'clear filters' }).click();
  await expect(page.getByText('Arun Mehta')).toBeVisible();
  await expect(page.getByText('Zoya Batra')).toBeVisible();

  // The table view is a real table, and it persists across a reload.
  await page.getByRole('button', { name: 'Table' }).click();
  await expect(page).toHaveURL(/view=table/);
  await expect(page.locator('table thead')).toContainText('Born');
  await page.reload();
  await expect(page.locator('table thead')).toContainText('Born');

  // Sorting by birth date puts the older person first, whatever the view.
  await page.goto('/people?sort=birth&view=list');
  const names = await page.locator('a span.font-display').allTextContents();
  expect(names).toEqual(['Zoya Batra', 'Arun Mehta']);
});

test('a nonsense URL shows the list rather than an error', async ({ page }) => {
  await signIn(page);
  await page.goto('/people?sort=sideways&view=hologram');
  await expect(page.getByText('Zoya Batra')).toBeVisible();
});

test('settings saves the lens, and refuses what is not implemented', async ({ page }) => {
  await signIn(page);
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'The lens' })).toBeVisible();

  // The two unbuilt house systems are visible — so the question is answered —
  // but cannot be chosen.
  const houses = page.locator('select[name="houseSystem"]');
  await expect(houses.locator('option[value="sripati"]')).toBeDisabled();
  await expect(houses.locator('option[value="placidus"]')).toBeDisabled();
  await expect(houses.locator('option[value="whole_sign"]')).toBeEnabled();

  // A real change round-trips through the database.
  await page.locator('select[name="ayanamsa"]').selectOption('raman');
  await page.locator('select[name="nodeType"]').selectOption('true');
  await page.getByRole('button', { name: 'Save settings' }).click();

  await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 });
  await expect(page.getByText('Saved')).toBeVisible();
  await page.reload();
  await expect(page.locator('select[name="ayanamsa"]')).toHaveValue('raman');
  await expect(page.locator('select[name="nodeType"]')).toHaveValue('true');

  // Put it back, so this test can run twice against the same database.
  await page.locator('select[name="ayanamsa"]').selectOption('lahiri');
  await page.locator('select[name="nodeType"]').selectOption('mean');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 });
});

test('a custom ayanamsa without a value is rejected, not silently defaulted', async ({ page }) => {
  // Constitution item 3: no silent defaults in astrology settings. Falling back
  // to Lahiri here would compute charts in a frame nobody chose while the UI
  // reported the frame they did.
  await signIn(page);

  // Establish the baseline rather than inheriting whatever the previous test
  // left behind. A test that only passes in a particular order is a test that
  // will fail for the wrong reason later.
  await page.goto('/settings');
  await page.locator('select[name="ayanamsa"]').selectOption('lahiri');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 });

  await page.goto('/settings');
  await page.locator('select[name="ayanamsa"]').selectOption('custom');
  await page.fill('input[name="customAyanamsaAtJ2000"]', '');
  await page.getByRole('button', { name: 'Save settings' }).click();

  await expect(page).toHaveURL(/error=/, { timeout: 20_000 });
  await expect(page.getByText(/needs its value at J2000/)).toBeVisible();

  // The select still reads "custom" here, and that is correct: the redirect
  // re-renders the same component in the same position, so React keeps the
  // existing uncontrolled <select> and `defaultValue` does not re-apply. The
  // rejected choice staying on screen is the useful behaviour — she reads the
  // error and types the missing number rather than starting again.
  //
  // What matters is that nothing was *written*. A fresh load reads the row.
  await page.goto('/settings');
  await expect(page.locator('select[name="ayanamsa"]')).toHaveValue('lahiri');
});

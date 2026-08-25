import { expect, test, type Page } from '@playwright/test';

/**
 * The dashboard and the interactive wheel.
 *
 * The dashboard's structural claim is that "yours" and "the sky" are separate.
 * That separation is the whole reason it is not a horoscope: a general transit
 * reads as a personal prediction the moment it sits under someone's name. So
 * the test asserts both sections exist and that the sky section says out loud
 * that it is about nobody.
 *
 * The wheel's claims are geometric and interactive. The geometry is unit
 * tested; what only a browser can check is that the toggles actually change
 * what is rendered.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-dash-${Date.now()}-${(seq += 1)}@example.com`;

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  // Wait for the session to actually land. Navigating before this races an
  // unset cookie and every subsequent page bounces back to /sign-in.
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
}

async function addPerson(page: Page, name: string): Promise<string> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', '2001-11-07');
  await page.fill('#time', '10:32');
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  // The URL changes before the server component finishes streaming, so
  // waiting on it alone reads the loading skeleton. Wait for real content.
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });
  return page.url();
}

test('signing in lands on the dashboard, not the people list', async ({ page }) => {
  await signIn(page, nextEmail());
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
});

test('the dashboard separates what is yours from what is everyone’s', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/dashboard');

  await expect(page.getByText('Yours', { exact: true })).toBeVisible();
  await expect(page.getByText('The sky', { exact: true })).toBeVisible();

  // The sky panel must say it is impersonal. This is the line that keeps a
  // general transit from reading as a prediction about the reader.
  await expect(page.getByText(/True of everyone/)).toBeVisible();

  // And it must state the lens it computed in — constitution item 3.
  await expect(page.getByText(/ayanāṁśa/)).toBeVisible();
});

test('the dashboard shows real positions and a seven-day outlook', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/dashboard');

  const positions = page.getByRole('table', { name: 'Current positions' });
  await expect(positions).toBeVisible();
  // Nine grahas, nodes included.
  await expect(positions.locator('tbody tr')).toHaveCount(9);
  await expect(positions).toContainText('Rahu');
  await expect(positions).toContainText('Ketu');
  // Real degrees, not vague prose.
  await expect(positions).toContainText(/\d+°\d{2}′/);

  // "Today" is also the nav link to this page, so scope to the week strip.
  const week = page.locator('section', { hasText: 'Seven days of Moon' });
  await expect(week).toBeVisible();
  await expect(week.getByText('Today', { exact: true })).toBeVisible();
  await expect(week.getByText('Tomorrow', { exact: true })).toBeVisible();
});

test('the dashboard invites you to add yourself when nobody is marked', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/dashboard');
  await expect(page.getByText('Nobody marked as you yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add a person' })).toBeVisible();
});

test('the wheel renders and its toggles change what is drawn', async ({ page }) => {
  const email = nextEmail();
  await signIn(page, email);
  const person = await addPerson(page, 'Wheel Subject');
  await page.goto(person);
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });

  const wheel = page.getByRole('img', { name: /circular chart/i });
  await expect(wheel).toBeVisible();

  // House numbers are on by default; turning them off must remove them.
  const houseNumbers = page.getByRole('button', { name: 'House numbers' });
  await expect(houseNumbers).toHaveAttribute('aria-pressed', 'true');
  await houseNumbers.click();
  await expect(houseNumbers).toHaveAttribute('aria-pressed', 'false');

  // Dṛṣṭi is off by default; turning it on must add lines to the SVG.
  const before = await wheel.locator('line').count();
  await page.getByRole('button', { name: 'Dṛṣṭi' }).click();
  await expect(page.getByRole('button', { name: 'Dṛṣṭi' })).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(async () => wheel.locator('line').count(), { timeout: 5_000 })
    .toBeGreaterThan(before);
});

test('clicking a graha in the wheel reads out its exact placement', async ({ page }) => {
  const email = nextEmail();
  await signIn(page, email);
  const person = await addPerson(page, 'Wheel Readout');
  await page.goto(person);
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });

  // Before any selection the wheel explains itself rather than showing blanks.
  await expect(page.getByText(/Click a graha to isolate it/)).toBeVisible();

  await page.getByRole('button', { name: /^Saturn at / }).click();

  // The readout carries a real degree, sign and house — not a generic label.
  const readout = page.locator('div', { hasText: /^♄︎ Saturn/ }).last();
  await expect(readout).toContainText(/\d+°\d{2}′/);
  await expect(readout).toContainText(/house \d+/);
  await expect(page.getByRole('button', { name: 'Clear Saturn' })).toBeVisible();
});

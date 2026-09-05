import { expect, test, type Page } from '@playwright/test';
import { setPlan } from './plan';

/**
 * The wheel workspace.
 *
 * What is worth a browser here is the coordination — that one selection drives
 * the wheel and the panel together — and the glyphs, because the reason they
 * are drawn rather than typed is a rendering failure that only shows up in a
 * real browser.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-wheel-${Date.now()}-${(seq += 1)}@example.com`;

async function signIn(page: Page): Promise<string> {
  const email = nextEmail();
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  await setPlan(email, 'professional');
  return email;
}

async function addPerson(page: Page, name: string, date: string, time: string): Promise<void> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', date);
  await page.fill('#time', time);
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
}

test('the wheel has a page of its own and lists your people', async ({ page }) => {
  await signIn(page);
  await addPerson(page, 'Wheel Subject', '1994-03-11', '07:45');
  await addPerson(page, 'Second Person', '1988-07-02', '15:20');

  await page.goto('/wheel');
  await expect(page.getByText('Your people')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByRole('button', { name: /Wheel Subject/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Second Person/ })).toBeVisible();
});

test('signs are drawn, never Unicode emoji', async ({ page }) => {
  // The whole reason glyphs are SVG: iOS renders several of the Unicode
  // zodiac code points as colour emoji, at a different size and baseline, and
  // no CSS can reach them. Asserting their absence is asserting the fix.
  await signIn(page);
  await addPerson(page, 'Glyph Subject', '1994-03-11', '07:45');
  await page.goto('/wheel');
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 40_000 });

  const body = await page.locator('body').innerText();
  for (const unicodeSign of [
    '♈',
    '♉',
    '♊',
    '♋',
    '♌',
    '♍',
    '♎',
    '♏',
    '♐',
    '♑',
    '♒',
    '♓',
  ]) {
    expect(body, `the wheel printed the Unicode sign ${unicodeSign}`).not.toContain(unicodeSign);
  }
});

test('selecting a graha fills the panel with everything about it', async ({ page }) => {
  await signIn(page);
  await addPerson(page, 'Focus Subject', '1994-03-11', '07:45');
  await page.goto('/wheel');

  await expect(page.getByText('Nothing selected')).toBeVisible({ timeout: 40_000 });

  // The empty state offers the grahas directly, which is also the keyboard path.
  await page.getByRole('button', { name: 'Saturn' }).first().click();

  await expect(page.getByText('Nakṣatra lord')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Bindus')).toBeVisible();
  await expect(page.getByText('Dignity')).toBeVisible();
  // A real degree, so the panel could only be this chart.
  await expect(page.getByText(/\d+°\d{2}′/).first()).toBeVisible();

  // The coordination, observable: setting focus from the panel made the wheel
  // itself offer to clear that same graha. Two components, one selection.
  await expect(page.getByRole('button', { name: 'Clear Saturn' })).toBeVisible();

  await page.getByRole('button', { name: 'clear', exact: true }).click();
  await expect(page.getByText('Nothing selected')).toBeVisible();
  // And clearing from the panel cleared the wheel too.
  await expect(page.getByRole('button', { name: 'Clear Saturn' })).toHaveCount(0);
});

test('a second person can be overlaid on the same wheel', async ({ page }) => {
  await signIn(page);
  await addPerson(page, 'Inner Person', '1994-03-11', '07:45');
  await addPerson(page, 'Outer Person', '1988-07-02', '15:20');

  await page.goto('/wheel');
  await expect(page.getByText('Overlay a second chart')).toBeVisible({ timeout: 40_000 });

  await page.getByLabel("Overlay another person's chart").selectOption({ label: 'Inner Person' });
  await expect(page).toHaveURL(/overlay=/, { timeout: 30_000 });

  // Both rings are labelled, so nobody has to guess whose grahas are whose.
  await expect(page.getByText(/inner · this chart/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/outer · Inner Person/)).toBeVisible();
});

test('an uncertain birth time is said out loud beside the wheel', async ({ page }) => {
  await signIn(page);
  await page.goto('/people/new');
  await page.fill('#displayName', 'Unsure Subject');
  await page.fill('#date', '1994-03-11');
  await page.fill('#time', '07:45');
  await page.locator('#timeAccuracy').selectOption('hour2');
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  await page.goto('/wheel');
  // The houses on screen rest on a time that could be two hours out, and the
  // wheel says so rather than letting the drawing imply precision.
  await expect(page.getByText(/long enough for the lagna to have changed sign/)).toBeVisible({
    timeout: 40_000,
  });
});

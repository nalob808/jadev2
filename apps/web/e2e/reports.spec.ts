import { expect, test, type Page } from '@playwright/test';
import { setPlan } from './plan';

/**
 * The printable reports.
 *
 * The claims worth testing here are not about layout — a browser test cannot
 * see a page break. They are about what the document *says*:
 *
 *  - a printed chart names the frame it was computed in, because a chart
 *    without its ayanāṁśa cannot be checked by whoever is holding the paper;
 *  - every interpretive sentence still carries its placements, which is the
 *    constitutional rule and is easiest to lose when re-laying material out;
 *  - practice notes are off by default and announced when on, because they
 *    contain what the astrologer thinks rather than what they would say;
 *  - the relationship report still returns no verdict.
 *
 * The print stylesheet is exercised through Playwright's print emulation,
 * which is the same CSS path a Save-as-PDF takes.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-report-${Date.now()}-${(seq += 1)}@example.com`;

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  // Tiers arrived after this spec was written. Without this the workspace
  // is on Free and half these assertions would be testing the wall.
  await setPlan(email, 'professional');
}

async function addPerson(page: Page, name: string, date: string, time: string): Promise<string> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', date);
  await page.fill('#time', time);
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });
  return page.url();
}

test('the chart report states its frame and grounds every sentence', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Report Subject', '1994-03-11', '07:45');

  await page.goto(`${person}/report`);
  await expect(page.getByRole('heading', { name: 'Report Subject', level: 1 })).toBeVisible({
    timeout: 30_000,
  });

  // Constitution item 3, on the paper itself. Scoped to the masthead: the word
  // also appears in the provenance footer, which carries the numeric value
  // rather than the name, and matching both is ambiguous.
  const masthead = page.locator('header');
  await expect(masthead.getByText(/ayanāṁśa/)).toBeVisible();
  await expect(masthead.getByText(/whole sign houses/)).toBeVisible();

  // The set pieces are all present.
  for (const heading of [
    'The chart',
    'The twelve houses',
    'Divisional charts',
    'Sarvāṣṭakavarga',
    'Vimśottarī daśā',
    'What this chart says, and why',
  ]) {
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

  // Real degrees, not vague prose.
  await expect(page.locator('body')).toContainText(/\d+°\d{2}′/);

  // Item 5: every statement prints the placements that produced it.
  const statements = page.locator('article');
  const count = await statements.count();
  expect(count).toBeGreaterThan(5);
  for (let i = 0; i < count; i += 1) {
    const factors = await statements.nth(i).locator('span.font-mono').count();
    expect(factors, `report statement ${i} has no factors`).toBeGreaterThan(0);
  }

  // Provenance, so the sheet can be reproduced exactly.
  await expect(page.getByText(/Chart computed at JD/)).toBeVisible();
});

test('practice notes are off by default and announced when included', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Notes Subject', '2001-11-07', '10:32');

  await page.goto(person);
  await page.getByRole('button', { name: 'Write a note…' }).click();
  await page.fill('textarea[name="body"]', 'Private working thought about the ascendant.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('Private working thought about the ascendant.')).toBeVisible({
    timeout: 20_000,
  });

  // The client copy must not carry it.
  await page.goto(`${person}/report`);
  await expect(page.getByRole('heading', { name: 'The chart' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Private working thought about the ascendant.')).toHaveCount(0);
  await expect(page.getByText(/includes private practice notes/)).toHaveCount(0);

  // The practitioner's copy carries it, and says so at the top.
  await page.goto(`${person}/report?notes=1`);
  await expect(page.getByText(/includes private practice notes/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText('Private working thought about the ascendant.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Practice notes' })).toBeVisible();
});

test('the printed page drops the interface and keeps the document', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Print Subject', '1975-11-30', '23:15');
  await page.goto(`${person}/report`);
  await expect(page.getByRole('heading', { name: 'The chart' })).toBeVisible({ timeout: 30_000 });

  // Same CSS path a Save-as-PDF takes.
  await page.emulateMedia({ media: 'print' });

  // Controls go; the report stays.
  await expect(page.getByRole('button', { name: /Print/ })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'The chart' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible();

  // The chart is still drawn — a report whose diagram vanishes in print is
  // the specific failure this stylesheet exists to prevent.
  await expect(page.locator('svg.jade-chart').first()).toBeVisible();

  // And the page is white rather than the app's paper tone.
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe('rgb(255, 255, 255)');

  await page.emulateMedia({ media: 'screen' });
});

test('the relationship report keeps the promise the screen makes', async ({ page }) => {
  await signIn(page, nextEmail());
  await addPerson(page, 'Pair One', '2001-11-07', '10:32');
  await addPerson(page, 'Pair Two', '1996-03-19', '04:10');

  await page.goto('/relationships');
  await page.selectOption('#subjectAId', { label: 'Pair One' });
  await page.selectOption('#subjectBId', { label: 'Pair Two' });
  await page.getByRole('button', { name: 'Pair them' }).click();
  await expect(page).toHaveURL(/\/relationships\/[0-9a-f-]{36}$/, { timeout: 30_000 });

  await page.getByRole('link', { name: /Printable report/ }).click();
  await expect(page).toHaveURL(/\/report$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { name: 'The two charts' })).toBeVisible({
    timeout: 30_000,
  });

  // It opens by saying what it is not — the sentence that has to survive
  // being printed and read years later by someone who was not in the room.
  await expect(page.getByText(/no compatibility score on this page/)).toBeVisible();

  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const forbidden of ['compatible', 'incompatible', 'good match', 'bad match', 'verdict:']) {
    expect(body, `report said "${forbidden}"`).not.toContain(forbidden);
  }

  // Both charts drawn, and the kūṭa components shown rather than a total alone.
  await expect(page.getByRole('img', { name: /North Indian style/i })).toHaveCount(2);
  await expect(page.getByRole('rowheader', { name: 'Nāḍī' })).toBeVisible();
});

test('the wheel can show aṣṭakavarga and the chalit cusps', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Overlay Subject', '1994-03-11', '07:45');
  await page.goto(person);
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });

  const wheel = page.getByRole('img', { name: /circular chart/i });
  await expect(wheel).toBeVisible();

  // Aṣṭakavarga draws twelve bindu counts and explains what the shading is.
  const sarva = page.getByRole('button', { name: 'Aṣṭakavarga' });
  await expect(sarva).toHaveAttribute('aria-pressed', 'false');
  await sarva.click();
  await expect(sarva).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/sarva bindus per sign, 337/)).toBeVisible();
  await expect(page.getByText(/density, not merit/)).toBeVisible();

  // Chalit adds a second set of spokes and names the frame it used.
  const chalit = page.getByRole('button', { name: 'Bhāva chalit' });
  const linesBefore = await wheel.locator('line').count();
  await chalit.click();
  await expect(chalit).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(async () => wheel.locator('line').count(), { timeout: 5_000 })
    .toBeGreaterThan(linesBefore);
  await expect(page.getByText(/equal from the lagna degree/)).toBeVisible();
});

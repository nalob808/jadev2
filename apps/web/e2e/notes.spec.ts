import { expect, test, type Page } from '@playwright/test';

/**
 * Notes, and the claim that justifies anchoring them.
 *
 * The test that matters here is the cross-chart one: a note written on one
 * person's Mars must be findable from a filter that knows nothing about that
 * person. If that fails, anchoring is just a label and the whole design was
 * pointless.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

/**
 * A fresh workspace per test.
 *
 * These tests share a database, and a signed-in email *is* the workspace. With
 * one address for the file, notes written by an earlier test are still on
 * screen in a later one — which makes any positional assertion ("the last
 * card") quietly wrong, and only in a full run, never when the test is run
 * alone. A unique address per test is the cheapest real isolation available.
 */
let seq = 0;
const nextEmail = (): string => `e2e-notes-${Date.now()}-${(seq += 1)}@example.com`;

const PEOPLE = [
  { name: 'Note Subject One', date: '2001-11-07', time: '10:32' },
  { name: 'Note Subject Two', date: '1975-11-30', time: '23:15' },
];

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/people$/);
}

async function addPerson(page: Page, entry: (typeof PEOPLE)[number]): Promise<string> {
  await page.goto('/people/new');
  await page.fill('#displayName', entry.name);
  await page.fill('#date', entry.date);
  await page.fill('#time', entry.time);
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  return page.url();
}

/** Open the composer, write, choose an anchor, save. */
async function writeNote(page: Page, body: string, anchor?: string, tags?: string): Promise<void> {
  await page.getByRole('button', { name: 'Write a note…' }).click();
  await page.fill('textarea[name="body"]', body);

  if (anchor) {
    await page.getByRole('button', { name: /No particular factor/ }).click();
    await page.fill('input[placeholder*="Filter"]', anchor);
    await page
      .getByRole('option', { name: new RegExp(anchor, 'i') })
      .first()
      .click();
  }
  if (tags) await page.fill('input[name="tags"]', tags);

  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });
}

test('a note anchored on one chart is found from every chart', async ({ page }) => {
  await signIn(page, nextEmail());
  const first = await addPerson(page, PEOPLE[0]!);
  await addPerson(page, PEOPLE[1]!);

  // Written while looking at one person's chart...
  await page.goto(first);
  await writeNote(page, 'Mars here is doing the heavy lifting.', 'Mars', 'lesson');

  // ...and found from a filter that names only the factor.
  await page.goto('/notes?anchorKind=graha&anchorKey=Mars');
  await expect(page.getByText('Mars here is doing the heavy lifting.')).toBeVisible();
  await expect(page.getByRole('link', { name: PEOPLE[0]!.name })).toBeVisible();
});

test('the study log searches, filters by tag, and pins', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/notes');

  await writeNote(page, 'Kendras are the pillars of the chart.', undefined, 'theory');
  await writeNote(page, 'Revisit the ninth lord question.', undefined, 'revisit');

  // Full text. The search box is debounced and navigates, so wait for the URL
  // to catch up — asserting on content first reads the pre-search list and
  // fails for a reason that has nothing to do with searching.
  await page.fill('#notes-search', 'pillars');
  await expect(page).toHaveURL(/q=pillars/, { timeout: 10_000 });
  await expect(page.getByText('Kendras are the pillars of the chart.')).toBeVisible();
  await expect(page.getByText('Revisit the ninth lord question.')).toHaveCount(0);

  await page.goto('/notes');
  await page.locator('#notes-tag').selectOption('revisit');
  await expect(page).toHaveURL(/tag=revisit/, { timeout: 10_000 });
  await expect(page.getByText('Revisit the ninth lord question.')).toBeVisible();
  await expect(page.getByText('Kendras are the pillars of the chart.')).toHaveCount(0);

  // Pinning floats a note above newer ones. Located by its text rather than by
  // position, so the assertion says what it means.
  await page.goto('/notes');
  const older = page.locator('article', { hasText: 'Kendras are the pillars' }).first();
  await older.getByRole('button', { name: 'Pin this note' }).click();
  await expect(page.locator('article').first()).toContainText('Kendras are the pillars');
});

test('an empty note is refused rather than saved blank', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/notes');
  await page.getByRole('button', { name: 'Write a note…' }).click();
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText(/Write something first/)).toBeVisible({ timeout: 20_000 });
});

test('a note can be edited and deleted in place', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/notes');
  await writeNote(page, 'First draft of a thought.');

  const card = page.locator('article', { hasText: 'First draft of a thought.' }).first();
  await card.getByRole('button', { name: 'Edit' }).click();
  await card.locator('textarea[name="body"]').fill('Second draft, much better.');
  await card.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Second draft, much better.')).toBeVisible({ timeout: 20_000 });

  const edited = page.locator('article', { hasText: 'Second draft, much better.' }).first();
  await edited.getByRole('button', { name: 'Delete' }).click();
  await edited.getByRole('button', { name: 'Yes' }).click();
  await expect(page.getByText('Second draft, much better.')).toHaveCount(0, { timeout: 20_000 });
});

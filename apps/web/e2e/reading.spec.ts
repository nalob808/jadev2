import { expect, test, type Page } from '@playwright/test';
import { setPlan } from './plan';

/**
 * The reading, and the constitutional rule it exists under.
 *
 * The assertion that matters is that no interpretive sentence appears without
 * the factors that produced it. That is CLAUDE.md item 5, and it is the whole
 * difference between this and a horoscope generator — so it is tested in the
 * browser as well as in the unit suite, because a UI could perfectly well
 * render the text and drop the factors.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

const EMAIL = `e2e-reading-${Date.now()}@example.com`;

async function signInAndAddPerson(page: Page): Promise<string> {
  await page.goto('/sign-in');
  await page.fill('#email', EMAIL);
  await page.getByRole('button', { name: 'Continue' }).click();
  // Signing in lands on the dashboard, not the list.
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  await setPlan(EMAIL, 'professional');

  await page.goto('/people/new');
  await page.fill('#displayName', 'Reading Subject');
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

test('every statement in a reading shows the factors that produced it', async ({ page }) => {
  await signInAndAddPerson(page);

  const reading = page.locator('section', { hasText: 'What this chart says, and why' });
  await expect(reading).toBeVisible();

  // Each statement is an <article> carrying its own factor chips.
  const statements = reading.locator('article');
  const count = await statements.count();
  expect(count).toBeGreaterThan(5);

  for (let i = 0; i < count; i += 1) {
    const statement = statements.nth(i);
    const text = (await statement.locator('p').first().innerText()).trim();
    expect(text.length, `statement ${i} is empty`).toBeGreaterThan(40);
    expect(text).not.toContain('undefined');

    // The rule: no statement without its factors, visible.
    const factors = await statement.locator('span.font-mono').count();
    expect(factors, `statement ${i} has no factors shown`).toBeGreaterThan(0);
  }
});

test('a reading is specific to the chart, and never predicts the forbidden', async ({ page }) => {
  await signInAndAddPerson(page);

  const body = await page.locator('body').innerText();

  // Specific: the actual degrees appear, not generic prose.
  expect(body).toMatch(/\d+°\d{2}′/);

  // Constitution item 6, checked at the rendered page rather than the library.
  for (const word of ['death', 'fatal', 'disease', 'lawsuit', 'litigation']) {
    expect(body.toLowerCase(), `the page said "${word}"`).not.toContain(word);
  }
});

test('the house table teaches, and links to the reference', async ({ page }) => {
  const person = await signInAndAddPerson(page);
  await page.goto(person);
  // Named, because the page carries two tables.
  const table = page.getByRole('table', { name: 'The twelve houses' });
  await expect(table).toBeVisible({ timeout: 30_000 });
  await expect(table.locator('tbody tr')).toHaveCount(12);

  await table.getByRole('link', { name: '7', exact: true }).click();
  // 20s, not the 5s default. This is the first navigation to a /learn route in
  // the run, and `next dev` compiles it on demand — under a full suite that
  // regularly takes longer than five seconds. It passed in isolation and
  // failed in the full run, which is exactly what a too-short timeout looks
  // like, and re-running until it goes green is how a real flake gets kept.
  await expect(page).toHaveURL(/\/learn\/houses\/7$/, { timeout: 20_000 });
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Partnership');
});

test('the reference pages render signed out and cite a source', async ({ page }) => {
  for (const path of [
    '/learn',
    '/learn/houses/1',
    '/learn/signs/scorpio',
    '/learn/grahas/saturn',
  ]) {
    await page.goto(path);
    await expect(page.locator('h1'), path).toHaveCount(1);

    if (path !== '/learn') {
      // Teaching text that cites nothing is an opinion.
      await expect(page.getByText(/Source:/), path).toBeVisible();
    }

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical, path).toContain('jadeapp.co');
  }
});

test('the sitemap lists every reference page', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  // 12 houses + 12 signs + 9 grahas. A crawler will not find these from the
  // index at any useful rate, which is the whole reason they are listed.
  for (const path of ['/learn/houses/12', '/learn/signs/pisces', '/learn/grahas/ketu']) {
    expect(xml, path).toContain(path);
  }
});

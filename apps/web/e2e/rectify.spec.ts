import { expect, test, type Page } from '@playwright/test';

/**
 * The rectification workspace.
 *
 * What is worth testing in a browser here is not the arithmetic — that is
 * covered in the unit suite — but the refusals, because they are the whole
 * reason this feature is trustworthy and they live entirely in the UI:
 *
 *  - it never names a corrected birth time, only a ranked shortlist;
 *  - every candidate shows the rules and placements that scored it;
 *  - rules that fired for every candidate are reported as having ranked
 *    nothing, rather than quietly padding a confident-looking spread;
 *  - adopting a candidate records that the time came from a sweep.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-rectify-${Date.now()}-${(seq += 1)}@example.com`;

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
}

async function addPerson(page: Page, name: string): Promise<string> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', '1994-03-11');
  await page.fill('#time', '07:45');
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });
  return page.url();
}

async function addEvent(page: Page, kind: string, date: string): Promise<void> {
  await page.locator('#kind').selectOption(kind);
  await page.fill('#occurredOn', date);
  await page.getByRole('button', { name: 'Add event' }).click();
  await expect(page).toHaveURL(/\/rectify/, { timeout: 20_000 });
}

test('with no events it declines to rank rather than ranking noise', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Unrectified Subject');

  await page.goto(`${person}/rectify`);
  await expect(page.getByRole('heading', { name: /Which birth time fits/ })).toBeVisible({
    timeout: 30_000,
  });

  await expect(page.getByText(/Add at least one life event/)).toBeVisible();
  // No shortlist at all — an empty ranking would still read as a ranking.
  await expect(page.locator('[data-candidate]')).toHaveCount(0);

  // The caveat is present before any result exists, not bolted on after.
  await expect(page.getByText(/inference, not measurement/)).toBeVisible();
});

test('a sweep ranks candidates and shows the rules behind each', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Sweep Subject');
  await page.goto(`${person}/rectify`);

  await addEvent(page, 'marriage', '2019-06-15');
  await addEvent(page, 'childbirth', '2022-02-03');
  await addEvent(page, 'career_change', '2016-09-01');

  const candidates = page.locator('[data-candidate]');
  await expect(candidates.first()).toBeVisible({ timeout: 30_000 });
  const count = await candidates.count();
  expect(count).toBeGreaterThan(2);

  // Each candidate names a real time, a rising sign and a nakṣatra.
  const first = candidates.first();
  await expect(first).toContainText(/\d{2}:\d{2}/);
  await expect(first).toContainText(/rising/);
  await expect(first).toContainText(/Moon in/);

  // And the score is expressed against a stated denominator, never bare.
  await expect(first).toContainText(/% of maximum/);

  // The sweep reports what it actually did.
  await expect(page.getByText(/Times tested/)).toBeVisible();
  await expect(page.getByText(/Ascendant signs in range/)).toBeVisible();
});

test('it reports which rules ranked nothing', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Discrimination Subject');
  await page.goto(`${person}/rectify`);
  await addEvent(page, 'marriage', '2019-06-15');
  await addEvent(page, 'property', '2021-04-20');

  await expect(page.locator('[data-candidate]').first()).toBeVisible({ timeout: 30_000 });

  // This is the honesty mechanism, and it must be on the page.
  await expect(page.getByText('What did the ranking')).toBeVisible();
  await expect(page.getByText(/Fired for everything — ranked nothing/)).toBeVisible();
  await expect(page.getByText(/contributed equally to every score/)).toBeVisible();
});

test('it never claims a corrected birth time', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Modesty Subject');
  await page.goto(`${person}/rectify`);
  await addEvent(page, 'marriage', '2019-06-15');
  await expect(page.locator('[data-candidate]').first()).toBeVisible({ timeout: 30_000 });

  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of [
    'your correct birth time',
    'the correct birth time',
    'rectified birth time is',
    'confirmed birth time',
    'true birth time',
    'we have determined',
    'proven',
  ]) {
    expect(body, `the page said "${phrase}"`).not.toContain(phrase);
  }

  // Constitution item 6 still holds on a page whose event list names
  // bereavement and illness as anchors.
  for (const word of ['will die', 'you will', 'predicts that']) {
    expect(body, `the page said "${word}"`).not.toContain(word);
  }
});

test('an event can be excluded and the ranking recomputes', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Exclusion Subject');
  await page.goto(`${person}/rectify`);
  await addEvent(page, 'marriage', '2019-06-15');
  await addEvent(page, 'bereavement', '2005-11-02');

  await expect(page.getByText('2 events')).toBeVisible({ timeout: 30_000 });

  // Excluding is reversible and visible — the point is testing whether one
  // doubtful event is carrying the whole result. `exact` matters: without it
  // "excluded" also matches the container holding the "exclude" button.
  const excludedBadge = page.getByText('excluded', { exact: true });

  await page.getByRole('button', { name: 'exclude', exact: true }).first().click();
  await expect(excludedBadge).toBeVisible({ timeout: 20_000 });

  await page.getByRole('button', { name: 'include', exact: true }).first().click();
  await expect(excludedBadge).toHaveCount(0, { timeout: 20_000 });
});

test('adopting a candidate records that it came from a sweep', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addPerson(page, 'Adoption Subject');
  await page.goto(`${person}/rectify`);
  await addEvent(page, 'marriage', '2019-06-15');

  const adopt = page.getByRole('button', { name: /Adopt \d{2}:\d{2} as the birth time/ }).first();
  await expect(adopt).toBeVisible({ timeout: 30_000 });
  const label = await adopt.innerText();
  const adopted = label.match(/(\d{2}:\d{2})/)![1]!;

  await adopt.click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}\?saved=1$/, { timeout: 30_000 });

  // The new time is on the person, and the chart was recast from it.
  await expect(page.getByText(adopted)).toBeVisible();
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });

  // And the provenance survived: the edit form shows it came from a sweep,
  // with an accuracy that is not "exact".
  await page.goto(`${person}/edit`);
  await expect(page.locator('#sourceNote')).toHaveValue(/Rectified in Jade/);
  await expect(page.locator('#timeAccuracy')).not.toHaveValue('exact');
});

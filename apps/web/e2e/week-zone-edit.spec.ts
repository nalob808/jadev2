import { expect, test, type Page } from '@playwright/test';

/**
 * The coloured week, the practice's clock, and correcting a person.
 *
 * The week strip is the riskiest thing shipped in this change. Its whole
 * defence is that the colour restates two named classical counts rather than
 * expressing a view about how someone's day will go — so what is tested here
 * is that the counts appear beside the colour, that the caveat appears beside
 * both, and that no verdict vocabulary reaches the rendered page. Those are
 * not decorative assertions: the landing page and /accuracy both publicly
 * promise Jade returns no verdict, and this is where that becomes false if it
 * ever does.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-week-${Date.now()}-${(seq += 1)}@example.com`;

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
}

/** Add someone and mark them as the reader, which is what unlocks the week. */
async function addSelf(page: Page, name: string): Promise<string> {
  await page.goto('/people/new');
  await page.fill('#displayName', name);
  await page.fill('#date', '1994-03-11');
  await page.fill('#time', '07:45');
  await page.fill('#place-search', 'Ann Arb');
  await page.locator('ul li button').first().click();
  await page.locator('#relationship').selectOption('self');
  await page.getByRole('button', { name: 'Add person' }).click();
  await expect(page).toHaveURL(/\/people\/[0-9a-f-]{36}$/, { timeout: 30_000 });
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });
  return page.url();
}

test('the week is coloured, and every colour shows the counts behind it', async ({ page }) => {
  await signIn(page, nextEmail());
  await addSelf(page, 'Week Subject');
  await page.goto('/home');

  const week = page.locator('section', { hasText: 'Seven days, counted from your Moon' });
  await expect(week).toBeVisible({ timeout: 30_000 });

  // Seven days, and the reader's own calendar labels them.
  await expect(week.getByText('Today', { exact: true })).toBeVisible();
  await expect(week.getByText('Tomorrow', { exact: true })).toBeVisible();

  // Rule 1: the two counts are on screen beside the colour, never behind a
  // disclosure. A colour with its reasoning hidden is a verdict.
  await expect(week.getByText('Tārā', { exact: true }).first()).toBeVisible();
  await expect(week.getByText('Candra', { exact: true }).first()).toBeVisible();
  await expect(week.getByText('Tārā', { exact: true })).toHaveCount(7);

  // Every band carries a described swatch, so the colour is not the only
  // channel carrying the meaning.
  const swatches = week.getByRole('img', { name: /counts/i });
  await expect(swatches).toHaveCount(7);

  // Rule 2: the caveat travels with the colour.
  await expect(week.getByText(/muhūrta counts/)).toBeVisible();
  await expect(week.getByText(/not what will happen/)).toBeVisible();
});

test('the coloured week never states a verdict', async ({ page }) => {
  await signIn(page, nextEmail());
  await addSelf(page, 'Verdict Check');
  await page.goto('/home');
  await expect(
    page.locator('section', { hasText: 'Seven days, counted from your Moon' }),
  ).toBeVisible({
    timeout: 30_000,
  });

  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of [
    'good day',
    'bad day',
    'great day',
    'lucky',
    'unlucky',
    'you will',
    'expect a',
    'avoid ',
    'be careful',
    'score',
  ]) {
    expect(body, `Home said "${phrase}"`).not.toContain(phrase);
  }

  // Constitution item 6, at the rendered page.
  for (const word of ['death', 'fatal', 'disease', 'lawsuit', 'litigation']) {
    expect(body, `Home said "${word}"`).not.toContain(word);
  }
});

test('the daily reading grounds every sentence it prints', async ({ page }) => {
  await signIn(page, nextEmail());
  await addSelf(page, 'Daily Subject');
  await page.goto('/home');

  const daily = page.locator('section', { hasText: 'What the sky is doing to' });
  await expect(daily).toBeVisible({ timeout: 30_000 });

  const statements = daily.locator('article');
  const count = await statements.count();
  expect(count).toBeGreaterThan(4);

  for (let i = 0; i < count; i += 1) {
    const statement = statements.nth(i);
    const text = (await statement.locator('p').first().innerText()).trim();
    expect(text.length, `daily statement ${i} is too short to be a sentence`).toBeGreaterThan(50);
    expect(text).not.toContain('undefined');
    // The rule: no statement without its factors, visible.
    const factors = await statement.locator('span.font-mono').count();
    expect(factors, `daily statement ${i} has no factors shown`).toBeGreaterThan(0);
  }
});

test('an unset zone is announced rather than guessed, and can be set', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/home');

  // A fresh workspace has no zone, and the page must say so — every date on it
  // is in UTC until somebody answers.
  await expect(page.getByText(/Times shown in UTC/)).toBeVisible();
  await page.getByRole('link', { name: 'Set your time zone' }).click();
  await expect(page).toHaveURL(/\/settings$/, { timeout: 20_000 });

  await expect(page.getByRole('heading', { name: 'Your clock' })).toBeVisible();
  await page.locator('#homeZoneId').selectOption('Pacific/Honolulu');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 });

  // It round-trips...
  await page.reload();
  await expect(page.locator('#homeZoneId')).toHaveValue('Pacific/Honolulu');

  // ...and the banner is gone, with the zone now named in the lens line.
  await page.goto('/home');
  await expect(page.getByText(/Times shown in UTC/)).toHaveCount(0);
  await expect(page.getByText(/Pacific\/Honolulu/)).toBeVisible();
  // Dates now carry the zone, so a time on this page is never bare.
  await expect(page.getByText(/HST/)).toBeVisible();
});

test('a nonsense zone is refused rather than stored', async ({ page }) => {
  await signIn(page, nextEmail());
  await page.goto('/settings');
  // Wait for the picker to hydrate before touching it. Its detection button
  // only renders from an effect, so its presence is the signal that React has
  // taken over the markup. Injecting before that point works in an isolated
  // run and fails in a full one: hydration lands after the injection, React
  // reconciles away the option it does not know about, and the form posts an
  // empty zone — which is a valid value, so the action succeeds and the test
  // fails somewhere far from the cause.
  await expect(page.getByRole('button', { name: /use this device/ })).toBeVisible({
    timeout: 20_000,
  });

  // The picker cannot offer this value, but anything that posts the form can —
  // and the server action is the boundary, not the form. The option is
  // injected and the value set through the native setter, with no change event
  // dispatched on purpose: firing one would re-render the component, React
  // would reconcile away an <option> it does not know about, and the value
  // would fall back to empty before the form was ever submitted.
  await page.evaluate(() => {
    const select = document.querySelector('#homeZoneId') as HTMLSelectElement;
    const option = document.createElement('option');
    option.value = 'Middle/Earth';
    option.textContent = 'Middle/Earth';
    select.append(option);
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!.call(
      select,
      'Middle/Earth',
    );
  });
  await expect(page.locator('#homeZoneId')).toHaveValue('Middle/Earth');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/error=/, { timeout: 20_000 });
  await expect(page.getByText(/not a time zone this system recognises/)).toBeVisible();
});

test('a person can be corrected without losing their notes', async ({ page }) => {
  await signIn(page, nextEmail());
  const person = await addSelf(page, 'Mistyped Name');

  // Write a note first — the point of editing rather than deleting is that
  // everything attached survives.
  await page.getByRole('button', { name: 'Write a note…' }).click();
  await page.fill('textarea[name="body"]', 'The ascendant here needs checking.');
  await page.getByRole('button', { name: 'Save note' }).click();
  await expect(page.getByText('The ascendant here needs checking.')).toBeVisible({
    timeout: 20_000,
  });

  await page.getByRole('link', { name: 'edit' }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 20_000 });

  // Everything arrives pre-filled — an edit form that blanks a field deletes
  // data when somebody only meant to fix a spelling.
  await expect(page.locator('#displayName')).toHaveValue('Mistyped Name');
  await expect(page.locator('#date')).toHaveValue('1994-03-11');
  await expect(page.locator('#time')).toHaveValue('07:45');
  await expect(page.locator('#relationship')).toHaveValue('self');
  // Including the birthplace, which is the one most easily lost.
  await expect(page.getByText(/Ann Arbor/)).toBeVisible();

  await page.fill('#displayName', 'Corrected Name');
  await page.fill('#time', '08:15');
  await page.getByRole('button', { name: 'Save changes' }).click();

  await expect(page).toHaveURL(/saved=1/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Corrected Name' })).toBeVisible();
  await expect(page.getByText(/recast from the corrected details/)).toBeVisible();
  await expect(page.getByText('08:15')).toBeVisible();

  // The chart really was recomputed, and the note is still attached.
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText('The ascendant here needs checking.')).toBeVisible();

  expect(person).toContain('/people/');
});

test('changing the birthplace re-resolves the offset rather than carrying it', async ({ page }) => {
  // The bug this guards is subtle and permanent once it lands: move someone
  // from Michigan to Hawaii, keep their wall-clock birth time, and carry the
  // old offset over "because only the city changed". The chart is then cast
  // for an instant five hours from the one the certificate describes, and
  // nothing on screen says so. The action re-resolves from scratch instead.
  await signIn(page, nextEmail());
  await addSelf(page, 'Moved Person');

  await page.getByRole('link', { name: 'edit' }).click();
  await expect(page).toHaveURL(/\/edit$/, { timeout: 20_000 });

  // Michigan on the way in.
  await expect(page.getByText(/America\/Detroit/)).toBeVisible();
  // `exact` matters: 'change' is also a substring of 'Save changes'.
  await page.getByRole('button', { name: 'change', exact: true }).click();
  await page.fill('#place-search', 'Honolu');
  await page.locator('ul li button').first().click();
  await expect(page.getByText(/Pacific\/Honolulu/)).toBeVisible();

  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 30_000 });

  // The wall clock is unchanged — that is what a birth certificate says — but
  // the offset behind it is Hawaii's, not Michigan's.
  await expect(page.getByText('07:45')).toBeVisible();
  await expect(page.getByText(/-10:00/)).toBeVisible();
  await expect(page.getByText(/Honolulu/)).toBeVisible();
  await expect(page.getByText(/-0[45]:00/)).toHaveCount(0);

  // And the chart really was recast from the new instant.
  await expect(page.getByRole('table', { name: 'Graha positions' })).toBeVisible({
    timeout: 30_000,
  });
});

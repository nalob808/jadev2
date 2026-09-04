import { expect, test, type Page } from '@playwright/test';
import { setPlan } from './plan';

/**
 * Sessions and the prep sheet.
 *
 * Two things are worth a browser here. The gate, because Practitioner is the
 * first tier with something real behind it and the refusal must be a refusal
 * rather than a hidden link. And the prep sheet's restraint, because a
 * document a practitioner reads from five minutes before a paying client
 * arrives is exactly where generated text must not start telling them what to
 * say.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'needs TEST_DATABASE_URL');

let seq = 0;
const nextEmail = (): string => `e2e-sessions-${Date.now()}-${(seq += 1)}@example.com`;

async function signIn(page: Page, plan: 'free' | 'seeker' | 'practitioner'): Promise<string> {
  const email = nextEmail();
  await page.goto('/sign-in');
  await page.fill('#email', email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page).toHaveURL(/\/home$/, { timeout: 20_000 });
  await setPlan(email, plan);
  return email;
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
  return page.url().split('/').pop()!;
}

async function bookSession(page: Page, date: string): Promise<void> {
  await page.goto('/sessions/new');
  await page.locator('#subjectId').selectOption({ index: 1 });
  await page.fill('#date', date);
  await page.fill('#time', '14:00');
  await page.getByRole('button', { name: 'Book it' }).click();
  await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/, { timeout: 30_000 });
}

test('sessions are refused below Practitioner, by URL and not just by link', async ({ page }) => {
  await signIn(page, 'seeker');
  await page.goto('/sessions');
  await expect(page).toHaveURL(/\/upgrade\?/, { timeout: 20_000 });
  await expect(
    page.getByRole('heading', { name: /Sessions are a Practitioner feature/ }),
  ).toBeVisible();

  // And the wall names a real, finished feature rather than a promise — this
  // is the first Practitioner capability that is actually built.
  await expect(page.getByText(/prep sheet assembled before you sit down/)).toBeVisible();
  await expect(page.getByText(/This one is not finished yet/)).toHaveCount(0);
});

test('booking reads the time in the practice zone, not the server zone', async ({ page }) => {
  await signIn(page, 'practitioner');
  await addPerson(page, 'Zoned Client');

  // Set the practice to Hawaii, which is far enough from UTC that a naive
  // conversion lands on a different day.
  await page.goto('/settings');
  // Wait for a real hydration signal before touching the ~400-option picker.
  // Selecting before React takes over silently reverts the choice.
  await expect(page.getByRole('heading', { name: 'Your clock' })).toBeVisible({ timeout: 30_000 });
  await page.locator('#homeZoneId').selectOption('Pacific/Honolulu');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page).toHaveURL(/saved=1/, { timeout: 20_000 });

  await bookSession(page, '2027-04-15');
  // 14:00 booked is 14:00 shown, in HST.
  await expect(page.getByText(/02:00 PM|14:00/)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/HST/)).toBeVisible();
});

test('the prep sheet leads with the daśā and dates, and shows its factors', async ({ page }) => {
  await signIn(page, 'practitioner');
  await addPerson(page, 'Prepared Client');
  await bookSession(page, '2027-06-10');

  // The two things a practitioner cannot get anywhere else in five minutes.
  await expect(page.getByRole('heading', { name: 'The period running' })).toBeVisible({
    timeout: 40_000,
  });
  // Three levels each say when they turn, so scope to the first.
  await expect(page.getByText(/runs out/).first()).toBeVisible();
  await expect(page.getByText('Dates either side of this consultation')).toBeVisible();

  // Grounded: every statement carries the placements that produced it.
  await expect(page.getByText(/placement:|lord:|position:/).first()).toBeVisible();

  // And real degrees, so it could only be this chart.
  const body = await page.locator('body').innerText();
  expect(body).toMatch(/\d+°\d{2}′/);
});

test('the prep sheet prepares, it does not script the reading', async ({ page }) => {
  await signIn(page, 'practitioner');
  await addPerson(page, 'Unscripted Client');
  await bookSession(page, '2027-06-10');
  await expect(page.getByRole('heading', { name: 'The period running' })).toBeVisible({
    timeout: 40_000,
  });

  const body = (await page.locator('body').innerText()).toLowerCase();
  for (const phrase of [
    'tell them',
    'advise them',
    'reassure',
    'warn them',
    'a good period',
    'a bad period',
    'they will',
    'will improve',
  ]) {
    expect(body, `the prep sheet said "${phrase}"`).not.toContain(phrase);
  }
  // Constitution item 6 holds on a page a practitioner reads aloud from.
  for (const word of ['death', 'disease', 'lawsuit']) {
    expect(body, `the prep sheet said "${word}"`).not.toContain(word);
  }
  // And it says whose judgement the meaning is.
  expect(body).toContain('your reading, not the software');
});

test('a follow-up outlives its session and carries to the next one', async ({ page }) => {
  await signIn(page, 'practitioner');
  await addPerson(page, 'Continuing Client');
  await bookSession(page, '2027-02-01');

  await page.fill('input[name="body"]', 'Revisit the 10th when Saturn stations.');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  // It appears twice, and that is correct: once in the follow-up list and
  // again inside the prep sheet's "since last time". Scoped to the first.
  await expect(page.getByText('Revisit the 10th when Saturn stations.').first()).toBeVisible({
    timeout: 20_000,
  });

  // It shows on the book as open work, not buried inside one session.
  await page.goto('/sessions');
  await expect(page.getByText('Open follow-ups')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Revisit the 10th when Saturn stations.').first()).toBeVisible();

  // A later session with the same person carries it into its prep.
  await bookSession(page, '2027-05-01');
  await expect(page.getByText('Revisit the 10th when Saturn stations.').first()).toBeVisible({
    timeout: 40_000,
  });
});

test('the printable prep sheet is the practitioner’s, not the client’s', async ({ page }) => {
  await signIn(page, 'practitioner');
  await addPerson(page, 'Printable Client');
  await bookSession(page, '2027-06-10');
  const sessionUrl = page.url();

  await page.goto(`${sessionUrl}/prep`);
  await expect(page.getByText('Preparation · not for the client')).toBeVisible({ timeout: 40_000 });
  await expect(page.getByRole('button', { name: /Print prep sheet/ })).toBeVisible();

  // It states the lens it was computed under, like every other output.
  await expect(page.getByText(/ayanāṁśa/)).toBeVisible();
});

import { expect, test } from '@playwright/test';

/**
 * The public site.
 *
 * These run without a database on purpose — a signed-out visitor arriving from
 * a search result must never depend on the app's data layer, and the pages are
 * statically generated so that they do not.
 *
 * The assertions are mostly about things that are invisible until they are
 * broken: canonical URLs, structured data, and the fact that no signed-in
 * route is advertised to a crawler.
 */

const PAGES = ['/', '/features', '/accuracy', '/pricing'];

test('every public page renders signed out, with a canonical and a description', async ({
  page,
}) => {
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('h1, h2').first()).toBeVisible();

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description, `${path} description`).toBeTruthy();
    expect(description!.length, `${path} description length`).toBeGreaterThan(60);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical, `${path} canonical`).toContain('jadeapp.co');

    // Relative OG urls are silently dropped by most crawlers.
    const og = await page.locator('meta[property="og:title"]').getAttribute('content');
    expect(og, `${path} og:title`).toBeTruthy();
  }
});

test('exactly one h1 per page, and it says something', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    const h1 = page.locator('h1');
    // A page with two h1s or none reads as unstructured to a crawler.
    await expect(h1, path).toHaveCount(1);
    expect((await h1.innerText()).trim().length, path).toBeGreaterThan(8);
  }
});

test('structured data is present and parses', async ({ page }) => {
  await page.goto('/');
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(blocks.length).toBeGreaterThan(0);

  const parsed = blocks.map((raw) => JSON.parse(raw) as { '@type': string });
  const types = parsed.map((item) => item['@type']);
  expect(types).toContain('SoftwareApplication');
  expect(types).toContain('FAQPage');
});

test('pricing shows every tier and a way to start free', async ({ page }) => {
  await page.goto('/pricing');
  for (const tier of ['Free', 'Seeker', 'Practitioner', 'Professional', 'Institute']) {
    await expect(page.getByRole('heading', { name: tier, exact: true })).toBeVisible();
  }
  expect(await page.getByRole('link', { name: /start free/i }).count()).toBeGreaterThan(1);
});

test('the hero chart is a real rendered chart, not an image', async ({ page }) => {
  await page.goto('/');
  // Rendered by @jade/ui from the real engine at build time.
  await expect(page.locator('svg.jade-chart').first()).toBeVisible();
});

test('every page offers a route to signing up', async ({ page }) => {
  for (const path of PAGES) {
    await page.goto(path);
    expect(
      await page.getByRole('link', { name: /start free|create a free account/i }).count(),
      path,
    ).toBeGreaterThan(0);
  }
});

test('robots keeps crawlers out of the app and points at the sitemap', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();
  const body = await robots.text();

  // These paths hold birth data.
  for (const path of ['/people', '/relationships', '/notes', '/settings']) {
    expect(body, path).toContain(`Disallow: ${path}`);
  }
  expect(body).toContain('Sitemap:');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  const xml = await sitemap.text();
  for (const path of ['/features', '/accuracy', '/pricing']) {
    expect(xml, path).toContain(path);
  }
  // The sitemap must never advertise a route that requires a session.
  expect(xml).not.toContain('/people');
  expect(xml).not.toContain('/settings');
});

test('the site works at a phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of PAGES) {
    await page.goto(path);
    // Nothing may push the page sideways. A horizontal scrollbar on a phone is
    // the single most common responsive failure and it looks broken instantly.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(1);
    await expect(page.getByRole('link', { name: 'Start free' }).first()).toBeVisible();
  }
});

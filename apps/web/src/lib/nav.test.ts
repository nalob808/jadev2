import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '../app/sitemap';
import {
  ACCOUNT,
  SECTIONS,
  UNLINKED,
  isCurrent,
  sectionFor,
  subjectLenses,
  workbenchHref,
} from './nav';

/**
 * The navigation map and the app directory have to agree.
 *
 * This test exists because of how the last three phases actually went. The
 * instrument, the plain reading and the event search were all built, all
 * shipped, and all unreachable — each one linked from one sentence on one page,
 * or from nothing at all. Nobody decided that; the menu was a hand-kept array
 * in a component and adding a route simply did not touch it.
 *
 * So the rule is: a page either appears in the map, or it is named in `UNLINKED`
 * with a reason. Both directions are checked, because a stale map is its own
 * kind of broken — a menu word pointing at a route somebody deleted is worse
 * than no word at all.
 *
 * Reading the filesystem rather than a list is the whole point. A list would
 * need the same maintenance the menu needed.
 */

const APP = fileURLToPath(new URL('../app', import.meta.url));

/** Route group segments — `(marketing)` — contribute nothing to the URL. */
const isGroup = (segment: string): boolean => segment.startsWith('(') && segment.endsWith(')');

/** `[id]` in a directory name is `:id` in a route, matching how `UNLINKED` spells it. */
const asParam = (segment: string): string =>
  segment.startsWith('[') && segment.endsWith(']') ? `:${segment.slice(1, -1)}` : segment;

function routes(dir = APP, prefix = ''): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const segment = isGroup(entry.name) ? '' : `/${asParam(entry.name)}`;
      found.push(...routes(join(dir, entry.name), prefix + segment));
    } else if (entry.name === 'page.tsx') {
      found.push(prefix === '' ? '/' : prefix);
    }
  }
  return found;
}

/** Every href the chrome can render, as a bare path. */
function mapped(): Set<string> {
  const paths = new Set<string>();
  const add = (href: string): void => {
    paths.add(href.split('?')[0] ?? href);
  };
  for (const section of [...SECTIONS, ACCOUNT]) {
    add(section.href);
    for (const item of section.items) add(item.href);
  }
  for (const lens of subjectLenses(':id')) add(lens.href);
  /* Labs is appended at render time from the deployment, not from the map. */
  add('/spike/sphere');
  return paths;
}

describe('the navigation map and the app directory', () => {
  const all = routes();
  const exempt = new Set(UNLINKED.map((entry) => entry.route));

  it('found the app directory', () => {
    expect(all.length).toBeGreaterThan(30);
    expect(all).toContain('/home');
  });

  it('gives every app page a home in the menu or a reason not to have one', () => {
    /*
     * The public site is excluded: its chrome is `SiteHeader`, whose job is to
     * sell rather than to navigate a workspace, and its deep pages are landing
     * pages reached from search results.
     */
    const appPages = all.filter(
      (route) =>
        !route.startsWith('/learn') &&
        !route.startsWith('/charts') &&
        ![
          '/',
          '/about',
          '/accuracy',
          '/features',
          '/glossary',
          '/pricing',
          '/privacy',
          '/terms',
        ].includes(route),
    );
    const orphans = appPages.filter((route) => !mapped().has(route) && !exempt.has(route));
    expect(orphans, 'add these to lib/nav.ts, or to UNLINKED with a reason').toEqual([]);
  });

  /*
   * The public site's pages are exempt from the menu, and that exemption used
   * to mean exempt from everything.
   *
   * `/learn/*` is reached from search results rather than from the workspace
   * menu, so it cannot be held to the map. But "reached from search results"
   * is not the same as "reached from nowhere": a reference page no page links
   * to is the same built-and-unreachable failure this file exists to catch,
   * and a crawler treats an orphan the way a reader does. So every `/learn`
   * route has to be linked from somewhere else on the public site.
   */
  it('links every public reference page from somewhere on the public site', () => {
    const marketing = join(APP, '(marketing)');
    const sources: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else if (entry.isFile() && entry.name.endsWith('.tsx')) sources.push(path);
      }
    };
    walk(marketing);
    /* The chrome links too, and it is not under the route group. */
    sources.push(join(APP, '..', 'components', 'marketing', 'Site.tsx'));

    const learn = all.filter((route) => route.startsWith('/learn/') && !route.includes(':'));

    /*
     * A page does not link to itself.
     *
     * The first version of this searched every marketing file including the
     * one implementing the route, and every page names its own path — in the
     * canonical URL, in the breadcrumb — so the test passed for a page nothing
     * linked to. Its own directory is excluded, which also rules out a child
     * page's "back to the index" link counting as an inbound link to the
     * index.
     */
    const unlinked = learn.filter((route) => {
      const own = join(marketing, ...route.split('/').filter(Boolean));
      return !sources.some(
        (file) => !file.startsWith(own) && readFileSync(file, 'utf8').includes(route),
      );
    });

    expect(unlinked, 'these public pages are reachable from nothing').toEqual([]);
  });

  /*
   * Linked is not the same as findable.
   *
   * These pages exist to answer a search — "what did medieval astrologers say
   * about Saturn" — and a crawler that has to walk in from the index finds the
   * deep ones slowly or not at all. The sitemap is how they get found, so a
   * reference page missing from it is half-shipped in the same way an unlinked
   * one is.
   */
  it('lists every public reference page in the sitemap', () => {
    const listed = new Set(
      sitemap().map((entry) => new URL(entry.url).pathname.replace(/\/$/, '') || '/'),
    );
    const learn = all.filter((route) => route.startsWith('/learn') && !route.includes(':'));

    expect(
      learn.filter((route) => !listed.has(route)),
      'add these to app/sitemap.ts',
    ).toEqual([]);
  });

  it('points every menu word at a page that exists', () => {
    const existing = new Set(all);
    const dangling = [...mapped()].filter((href) => !existing.has(href));
    expect(dangling, 'these hrefs have no page.tsx').toEqual([]);
  });

  it('names a reason for every unlinked route, and no stale ones', () => {
    for (const entry of UNLINKED) {
      expect(entry.why.length, entry.route).toBeGreaterThan(12);
      expect(all, `${entry.route} is in UNLINKED but has no page`).toContain(entry.route);
    }
  });
});

describe('which section is current', () => {
  it('claims the routes a section owns even when they are not under its path', () => {
    expect(sectionFor('/houses')?.id).toBe('people');
    /* The wheel is its own section now, and takes the first word. */
    expect(sectionFor('/wheel')?.id).toBe('wheel');
    expect(sectionFor('/home')?.id).toBe('wheel');
    expect(sectionFor('/read/abc')?.id).toBe('people');
    expect(sectionFor('/people/abc/instrument')?.id).toBe('people');
    expect(sectionFor('/timing/search')?.id).toBe('sky');
    expect(sectionFor('/notes')?.id).toBe('practice');
    expect(sectionFor('/upgrade')?.id).toBe('account');
  });

  it('claims nothing on the public site', () => {
    expect(sectionFor('/')).toBeUndefined();
    expect(sectionFor('/pricing')).toBeUndefined();
    expect(sectionFor('/sign-in')).toBeUndefined();
  });

  /*
   * The bug this prevents: `/houses` is listed under People, and a prefix test
   * against `/home` would also match `/homes`. Longest-prefix-wins is what
   * keeps `/timing/search` in Sky rather than in whichever section was declared
   * first.
   */
  it('lets the longest prefix win', () => {
    expect(sectionFor('/timing')?.id).toBe('sky');
    expect(sectionFor('/people')?.id).toBe('people');
  });
});

describe('marking the current link', () => {
  it('does not mark a parent when a child is open', () => {
    expect(isCurrent('/timing/search', '/timing')).toBe(false);
    expect(isCurrent('/people/abc/houses', '/people/abc')).toBe(false);
  });

  it('ignores the query, so a subject-scoped link still marks itself', () => {
    expect(isCurrent('/timing', '/timing?person=abc')).toBe(true);
    expect(isCurrent('/timing?span=10y', '/timing')).toBe(true);
  });

  it('has eight lenses, with the sphere between the instrument and timing', () => {
    // The sphere is the eighth lens. It sits after the instrument because both
    // are ways of looking at the same moment, and before timing because timing
    // is about spans rather than an instant.
    expect(subjectLenses('abc').map((lens) => lens.label)).toEqual([
      'Sheet',
      'Houses',
      'Reading',
      'Instrument',
      'Sphere',
      'Timing',
      'Report',
      'Rectify',
    ]);
    expect(sectionFor('/people/abc/sphere')?.id).toBe('people');
  });

  it('marks the lens you are on', () => {
    const lenses = subjectLenses('abc');
    const current = lenses.filter((lens) => isCurrent('/people/abc/instrument', lens.href));
    expect(current.map((lens) => lens.label)).toEqual(['Instrument']);
  });
});

describe('crossing back from the reading host', () => {
  /*
   * The bug: the middleware rewrites every path on read.* that does not start
   * with /read into the reading group, so a relative link to the workbench
   * resolved to /read/people/… and 404ed — in production only, because
   * localhost serves both surfaces from one host.
   */
  it('absolutises a workbench link when served from the reading host', () => {
    expect(workbenchHref('/people/abc', 'read.jadeapp.co')).toBe('https://jadeapp.co/people/abc');
    expect(workbenchHref('/home', 'read.jadeapp.co')).toBe('https://jadeapp.co/home');
  });

  it('keeps the query when it crosses', () => {
    expect(workbenchHref('/people/abc/houses?h=7', 'read.jadeapp.co')).toBe(
      'https://jadeapp.co/people/abc/houses?h=7',
    );
  });

  it('leaves the path alone on the app host, so client navigation still works', () => {
    expect(workbenchHref('/people/abc', 'jadeapp.co')).toBe('/people/abc');
    expect(workbenchHref('/people/abc', 'localhost:3000')).toBe('/people/abc');
    expect(workbenchHref('/people/abc', null)).toBe('/people/abc');
    expect(workbenchHref('/people/abc')).toBe('/people/abc');
  });

  /* A host that merely contains "read" is not the reading host. */
  it('matches the prefix, not the substring', () => {
    expect(workbenchHref('/home', 'already-read.example.com')).toBe('/home');
  });
});

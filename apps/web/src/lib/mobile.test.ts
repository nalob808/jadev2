import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The rules that make this an app on a phone rather than a narrow desktop.
 *
 * Each of these was a real defect before it was a test. They are checked
 * against the source rather than against a rendered page because the failure
 * mode is somebody adding the thirty-first surface next month and not knowing
 * the rules exist — a source test tells them at the moment they break one,
 * which a screenshot in a pull request does not.
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string, ext: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path, ext);
    return entry.isFile() && entry.name.endsWith(ext) ? [path] : [];
  });
}

const sources = files(SRC, '.tsx').map((path) => ({
  path: path.slice(SRC.length),
  text: readFileSync(path, 'utf8'),
}));

const read = (relative: string): string => readFileSync(join(SRC, relative), 'utf8');

describe('the viewport', () => {
  /* Without this the layout stops at the notch and the safe-area variables all
     resolve to zero, which makes every `env(safe-area-inset-*)` below a lie. */
  it('reaches the edges of the device', () => {
    const layout = read('app/layout.tsx');
    expect(layout).toContain('export const viewport');
    expect(layout).toContain("viewportFit: 'cover'");
  });

  /* Pinch-zoom is the last resort of anybody whose eyes or hands this design
     did not anticipate. Taking it away is never worth what it buys. */
  it('does not block zoom', () => {
    const layout = read('app/layout.tsx');
    /* The object only. The prose above it explains why these are absent, and
       a whole-file search finds the explanation and fails on it. */
    const object = layout.slice(
      layout.indexOf('export const viewport'),
      layout.indexOf('};', layout.indexOf('export const viewport')),
    );
    expect(object).not.toContain('maximumScale');
    expect(object).not.toContain('userScalable');
  });
});

describe('the bottom tab bar', () => {
  const nav = read('components/AppNav.tsx');

  it('carries the same five sections as the masthead', () => {
    /* Both read SECTIONS. A tab bar with its own hand-written list is a
       second map of the app, and the two would disagree within a month. */
    const bar = nav.slice(nav.indexOf('export function MobileTabBar'));
    expect(bar).toContain('SECTIONS.map');
  });

  it('clears the home indicator', () => {
    expect(nav).toContain('jade-safe-bottom');
    expect(read('app/globals.css')).toContain('env(safe-area-inset-bottom');
  });

  it('marks the current tab with more than colour', () => {
    const bar = nav.slice(nav.indexOf('export function MobileTabBar'));
    /* Colour alone fails for roughly one man in twelve. The border carries it
       too, and `aria-current` carries it to a screen reader. */
    expect(bar).toContain('aria-current');
    expect(bar).toMatch(/border-\[var\(--accent\)\]/);
  });

  it('is disappeared above the breakpoint, where the masthead takes over', () => {
    const bar = nav.slice(nav.indexOf('export function MobileTabBar'));
    expect(bar).toContain('sm:hidden');
  });
});

describe('the page container', () => {
  /* The bar is fixed, so without bottom padding the last thing on every page
     in the app sits underneath it — unreadable and untappable. */
  it('leaves room for the tab bar', () => {
    expect(read('components/Shell.tsx')).toContain('pb-32');
  });

  /* Both the real shell and the skeleton render it, or the bar blinks out of
     existence for the length of every navigation. */
  it('is rendered by the shell and by the loading skeleton', () => {
    expect(read('components/Shell.tsx')).toContain('<MobileTabBar />');
    expect(read('components/Skeleton.tsx')).toContain('<MobileTabBar />');
  });
});

describe('folds', () => {
  const uses = sources.filter((file) => /<Fold\b/.test(file.text));

  it('are used, and on the surfaces that were too long to read', () => {
    const paths = uses.map((file) => file.path);
    for (const surface of [
      'app/people/[id]/page.tsx',
      'app/people/[id]/houses/page.tsx',
      'app/home/page.tsx',
      'app/timing/page.tsx',
      'app/read/[id]/page.tsx',
    ]) {
      expect(paths, surface).toContain(surface);
    }
  });

  /* Two folds with one id on a page means tapping either toggles the first,
     which looks like the page has lost its mind. */
  it('have ids that are unique within a page', () => {
    for (const file of uses) {
      const literals = [...file.text.matchAll(/<Fold\b[^>]*?\bid="([^"{]+)"/g)].map((m) => m[1]!);
      expect(new Set(literals).size, file.path).toBe(literals.length);
    }
  });

  /*
   * A page that arrives entirely closed looks broken and says nothing about
   * what it holds. So every page either opens a fold — flatly or on a
   * condition, which is better — or shows its subject before the first one.
   *
   * The sheet is the second case: the wheel and the positions table sit above
   * every fold, which is the right hero for a page about one chart, and
   * opening a fold underneath them would only push them off the screen.
   */
  const HERO_ABOVE_THE_FOLDS = new Set(['app/people/[id]/page.tsx']);

  it('leave something open on arrival', () => {
    for (const file of uses) {
      if (HERO_ABOVE_THE_FOLDS.has(file.path)) continue;
      const opens = (file.text.match(/<Fold[^>]*\bopen\b/g) ?? []).length;
      const conditional = /open=\{/.test(file.text);
      expect(opens > 0 || conditional, file.path).toBe(true);
    }
  });

  /* …and a page claiming the exemption has to actually render before folding. */
  it('show their subject first where they claim to', () => {
    for (const path of HERO_ABOVE_THE_FOLDS) {
      const file = uses.find((one) => one.path === path);
      expect(file, path).toBeDefined();
      const body = file!.text.slice(file!.text.indexOf('return ('));
      expect(body.indexOf('<Panel'), path).toBeGreaterThan(-1);
      expect(body.indexOf('<Panel'), path).toBeLessThan(body.indexOf('<Fold'));
    }
  });

  /* The whole point of the mechanism: it must not reach the desktop layout. */
  it('are inert above the breakpoint', () => {
    const fold = read('components/Fold.tsx');
    expect(fold).toContain('sm:hidden');
    expect(fold).toContain('sm:block');
    expect(fold).not.toMatch(/\buseState\b|\buseEffect\b|'use client'/);
  });

  /* A link into a folded section has to land on an open one. */
  it('open when a link targets them', () => {
    expect(read('app/globals.css')).toContain('.jade-fold-wrap:target > .jade-fold-body');
    expect(read('components/Fold.tsx')).toContain('jade-fold-wrap');
  });

  /* And a printed report is never folded. */
  it('are all open on paper', () => {
    const css = read('app/globals.css');
    const print = css.slice(css.lastIndexOf('@media print'));
    expect(print).toContain('.jade-fold-body');
  });
});

describe('tab strips', () => {
  /* A wrapping strip changes height between sections, so the content below it
     jumps by a line on every navigation. These scroll instead. */
  it('scroll rather than wrap', () => {
    const nav = read('components/AppNav.tsx');
    expect(nav).toContain('jade-strip');
    expect(nav).toContain('flex-nowrap');
    expect(read('app/globals.css')).toContain('.jade-strip');
  });

  /* Snapping aligned to the scrollport start, which sits inside the strip's
     own padding — so every strip silently scrolled 20px and clipped its first
     tab against the edge of the screen. */
  it('do not snap', () => {
    expect(read('app/globals.css')).not.toContain('scroll-snap-type');
  });
});

describe('forms', () => {
  /* iOS zooms in on a field under 16px and does not zoom back out. */
  it('do not trigger the iOS zoom trap', () => {
    const css = read('app/globals.css');
    expect(css).toMatch(/@media \(pointer: coarse\)[\s\S]*?font-size: max\(16px/);
  });
});

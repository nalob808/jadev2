import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * The two dark themes have to be one dark theme.
 *
 * Jade's dark palette is written twice, and has to be: one copy under
 * `@media (prefers-color-scheme: dark)` for people whose system is dark, one
 * under `:root[data-theme='dark']` for people who chose it in the app. CSS has
 * no way to share a declaration block across a media query and a plain
 * selector, so the duplication is structural rather than careless.
 *
 * It had already drifted. The six band tokens — the favourable / mixed /
 * difficult washes a timeline is shaded with — were in the media copy and not
 * in the attribute copy, so anyone on a light system who switched the app to
 * dark got washes mixed for a white page laid over an almost-black one.
 * Nothing threw; the colours were simply wrong, on the one screen where colour
 * is the information.
 *
 * So the rule is checked rather than remembered.
 */
const css = readFileSync(fileURLToPath(new URL('../app/globals.css', import.meta.url)), 'utf8');

/**
 * Custom property declarations, in source order, from one block of CSS.
 *
 * Anchored to the start of a line, which is not fussiness. The palette's own
 * comments mention tokens by name — "rather than reusing --accent and --jade:"
 * — and an unanchored pattern matches that prose, then swallows everything to
 * the next semicolon, which is the next real declaration. The first draft of
 * this file lost `--elem-fire` that way and reported a colour that was never
 * written down.
 */
function declarations(block: string): Array<[string, string]> {
  return [...block.matchAll(/^[ \t]*(--[a-z0-9-]+):[ \t]*([^;]+);/gm)].map(([, name, value]) => [
    name!,
    value!.trim(),
  ]);
}

function block(opening: string): string {
  const start = css.indexOf(opening);
  expect(start, `no ${opening} in globals.css`).toBeGreaterThan(-1);
  const rest = css.slice(start);
  /* The media copy is nested one level deeper, so stop at its own closer. */
  const end = rest.indexOf(opening.startsWith('@media') ? '\n  }\n' : '\n}\n');
  return rest.slice(0, end);
}

const mediaDark = block('@media (prefers-color-scheme: dark)');
const chosenDark = block(":root[data-theme='dark'] {");
/* The bare `:root {` — not `:root[data-theme=…]`, and not one nested in an
   at-rule, both of which the exact opening brace and leading newline rule out. */
const light = block('\n:root {\n');

describe('the palettes were found at all', () => {
  /*
   * The blocks are located by matching text, so a refactor can silently point
   * this whole file at an empty string and every assertion below passes over
   * nothing. It has already happened once: adding `color-scheme` above
   * `--paper` moved the light block's first declaration and the old anchor
   * stopped matching.
   */
  it.each([
    ['light', light],
    ['media dark', mediaDark],
    ['chosen dark', chosenDark],
  ])('%s has a full palette', (_name, source) => {
    expect(declarations(source).length).toBeGreaterThan(30);
    expect(Object.fromEntries(declarations(source))['--paper']).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('the dark palette', () => {
  it('is the same palette whether the system chose it or the reader did', () => {
    expect(declarations(chosenDark)).toEqual(declarations(mediaDark));
  });

  it('redefines everything the light palette defines', () => {
    const lightNames = declarations(light)
      .map(([name]) => name)
      /* Fonts and the like are not a theme; only the colours must be paired. */
      .filter((name) => !name.startsWith('--font'));
    const darkNames = new Set(declarations(chosenDark).map(([name]) => name));

    expect([...lightNames].filter((name) => !darkNames.has(name))).toEqual([]);
  });
});

/* ------------------------------------------------------------- contrast */

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (high + 0.05) / (low + 0.05);
}

function tokens(source: string): Record<string, string> {
  return Object.fromEntries(
    declarations(source).filter(([, value]) => /^#[0-9a-f]{6}$/i.test(value)),
  );
}

/**
 * Text has to be readable on both grounds it can land on.
 *
 * `--surface` is the lighter of the two in light mode and the lighter in dark
 * mode too — a panel sits on the page either way — so both are checked rather
 * than whichever one happens to be worse.
 */
const TEXT_TOKENS = [
  '--ink',
  '--ink-muted',
  '--ink-faint',
  '--accent',
  '--accent-soft',
  '--jade',
  '--clay',
  '--elem-fire',
  '--elem-earth',
  '--elem-air',
  '--elem-water',
  '--nature-neutral',
];

describe.each([
  ['light', light],
  ['dark', chosenDark],
])('%s palette contrast', (_name, source) => {
  const palette = tokens(source);

  it.each(TEXT_TOKENS)('%s reads as text on both grounds', (token) => {
    for (const ground of ['--paper', '--surface'] as const) {
      expect(contrast(palette[token]!, palette[ground]!), `${token} on ${ground}`).toBeGreaterThan(
        4.5,
      );
    }
  });

  /* A border is not text; WCAG asks 3:1 of it, and a border below that is a
     border nobody can see, which is how a panel stops looking like a panel. */
  it('draws a strong rule you can actually see', () => {
    for (const ground of ['--paper', '--surface'] as const) {
      expect(
        contrast(palette['--rule-strong']!, palette[ground]!),
        `--rule-strong on ${ground}`,
      ).toBeGreaterThan(3);
    }
  });
});

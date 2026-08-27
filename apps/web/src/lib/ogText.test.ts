import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Every character on a share card must exist in the fonts that draw it.
 *
 * The OG images are rendered by satori from vendored .woff files. When satori
 * meets a codepoint none of them contain, it does not fail — it tries to fetch
 * a font from Google at build time, that fetch fails in a sandboxed or
 * offline build, and the card renders a tofu box. The build stays green and
 * the first thing anyone sees when the link is shared is "a□□akavarga".
 *
 * The three families Jade uses (Barlow, Barlow Condensed, IBM Plex Mono) ship
 * Google's "latin" and "latin-ext" subsets. Despite what the `unicode-range`
 * in Google's CSS declares, the actual faces stop at Latin Extended-A: they
 * carry ā, ś, ī and ū, and they do not carry the dotted consonants of Latin
 * Extended Additional — ṣ, ṭ, ṁ, ṛ — which is most of the Sanskrit this
 * product is written in.
 *
 * So card copy uses plain transliteration, which CLAUDE.md explicitly allows
 * ("use proper diacritics in user-facing strings, with a plain transliteration
 * always available"). A 1200×630 marketing image is not the place to lose that
 * argument to a missing glyph.
 *
 * To regenerate RENDERABLE after changing the vendored fonts:
 *
 *   cd apps/web/src/assets/og-fonts && python3 -c "
 *   from fontTools.ttLib import TTFont; import glob
 *   s=set()
 *   [s.update(TTFont(f).getBestCmap()) for f in glob.glob('*.woff')]
 *   print(''.join(sorted(chr(c) for c in s if c > 127)))"
 */

/** Non-ASCII characters present in at least one vendored OG font. */
const RENDERABLE = new Set([
  '·',
  '—',
  '–',
  '’',
  '‘',
  '“',
  '”',
  '…',
  'ā',
  'ś',
  'ī',
  'ū',
  '°',
  '′',
  '×',
  '→',
]);

// Resolved from this file rather than from `process.cwd()`, which is the repo
// root under a root-level vitest run and the app directory under a filtered
// one — a difference that makes the scan silently find nothing in one of them.
const HERE = fileURLToPath(new URL('.', import.meta.url));
const MARKETING = join(HERE, '..', 'app', '(marketing)');

/** Every opengraph-image source, plus the card renderer itself. */
function cardSources(): Array<{ path: string; text: string }> {
  const found: Array<{ path: string; text: string }> = [];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'opengraph-image.tsx') {
        found.push({ path: full, text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(MARKETING);

  const renderer = join(HERE, 'ogImage.tsx');
  found.push({ path: renderer, text: readFileSync(renderer, 'utf8') });
  return found;
}

describe('share cards', () => {
  const sources = cardSources();

  it('finds the card sources at all', () => {
    // A test that silently scans nothing passes forever.
    expect(sources.length).toBeGreaterThanOrEqual(4);
    expect(sources.some((s) => s.path.endsWith('ogImage.tsx'))).toBe(true);
  });

  it('uses no character the vendored fonts cannot draw', () => {
    for (const { path, text } of sources) {
      // Comments are exempt — this file's own prose names the missing glyphs,
      // and so does the renderer's. Only what reaches the image matters.
      const code = text
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

      const offenders = [...new Set([...code].filter((c) => c.charCodeAt(0) > 127))].filter(
        (c) => !RENDERABLE.has(c),
      );

      expect(
        offenders,
        `${path.split('/').slice(-2).join('/')} uses ${offenders
          .map((c) => `"${c}" (U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')})`)
          .join(
            ', ',
          )} — no vendored font has it, so satori will render a tofu box. Use plain transliteration in card copy.`,
      ).toEqual([]);
    }
  });
});

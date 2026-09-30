import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A skeleton has to be the shape of the page it stands in for.
 *
 * `loading.tsx` renders while a route's data is in flight, and then the real
 * page replaces it. If the two disagree about the container, the page visibly
 * jumps at the exact moment the reader starts looking at it — which is worse
 * than no skeleton, because it reads as a bug rather than as loading.
 *
 * They had already disagreed: the skeleton's container used `pt-6` and the
 * page's used `pt-7`, so every route with a loading state moved four pixels on
 * arrival. Nobody would report that; everybody would feel it.
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string, ext: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path, ext);
    return entry.isFile() && entry.name.endsWith(ext) ? [path] : [];
  });
}

const sources = files(SRC, '.tsx');

describe('the page container', () => {
  /*
   * One definition. `shellContainer` is it, and the only file allowed to spell
   * the classes out is the one that exports it — otherwise a second copy is a
   * second thing to keep in step, which is how the four pixels happened.
   */
  /*
   * The exact strings `shellContainer` produces. A public chart page and a
   * report have containers of their own that happen to share a width, and
   * those are not duplication — a byte-identical copy of the shell's container
   * is, because it is a copy that will not move when the shell moves.
   */
  const CONTAINERS = [
    'mx-auto px-5 pb-24 pt-7 sm:px-8 max-w-5xl',
    'mx-auto px-5 pb-24 pt-7 sm:px-8 max-w-[100rem]',
    'mx-auto max-w-5xl px-5 pb-24 pt-7 sm:px-8',
  ];

  it('is written down in exactly one place', () => {
    const spelt = sources.filter((file) => {
      const source = readFileSync(file, 'utf8');
      return CONTAINERS.some((one) => source.includes(one)) && !file.endsWith('Shell.tsx');
    });

    expect(spelt.map((file) => file.slice(SRC.length))).toEqual([]);
  });

  /* And the one place still produces what the rest of the app is laid out for. */
  it('still produces the container the pages were built against', () => {
    const shell = readFileSync(join(SRC, 'components', 'Shell.tsx'), 'utf8');
    expect(shell).toContain('pb-24 pt-7');
    expect(shell).toContain('max-w-[100rem]');
    expect(shell).toContain('max-w-5xl');
  });
});

describe('loading states', () => {
  const loadings = sources.filter((file) => file.endsWith('loading.tsx'));

  it('exist for the wheel, which is where the app opens', () => {
    expect(loadings.some((file) => file.includes(join('app', 'wheel')))).toBe(true);
  });

  /*
   * Every skeleton comes from the skeleton module rather than being drawn in
   * place. A bespoke one is a second page nobody maintains, and it will drift
   * from the real one the first time the real one changes.
   */
  it('are built from the skeleton module, never drawn in place', () => {
    for (const file of loadings) {
      const source = readFileSync(file, 'utf8');
      expect(source, file.slice(SRC.length)).toContain("from '@/components/Skeleton'");
    }
  });

  /*
   * The wheel runs wide and its skeleton has to run wide with it, or the
   * skeleton is 64rem and the page that replaces it is 100rem.
   */
  it('match the width of the page they stand in for', () => {
    const skeletons = readFileSync(join(SRC, 'components', 'Skeleton.tsx'), 'utf8');
    const wheelPage = readFileSync(join(SRC, 'app', 'wheel', 'page.tsx'), 'utf8');

    expect(wheelPage).toContain('width="wide"');
    expect(skeletons).toContain('<LoadingShell width="wide">');
  });
});

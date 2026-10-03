import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FITTED_AYANAMSAS } from '@jade/astro';

/**
 * The marketing site may not outrun the code.
 *
 * `plans.ts` already prevents a tier card from advertising an unbuilt
 * capability, through `built: false`. This catches the other shape of the same
 * mistake: a sentence of prose that quantifies something the code can count.
 *
 * The case that prompted it was real. The pricing page highlighted "Every
 * ayanāṁśa, stated on the chart" while two of eight were fitted and the other
 * six threw — so a KP astrologer could read the claim, pay, and find that Jade
 * could not cast them a chart at all. Nothing could catch that, because the
 * claim was a string and the truth was a table.
 */
const SRC = fileURLToPath(new URL('..', import.meta.url));

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [path] : [];
  });
}

const sources = files(SRC).map((path) => ({
  path: path.slice(SRC.length),
  text: readFileSync(path, 'utf8'),
}));

/** The modes a chart can actually be cast in, minus `custom`, which is a slot. */
const SELECTABLE = FITTED_AYANAMSAS.filter((one) => one !== 'custom').length;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

describe('ayanāṁśa claims', () => {
  it('never says "every ayanāṁśa" while any is unfitted', () => {
    const offenders = sources.filter((file) => /every ayanāṁśa/i.test(file.text));
    /* Only true when nothing is left in PLANNED_AYANAMSAS. */
    if (SELECTABLE >= 8) return;
    expect(offenders.map((f) => f.path)).toEqual([]);
  });

  it('counts them correctly wherever it counts them', () => {
    const correct = WORDS[SELECTABLE] ?? String(SELECTABLE);
    const pattern = /(\w+) ayanāṁśas?(?= selectable| available|, each| stated)/gi;
    for (const file of sources) {
      for (const [, word] of file.text.matchAll(pattern)) {
        const said = word!.toLowerCase();
        /* "Lahiri ayanāṁśa" and friends are naming one, not counting. */
        if (!WORDS.includes(said) && !/^\d+$/.test(said)) continue;
        expect(said, `${file.path} says "${said}", code has ${correct}`).toBe(correct);
      }
    }
  });
});

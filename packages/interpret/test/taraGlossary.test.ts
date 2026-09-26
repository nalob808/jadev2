import { describe, expect, it } from 'vitest';
import { TARAS } from '@jade/astro';
import { glossaryEntry } from '../src/index.js';

/**
 * The nine tārās each have a glossary entry, reachable from the core's own name.
 *
 * The book-wide sky screen derives the glossary id from `TARAS[].plain` rather
 * than keeping a second table of the nine names — the whole point of the derived
 * entries is that a lesson and a tooltip cannot drift. But a derivation is only
 * safe while the two spellings agree, and they nearly did not: the core writes
 * "Ati-mitra" and the glossary id is `atimitra`.
 *
 * So the rule is asserted rather than assumed. If someone renames a tārā in
 * either place, this fails instead of the hover quietly going dead on one row of
 * one screen, which is the sort of thing nobody notices for months.
 */
describe('the tārās and the glossary', () => {
  it('derives a real glossary id from every tārā the core defines', () => {
    expect(TARAS).toHaveLength(9);
    for (const tara of TARAS) {
      const id = tara.plain.toLowerCase().replace(/[^a-z]/g, '');
      const entry = glossaryEntry(id);
      expect(entry, `${tara.name} → '${id}'`).toBeDefined();
      /*
       * And the entry really is about that tārā, not a near-miss on another
       * word. Checked against the entry's own `plain` field rather than by
       * stripping diacritics from `term`: IAST does not transliterate by
       * dropping marks — `Kṣema` is `kshema`, not `ksema` — so a diacritic
       * strip would be a different (and wrong) romanisation, which is precisely
       * why both files carry an explicit plain spelling.
       */
      expect(entry!.plain.toLowerCase().replace(/[^a-z]/g, ''), tara.name).toBe(id);
    }
  });

  it('gives all nine distinct entries', () => {
    const ids = TARAS.map((tara) => tara.plain.toLowerCase().replace(/[^a-z]/g, ''));
    expect(new Set(ids).size).toBe(9);
  });
});

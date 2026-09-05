import { describe, expect, it } from 'vitest';
import { GLOSSARY, glossaryEntry, glossaryLookup } from './glossary.js';

describe('the glossary', () => {
  it('has no duplicate ids', () => {
    const ids = GLOSSARY.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /**
   * The whole value of the `related` field is that it is a graph you can walk.
   * A dangling id is a dead end in the interface — the chip renders and does
   * nothing — and it is exactly the kind of rot that sets in as entries are
   * added and renamed, so it is checked rather than reviewed.
   */
  it('has no dangling cross-references', () => {
    const ids = new Set(GLOSSARY.map((entry) => entry.id));
    for (const entry of GLOSSARY) {
      for (const related of entry.related) {
        expect(ids.has(related), `${entry.id} → ${related}`).toBe(true);
      }
    }
  });

  it('never points a term at itself', () => {
    for (const entry of GLOSSARY) {
      expect(entry.related, entry.id).not.toContain(entry.id);
    }
  });

  /**
   * An entry that only says what a word means is the generic dictionary this
   * was built to avoid. The body has to carry some actual use of the term, so
   * a floor is enforced — not as a quality measure, but to make a one-line
   * placeholder fail the build rather than ship.
   */
  it('says something substantial about every term', () => {
    for (const entry of GLOSSARY) {
      expect(entry.short.length, `${entry.id} short`).toBeGreaterThan(20);
      expect(entry.body.length, `${entry.id} body`).toBeGreaterThan(120);
      expect(entry.related.length, `${entry.id} related`).toBeGreaterThan(0);
    }
  });

  it('resolves a term however it is spelled', () => {
    for (const spelling of ['nakṣatra', 'Nakshatra', 'NAKSATRA', 'nakshatra']) {
      expect(glossaryLookup(spelling)?.id, spelling).toBe('nakshatra');
    }
    expect(glossaryLookup('Ṣaḍbala')?.id).toBe('shadbala');
    expect(glossaryLookup('not a word')).toBeNull();
  });

  it('returns null for an unknown id rather than throwing', () => {
    expect(glossaryEntry('nonsense')).toBeNull();
  });

  /**
   * Constitution #6. The glossary is prose Jade wrote, and prose is exactly
   * where a prohibited claim would slip in unnoticed — `readingFor` filters
   * generated statements, but nothing filters this file.
   */
  it('never predicts death, disease or legal outcomes', () => {
    const forbidden = /\b(will die|death of|fatal|cancer diagnosis|lawsuit|you will be sued)\b/i;
    for (const entry of GLOSSARY) {
      expect(forbidden.test(`${entry.short} ${entry.body}`), entry.id).toBe(false);
    }
  });
});

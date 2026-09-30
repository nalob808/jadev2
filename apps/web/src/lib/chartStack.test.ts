import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  MAX_RINGS,
  addLayer,
  defaultStack,
  hasLayer,
  isFull,
  layerKey,
  momentJd,
  moveLayer,
  parseOffsetDays,
  parseStack,
  removeLayer,
  serialiseStack,
  stackFromLegacy,
  type Layer,
} from './chartStack';

/**
 * The stack is the URL, so the URL is user input.
 *
 * Most of what follows is about what happens when a link is hand-edited,
 * truncated by a chat client, or forged: the wheel should draw fewer rings, and
 * never throw or trust an id it has not checked.
 */

const PERSON = '5f3a1c2e-0000-4000-8000-0123456789ab';
const OTHER = '7b1d9f04-0000-4000-8000-ba9876543210';

describe('reading a stack from a link', () => {
  it('reads all three kinds of ring, in order', () => {
    expect(parseStack(`p:${PERSON},f:albert-einstein`)).toEqual([
      { kind: 'person', id: PERSON },
      { kind: 'figure', slug: 'albert-einstein' },
    ]);
    expect(parseStack(`p:${PERSON},t:0`)).toEqual([
      { kind: 'person', id: PERSON },
      { kind: 'moment', at: { kind: 'offset', days: 0 } },
    ]);
  });

  it('round-trips', () => {
    const raw = `p:${PERSON},d:2027-01-01`;
    expect(serialiseStack(parseStack(raw))).toBe(raw);
  });

  it('keeps both moment forms, because they answer different questions', () => {
    /*
     * `t:` stays true tomorrow, which is what "their transits now" means.
     * `d:` is one day and no other, which is what a date you discussed means.
     */
    expect(parseStack('t:-30')).toEqual([{ kind: 'moment', at: { kind: 'offset', days: -30 } }]);
    expect(parseStack('d:2027-01-01')).toEqual([
      { kind: 'moment', at: { kind: 'date', iso: '2027-01-01' } },
    ]);
  });

  it('drops what it cannot read rather than throwing', () => {
    for (const raw of [
      'p:../../etc/passwd',
      'f:Not A Slug',
      'f:trailing-',
      't:99999',
      't:abc',
      'd:2026-02-30',
      'd:not-a-date',
      'x:whatever',
      'p:',
      ',,,',
    ]) {
      expect(parseStack(raw), raw).toEqual([]);
    }
    expect(parseStack(undefined)).toEqual([]);
    expect(parseStack('')).toEqual([]);
  });

  it('keeps the good rings out of a part-broken link', () => {
    expect(parseStack(`p:${PERSON},f:NOPE,t:7`)).toHaveLength(2);
  });

  it('refuses a ring past the limit and a repeat', () => {
    const raw = `p:${PERSON},p:${OTHER},t:0,d:2027-01-01`;
    expect(parseStack(raw)).toHaveLength(MAX_RINGS);
    expect(parseStack(`p:${PERSON},p:${PERSON}`)).toHaveLength(1);
    expect(parseStack('t:0,t:0')).toHaveLength(1);
  });

  it('tolerates whitespace a mail client may have added', () => {
    expect(parseStack(` p:${PERSON} , t:0 `)).toHaveLength(2);
  });
});

describe('links that already exist', () => {
  it('reads the old three parameters as a stack', () => {
    expect(stackFromLegacy({ person: PERSON, overlay: OTHER })).toEqual([
      { kind: 'person', id: PERSON },
      { kind: 'person', id: OTHER },
    ]);
    expect(stackFromLegacy({ person: PERSON, figure: 'albert-einstein' })).toEqual([
      { kind: 'person', id: PERSON },
      { kind: 'figure', slug: 'albert-einstein' },
    ]);
  });

  /*
   * The old page drew a figure only when an overlay person was absent, and a
   * link carrying both was a link somebody had edited by hand. The stack keeps
   * the two rings it can draw and drops the third rather than refusing the
   * link — a shared URL that opens on a slightly smaller chart is better than
   * one that opens on nothing.
   */
  it('keeps what it can draw when an old link carries both', () => {
    expect(stackFromLegacy({ person: PERSON, overlay: OTHER, figure: 'albert-einstein' })).toEqual([
      { kind: 'person', id: PERSON },
      { kind: 'person', id: OTHER },
    ]);
  });

  it('survives an empty query', () => {
    expect(stackFromLegacy({})).toEqual([]);
  });
});

describe('changing the stack', () => {
  const base: Layer[] = [
    { kind: 'person', id: PERSON },
    { kind: 'figure', slug: 'albert-einstein' },
  ];

  it('adds on the outside', () => {
    expect(
      addLayer([{ kind: 'person', id: PERSON }], { kind: 'figure', slug: 'albert-einstein' }),
    ).toEqual(base);
  });

  it('refuses rather than replacing when full', () => {
    expect(isFull(base)).toBe(true);
    expect(addLayer(base, { kind: 'moment', at: { kind: 'offset', days: 0 } })).toEqual(base);
    expect(addLayer(base, { kind: 'person', id: OTHER })).toEqual(base);
  });

  it('refuses a ring already on the wheel', () => {
    expect(addLayer(base, { kind: 'person', id: PERSON })).toEqual(base);
    expect(hasLayer(base, { kind: 'figure', slug: 'albert-einstein' })).toBe(true);
  });

  it('moves a ring, which is what swapping the wheels is', () => {
    expect(moveLayer(base, 0, 1)).toEqual([base[1], base[0]]);
    expect(moveLayer(base, 1, 0)).toEqual([base[1], base[0]]);
  });

  /* A drag that ends off the list is a cancelled drag, not a reorder. */
  it('leaves the stack alone when a move goes nowhere real', () => {
    expect(moveLayer(base, 0, 9)).toEqual(base);
    expect(moveLayer(base, -1, 0)).toEqual(base);
    expect(moveLayer(base, 0, 0)).toEqual(base);
  });

  it('removes by position', () => {
    expect(removeLayer(base, 0)).toEqual([base[1]]);
    expect(removeLayer(base, 5)).toEqual(base);
  });

  it('never mutates what it was given', () => {
    const before = [...base];
    moveLayer(base, 0, 1);
    addLayer(base, { kind: 'person', id: OTHER });
    removeLayer(base, 0);
    expect(base).toEqual(before);
  });
});

describe('what moment a ring stands for', () => {
  const TODAY = 2461000.5;

  it('counts an offset from the workspace’s today', () => {
    expect(momentJd({ kind: 'offset', days: 0 }, TODAY)).toBe(TODAY);
    expect(momentJd({ kind: 'offset', days: -10 }, TODAY)).toBe(TODAY - 10);
  });

  /* 1 Jan 2027 00:00 UT. Checked against the Julian day the epoch defines. */
  it('resolves an absolute date without reference to today', () => {
    expect(momentJd({ kind: 'date', iso: '2027-01-01' }, TODAY)).toBeCloseTo(2461406.5, 6);
    expect(momentJd({ kind: 'date', iso: '2027-01-01' }, TODAY + 500)).toBeCloseTo(2461406.5, 6);
  });
});

describe('keys and defaults', () => {
  it('gives every ring a key that is also its identity', () => {
    expect(layerKey({ kind: 'person', id: PERSON })).toBe(`p:${PERSON}`);
    expect(layerKey({ kind: 'moment', at: { kind: 'date', iso: '2027-01-01' } })).toBe(
      'd:2027-01-01',
    );
  });

  it('falls back to one person', () => {
    expect(defaultStack(PERSON)).toEqual([{ kind: 'person', id: PERSON }]);
  });
});

describe('a day offset from a link', () => {
  /*
   * `Number()` is the wrong tool and this is the list of reasons.
   *
   * Every one of these was accepted before the parser was shared: `?t=1e6`
   * drew a transit ring for the year 4764 and labelled it like any other,
   * `?t=99999999` threw a RangeError out of `toISOString` and replaced the
   * whole wheel with an error boundary, and `?t=0x10` quietly meant sixteen
   * days. None of them is a link a person wrote; all of them are links a
   * person could receive.
   */
  it('refuses everything that is not a plain whole number of days', () => {
    for (const raw of [
      '1e6',
      '0x10',
      '1.5',
      '-1.5',
      ' 5',
      '5 ',
      '',
      'NaN',
      'Infinity',
      '-Infinity',
      '+5',
      '99999999',
      '1_000',
      'five',
    ]) {
      expect(parseOffsetDays(raw), JSON.stringify(raw)).toBeNull();
    }
    expect(parseOffsetDays(undefined)).toBeNull();
    expect(parseOffsetDays(null)).toBeNull();
  });

  it('accepts a whole number of days inside the scrubber’s range', () => {
    expect(parseOffsetDays('0')).toBe(0);
    expect(parseOffsetDays('-0')).toBe(-0);
    expect(parseOffsetDays('7')).toBe(7);
    expect(parseOffsetDays('-365')).toBe(-365);
    expect(parseOffsetDays('3653')).toBe(3653);
    expect(parseOffsetDays('-3653')).toBe(-3653);
  });

  it('stops at the edge of the range rather than near it', () => {
    expect(parseOffsetDays('3654')).toBeNull();
    expect(parseOffsetDays('-3654')).toBeNull();
  });

  /* The stack and the legacy parameter have to agree, which is the whole point
     of there being one function. */
  it('is the same rule the stack applies', () => {
    for (const raw of ['1e6', '99999999', '1.5', '3654']) {
      expect(parseStack(`t:${raw}`), raw).toEqual([]);
    }
    expect(parseStack('t:3653')).toEqual([{ kind: 'moment', at: { kind: 'offset', days: 3653 } }]);
  });
});

describe('one parser, everywhere the offset is read', () => {
  /*
   * Three places read `?t=`: the wheel page on the server, the wheel workspace
   * in the browser, and the stack. They each had their own parse, and they
   * disagreed — `Number` on the page, `Number.parseInt` in the browser, a
   * regex in the stack. `?t=1e6` meant a million days on the server and one
   * day in the browser, which is two different skies drawn from one link.
   *
   * A source check rather than a behavioural one, because the failure is a
   * second parser appearing rather than an existing one misbehaving, and by
   * the time it misbehaves the disagreement is already shipped.
   */
  const SOURCES = ['../app/wheel/page.tsx', '../components/WheelWorkspace.tsx'];

  for (const relative of SOURCES) {
    it(`${relative.split('/').pop()} reads the offset through parseOffsetDays`, () => {
      const source = readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

      expect(source).toContain('parseOffsetDays');
      /* The three spellings that used to be here. */
      expect(source).not.toMatch(/Number\.parseInt\(\s*offset/);
      expect(source).not.toMatch(/Number\(\s*transitParam\s*\)/);
      expect(source).not.toMatch(/Number\(\s*offsetRaw\s*\)/);
    });
  }
});

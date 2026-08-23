import { describe, expect, it } from 'vitest';
import type { SubjectWithPrimaryEvent } from '@jade/db';
import {
  applyView,
  compareBy,
  DEFAULT_VIEW_STATE,
  matches,
  readViewState,
  relationshipsPresent,
  toQuery,
} from './peopleView.js';

/**
 * A person, with only the fields the view logic reads.
 *
 * Cast at the boundary rather than constructing a full row: the sort rules
 * depend on five fields and a fixture carrying thirty would hide which five.
 */
function person(overrides: {
  name: string;
  updated?: string;
  created?: string;
  birth?: string | null;
  place?: string;
  relationship?: string;
  tags?: string[];
}): SubjectWithPrimaryEvent {
  const {
    name,
    updated = '2026-01-01T00:00:00Z',
    created = '2026-01-01T00:00:00Z',
    birth = '1990-06-15T10:30:00',
    place = 'Mumbai, India',
    relationship = 'other',
    tags = [],
  } = overrides;

  return {
    subject: {
      displayName: name,
      givenNames: null,
      familyName: null,
      relationship,
      tags,
      updatedAt: new Date(updated),
      createdAt: new Date(created),
    },
    birthEvent: birth === null ? null : { localDatetime: birth, placeName: place },
  } as unknown as SubjectWithPrimaryEvent;
}

describe('readViewState', () => {
  it('defaults an empty query string', () => {
    expect(readViewState({})).toEqual(DEFAULT_VIEW_STATE);
  });

  it('reads every field', () => {
    expect(
      readViewState({ q: ' asha ', sort: 'name', view: 'table', relationship: 'client' }),
    ).toEqual({
      q: 'asha',
      sort: 'name',
      view: 'table',
      relationship: 'client',
    });
  });

  // A hand-edited or stale URL must show the list, not an error page.
  it('falls back rather than throwing on nonsense', () => {
    const state = readViewState({ sort: 'sideways', view: 'hologram' });
    expect(state.sort).toBe('recent');
    expect(state.view).toBe('cards');
  });

  it('takes the first value when a param repeats', () => {
    expect(readViewState({ sort: ['name', 'birth'] }).sort).toBe('name');
  });
});

describe('matches', () => {
  const asha = person({ name: 'Āśā Rao', place: 'Chennai, India', tags: ['study'] });

  it('finds a name regardless of case or diacritics', () => {
    expect(matches(asha, 'asa')).toBe(true);
    expect(matches(asha, 'RAO')).toBe(true);
  });

  it('finds a person by where they were born', () => {
    // "who was the one born in Chennai" is a question people ask of their own
    // list, and the place is often easier to recall than the spelling.
    expect(matches(asha, 'chennai')).toBe(true);
  });

  it('finds a person by tag', () => {
    expect(matches(asha, 'study')).toBe(true);
  });

  it('an empty query matches everyone', () => {
    expect(matches(asha, '   ')).toBe(true);
  });

  it('does not match something absent', () => {
    expect(matches(asha, 'zebra')).toBe(false);
  });

  it('survives a person with no birth data', () => {
    expect(matches(person({ name: 'No Data', birth: null }), 'no data')).toBe(true);
  });
});

describe('sorting', () => {
  it('sorts by name', () => {
    const rows = [person({ name: 'Zara' }), person({ name: 'Amit' }), person({ name: 'Meera' })];
    expect(
      rows
        .slice()
        .sort(compareBy('name'))
        .map((r) => r.subject.displayName),
    ).toEqual(['Amit', 'Meera', 'Zara']);
  });

  it('sorts by birth date, oldest first', () => {
    const rows = [
      person({ name: 'C', birth: '2001-03-02T08:00:00' }),
      person({ name: 'A', birth: '1975-11-30T23:15:00' }),
      person({ name: 'B', birth: '1990-06-15T10:30:00' }),
    ];
    expect(
      rows
        .slice()
        .sort(compareBy('birth'))
        .map((r) => r.subject.displayName),
    ).toEqual(['A', 'B', 'C']);
  });

  // A missing value is not an early date. Floating incomplete records to the
  // top of a birth-date sort is worse than not sorting at all.
  it('puts people with no birth data last, not first', () => {
    const rows = [
      person({ name: 'Unknown', birth: null }),
      person({ name: 'Known', birth: '1990-06-15T10:30:00' }),
    ];
    expect(
      rows
        .slice()
        .sort(compareBy('birth'))
        .map((r) => r.subject.displayName),
    ).toEqual(['Known', 'Unknown']);
  });

  it('sorts by most recently updated', () => {
    const rows = [
      person({ name: 'Old', updated: '2020-01-01T00:00:00Z' }),
      person({ name: 'New', updated: '2026-08-01T00:00:00Z' }),
    ];
    expect(rows.slice().sort(compareBy('recent'))[0]!.subject.displayName).toBe('New');
  });

  it('sorts by most recently added', () => {
    const rows = [
      person({ name: 'First', created: '2020-01-01T00:00:00Z' }),
      person({ name: 'Latest', created: '2026-08-01T00:00:00Z' }),
    ];
    expect(rows.slice().sort(compareBy('added'))[0]!.subject.displayName).toBe('Latest');
  });

  // A list that reshuffles its ties between renders looks broken even when the
  // sort itself is correct.
  it('breaks every tie by name, so the order is total', () => {
    const same = '2026-01-01T00:00:00Z';
    const rows = [
      person({ name: 'Chandra', updated: same, created: same }),
      person({ name: 'Anil', updated: same, created: same }),
      person({ name: 'Bharat', updated: same, created: same }),
    ];
    for (const sort of ['recent', 'added', 'birth'] as const) {
      expect(
        rows
          .slice()
          .sort(compareBy(sort))
          .map((r) => r.subject.displayName),
      ).toEqual(['Anil', 'Bharat', 'Chandra']);
    }
  });
});

describe('applyView', () => {
  const rows = [
    person({ name: 'Asha', relationship: 'client', place: 'Chennai, India' }),
    person({ name: 'Bina', relationship: 'family', place: 'Mumbai, India' }),
    person({ name: 'Cyrus', relationship: 'client', place: 'Mumbai, India' }),
  ];

  it('searches, filters and sorts together', () => {
    const out = applyView(rows, {
      q: 'mumbai',
      sort: 'name',
      view: 'cards',
      relationship: 'client',
    });
    expect(out.map((r) => r.subject.displayName)).toEqual(['Cyrus']);
  });

  it('does not mutate the list it was given', () => {
    const before = rows.map((r) => r.subject.displayName);
    applyView(rows, { ...DEFAULT_VIEW_STATE, sort: 'name' });
    expect(rows.map((r) => r.subject.displayName)).toEqual(before);
  });

  it('an empty result is empty, not everything', () => {
    expect(applyView(rows, { ...DEFAULT_VIEW_STATE, q: 'nobody' })).toEqual([]);
  });
});

describe('relationshipsPresent', () => {
  it('lists each relationship once, sorted', () => {
    const rows = [
      person({ name: 'A', relationship: 'client' }),
      person({ name: 'B', relationship: 'family' }),
      person({ name: 'C', relationship: 'client' }),
    ];
    expect(relationshipsPresent(rows)).toEqual(['client', 'family']);
  });
});

describe('toQuery', () => {
  // The common case should be a clean /people, not /people?sort=recent&view=cards.
  it('omits the defaults', () => {
    expect(toQuery(DEFAULT_VIEW_STATE)).toBe('');
  });

  it('includes what differs', () => {
    expect(toQuery({ q: 'asha', sort: 'name', view: 'table', relationship: 'client' })).toBe(
      '?q=asha&sort=name&view=table&relationship=client',
    );
  });

  it('round-trips through readViewState', () => {
    const state = { q: 'rao', sort: 'birth', view: 'list', relationship: 'family' } as const;
    const params = Object.fromEntries(new URLSearchParams(toQuery(state).slice(1)));
    expect(readViewState(params)).toEqual(state);
  });
});

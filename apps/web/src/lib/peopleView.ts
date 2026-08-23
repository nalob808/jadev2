import type { SubjectWithPrimaryEvent } from '@jade/db';

/**
 * How the people list is searched, sorted and shown.
 *
 * Pure functions over an already-fetched list, deliberately. A practice holds
 * tens to low hundreds of people, not millions, so sorting in memory costs
 * nothing and buys two things worth more than a query plan: the ordering rules
 * are unit-testable without a database, and adding a sort never means writing
 * a migration.
 *
 * The state lives in the URL rather than in component state, so a particular
 * view survives a reload, a back button, and being sent to someone else.
 */

export const SORTS = ['recent', 'name', 'birth', 'added'] as const;
export type Sort = (typeof SORTS)[number];

export const VIEWS = ['cards', 'list', 'table'] as const;
export type View = (typeof VIEWS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  recent: 'Recently updated',
  name: 'Name (A–Z)',
  birth: 'Birth date',
  added: 'Recently added',
};

export const VIEW_LABELS: Record<View, string> = {
  cards: 'Cards',
  list: 'List',
  table: 'Table',
};

export interface PeopleViewState {
  readonly q: string;
  readonly sort: Sort;
  readonly view: View;
  /** Empty means every relationship. */
  readonly relationship: string;
}

export const DEFAULT_VIEW_STATE: PeopleViewState = {
  q: '',
  sort: 'recent',
  view: 'cards',
  relationship: '',
};

/**
 * Read the view state out of URL search params.
 *
 * Anything unrecognised falls back to the default rather than throwing. A
 * hand-edited or stale URL should show the list, not an error page.
 */
export function readViewState(
  params: Record<string, string | string[] | undefined>,
): PeopleViewState {
  const one = (key: string): string => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
  };

  const sort = one('sort');
  const view = one('view');

  return {
    q: one('q'),
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as Sort) : DEFAULT_VIEW_STATE.sort,
    view: (VIEWS as readonly string[]).includes(view) ? (view as View) : DEFAULT_VIEW_STATE.view,
    relationship: one('relationship'),
  };
}

/** Fold accents and case so "Renée" is found by typing "renee". */
function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Does this person match the search box?
 *
 * Name and birthplace both, because "who was the one born in Chennai" is a
 * question people actually ask of their own list, and the place is often
 * easier to remember than the spelling of a name.
 */
export function matches(row: SubjectWithPrimaryEvent, query: string): boolean {
  const needle = fold(query.trim());
  if (!needle) return true;

  const haystacks = [
    row.subject.displayName,
    row.subject.givenNames ?? '',
    row.subject.familyName ?? '',
    row.birthEvent?.placeName ?? '',
    ...row.subject.tags,
  ];

  return haystacks.some((hay) => fold(hay).includes(needle));
}

function time(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const ms = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Compare by the chosen sort.
 *
 * Two rules apply to every sort. People with no birth data sort last rather
 * than first — a missing value is not an early date, and floating the
 * incomplete records to the top of a birth-date sort is worse than useless.
 * And every comparison falls through to the name, so the order is total: a
 * list that reshuffles its ties between renders looks broken even when the
 * sort is correct.
 */
export function compareBy(sort: Sort) {
  return (a: SubjectWithPrimaryEvent, b: SubjectWithPrimaryEvent): number => {
    const byName = a.subject.displayName.localeCompare(b.subject.displayName, undefined, {
      sensitivity: 'base',
    });

    switch (sort) {
      case 'name':
        return byName;

      case 'added': {
        const delta = time(b.subject.createdAt) - time(a.subject.createdAt);
        return delta !== 0 ? delta : byName;
      }

      case 'birth': {
        // localDatetime is stored as the literal wall-clock text, so it sorts
        // lexicographically without parsing — and without a timezone turning
        // two births on the same day into different days.
        const aAt = a.birthEvent?.localDatetime ?? '';
        const bAt = b.birthEvent?.localDatetime ?? '';
        if (!aAt && !bAt) return byName;
        if (!aAt) return 1;
        if (!bAt) return -1;
        const delta = aAt.localeCompare(bAt);
        return delta !== 0 ? delta : byName;
      }

      case 'recent':
      default: {
        const delta = time(b.subject.updatedAt) - time(a.subject.updatedAt);
        return delta !== 0 ? delta : byName;
      }
    }
  };
}

/** Search, filter and sort in one pass. Never mutates the input. */
export function applyView(
  rows: readonly SubjectWithPrimaryEvent[],
  state: PeopleViewState,
): SubjectWithPrimaryEvent[] {
  return rows
    .filter((row) => matches(row, state.q))
    .filter((row) => !state.relationship || row.subject.relationship === state.relationship)
    .slice()
    .sort(compareBy(state.sort));
}

/** The relationship values actually present, for the filter menu. */
export function relationshipsPresent(rows: readonly SubjectWithPrimaryEvent[]): string[] {
  return [...new Set(rows.map((row) => row.subject.relationship))].sort();
}

/**
 * Build the querystring for a changed view.
 *
 * Defaults are omitted so the common case is a clean `/people` rather than
 * `/people?sort=recent&view=cards&q=`.
 */
export function toQuery(state: PeopleViewState): string {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.sort !== DEFAULT_VIEW_STATE.sort) params.set('sort', state.sort);
  if (state.view !== DEFAULT_VIEW_STATE.view) params.set('view', state.view);
  if (state.relationship) params.set('relationship', state.relationship);
  const query = params.toString();
  return query ? `?${query}` : '';
}

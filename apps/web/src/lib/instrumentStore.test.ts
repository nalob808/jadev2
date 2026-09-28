import { describe, expect, it } from 'vitest';
import {
  createInstrumentStore,
  encodeSelection,
  parseOffset,
  parseSelection,
  type Selection,
  type UrlAdapter,
} from './instrumentStore';

/**
 * The instrument's acceptance, from the visual-system brief §1:
 *
 *   setting a selection and reloading restores it; dragging does not write
 *   history; a malformed URL value degrades to the default rather than
 *   throwing.
 *
 * History is an array here. "Reload" is a fresh store built over whatever the
 * last entry says, which is exactly what a browser reload does — the store has
 * no memory beyond the URL.
 */

const TODAY = 2_461_000.5;

function fakeHistory(initial = ''): UrlAdapter & { entries: string[] } {
  const entries = [initial];
  return {
    entries,
    read: () => entries[entries.length - 1]!,
    push: (query) => {
      entries.push(query);
    },
  };
}

describe('the selection codec', () => {
  const every: Selection[] = [
    { kind: 'graha', id: 'Saturn' },
    { kind: 'graha', id: 'Ascendant' },
    { kind: 'house', house: 7 },
    { kind: 'sign', signIndex: 0 },
    { kind: 'nakshatra', index: 26 },
    { kind: 'pada', nakshatra: 12, pada: 3 },
    { kind: 'period', lords: ['Saturn', 'Mercury', 'Ketu'] },
  ];

  it('round-trips every kind', () => {
    for (const selection of every) {
      expect(parseSelection(encodeSelection(selection))).toEqual(selection);
    }
  });

  it('reads the brief’s own examples', () => {
    expect(parseSelection('graha:Saturn')).toEqual({ kind: 'graha', id: 'Saturn' });
    expect(parseSelection('nak:12')).toEqual({ kind: 'nakshatra', index: 12 });
    expect(parseSelection('pada:12.3')).toEqual({ kind: 'pada', nakshatra: 12, pada: 3 });
  });

  it('turns anything malformed into no selection rather than throwing', () => {
    const junk = [
      '',
      'Saturn',
      'graha:',
      'graha:Chiron',
      'graha:saturn',
      'house:0',
      'house:13',
      'house:7.5',
      'sign:12',
      'sign:-1',
      'nak:27',
      'nak:-1',
      'nak:1e1',
      'pada:12',
      'pada:12.0',
      'pada:12.5',
      'pada:27.1',
      'period:',
      'period:Saturn.Pluto',
      'period:Saturn.Saturn.Saturn.Saturn.Saturn.Saturn',
      'spaceship:1',
      '%E0%A4',
    ];
    for (const raw of junk) expect(parseSelection(raw), raw).toBeNull();
    expect(parseSelection(null)).toBeNull();
  });

  it('reads a malformed or absurd offset as today', () => {
    for (const raw of [null, '', 'soon', '3.5', '1e9', '99999999', 'NaN', 'Infinity']) {
      expect(parseOffset(raw), String(raw)).toBe(0);
    }
    expect(parseOffset('-30')).toBe(-30);
  });
});

describe('the instrument store', () => {
  it('restores a selection and a date on reload', () => {
    const history = fakeHistory();
    const store = createInstrumentStore(history, TODAY);
    store.setSelection({ kind: 'pada', nakshatra: 3, pada: 2 });
    store.setJd(TODAY + 40);

    const reloaded = createInstrumentStore(history, TODAY);
    expect(reloaded.getState().selection).toEqual({ kind: 'pada', nakshatra: 3, pada: 2 });
    expect(reloaded.getState().jd).toBe(TODAY + 40);
  });

  it('writes no history while dragging, and exactly one entry on release', () => {
    const history = fakeHistory();
    const store = createInstrumentStore(history, TODAY);

    for (let frame = 1; frame <= 120; frame += 1) store.scrubTo(TODAY + frame * 0.5);
    expect(history.entries).toHaveLength(1);
    // The views still see the live value while the finger is down.
    expect(store.getState().jd).toBe(TODAY + 60);
    expect(store.getState().isDragging).toBe(true);

    store.endScrub();
    expect(history.entries).toHaveLength(2);
    expect(history.entries[1]).toBe('t=60');
    expect(store.getState().isDragging).toBe(false);
  });

  it('lets back walk committed views', () => {
    const history = fakeHistory();
    const store = createInstrumentStore(history, TODAY);
    store.setSelection({ kind: 'graha', id: 'Moon' });
    store.setSelection({ kind: 'graha', id: 'Saturn' });
    history.entries.pop(); // the back button
    store.syncFromUrl();
    expect(store.getState().selection).toEqual({ kind: 'graha', id: 'Moon' });
  });

  it('does not stack a duplicate entry for a click on what is already chosen', () => {
    const history = fakeHistory();
    const store = createInstrumentStore(history, TODAY);
    store.setSelection({ kind: 'nakshatra', index: 3 });
    store.setSelection({ kind: 'nakshatra', index: 3 });
    store.setJd(TODAY);
    expect(history.entries).toHaveLength(2);
  });

  it('keeps other query parameters it does not own', () => {
    const history = fakeHistory('person=abc&g=Mars');
    const store = createInstrumentStore(history, TODAY);
    store.setSelection({ kind: 'house', house: 10 });
    const params = new URLSearchParams(history.read());
    expect(params.get('person')).toBe('abc');
    expect(params.get('g')).toBe('Mars');
  });

  it('opens on today with nothing selected when the URL is junk', () => {
    const store = createInstrumentStore(fakeHistory('t=tomorrow&sel=graha:Chiron'), TODAY);
    expect(store.getState()).toEqual({ jd: TODAY, selection: null, isDragging: false });
  });

  it('clears the selection and returns to today by removing the parameters', () => {
    const history = fakeHistory('t=12&sel=nak:4');
    const store = createInstrumentStore(history, TODAY);
    store.setSelection(null);
    store.setJd(TODAY);
    expect(history.read()).toBe('');
  });

  it('notifies subscribers on every change, including live scrubbing', () => {
    const store = createInstrumentStore(fakeHistory(), TODAY);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.scrubTo(TODAY + 1);
    store.scrubTo(TODAY + 2);
    store.endScrub();
    unsubscribe();
    store.setJd(TODAY + 5);
    expect(calls).toBe(3);
  });
});

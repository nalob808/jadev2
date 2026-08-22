import { describe, expect, it } from 'vitest';
import { chartCacheKey } from './chart.js';
import type { BirthEvent } from '@jade/db';
import type { ChartSettings } from '@jade/astro';

const birthEvent = {
  id: 'be-1',
  utcDatetime: new Date(Date.UTC(2001, 10, 7, 15, 32)),
  latitude: 42.2808,
  longitude: -83.743,
  elevationM: 256,
} as unknown as BirthEvent;

const settings: ChartSettings = {
  ayanamsa: 'lahiri',
  nodeType: 'mean',
  houseSystem: 'whole_sign',
  includeOuters: false,
};

describe('chart cache key', () => {
  it('is stable for identical inputs', () => {
    expect(chartCacheKey('ws-1', birthEvent, settings)).toBe(
      chartCacheKey('ws-1', birthEvent, settings),
    );
  });

  it('differs per workspace, even for identical birth data', () => {
    // Regression: without this, two practices holding the same chart collide
    // on the primary key while RLS hides the existing row from the second —
    // a permanent, silent cache miss.
    expect(chartCacheKey('ws-1', birthEvent, settings)).not.toBe(
      chartCacheKey('ws-2', birthEvent, settings),
    );
  });

  it('changes when the lens changes', () => {
    expect(chartCacheKey('ws-1', birthEvent, { ...settings, ayanamsa: 'raman' })).not.toBe(
      chartCacheKey('ws-1', birthEvent, settings),
    );
    expect(chartCacheKey('ws-1', birthEvent, { ...settings, nodeType: 'true' })).not.toBe(
      chartCacheKey('ws-1', birthEvent, settings),
    );
    expect(chartCacheKey('ws-1', birthEvent, { ...settings, includeOuters: true })).not.toBe(
      chartCacheKey('ws-1', birthEvent, settings),
    );
  });

  it('changes when the moment or the place changes', () => {
    const oneMinuteLater = {
      ...birthEvent,
      utcDatetime: new Date(Date.UTC(2001, 10, 7, 15, 33)),
    } as BirthEvent;
    const elsewhere = { ...birthEvent, latitude: 42.2809 } as BirthEvent;
    expect(chartCacheKey('ws-1', oneMinuteLater, settings)).not.toBe(
      chartCacheKey('ws-1', birthEvent, settings),
    );
    expect(chartCacheKey('ws-1', elsewhere, settings)).not.toBe(
      chartCacheKey('ws-1', birthEvent, settings),
    );
  });
});

describe('point display order', () => {
  it('is explicit, because jsonb does not preserve key order', async () => {
    const { POINT_DISPLAY_ORDER } = await import('@jade/astro');
    expect(POINT_DISPLAY_ORDER.slice(0, 9)).toEqual([
      'Sun',
      'Moon',
      'Mars',
      'Mercury',
      'Jupiter',
      'Venus',
      'Saturn',
      'Rahu',
      'Ketu',
    ]);
    // A cached chart round-trips through Postgres jsonb, which reorders keys.
    // Rendering must not depend on that order.
    const shuffled = { Ketu: 1, Sun: 2, Mars: 3 };
    const ordered = POINT_DISPLAY_ORDER.filter((id) => id in shuffled);
    expect(ordered).toEqual(['Sun', 'Mars', 'Ketu']);
  });
});

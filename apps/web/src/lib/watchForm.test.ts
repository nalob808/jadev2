import { describe, expect, it } from 'vitest';
import { AstronomyEngineProvider, evaluateWatch, vimshottari } from '@jade/astro';
import { DEFAULT_HORIZON_DAYS, WATCH_KINDS, describeWatch, parseWatchForm } from './watchForm';

/**
 * A watch is the one thing a user writes that a *service* later executes,
 * unattended, against every chart they own. A malformed rule does not fail
 * where it was typed — it fails at three in the morning inside a job, for one
 * workspace, in a way nobody sees until the alerts stop.
 *
 * So these tests are mostly about refusal: rules that can never fire, rules
 * that contradict themselves, and anything that is not one of the four kinds.
 */
function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe('the four kinds', () => {
  it('covers every kind the evaluator switches on', () => {
    /* If a fifth kind is added to the union, this list has to grow with it or
       the form silently cannot create one. */
    expect(WATCH_KINDS.map((one) => one.id).sort()).toEqual(
      ['dashaChange', 'ingress', 'station', 'transitCrossing'].sort(),
    );
  });

  it('parses a transit crossing', () => {
    const out = parseWatchForm(
      form({ kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Moon' }),
    );
    expect(out).toEqual({
      ok: true,
      horizonDays: DEFAULT_HORIZON_DAYS,
      rule: { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Moon' },
    });
  });

  it('parses an ingress, with and without a target', () => {
    expect(parseWatchForm(form({ kind: 'ingress', transiting: 'Jupiter' }))).toMatchObject({
      ok: true,
      rule: { kind: 'ingress', transiting: 'Jupiter' },
    });
    expect(
      parseWatchForm(form({ kind: 'ingress', transiting: 'Jupiter', intoSign: '3' })),
    ).toMatchObject({ ok: true, rule: { intoSign: 3 } });
    expect(
      parseWatchForm(form({ kind: 'ingress', transiting: 'Jupiter', intoHouse: '10' })),
    ).toMatchObject({ ok: true, rule: { intoHouse: 10 } });
  });

  it('parses a station and a daśā change', () => {
    expect(
      parseWatchForm(form({ kind: 'station', transiting: 'Mercury', direction: 'retrograde' })),
    ).toMatchObject({ ok: true, rule: { kind: 'station', direction: 'retrograde' } });
    expect(parseWatchForm(form({ kind: 'dashaChange', level: '2' }))).toMatchObject({
      ok: true,
      rule: { kind: 'dashaChange', level: 2 },
    });
    expect(parseWatchForm(form({ kind: 'dashaChange', level: '2', lord: 'Venus' }))).toMatchObject({
      ok: true,
      rule: { lord: 'Venus' },
    });
  });

  /* An absent option must be absent, not present-and-undefined: the rule is
     stored as jsonb and `{"intoSign": null}` is a different document. */
  it('omits optional fields rather than storing them empty', () => {
    const out = parseWatchForm(form({ kind: 'ingress', transiting: 'Jupiter' }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(Object.keys(out.rule).sort()).toEqual(['kind', 'transiting']);
  });
});

describe('rules that could never fire are refused', () => {
  /* The luminaries never station and the mean nodes are always retrograde. A
     stored rule for any of them is an alert that silently never arrives. */
  it.each(['Sun', 'Moon', 'Rahu', 'Ketu'])('refuses a station on %s', (body) => {
    const out = parseWatchForm(form({ kind: 'station', transiting: body }));
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toMatch(/never stations/i);
  });

  /* For one chart a sign IS a house, so naming both says it twice or never. */
  it('refuses an ingress naming both a sign and a house', () => {
    const out = parseWatchForm(
      form({ kind: 'ingress', transiting: 'Saturn', intoSign: '3', intoHouse: '10' }),
    );
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toMatch(/not both/i);
  });
});

describe('bad input is refused with a reason', () => {
  it.each([
    [{ kind: '' }, /what to watch/i],
    [{ kind: 'nonsense' }, /what to watch/i],
    [{ kind: 'transitCrossing', transiting: 'Chiron', natalPoint: 'Moon' }, /graha to watch/i],
    [{ kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Chiron' }, /natal point/i],
    /* The outers are absent on purpose: a chart carries them only when the
       profile asks, so a rule naming one evaluates for some charts and not
       others. */
    [{ kind: 'ingress', transiting: 'Pluto' }, /graha to watch/i],
    /* The angles do not transit. */
    [{ kind: 'ingress', transiting: 'Ascendant' }, /graha to watch/i],
    [{ kind: 'ingress', transiting: 'Saturn', intoSign: '14' }, /out of range/i],
    [{ kind: 'ingress', transiting: 'Saturn', intoHouse: '0' }, /1 to 12/i],
    [{ kind: 'station', transiting: 'Mars', direction: 'sideways' }, /retrograde or direct/i],
    [{ kind: 'dashaChange', level: '9' }, /daśā level/i],
    [{ kind: 'dashaChange', level: '2', lord: 'Pluto' }, /nine daśā lords/i],
    [{ kind: 'dashaChange', level: '2', horizonDays: '99999' }, /1 and 1825/i],
  ])('refuses %o', (fields, pattern) => {
    const out = parseWatchForm(form(fields as Record<string, string>));
    expect(out.ok).toBe(false);
    if (out.ok) return;
    expect(out.reason).toMatch(pattern);
  });

  it('never returns a rule without a reason, or a reason with a rule', () => {
    const bad = parseWatchForm(form({ kind: 'station', transiting: 'Sun' }));
    expect('rule' in bad).toBe(false);
    const good = parseWatchForm(form({ kind: 'dashaChange', level: '1' }));
    expect('reason' in good).toBe(false);
  });
});

describe('every parsed rule is one the evaluator accepts', () => {
  /*
   * The real check. A rule that parses but that `evaluateWatch` cannot switch
   * on would be stored, run nightly, and do nothing — and the exhaustiveness
   * guard in the evaluator cannot catch it, because that guard protects
   * against Jade adding a kind, not against a row that was wrong when written.
   */
  const subject = {
    ascendantSign: 2,
    natalLongitudeOf: { Sun: 10, Moon: 100, Mars: 200, Saturn: 300, Ascendant: 70 },
  };
  const context = {
    provider: new AstronomyEngineProvider({ nodeType: 'mean' as const }),
    frame: { ayanamsa: 'lahiri' as const },
    /* `dashaChange` is the one kind that needs a chain; the others ignore it. */
    dasha: vimshottari(100, 2440000, { levels: 3 }),
  };

  it.each([
    { kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Moon' },
    { kind: 'ingress', transiting: 'Jupiter' },
    { kind: 'ingress', transiting: 'Jupiter', intoSign: '3' },
    { kind: 'ingress', transiting: 'Jupiter', intoHouse: '10' },
    { kind: 'station', transiting: 'Mercury' },
    { kind: 'station', transiting: 'Mars', direction: 'direct', inHouse: '7' },
    { kind: 'dashaChange', level: '1' },
    { kind: 'dashaChange', level: '2', lord: 'Venus' },
  ])('evaluates %o without throwing', (fields) => {
    const out = parseWatchForm(form(fields as unknown as Record<string, string>));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(() =>
      evaluateWatch(out.rule, subject, { fromJd: 2460000, toJd: 2460030 }, context),
    ).not.toThrow();
  });
});

describe('describeWatch', () => {
  it('says each kind the way the person who wrote it would', () => {
    expect(
      describeWatch({ kind: 'transitCrossing', transiting: 'Saturn', natalPoint: 'Moon' }),
    ).toBe('Saturn reaches natal Moon');
    expect(describeWatch({ kind: 'ingress', transiting: 'Jupiter' })).toBe('Jupiter changes sign');
    expect(describeWatch({ kind: 'ingress', transiting: 'Jupiter', intoSign: 0 })).toMatch(
      /Jupiter enters Aries/,
    );
    expect(describeWatch({ kind: 'station', transiting: 'Mercury' })).toBe('Mercury turns');
    expect(
      describeWatch({ kind: 'station', transiting: 'Mars', direction: 'retrograde', inHouse: 7 }),
    ).toBe('Mars turns retrograde in the 7th');
    expect(describeWatch({ kind: 'dashaChange', level: 2, lord: 'Venus' })).toBe(
      'Venus antardaśā begins',
    );
    expect(describeWatch({ kind: 'dashaChange', level: 1 })).toBe('Any mahādaśā begins');
  });

  it('never renders an undefined into the sentence', () => {
    const rules = [
      { kind: 'ingress', transiting: 'Saturn', intoSign: 99 },
      { kind: 'dashaChange', level: 9 },
    ] as const;
    for (const rule of rules) {
      expect(describeWatch(rule as never)).not.toMatch(/undefined/);
    }
  });
});

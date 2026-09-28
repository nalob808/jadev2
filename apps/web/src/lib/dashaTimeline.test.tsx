import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { VIMSHOTTARI_YEARS, dashaChainAt, vimshottari } from '@jade/astro';
import {
  DashaTimeline,
  type DashaStrengthSegment,
  type DashaTimelineEvent,
  type InstrumentSelection,
} from '@jade/ui';

/**
 * The daśā timeline's encoding, asserted in the DOM (brief §5 and §6).
 *
 * The promise is proportion: a table cannot show that Rāhu gets 18 years and
 * the Sun 6, and this view exists to. So widths are measured against
 * durations, and the finer levels — which only appear on zoom — are rendered
 * zoomed in before anything is said about them.
 */

const BIRTH_JD = 2_447_892.5; // 1990-01-01 UT
const DASHAS = vimshottari(137.5, BIRTH_JD, { levels: 3, yearLength: 'julian' });
const CURSOR = BIRTH_JD + 30 * 365.25;
const PLOT_W = 902;

function draw(
  options: {
    window?: { fromJd: number; toJd: number };
    selection?: InstrumentSelection | null;
    events?: DashaTimelineEvent[];
    strength?: DashaStrengthSegment[];
  } = {},
): string {
  return renderToStaticMarkup(
    <DashaTimeline
      dashas={DASHAS}
      jd={CURSOR}
      selection={options.selection ?? null}
      initialWindow={options.window}
      events={options.events}
      strength={options.strength}
      onSelect={() => {}}
    />,
  );
}

function tagsWith(markup: string, marker: string): Record<string, string>[] {
  const pattern = new RegExp(`<[a-z]+\\b[^>]*\\b${marker}="[^"]*"[^>]*>`, 'g');
  return [...markup.matchAll(pattern)].map((match) => {
    const attributes: Record<string, string> = {};
    for (const attribute of match[0].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attributes[attribute[1]!] = attribute[2]!;
    }
    return attributes;
  });
}

/** Each period group followed by its first rect, paired. */
function periodBars(markup: string): Array<{ group: Record<string, string>; width: number }> {
  return [...markup.matchAll(/<g\b[^>]*data-lords="[^"]*"[^>]*>.*?<rect\b[^>]*>/g)].map((m) => {
    const [group] = tagsWith(m[0], 'data-lords');
    const width = Number(/<rect\b[^>]*\swidth="([^"]+)"/.exec(m[0])![1]);
    return { group: group!, width };
  });
}

describe('the 120-year overview', () => {
  const markup = draw();
  const bars = periodBars(markup);

  it('draws the nine mahādaśās and nothing finer', () => {
    expect(bars).toHaveLength(9);
    expect(bars.every(({ group }) => group['data-period-level'] === '1')).toBe(true);
    expect(markup).toContain('data-visible-levels="1"');
  });

  it('makes every width true to its duration', () => {
    const perDay = bars.map(({ group, width }) => width / Number(group['data-duration-days']));
    for (const ratio of perDay) expect(ratio).toBeCloseTo(perDay[0]!, 9);
    const total = bars.reduce((sum, bar) => sum + bar.width, 0);
    expect(total).toBeCloseTo(PLOT_W, 6);
  });

  it('draws Rāhu three times as wide as the Sun', () => {
    const width = (lord: string) => bars.find(({ group }) => group['data-lords'] === lord)!.width;
    expect(width('Rahu') / width('Sun')).toBeCloseTo(
      VIMSHOTTARI_YEARS.Rahu / VIMSHOTTARI_YEARS.Sun,
      9,
    );
  });

  it('puts the cursor on the instrument’s moment', () => {
    expect(
      tagsWith(markup, 'data-layer').find((t) => t['data-layer'] === 'cursor')!['data-jd'],
    ).toBe(CURSOR.toFixed(5));
  });
});

describe('levels revealed by zoom', () => {
  const [maha, antara] = dashaChainAt(DASHAS, CURSOR);

  it('shows antardaśās inside one mahādaśā, filling it exactly', () => {
    const markup = draw({ window: { fromJd: maha!.startJd, toJd: maha!.endJd } });
    expect(markup).toContain('data-visible-levels="2"');
    const children = periodBars(markup).filter(({ group }) => group['data-period-level'] === '2');
    expect(children).toHaveLength(9);
    const days = children.reduce((sum, { group }) => sum + Number(group['data-duration-days']), 0);
    expect(days).toBeCloseTo(maha!.endJd - maha!.startJd, 6);
  });

  it('shows pratyantardaśās inside one antardaśā', () => {
    const markup = draw({ window: { fromJd: antara!.startJd, toJd: antara!.endJd } });
    expect(markup).toContain('data-visible-levels="3"');
    expect(
      periodBars(markup).filter(({ group }) => group['data-period-level'] === '3').length,
    ).toBeGreaterThanOrEqual(9);
  });

  it('zooms as far as a single week and no further', () => {
    const markup = draw({ window: { fromJd: CURSOR, toJd: CURSOR + 1 } });
    expect(Number(/data-window-days="([^"]+)"/.exec(markup)![1])).toBeCloseTo(7, 6);
    expect(markup).toContain('data-visible-levels="3"');
  });
});

describe('what is pinned to the timeline', () => {
  it('pins life events at their dates and drops those outside the window', () => {
    const inside: DashaTimelineEvent = { id: 'marriage', jd: CURSOR, label: 'marriage' };
    const outside: DashaTimelineEvent = {
      id: 'ancient',
      jd: DASHAS.periods[0]!.startJd - 10,
      label: 'x',
    };
    const markup = draw({ events: [inside, outside] });
    const pinned = tagsWith(markup, 'data-life-event');
    expect(pinned.map((tag) => tag['data-life-event'])).toEqual(['marriage']);
    expect(pinned[0]!['data-jd']).toBe(CURSOR.toFixed(5));
  });

  it('draws the context band with its named factors', () => {
    const segment: DashaStrengthSegment = {
      id: 'sat-leo',
      fromJd: CURSOR - 100,
      toJd: CURSOR + 100,
      value: 0.5,
      label: 'Saturn in Leo — 31 sarva bindus',
      factors: ['natal sarvāṣṭakavarga 31 in Leo'],
    };
    const markup = draw({ strength: [segment] });
    const [band] = tagsWith(markup, 'data-strength');
    expect(band!['data-value']).toBe('0.5000');
    expect(markup).toContain('natal sarvāṣṭakavarga 31 in Leo');
  });

  it('marks the selected period', () => {
    const lords = DASHAS.periods[2]!.lords;
    const selected = periodBars(draw({ selection: { kind: 'period', lords } })).filter(
      ({ group }) => group['data-selected'],
    );
    expect(selected.map(({ group }) => group['data-lords'])).toEqual([lords.join('.')]);
  });

  it('mirrors every drawn period in the hidden table', () => {
    const markup = draw();
    const table = markup.slice(markup.indexOf('<table'), markup.indexOf('</table>'));
    expect(table.match(/<th scope="row">/g)).toHaveLength(periodBars(markup).length);
  });
});

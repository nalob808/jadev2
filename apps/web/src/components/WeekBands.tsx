import type { DayBand, DayQuality } from '@jade/astro';
import { BAND_CAVEAT } from '@jade/interpret';

/**
 * Seven days, coloured.
 *
 * This is the most dangerous component in the app, so it is worth being
 * explicit about what makes it defensible.
 *
 * A coloured week is one step from a horoscope. What keeps this one honest is
 * that the colour is not a judgement Jade formed — it is a restatement of two
 * named classical counts, tārā bala and candra bala, which the muhūrta texts
 * themselves label favourable or otherwise. Jade computes the counts, reports
 * which band they land in, and shows both counts inline so a practitioner can
 * check them against her own reckoning in about four seconds.
 *
 * Three rules follow from that, and all three are load-bearing:
 *
 *  1. **The counts are always on screen**, not behind the disclosure. A colour
 *     with its reasoning hidden is a verdict.
 *  2. **The caveat travels with the colour.** These techniques speak to the
 *     suitability of *undertakings*, not to what will happen to a person, and
 *     the difference is the whole product.
 *  3. **A band is never a number.** No score, no percentage, no "4/5 stars" —
 *     the moment it becomes ordinal it becomes a forecast with arithmetic.
 *
 * The strip is personal, which is why it lives under "Yours" and not under
 * "The sky": tārā bala is counted from a specific natal Moon and means nothing
 * without one.
 */

const BAND_TOKEN: Record<DayBand, { line: string; wash: string; label: string }> = {
  favourable: {
    line: 'var(--band-favourable)',
    wash: 'var(--band-favourable-wash)',
    label: 'Both counts favourable',
  },
  mixed: {
    line: 'var(--band-mixed)',
    wash: 'var(--band-mixed-wash)',
    label: 'Counts disagree',
  },
  difficult: {
    line: 'var(--band-difficult)',
    wash: 'var(--band-difficult-wash)',
    label: 'Both counts difficult',
  },
};

export interface WeekDay {
  readonly key: number;
  readonly label: string;
  readonly dateLabel: string;
  readonly moonSign: string;
  readonly moonNakshatra: string;
  readonly tithi: string;
  readonly changesSign: boolean;
  readonly changesNakshatra: boolean;
  readonly nextNakshatra: string;
  readonly quality: DayQuality;
}

function Swatch({ band }: { band: DayBand }): React.ReactElement {
  const token = BAND_TOKEN[band];
  return (
    <span
      className="inline-block h-1.5 w-full"
      style={{ background: token.line }}
      role="img"
      aria-label={token.label}
    />
  );
}

export function WeekBands({ days }: { days: readonly WeekDay[] }): React.ReactElement {
  return (
    <div>
      <div className="grid gap-px border border-[var(--rule)] bg-[var(--rule)] sm:grid-cols-4 lg:grid-cols-7">
        {days.map((day, index) => {
          const token = BAND_TOKEN[day.quality.band];
          return (
            <div
              key={day.key}
              className="jade-rise flex flex-col bg-[var(--surface)]"
              style={{ '--i': index, background: token.wash } as React.CSSProperties}
            >
              <Swatch band={day.quality.band} />

              <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-2.5">
                <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
                  {day.label}
                </p>
                <p className="font-mono text-[9px] text-[var(--ink-faint)]">{day.dateLabel}</p>

                <p className="mt-1 font-display text-lg leading-tight text-[var(--ink)]">
                  {day.moonSign}
                </p>
                <p className="font-mono text-[10px] leading-snug text-[var(--ink-muted)]">
                  {day.moonNakshatra}
                </p>

                {/*
                 * The counts, inline. This is rule 1 — the colour never appears
                 * without the two numbers that produced it.
                 */}
                <dl className="mt-2 flex flex-col gap-0.5 border-t border-[var(--rule)] pt-2 font-mono text-[9.5px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[var(--ink-faint)]">Tārā</dt>
                    <dd className="text-right" style={{ color: token.line }}>
                      {day.quality.tara.name}
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="text-[var(--ink-faint)]">Candra</dt>
                    <dd className="text-right" style={{ color: token.line }}>
                      {day.quality.candra.house}
                      {ordinal(day.quality.candra.house)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-1 font-mono text-[9px] leading-snug text-[var(--ink-faint)]">
                  {day.tithi}
                </p>

                {day.changesSign || day.changesNakshatra ? (
                  <p className="mt-auto pt-1.5 font-mono text-[8.5px] uppercase leading-snug tracking-wider text-[var(--accent)]">
                    {day.changesSign ? 'enters a new sign' : null}
                    {day.changesSign && day.changesNakshatra ? ' · ' : null}
                    {day.changesNakshatra ? `→ ${day.nextNakshatra}` : null}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rule 2: the caveat travels with the colour, in prose, not a tooltip. */}
      <div className="mt-3 flex flex-wrap items-start gap-x-5 gap-y-2 border-l-2 border-[var(--rule-strong)] pl-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {(['favourable', 'mixed', 'difficult'] as const).map((band) => (
            <li key={band} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-4"
                style={{ background: BAND_TOKEN[band].line }}
                aria-hidden="true"
              />
              <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
                {BAND_TOKEN[band].label}
              </span>
            </li>
          ))}
        </ul>
        <p className="max-w-[70ch] text-[12px] leading-relaxed text-[var(--ink-muted)]">
          {BAND_CAVEAT}
        </p>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

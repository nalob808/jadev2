import type { TimingSegment } from '@jade/astro';

const RULE = 'var(--rule, #C8CEC9)';
const RULE_STRONG = 'var(--rule-strong, #A9B2AE)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const FAINT = 'var(--ink-faint, #7C8A95)';
const INK = 'var(--ink, #16222E)';
const ACCENT = 'var(--accent, #33668F)';
const SURFACE = 'var(--surface, #F9F9F4)';
const CLAY = 'var(--clay, #9E5B3A)';

/**
 * The whole window at a glance: periods across, events counted above.
 *
 * ## What the height of a bar is
 *
 * The number of named events in that period. Not a score. Not an intensity. Not
 * a forecast. Four contacts is four things to look at and the bar says four —
 * the reader decides whether four matters, which is the part Jade is not
 * entitled to do for them.
 *
 * This is why there is no colour gradient. A scale running from cool to hot
 * would be a verdict smuggled in as a rendering choice, and would be read as
 * one no matter what the caption underneath it said. Bars are one colour; the
 * only thing colour distinguishes is whether a period's *own daśā lords* are
 * among the transiting grahas, which is a fact about the chart rather than an
 * opinion about the person's life.
 *
 * ## Why the divisions are irregular
 *
 * They are antardaśās, so they are as long as they are. An axis of equal bins
 * would look tidier and would mean nothing.
 */
export function TimingStrip({
  segments,
  fromJd,
  toJd,
  nowJd,
  formatJd,
  selectedFromJd,
  onSelect,
  height = 84,
}: {
  readonly segments: readonly TimingSegment[];
  readonly fromJd: number;
  readonly toJd: number;
  /** Today, so the reader can see where they are standing. Passed in — no clock here. */
  readonly nowJd?: number;
  /** How to render a Julian Day. Supplied by the caller; the core has no locale. */
  readonly formatJd: (jdUt: number) => string;
  readonly selectedFromJd?: number | null;
  readonly onSelect?: (segment: TimingSegment) => void;
  readonly height?: number;
}): React.ReactElement {
  if (segments.length === 0) {
    return (
      <p style={{ fontSize: '13.5px', color: MUTED, margin: 0 }}>
        No daśā period falls inside this window.
      </p>
    );
  }

  const span = toJd - fromJd;
  const pct = (jd: number): number => ((jd - fromJd) / span) * 100;

  /**
   * The tallest bar sets the scale, with a floor of one.
   *
   * Without the floor, a window in which every period holds one event would
   * draw every bar at full height and imply a great deal is happening.
   */
  const ceiling = Math.max(1, ...segments.map((s) => s.eventCount));

  /** Mahādaśā blocks, merged from the antardaśās, for the label row. */
  const mahaBlocks: { lord: string; fromJd: number; toJd: number }[] = [];
  for (const segment of segments) {
    const lord = segment.lords[0] ?? '—';
    const last = mahaBlocks[mahaBlocks.length - 1];
    if (last && last.lord === lord) last.toJd = segment.toJd;
    else mahaBlocks.push({ lord, fromJd: segment.fromJd, toJd: segment.toJd });
  }

  const barArea = height - 22;

  return (
    <div>
      {/* ------------------------------------------------------- the counts */}
      <div
        style={{
          position: 'relative',
          height: `${barArea}px`,
          borderBottom: `1px solid ${RULE_STRONG}`,
        }}
      >
        {segments.map((segment) => {
          const left = pct(segment.fromJd);
          const width = Math.max(pct(segment.toJd) - left, 0.15);
          const barHeight = (segment.eventCount / ceiling) * (barArea - 4);
          const selected = selectedFromJd === segment.fromJd;
          const hasLordEvent = segment.lordEvents.length > 0;
          const title = `${segment.lords.join(' › ')} · ${formatJd(segment.fromJd)}–${formatJd(
            segment.toJd,
          )} · ${segment.eventCount} event${segment.eventCount === 1 ? '' : 's'}${
            hasLordEvent ? `, ${segment.lordEvents.length} by a lord of the period` : ''
          }`;
          return (
            <button
              key={segment.fromJd}
              type="button"
              title={title}
              aria-label={title}
              aria-pressed={selected}
              onClick={onSelect ? () => onSelect(segment) : undefined}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                bottom: 0,
                top: 0,
                padding: 0,
                border: 0,
                borderLeft: `1px solid ${RULE}`,
                background: selected ? 'var(--accent-wash, #E1E9EF)' : 'transparent',
                cursor: onSelect ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'stretch',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'block',
                  width: '100%',
                  height: `${Math.max(barHeight, segment.eventCount > 0 ? 2 : 0)}px`,
                  background: hasLordEvent ? CLAY : ACCENT,
                  opacity: selected ? 1 : 0.72,
                }}
              />
            </button>
          );
        })}

        {nowJd !== undefined && nowJd > fromJd && nowJd < toJd ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${pct(nowJd)}%`,
              top: 0,
              bottom: 0,
              width: '1px',
              background: INK,
            }}
          />
        ) : null}
      </div>

      {/* -------------------------------------------------- the mahādaśā row */}
      <div style={{ position: 'relative', height: '20px' }}>
        {mahaBlocks.map((block) => {
          const left = pct(block.fromJd);
          const width = pct(block.toJd) - left;
          return (
            <div
              key={`${block.lord}-${block.fromJd}`}
              title={`${block.lord} mahādaśā · ${formatJd(block.fromJd)}–${formatJd(block.toJd)}`}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: 0,
                bottom: 0,
                borderLeft: `1px solid ${RULE_STRONG}`,
                background: SURFACE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                fontSize: '10px',
                letterSpacing: '0.04em',
                color: MUTED,
              }}
            >
              {/* Only labelled where the label fits. A clipped name is worse
                  than none — it reads as a different graha. */}
              {width > 7 ? block.lord : ''}
            </div>
          );
        })}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '3px',
          fontSize: '10px',
          color: FAINT,
        }}
      >
        <span>{formatJd(fromJd)}</span>
        <span>
          bar height = events counted · tallest is {ceiling}
          {nowJd !== undefined && nowJd > fromJd && nowJd < toJd ? ' · the rule is today' : ''}
        </span>
        <span>{formatJd(toJd)}</span>
      </div>
    </div>
  );
}

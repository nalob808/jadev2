import type { Convergence, TimelineSegment, TransitContact } from '@jade/astro';

const RULE = 'var(--rule, #D8DEE3)';
const MUTED = 'var(--ink-muted, #4A5C6B)';
const ACCENT = 'var(--accent, #33668F)';
const CLAY = 'var(--clay, #9E5B3A)';
const SURFACE = 'var(--surface, #F4F1EA)';

/**
 * Two daśā tracks on one axis, with the named convergences marked between them.
 *
 * The design constraint is the same one that shapes every other relationship
 * surface here: a band on a timeline is a claim, so each one is labelled with
 * the rule that produced it and nothing is shaded by an unexplained intensity.
 * There is no gradient from good to bad, because the rules do not say good or
 * bad — they say *this is happening*, and the practitioner reads it.
 */
export function ConvergenceTimeline({
  segments,
  convergences,
  contacts = [],
  labelA,
  labelB,
  formatJd,
  nowJd,
}: {
  readonly segments: readonly TimelineSegment[];
  readonly convergences: readonly Convergence[];
  /** Slow transits arriving on a point that matters to the pair. */
  readonly contacts?: readonly TransitContact[];
  readonly labelA: string;
  readonly labelB: string;
  /** How to render a Julian Day as a year. Supplied by the caller — the core has no clock. */
  readonly formatJd: (jdUt: number) => string;
  /** Today, so the reader can see where they are. Passed in, never read here. */
  readonly nowJd?: number;
}): React.ReactElement {
  if (segments.length === 0) {
    return <p style={{ fontSize: '13.5px', color: MUTED }}>No overlapping period to show.</p>;
  }

  const start = segments[0]!.startJd;
  const end = segments[segments.length - 1]!.endJd;
  const span = end - start;
  const pct = (jd: number): number => ((jd - start) / span) * 100;

  /** One track: the mahādaśā changes, drawn as blocks with the lord named. */
  const track = (which: 'a' | 'b', colour: string): React.ReactElement[] => {
    const blocks: { lord: string; startJd: number; endJd: number }[] = [];
    for (const s of segments) {
      const lord = s[which][0]!;
      const last = blocks[blocks.length - 1];
      if (last && last.lord === lord) last.endJd = s.endJd;
      else blocks.push({ lord, startJd: s.startJd, endJd: s.endJd });
    }
    return blocks.map((b) => {
      const width = pct(b.endJd) - pct(b.startJd);
      return (
        <div
          key={`${which}-${b.startJd}`}
          title={`${b.lord} · ${formatJd(b.startJd)}–${formatJd(b.endJd)}`}
          style={{
            position: 'absolute',
            left: `${pct(b.startJd)}%`,
            width: `${width}%`,
            top: 0,
            bottom: 0,
            borderLeft: `1px solid ${RULE}`,
            background: SURFACE,
            color: colour,
            fontSize: '10.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {width > 5 ? b.lord : ''}
        </div>
      );
    });
  };

  return (
    <div>
      <div style={{ position: 'relative' }}>
        <p style={{ margin: '0 0 3px', fontSize: '11.5px', color: ACCENT }}>{labelA}</p>
        <div style={{ position: 'relative', height: '26px', border: `1px solid ${RULE}` }}>
          {track('a', ACCENT)}
        </div>

        <p style={{ margin: '10px 0 3px', fontSize: '11.5px', color: CLAY }}>{labelB}</p>
        <div style={{ position: 'relative', height: '26px', border: `1px solid ${RULE}` }}>
          {track('b', CLAY)}
        </div>

        {nowJd !== undefined && nowJd > start && nowJd < end ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: `${pct(nowJd)}%`,
              top: '16px',
              bottom: 0,
              width: '1px',
              background: 'var(--ink, #1A2A36)',
            }}
          />
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '4px',
          fontSize: '10.5px',
          color: MUTED,
        }}
      >
        <span>{formatJd(start)}</span>
        {nowJd !== undefined && nowJd > start && nowJd < end ? <span>now</span> : null}
        <span>{formatJd(end)}</span>
      </div>

      {contacts.length > 0 ? (
        <>
          <p style={{ margin: '16px 0 6px', fontWeight: 600, fontSize: '14px' }}>
            When the sky arrives
          </p>
          <ul style={{ margin: '0 0 4px', padding: 0, listStyle: 'none', fontSize: '13px' }}>
            {contacts.map((c) => (
              <li
                key={`${c.transiting}-${c.subject}-${c.point}-${c.jdUt}`}
                data-contact={c.transiting}
                style={{ borderTop: `1px solid ${RULE}`, padding: '7px 0' }}
              >
                <span style={{ fontWeight: 600 }}>
                  {c.transiting} on {c.subjectName}&rsquo;s{' '}
                  {c.point === 'moon' ? 'Moon' : c.point === 'venus' ? 'Venus' : 'seventh lord'}
                </span>
                <span style={{ color: MUTED }}>
                  {' '}
                  · {formatJd(c.jdUt)}
                  {c.pass > 1 ? ` · pass ${c.pass}` : ''}
                </span>
                <ul style={{ margin: '3px 0 0', paddingLeft: '18px', color: MUTED }}>
                  {c.factors.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <p style={{ margin: '16px 0 6px', fontWeight: 600, fontSize: '14px' }}>Where the two meet</p>
      {convergences.length === 0 ? (
        <p style={{ fontSize: '13px', color: MUTED, margin: 0 }}>
          None of the four rules fires over this span. That is a finding, not a gap.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: '13px' }}>
          {convergences.map((c) => (
            <li
              key={`${c.rule}-${c.subject}-${c.startJd}`}
              data-convergence={c.rule}
              style={{ borderTop: `1px solid ${RULE}`, padding: '7px 0' }}
            >
              <span style={{ fontWeight: 600 }}>{c.name}</span>
              <span style={{ color: MUTED }}>
                {' '}
                · {formatJd(c.startJd)}–{formatJd(c.endJd)}
              </span>
              <ul style={{ margin: '3px 0 0', paddingLeft: '18px', color: MUTED }}>
                {c.factors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

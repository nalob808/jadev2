import type { Panchanga } from '@jade/astro';

/**
 * The five limbs, as a reading surface rather than a data dump.
 *
 * `vara` can legitimately be absent — above the Arctic Circle the sun does not
 * rise, so the Vedic day has no start. That shows as a stated absence, never
 * as a silently substituted midnight.
 */
export function PanchangaCard({
  panchanga,
  sunrise,
  sunset,
  formatJd,
}: {
  panchanga: Panchanga;
  sunrise: number | null;
  sunset: number | null;
  /** How to render a Julian Day as a local clock time. Supplied by the caller. */
  formatJd?: (jdUt: number) => string;
}): React.ReactElement {
  const rows: Array<[string, string]> = [
    [
      'Tithi',
      `${panchanga.tithi.name} · ${panchanga.tithi.paksha === 'shukla' ? 'Śukla' : 'Kṛṣṇa'} pakṣa`,
    ],
    ['Nakṣatra', `${panchanga.nakshatra.name} · pada ${panchanga.nakshatra.pada}`],
    ['Yoga', panchanga.yoga.name],
    ['Karaṇa', panchanga.karana.name + (panchanga.karana.isFixed ? ' (fixed)' : '')],
    [
      'Vāra',
      panchanga.vara ? `${panchanga.vara.name} · ${panchanga.vara.lord}` : 'no sunrise on this day',
    ],
  ];

  return (
    <div>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '3px 14px',
          margin: 0,
          fontSize: '13.5px',
        }}
      >
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'contents' }}>
            <dt style={{ color: 'var(--ink-muted, #4A5C6B)' }}>{label}</dt>
            <dd style={{ margin: 0 }}>{value}</dd>
          </div>
        ))}
      </dl>

      {panchanga.vara?.beforeSunrise ? (
        <p
          style={{
            marginTop: '10px',
            fontSize: '12px',
            borderLeft: '2px solid var(--accent, #33668F)',
            paddingLeft: '8px',
            color: 'var(--ink-muted, #4A5C6B)',
          }}
        >
          Born before sunrise, so the vāra is the previous day&rsquo;s. Most software reads the
          civil date here and gets it wrong.
        </p>
      ) : null}

      {formatJd && sunrise !== null ? (
        <p
          style={{
            marginTop: '10px',
            fontFamily: 'var(--font-mono, ui-monospace, monospace)',
            fontSize: '11px',
            color: 'var(--ink-muted, #4A5C6B)',
          }}
        >
          sunrise {formatJd(sunrise)}
          {sunset !== null ? ` · sunset ${formatJd(sunset)}` : ''}
        </p>
      ) : null}
    </div>
  );
}

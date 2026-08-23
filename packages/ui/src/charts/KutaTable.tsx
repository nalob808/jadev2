import type { AshtakutaResult, MangalaComparison } from '@jade/astro';

const MUTED = 'var(--ink-muted, #4A5C6B)';
const RULE = 'var(--rule, #D8DEE3)';
const ACCENT = 'var(--accent, #33668F)';
const CLAY = 'var(--clay, #9E5B3A)';

/**
 * The eight kūṭas, with the reason for each score beside it.
 *
 * The total is deliberately not the headline. Aṣṭakūṭa's failure mode is a
 * number out of 36 quoted at people as a verdict on a marriage, and a big
 * figure at the top of a card is exactly how that happens. The components are
 * the reading; the total is a footnote to them.
 */
export function KutaTable({ result }: { result: AshtakutaResult }): React.ReactElement {
  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
        <tbody>
          {result.kutas.map((k) => {
            const share = k.maximum === 0 ? 0 : k.score / k.maximum;
            return (
              <tr key={k.kuta} style={{ borderTop: `1px solid ${RULE}` }}>
                <th
                  scope="row"
                  style={{
                    textAlign: 'left',
                    fontWeight: 600,
                    padding: '7px 10px 7px 0',
                    whiteSpace: 'nowrap',
                    verticalAlign: 'top',
                  }}
                >
                  {k.name}
                </th>
                <td style={{ padding: '7px 10px 7px 0', width: '72px', verticalAlign: 'top' }}>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {k.score}
                    <span style={{ color: MUTED }}> / {k.maximum}</span>
                  </span>
                </td>
                <td style={{ padding: '7px 10px 7px 0', width: '84px', verticalAlign: 'top' }}>
                  {/* A bar, not a traffic light. Nothing here is pass or fail. */}
                  <span
                    aria-hidden="true"
                    style={{
                      display: 'block',
                      height: '4px',
                      background: RULE,
                      position: 'relative',
                      marginTop: '6px',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        inset: '0 auto 0 0',
                        width: `${Math.round(share * 100)}%`,
                        background: ACCENT,
                      }}
                    />
                  </span>
                </td>
                <td style={{ padding: '7px 0', color: MUTED, verticalAlign: 'top' }}>{k.reason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <p style={{ marginTop: '12px', fontSize: '12.5px', color: MUTED }}>
        {result.total} of {result.maximum} points. A total is a summary of the eight readings above,
        not a verdict on a relationship — the components are what a practitioner works from.
      </p>
    </div>
  );
}

/**
 * Maṅgala doṣa for both people, with cancellations shown first.
 *
 * The ordering on this card is not a style choice. Of everything Jyotiṣa is
 * used for, this is the finding that does the most harm when it is handed over
 * bare, so the conditions that blunt it are printed above the placements that
 * raise it, and the mutual case is stated plainly.
 */
export function MangalaCard({
  comparison,
  nameA,
  nameB,
}: {
  comparison: MangalaComparison;
  nameA: string;
  nameB: string;
}): React.ReactElement {
  const sides = [
    { name: nameA, result: comparison.a },
    { name: nameB, result: comparison.b },
  ];

  if (!comparison.a.present && !comparison.b.present) {
    return (
      <p style={{ fontSize: '13.5px', margin: 0 }}>
        Mars falls outside the doṣa houses for both charts, read from{' '}
        {comparison.a.references.join(' and ')}.
      </p>
    );
  }

  return (
    <div style={{ fontSize: '13.5px' }}>
      {comparison.mutuallyCancelled ? (
        <p
          style={{
            margin: '0 0 12px',
            borderLeft: `2px solid ${ACCENT}`,
            paddingLeft: '10px',
          }}
        >
          <strong>Both charts carry it.</strong> The oldest and least contested cancellation of all
          is that when the doṣa stands on both sides, it does not weigh between them.
        </p>
      ) : null}

      {sides.map(({ name, result }) => (
        <div key={name} style={{ marginBottom: '14px' }}>
          <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{name}</p>
          {result.cancellations.length > 0 ? (
            <ul style={{ margin: '0 0 6px', paddingLeft: '18px' }}>
              {result.cancellations.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
          {result.present ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: '18px',
                color: result.cancellations.length > 0 ? MUTED : CLAY,
              }}
            >
              {result.occurrences.map((o) => (
                <li key={`${o.reference}-${o.house}`}>{o.description}</li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, color: MUTED }}>Mars falls outside the doṣa houses.</p>
          )}
        </div>
      ))}

      <p style={{ marginTop: '4px', fontSize: '12.5px', color: MUTED }}>
        Read from {comparison.a.references.join(' and ')}. Reading from the ascendant alone finds
        fewer occurrences than reading from the ascendant and the Moon; both are in wide use, and
        Jade records which was used.
      </p>
    </div>
  );
}

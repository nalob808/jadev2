import {
  GANA_OF_NAKSHATRA,
  NADI_OF_NAKSHATRA,
  NAKSHATRA_NAMES,
  SIGNS,
  YONI_OF_NAKSHATRA,
  taraBala,
} from '@jade/astro';
import { NAKSHATRA_CELLS, signPosition } from './nakshatraRingLayout.js';

/**
 * Everything about one nakṣatra that does not belong on the ring.
 *
 * Gaṇa, yoni and nāḍī are the matching attributes — the same tables the kūṭa
 * score reads, imported rather than restated so the panel and the match can
 * never disagree. On the ring they would be 81 more labels; here they are
 * three lines of DOM text, which the browser's own text engine shapes, so this
 * is also where the Devanagari-safe side of the typography rule lives.
 */

const GANA_LABEL = { deva: 'Deva', manushya: 'Manuṣya', rakshasa: 'Rākṣasa' } as const;
const NADI_LABEL = { adi: 'Ādi (vāta)', madhya: 'Madhya (pitta)', antya: 'Antya (kapha)' } as const;

export function NakshatraDetail({
  index,
  pada = null,
  natalMoonLongitude = null,
}: {
  /** 0–26. */
  readonly index: number;
  /** 1–4, when a pada rather than the whole nakṣatra is selected. */
  readonly pada?: number | null;
  readonly natalMoonLongitude?: number | null;
}): React.ReactElement {
  const cell = NAKSHATRA_CELLS[index]!;
  const tara =
    natalMoonLongitude === null
      ? null
      : taraBala(natalMoonLongitude, (cell.startArcmin + 400) / 60);
  const yoni = YONI_OF_NAKSHATRA[index]!;

  const rows: Array<[string, string]> = [
    ['Span', `${signPosition(cell.startArcmin)} – ${signPosition(cell.endArcmin)}`],
    ['Lord', `${cell.lord} — begins a ${cell.lord} mahādaśā for a Moon born here`],
    ['Gaṇa', GANA_LABEL[GANA_OF_NAKSHATRA[index]!]],
    ['Yoni', yoni.charAt(0).toUpperCase() + yoni.slice(1)],
    ['Nāḍī', NADI_LABEL[NADI_OF_NAKSHATRA[index]!]],
  ];
  if (tara)
    rows.push(['Tārā', `${tara.index} of 9 — ${tara.name}, “${tara.meaning}” (${tara.band})`]);

  return (
    <section
      aria-label={`${cell.name} details`}
      data-nakshatra-detail={index}
      style={{
        border: '1px solid var(--accent, #33668F)',
        background: 'var(--surface, #F9F9F4)',
        padding: '12px 14px',
      }}
    >
      <p
        style={{
          margin: 0,
          font: '600 22px/1.1 var(--font-display, "Barlow Condensed", sans-serif)',
          color: 'var(--ink, #16222E)',
        }}
      >
        {cell.name}
        {pada ? <span style={{ color: 'var(--accent, #33668F)' }}> · pada {pada}</span> : null}
      </p>
      {/* The plain transliteration, always available (CLAUDE.md). */}
      <p
        style={{
          margin: '2px 0 8px',
          font: '11px var(--font-mono, monospace)',
          color: 'var(--ink-faint, #7C8A95)',
        }}
      >
        {NAKSHATRA_NAMES[index]} · {index + 1} of 27
      </p>
      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: '4px 12px',
          fontSize: 13,
        }}
      >
        {rows.map(([term, value]) => (
          <div key={term} style={{ display: 'contents' }}>
            <dt
              style={{
                font: '10px var(--font-mono, monospace)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--ink-faint, #7C8A95)',
                alignSelf: 'baseline',
              }}
            >
              {term}
            </dt>
            <dd style={{ margin: 0, color: 'var(--ink, #16222E)' }} data-attribute={term}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <table style={{ marginTop: 10, width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <caption
          style={{
            textAlign: 'left',
            font: '10px var(--font-mono, monospace)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--ink-faint, #7C8A95)',
            paddingBottom: 4,
          }}
        >
          Padas
        </caption>
        <tbody>
          {cell.padas.map((p) => (
            <tr
              key={p.pada}
              style={{
                borderTop: '1px solid var(--rule, #C8CEC9)',
                color: p.pada === pada ? 'var(--accent, #33668F)' : 'var(--ink-muted, #4A5C6B)',
                fontWeight: p.pada === pada ? 600 : 400,
              }}
            >
              <th
                scope="row"
                style={{ textAlign: 'left', padding: '3px 0', fontWeight: 'inherit' }}
              >
                {p.pada}
              </th>
              <td>
                {signPosition(p.startArcmin)} – {signPosition(p.endArcmin)}
              </td>
              <td>navāṁśa {SIGNS[p.navamshaSign]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

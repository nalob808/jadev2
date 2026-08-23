import type { Overlay } from '@jade/astro';
import { GLYPHS } from '../tokens.js';

const MUTED = 'var(--ink-muted, #4A5C6B)';
const RULE = 'var(--rule, #D8DEE3)';
const SURFACE = 'var(--surface, #F4F1EA)';

/**
 * One person's grahas dropped into the other's houses.
 *
 * This is the synastry a Jyotiṣī actually reads: not angles between planets,
 * but which areas of the other person's life your grahas land on. Twelve rows,
 * each saying what that house is asked about, because "Saturn in their 7th"
 * only means something to someone who already knows what the 7th holds.
 */
export function OverlayGrid({
  overlays,
  title,
  caption,
}: {
  overlays: readonly Overlay[];
  title: string;
  caption: string;
}): React.ReactElement {
  const byHouse = new Map<number, Overlay[]>();
  for (const o of overlays) {
    const list = byHouse.get(o.house) ?? [];
    list.push(o);
    byHouse.set(o.house, list);
  }

  return (
    <div>
      <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '14px' }}>{title}</p>
      <p style={{ margin: '0 0 10px', fontSize: '12.5px', color: MUTED }}>{caption}</p>

      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((house) => {
          const here = byHouse.get(house) ?? [];
          return (
            <li
              key={house}
              style={{
                display: 'grid',
                gridTemplateColumns: '26px 1fr',
                gap: '10px',
                alignItems: 'baseline',
                borderTop: `1px solid ${RULE}`,
                padding: '6px 0',
                // An empty house is still information, so it keeps its row —
                // but it recedes.
                background: here.length > 0 ? 'transparent' : SURFACE,
              }}
            >
              <span
                style={{
                  fontVariantNumeric: 'tabular-nums',
                  color: MUTED,
                  fontSize: '12.5px',
                  textAlign: 'right',
                }}
              >
                {house}
              </span>
              <span style={{ fontSize: '13.5px' }}>
                {here.length > 0 ? (
                  <>
                    <span style={{ fontSize: '15px', letterSpacing: '2px' }}>
                      {here.map((o) => GLYPHS[o.graha as keyof typeof GLYPHS] ?? o.graha).join(' ')}
                    </span>
                    <span style={{ color: MUTED }}> — {here[0]!.matters}</span>
                  </>
                ) : (
                  <span style={{ color: MUTED }}>{HOUSE_LABEL[house - 1]}</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** The short form, for the rows nothing lands on. */
const HOUSE_LABEL: readonly string[] = [
  'the body',
  'what they hold',
  'courage, siblings',
  'home, mother',
  'children, learning',
  'illness, work',
  'the partner',
  'what is hidden',
  'belief, fortune',
  'standing in the world',
  'gain, networks',
  'loss, retreat',
];

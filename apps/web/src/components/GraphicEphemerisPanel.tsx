'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AstronomyEngineProvider,
  graphicEphemerisSeries,
  type GraphicEphemerisBody,
  type GraphicEphemerisFold,
  type GraphicEphemerisFrame,
  type GraphicEphemerisNatalPoint,
  type GraphicEphemerisSeries,
} from '@jade/astro';
import { GraphicEphemeris } from '@jade/ui';
import { useInstrument } from '@/lib/instrument';

/**
 * The graphic ephemeris, fed from the pure core in the browser.
 *
 * ## Why here, and why lazily
 *
 * Over two years the tracks cost about 150 ms and the crossings on one dial
 * 200–600 ms — the nakṣatra dial finds over two thousand, because every body
 * crosses every natal line each 13°20′. All three dials on the server would
 * add a second to every visit for a view many readers never scroll to. So one
 * dial is computed at a time, after the page has painted, and kept once
 * computed; switching back to a dial already seen is free.
 *
 * The span is fixed around the date the panel opened on — six months back,
 * eighteen ahead — and can be re-centred on the instrument's date. It does not
 * follow the cursor, because then dragging would re-run the whole search every
 * frame.
 */

/** Everything but the Moon, which crosses every line every day. */
const BODIES: readonly GraphicEphemerisBody[] = [
  'Sun',
  'Mars',
  'Mercury',
  'Jupiter',
  'Venus',
  'Saturn',
  'Rahu',
  'Ketu',
];
const BACK_DAYS = 180;
const AHEAD_DAYS = 545;

const PROVIDERS = new Map<string, AstronomyEngineProvider>();
function providerFor(nodeType: 'mean' | 'true'): AstronomyEngineProvider {
  let made = PROVIDERS.get(nodeType);
  if (!made) {
    made = new AstronomyEngineProvider({ nodeType });
    PROVIDERS.set(nodeType, made);
  }
  return made;
}

export function GraphicEphemerisPanel({
  frame,
  natal,
}: {
  readonly frame: GraphicEphemerisFrame;
  readonly natal: readonly GraphicEphemerisNatalPoint[];
}): React.ReactElement {
  const { jd, selection, setSelection, setJd, scrubTo, endScrub } = useInstrument();
  const [fold, setFold] = useState<GraphicEphemerisFold>('nakshatra');
  const [centre, setCentre] = useState(() => Math.round(jd));
  const [computed, setComputed] = useState<
    Partial<Record<GraphicEphemerisFold, GraphicEphemerisSeries>>
  >({});

  const span = useMemo(() => ({ fromJd: centre - BACK_DAYS, toJd: centre + AHEAD_DAYS }), [centre]);

  /**
   * A new span, frame or natal chart invalidates everything computed for the
   * old one. Keyed on content, not object identity, so a parent re-render that
   * hands over equal values does not throw away a second of work.
   */
  const inputKey = `${span.fromJd}|${frame.ayanamsa}|${frame.customAyanamsaAtJ2000 ?? ''}|${
    frame.nodeType
  }|${frame.positionBasis}|${natal.map((p) => `${p.id}:${p.longitude}`).join(',')}`;
  const [computedFor, setComputedFor] = useState(inputKey);
  if (computedFor !== inputKey) {
    setComputedFor(inputKey);
    setComputed({});
  }

  useEffect(() => {
    if (computed[fold]) return;
    let cancelled = false;
    // After paint, so the rest of the instrument is interactive first.
    const timer = setTimeout(() => {
      const series = graphicEphemerisSeries(providerFor(frame.nodeType), span, frame, {
        bodies: BODIES,
        natal,
        stepDays: 1,
        toleranceDays: 1e-4,
        folds: [fold],
      });
      if (!cancelled) setComputed((previous) => ({ ...previous, [fold]: series }));
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fold, computed, span, frame, natal]); // inputKey resets `computed`, which re-runs this

  // Any dial's tracks draw every dial; only the crossings are per dial.
  const series = computed[fold] ?? Object.values(computed)[0] ?? null;
  const outside = jd < span.fromJd || jd > span.toJd;

  if (!series) {
    return (
      <p className="border border-dashed border-[var(--rule-strong)] p-4 font-mono text-[11px] text-[var(--ink-muted)]">
        Computing the graphic ephemeris…
      </p>
    );
  }

  return (
    <div>
      <GraphicEphemeris
        series={series}
        fold={fold}
        onFoldChange={setFold}
        contacts={computed[fold]?.contacts[fold] ?? null}
        jd={jd}
        onJd={(next) => {
          setJd(next);
          endScrub();
        }}
        onScrub={scrubTo}
        selection={selection}
        onSelect={setSelection}
        frameLabel={`${frame.ayanamsa} · ${frame.nodeType} nodes · ${frame.positionBasis} positions`}
      />
      {outside ? (
        <button
          type="button"
          onClick={() => setCentre(Math.round(jd))}
          className="mt-2 border border-[var(--accent)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--accent)]"
        >
          Re-centre on the instrument&rsquo;s date
        </button>
      ) : null}
    </div>
  );
}

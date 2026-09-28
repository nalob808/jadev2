'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { unixMsFromJd } from '@jade/astro';
import { Wheel, type WheelPoint } from '@jade/ui';
import { transitRing, type RingFrame } from '@/lib/transitRing';
import type { SphereHandle, SphereStats } from './CelestialSphere';

/**
 * SPIKE — the sphere and the wheel, one moment, side by side.
 *
 * The sphere is loaded with `ssr: false`. Not because three.js touches the
 * browser at import time (current versions do not) but so its ~140 KB never
 * enters the bundle of a page that does not draw it.
 */
const CelestialSphere = dynamic(() => import('./CelestialSphere'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
      Loading the sphere…
    </div>
  ),
});

const SPAN = 3653; // ten years either side, as on the wheel's scrubber

const JUMPS = [
  { label: '−1y', days: -365 },
  { label: '−1m', days: -30 },
  { label: '−1d', days: -1 },
  { label: '+1d', days: 1 },
  { label: '+1m', days: 30 },
  { label: '+1y', days: 365 },
];

function formatDate(jdUt: number): string {
  return new Date(unixMsFromJd(jdUt)).toLocaleString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const button =
  'border border-[var(--rule)] px-2 py-1 font-mono text-[10px] uppercase tracking-wider hover:border-[var(--accent)] disabled:text-[var(--ink-faint)]';

export function SphereSpike({
  natalPoints,
  ascendant,
  ascendantSign,
  todayJd,
}: {
  readonly natalPoints: readonly WheelPoint[];
  readonly ascendant: number;
  readonly ascendantSign: number;
  readonly todayJd: number;
}): React.ReactElement {
  const [offset, setOffset] = useState(0);
  const [nodeType, setNodeType] = useState<'mean' | 'true'>('mean');
  const [showPaths, setShowPaths] = useState(true);
  const [handle, setHandle] = useState<SphereHandle | null>(null);
  const [contextState, setContextState] = useState<'ok' | 'lost'>('ok');
  const [stats, setStats] = useState<SphereStats | null>(null);

  const jd = todayJd + offset;
  // Lahiri is the only ayanāṁśa the core has fitted; stated, not defaulted.
  const frame = useMemo<RingFrame>(() => ({ ayanamsa: 'lahiri', nodeType }), [nodeType]);
  const transits = useMemo(() => transitRing(jd, frame, ascendantSign), [jd, frame, ascendantSign]);

  const onHandle = useCallback((next: SphereHandle | null) => setHandle(next), []);

  useEffect(() => {
    if (!handle) return;
    const timer = window.setInterval(() => setStats(handle.stats()), 1000);
    return () => window.clearInterval(timer);
  }, [handle]);

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--clay)]">
        Spike · not a feature · not in production
      </p>
      <h1 className="mt-1 font-display text-4xl">The sky as a sphere, beside the wheel</h1>
      <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-[var(--ink-muted)]">
        One moment, two drawings. The wheel&rsquo;s outer ring and the sphere&rsquo;s bodies come
        from the same function, so every longitude agrees. What the sphere adds is latitude (the
        stalks), the real stars behind the grahas, the equator crossing the band at the tropical
        equinox, and each planet&rsquo;s path over ±120 days. The question is whether any of that is
        worth reading.
      </p>

      {/* ----------------------------------------------------------- scrubber */}
      <section className="mt-5 border border-[var(--rule)] p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-2xl leading-none">{formatDate(jd)} UT</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
            Lahiri ayanāṁśa · {nodeType} nodes · interactive ephemeris
          </p>
        </div>
        <label className="mt-3 block">
          <span className="sr-only">Days from now</span>
          <input
            type="range"
            min={-SPAN}
            max={SPAN}
            step={1}
            value={offset}
            onChange={(event) => setOffset(Number(event.target.value))}
            className="w-full accent-[var(--accent)]"
          />
        </label>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={button}
            disabled={offset === 0}
            onClick={() => setOffset(0)}
          >
            Now
          </button>
          {JUMPS.map((jump) => (
            <button
              key={jump.label}
              type="button"
              className={button}
              onClick={() =>
                setOffset((value) => Math.max(-SPAN, Math.min(SPAN, value + jump.days)))
              }
            >
              {jump.label}
            </button>
          ))}
          <span className="mx-2 h-4 w-px bg-[var(--rule)]" />
          <button
            type="button"
            className={button}
            onClick={() => setNodeType(nodeType === 'mean' ? 'true' : 'mean')}
          >
            Nodes: {nodeType}
          </button>
          <button type="button" className={button} onClick={() => setShowPaths(!showPaths)}>
            Paths: {showPaths ? 'on' : 'off'}
          </button>
        </div>
      </section>

      {/* ------------------------------------------------------------ the two */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <section>
          <div className="relative h-[72vh] min-h-[420px] overflow-hidden border border-[var(--rule)]">
            <CelestialSphere
              jdUt={jd}
              frame={frame}
              showPaths={showPaths}
              onHandle={onHandle}
              onContextState={setContextState}
            />
            {contextState === 'lost' ? (
              <p className="absolute inset-x-0 top-3 text-center font-mono text-[11px] uppercase tracking-wider text-[var(--clay)]">
                WebGL context lost — waiting for restore
              </p>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={button}
              disabled={!handle}
              onClick={() => handle?.view('centre')}
            >
              From the centre
            </button>
            <button
              type="button"
              className={button}
              disabled={!handle}
              onClick={() => handle?.view('outside')}
            >
              From outside
            </button>
            <button
              type="button"
              className={button}
              disabled={!handle}
              onClick={() => handle?.view('pole')}
            >
              From the pole
            </button>
            <span className="mx-2 h-4 w-px bg-[var(--rule)]" />
            <button
              type="button"
              className={button}
              disabled={!handle}
              onClick={() => handle?.loseContext()}
            >
              Lose context
            </button>
            <button
              type="button"
              className={button}
              disabled={!handle}
              onClick={() => handle?.restoreContext()}
            >
              Restore
            </button>
            {stats ? (
              <span className="ml-auto font-mono text-[10px] text-[var(--ink-faint)]">
                {stats.calls} draw calls · {stats.triangles.toLocaleString()} tris ·{' '}
                {stats.points.toLocaleString()} stars · {stats.labels} labels shown
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-faint)]">
            Drag to turn, scroll to move in. The viewer is at the centre. Dashed blue: the celestial
            equator. Dashed violet: the nodal axis. Planet paths fade into the past and stay bright
            into the future.
          </p>
        </section>

        <section>
          <Wheel
            points={natalPoints}
            ascendant={ascendant}
            ascendantSign={ascendantSign}
            transits={transits}
            size={560}
            title="Reference chart, with transits at the scrubbed moment"
          />
          <p className="mt-2 text-[12px] leading-relaxed text-[var(--ink-faint)]">
            Inner ring: the public reference chart (7 Nov 2001, Ann Arbor). Outer ring: the same
            nine bodies the sphere shows, at the same moment.
          </p>
        </section>
      </div>
    </main>
  );
}

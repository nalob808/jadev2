'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  NAKSHATRA_IAST,
  SIGNS,
  nakshatraOf,
  norm360,
  unixMsFromJd,
  type PointId,
} from '@jade/astro';
import { Wheel, dms, type WheelPoint } from '@jade/ui';
import {
  InstrumentProvider,
  encodeSelection,
  useInstrument,
  type Selection,
} from '@/lib/instrument';
import { transitRing, type RingFrame } from '@/lib/transitRing';
import {
  NAMED_STARS,
  eclipticFromEquatorial,
  sphereBodies,
  starFrameShift,
  type SphereBody,
  type SphereView,
} from '@/lib/sky3d';
import { detectWebgl, useReducedMotion } from '@/lib/sphereSupport';
import { InstrumentTimeBar, useInstrumentKeys } from './InstrumentTimeBar';

/**
 * The Sphere lens — the spike, shipped as a presentation surface.
 *
 * Read docs/10-sphere-spike.md for what the sphere shows that the wheel does
 * not (latitude, the retrograde loop as geometry, the real stars) and
 * docs/briefs/17-sphere-to-production.md for why it is a lens of its own:
 * three.js is about 250 KB, and this route carries that alone.
 *
 * Everything here is a projection of the instrument's one time cursor and one
 * selection, in the instrument's own URL form (`?t=`, `?sel=`), so a link to
 * the instrument keeps the moment.
 *
 * ## One array of bodies
 *
 * `sphereBodies()` is called once per moment, here, and the same array goes to
 * the scene and to the positions table. The table is the sphere's payload in
 * text — latitude is the reason the sphere exists — and the two cannot
 * disagree because there is only one of them.
 */

const CelestialSphere = dynamic(() => import('./CelestialSphere'), {
  ssr: false,
  loading: () => <StagePlaceholder text="Loading the sphere…" />,
});

const GRAHA_IAST: Record<string, string> = {
  Sun: 'Sūrya',
  Moon: 'Candra',
  Mars: 'Maṅgala',
  Mercury: 'Budha',
  Jupiter: 'Guru',
  Venus: 'Śukra',
  Saturn: 'Śani',
  Rahu: 'Rāhu',
  Ketu: 'Ketu',
};

const VIEW_NAMES: Record<SphereView, string> = {
  lagna: 'From the pole, lagna on the left as on the wheel',
  centre: 'From the centre, where the viewer stands',
  outside: 'From outside, the armillary view',
  pole: 'From the north ecliptic pole, Aśvinī on the right',
};

const VIEW_BUTTONS: ReadonlyArray<{ view: SphereView; label: string; key: string }> = [
  { view: 'lagna', label: 'Lagna', key: '4' },
  { view: 'centre', label: 'Centre', key: '1' },
  { view: 'outside', label: 'Outside', key: '2' },
  { view: 'pole', label: 'Pole', key: '3' },
];

/** Signed ecliptic latitude, the way it is read: 4°02′ N. */
export function latitudeLabel(latitude: number): string {
  if (Math.abs(latitude) < 1 / 120) return '0°00′';
  return `${dms(Math.abs(latitude))} ${latitude > 0 ? 'N' : 'S'}`;
}

function formatDate(jd: number): string {
  return new Date(unixMsFromJd(jd)).toLocaleDateString(undefined, {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/* ---------------------------------------------------------------- caption */

/**
 * The lens the sphere is cast in, printed (CLAUDE.md #3).
 *
 * Same words the wheel uses for the settings, plus the one check a reader can
 * make against the real sky: where Citrā/Spica lands. Lahiri is defined by it
 * sitting at 180°; under any other zodiac it will not, which is true rather
 * than broken — and the caption says where it does sit, so nobody has to guess
 * which zodiac drew the stars. (Today the core has fitted Lahiri and custom
 * offsets only; the other declared modes refuse rather than guess, so a
 * custom offset is the non-Lahiri case this has to be honest about.)
 */
export function SphereFrameCaption({
  frame,
  jd,
}: {
  readonly frame: RingFrame;
  readonly jd: number;
}): React.ReactElement {
  const spica = NAMED_STARS.find((star) => star.label.includes('Spica'))!;
  const spicaLongitude = norm360(
    eclipticFromEquatorial(spica.ra, spica.dec).longitude + starFrameShift(jd, frame),
  );
  return (
    <p
      data-sphere-frame
      data-ayanamsa={frame.ayanamsa}
      data-node-type={frame.nodeType}
      className="font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[var(--ink-faint)]"
    >
      {frame.ayanamsa} ayanāṁśa
      {frame.ayanamsa === 'custom' && frame.customAyanamsaAtJ2000 !== undefined
        ? ` (${dms(frame.customAyanamsaAtJ2000)} at J2000)`
        : ''}{' '}
      · {frame.nodeType} nodes · precision class interactive · sidereal ecliptic of date ·
      Citrā/Spica at {dms(spicaLongitude % 30)} {SIGNS[Math.floor(spicaLongitude / 30)]} in this
      zodiac
    </p>
  );
}

/* ---------------------------------------------------------- the table */

/**
 * Where every graha is, with latitude — the sphere in text (WCAG 1.1.1).
 *
 * Visible by default rather than behind a disclosure: it is not an apology for
 * the canvas, it is the same data, and for anyone who cannot use the canvas it
 * is the whole page.
 */
export function SpherePositionsTable({
  bodies,
  selected = null,
  onSelect,
}: {
  readonly bodies: readonly SphereBody[];
  readonly selected?: string | null;
  readonly onSelect?: (id: PointId | null) => void;
}): React.ReactElement {
  return (
    <table className="w-full border-collapse text-[13px]" data-sphere-positions>
      <caption className="pb-2 text-left font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">
        Positions at this moment — sidereal longitude and ecliptic latitude
      </caption>
      <thead>
        <tr className="border-b border-[var(--rule-strong)] text-left font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--ink-faint)]">
          <th scope="col" className="py-1.5 pr-3 font-normal">
            Graha
          </th>
          <th scope="col" className="py-1.5 pr-3 font-normal">
            Longitude
          </th>
          <th scope="col" className="py-1.5 pr-3 font-normal">
            Latitude
          </th>
          <th scope="col" className="py-1.5 pr-3 font-normal">
            Nakṣatra · pāda
          </th>
          <th scope="col" className="py-1.5 font-normal">
            Motion
          </th>
        </tr>
      </thead>
      <tbody>
        {bodies.map((body) => {
          const nak = nakshatraOf(body.longitude);
          const isSelected = body.id === selected;
          return (
            <tr
              key={body.id}
              data-body={body.id}
              data-longitude={String(body.longitude)}
              data-latitude={String(body.latitude)}
              data-retrograde={String(body.retrograde)}
              data-nakshatra={body.nakshatra}
              data-pada={nak.pada}
              aria-selected={isSelected}
              className={`border-b border-[var(--rule)] ${isSelected ? 'bg-[var(--accent-wash)]' : ''}`}
            >
              <th scope="row" className="py-1.5 pr-3 text-left font-medium">
                <button
                  type="button"
                  onClick={() => onSelect?.(isSelected ? null : body.id)}
                  className="text-left hover:text-[var(--accent)]"
                  aria-pressed={isSelected}
                >
                  {GRAHA_IAST[body.id] ?? body.id}{' '}
                  <span className="text-[var(--ink-faint)]">{body.id}</span>
                </button>
              </th>
              <td className="py-1.5 pr-3 font-mono">
                {dms(body.longitude % 30)} {SIGNS[Math.floor(body.longitude / 30)]}
              </td>
              <td className="py-1.5 pr-3 font-mono">{latitudeLabel(body.latitude)}</td>
              <td className="py-1.5 pr-3">
                {NAKSHATRA_IAST[nak.index]} · {nak.pada}
              </td>
              <td className="py-1.5 font-mono text-[12px]">
                {body.retrograde ? (
                  <span className="text-[var(--clay)]">retrograde</span>
                ) : (
                  'direct'
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ------------------------------------------------------- the fallback */

export interface SphereNatal {
  readonly points: readonly WheelPoint[];
  readonly ascendant: number;
  readonly ascendantSign: number;
}

/**
 * What a reader without WebGL gets: one plain sentence, the 2D wheel with the
 * transits of the same moment, and the positions table. Useful, not a blank
 * rectangle.
 */
export function SphereFallback({
  natal,
  transits,
  bodies,
  reason,
}: {
  readonly natal: SphereNatal;
  readonly transits: readonly WheelPoint[];
  readonly bodies: readonly SphereBody[];
  readonly reason: 'no-webgl' | 'lost' | 'crashed';
}): React.ReactElement {
  const sentence =
    reason === 'no-webgl'
      ? 'The 3D view needs WebGL, which this browser does not offer, so here is the wheel for the same moment. The positions below carry the latitude the sphere would have shown.'
      : reason === 'lost'
        ? 'The 3D view lost its graphics context and did not recover, so here is the wheel for the same moment. Reloading the page may bring the sphere back.'
        : 'The 3D view stopped with an error, so here is the wheel for the same moment. Reloading the page may bring the sphere back.';
  return (
    <div data-sphere-fallback={reason} className="flex flex-col gap-4">
      <p className="border-l-2 border-[var(--clay)] py-1 pl-3 text-[13px] leading-relaxed text-[var(--ink-muted)]">
        {sentence}
      </p>
      <Wheel
        points={natal.points}
        ascendant={natal.ascendant}
        ascendantSign={natal.ascendantSign}
        transits={transits}
        size={560}
        title="The wheel, with transits at this moment"
      />
      <SpherePositionsTable bodies={bodies} />
    </div>
  );
}

/** Falls back to the wheel if the scene throws, instead of white-screening. */
class SphereErrorBoundary extends Component<
  { readonly fallback: ReactNode; readonly children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: unknown): void {
    console.error('sphere: scene crashed, showing the wheel instead', error);
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function StagePlaceholder({ text }: { readonly text: string }): React.ReactElement {
  return (
    <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
      {text}
    </div>
  );
}

/* -------------------------------------------------------------- the lens */

export interface SphereLensProps {
  readonly subjectId: string;
  readonly todayJd: number;
  readonly natal: SphereNatal;
  readonly frame: RingFrame;
  /** The settings in the wheel's words, beside the frame caption. */
  readonly settingsLabel: string;
}

export function SphereLens(props: SphereLensProps): React.ReactElement {
  return (
    <InstrumentProvider todayJd={props.todayJd}>
      <SphereLensBody {...props} />
    </InstrumentProvider>
  );
}

/** Seconds a lost context is given to come back before the wheel takes over. */
const LOST_GRACE_MS = 2500;

function SphereLensBody({
  subjectId,
  natal,
  frame,
  settingsLabel,
}: SphereLensProps): React.ReactElement {
  const { jd, selection, setSelection, isDragging } = useInstrument();
  const onKeyDown = useInstrumentKeys();
  const reducedMotion = useReducedMotion();

  /** Decided in the browser, before the scene is mounted. */
  const [stage, setStage] = useState<'checking' | '3d' | 'no-webgl' | 'lost'>('checking');
  useEffect(() => setStage(detectWebgl() ? '3d' : 'no-webgl'), []);

  const lostTimer = useRef<number | null>(null);
  const onContextState = (state: 'ok' | 'lost'): void => {
    if (lostTimer.current !== null) window.clearTimeout(lostTimer.current);
    lostTimer.current = null;
    if (state === 'lost') {
      lostTimer.current = window.setTimeout(() => setStage('lost'), LOST_GRACE_MS);
    }
  };
  useEffect(
    () => () => {
      if (lostTimer.current !== null) window.clearTimeout(lostTimer.current);
    },
    [],
  );

  const bodies = useMemo(() => sphereBodies(jd, frame), [jd, frame]);
  const transits = useMemo(
    () => transitRing(jd, frame, natal.ascendantSign),
    [jd, frame, natal.ascendantSign],
  );
  const highlight = selection?.kind === 'graha' ? selection.id : null;
  const selectGraha = (id: PointId | null): void => setSelection(id ? { kind: 'graha', id } : null);

  const [handle, setHandle] = useState<{ view(kind: SphereView): void } | null>(null);
  const [showPaths, setShowPaths] = useState(true);
  const [viewAnnouncement, setViewAnnouncement] = useState('');

  /**
   * The date, announced when the cursor settles — not on every frame of a
   * drag, which would be a stream of noise to a screen reader. The same
   * pattern as TransitScrubber.
   */
  const [dateAnnouncement, setDateAnnouncement] = useState('');
  useEffect(() => {
    if (!isDragging) setDateAnnouncement(`Showing ${formatDate(jd)}`);
  }, [jd, isDragging]);

  const fallback = (reason: 'no-webgl' | 'lost' | 'crashed') => (
    <SphereFallback natal={natal} transits={transits} bodies={bodies} reason={reason} />
  );

  return (
    <div className="flex flex-col gap-4" role="region" aria-label="Sphere" onKeyDown={onKeyDown}>
      <style>{`
        .jade-sphere-canvas { outline: none; }
        .jade-sphere-canvas:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
      `}</style>
      <InstrumentTimeBar />
      <p aria-live="polite" className="sr-only">
        {dateAnnouncement}
      </p>
      <p aria-live="polite" className="sr-only">
        {viewAnnouncement}
      </p>

      <SphereStage
        stage={stage}
        fallback={fallback}
        scene={
          <SphereErrorBoundary fallback={fallback('crashed')}>
            <div className="relative h-[70vh] min-h-[360px] overflow-hidden border border-[var(--rule)]">
              <CelestialSphere
                jdUt={jd}
                frame={frame}
                bodies={bodies}
                showPaths={showPaths}
                ascendant={natal.ascendant}
                initialView="lagna"
                reducedMotion={reducedMotion}
                highlight={highlight}
                onHandle={setHandle}
                onContextState={onContextState}
                onView={(view) => setViewAnnouncement(`View: ${VIEW_NAMES[view]}`)}
              />
            </div>
            <div
              role="group"
              aria-label="Sphere views"
              className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider"
            >
              {VIEW_BUTTONS.map((button) => (
                <button
                  key={button.view}
                  type="button"
                  disabled={!handle}
                  onClick={() => handle?.view(button.view)}
                  title={VIEW_NAMES[button.view]}
                  className="border border-[var(--rule)] px-2 py-1 hover:border-[var(--accent)] disabled:text-[var(--ink-faint)]"
                >
                  {button.label} · {button.key}
                </button>
              ))}
              <button
                type="button"
                aria-pressed={showPaths}
                onClick={() => setShowPaths(!showPaths)}
                className="border border-[var(--rule)] px-2 py-1 hover:border-[var(--accent)]"
              >
                Paths ±120 days: {showPaths ? 'on' : 'off'}
              </button>
              <InstrumentLink subjectId={subjectId} selection={selection} jdOffsetFrom={jd} />
            </div>
            <p className="text-[12px] leading-relaxed text-[var(--ink-muted)]">
              Drag to turn, pinch or scroll to move in; with the sky focused, arrow keys turn it, +
              and − zoom, 1–4 choose a view and Escape leaves. Stalks drop each graha to the
              ecliptic: their length is its latitude. Dashed blue is the celestial equator, dashed
              violet the nodal axis; paths fade into the past.
            </p>
          </SphereErrorBoundary>
        }
      />

      <SphereFrameCaption frame={frame} jd={jd} />
      <p className="-mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--ink-faint)]">
        {settingsLabel}
      </p>

      {stage === '3d' || stage === 'checking' ? (
        <SpherePositionsTable bodies={bodies} selected={highlight} onSelect={selectGraha} />
      ) : null}
    </div>
  );
}

/**
 * The stage: the scene, or the fallback, or a placeholder while the browser
 * is being checked. Pure, so the no-WebGL path can be rendered in a test.
 */
export function SphereStage({
  stage,
  scene,
  fallback,
}: {
  readonly stage: 'checking' | '3d' | 'no-webgl' | 'lost';
  readonly scene: ReactNode;
  readonly fallback: (reason: 'no-webgl' | 'lost') => ReactNode;
}): React.ReactElement {
  if (stage === 'no-webgl' || stage === 'lost') return <>{fallback(stage)}</>;
  if (stage === 'checking') {
    return (
      <div className="h-[70vh] min-h-[360px] border border-[var(--rule)]">
        <StagePlaceholder text="Checking for 3D support…" />
      </div>
    );
  }
  return <>{scene}</>;
}

/** To the instrument, keeping the moment and the selection. */
function InstrumentLink({
  subjectId,
  selection,
  jdOffsetFrom,
}: {
  readonly subjectId: string;
  readonly selection: Selection | null;
  readonly jdOffsetFrom: number;
}): React.ReactElement {
  const { todayJd } = useInstrument();
  const query = new URLSearchParams();
  const days = Math.round(jdOffsetFrom - todayJd);
  if (days !== 0) query.set('t', String(days));
  if (selection) query.set('sel', encodeSelection(selection));
  const suffix = query.toString();
  return (
    <Link
      href={`/people/${subjectId}/instrument${suffix ? `?${suffix}` : ''}`}
      className="ml-auto border border-[var(--rule)] px-2 py-1 text-[var(--accent)] hover:border-[var(--accent)]"
    >
      Same moment in the instrument →
    </Link>
  );
}

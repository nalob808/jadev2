'use client';

import { useMemo, useState } from 'react';
import {
  ayanamsa,
  jdTtFromJdUt,
  NAKSHATRA_IAST,
  nakshatraOf,
  SIGNS,
  vimshottari,
  dashaChainAt,
  unixMsFromJd,
  type AvContributor,
  type SarvaTransitSegment,
  type VimshottariResult,
  type YearLength,
} from '@jade/astro';
import {
  dms,
  ContributorMultiples,
  DashaTimeline,
  KakshaBand,
  SarvaProfile,
  type KakshaRow,
  NakshatraDetail,
  type DashaStrengthSegment,
  type DashaTimelineEvent,
  NakshatraRing,
  Wheel,
  type InstrumentMark,
  type WheelAspect,
  type WheelPoint,
} from '@jade/ui';
import { InstrumentProvider, useInstrument, type Selection } from '@/lib/instrument';
import { transitRing, type RingFrame } from '@/lib/transitRing';
import { InstrumentTimeBar, useInstrumentKeys } from './InstrumentTimeBar';
import { GraphicEphemerisPanel } from './GraphicEphemerisPanel';

/**
 * Every visual-system view on one screen, all projections of one instrument.
 *
 * None of the views below knows another exists. Each reads `jd` and
 * `selection` from the instrument and writes them back through it; the wheel
 * and the ring agree about Saturn because they are both looking at the same
 * URL, not because anything wires them together.
 *
 * Only transits recompute as the cursor moves — the natal chart is the birth
 * moment's and arrives from the server already computed, exactly as it does
 * for the transit scrubber.
 */

export interface InstrumentNatal {
  readonly points: readonly WheelPoint[];
  readonly aspects: readonly WheelAspect[];
  readonly ascendant: number;
  readonly ascendantSign: number;
  readonly sarva: readonly number[];
  readonly moonLongitude: number;
  readonly birthJd: number;
  readonly yearLength: YearLength;
}

export interface InstrumentWorkspaceProps {
  readonly todayJd: number;
  readonly natal: InstrumentNatal;
  readonly frame: RingFrame;
  /** Apparent or true positions — from the settings profile, never assumed. */
  readonly positionBasis: 'apparent' | 'true';
  /** "Lahiri", "mean nodes", "whole sign" — the settings in words. */
  readonly settingsLabel: string;
  /** Saturn's sign over the lifetime, scored by sarva — the timeline's context band. */
  readonly saturnBand: readonly SarvaTransitSegment[];
  /** Dated life events to pin on the timeline. */
  readonly events: readonly DashaTimelineEvent[];
  /** Sarva bindus decomposed by the contributor that gave them. */
  readonly bySource: Record<AvContributor, readonly number[]>;
  readonly kakshaRows: readonly KakshaRow[];
  readonly kakshaWindow: { readonly fromJd: number; readonly toJd: number };
}

export function InstrumentWorkspace(props: InstrumentWorkspaceProps): React.ReactElement {
  return (
    <InstrumentProvider todayJd={props.todayJd}>
      <Instrument {...props} />
    </InstrumentProvider>
  );
}

function Instrument({
  natal,
  frame,
  settingsLabel,
  saturnBand,
  events,
  bySource,
  kakshaRows,
  kakshaWindow,
  positionBasis,
}: InstrumentWorkspaceProps): React.ReactElement {
  const { jd, selection, setSelection, setJd, scrubTo, endScrub } = useInstrument();
  const onKeyDown = useInstrumentKeys();

  const transits = useMemo(
    () => transitRing(jd, frame, natal.ascendantSign),
    [jd, frame, natal.ascendantSign],
  );

  const natalMarks: InstrumentMark[] = useMemo(
    () =>
      natal.points
        .filter((point) => point.id !== 'Midheaven')
        .map((point) => ({
          id: point.id as InstrumentMark['id'],
          longitude: point.longitude,
          retrograde: point.retrograde,
        })),
    [natal.points],
  );
  const transitMarks: InstrumentMark[] = useMemo(
    () =>
      transits.map((point) => ({
        id: point.id as InstrumentMark['id'],
        longitude: point.longitude,
        retrograde: point.retrograde,
      })),
    [transits],
  );

  /**
   * The frame, stated on screen (brief §6): the ayanāṁśa and its value for the
   * instrument's date — it drifts by about 50″ a year, so a single number for
   * every date would be quietly wrong — and what is and is not drawn.
   */
  const ayanamsaValue = ayanamsa(jdTtFromJdUt(jd), {
    mode: frame.ayanamsa,
    customAtJ2000: frame.customAyanamsaAtJ2000,
    includeNutation: true,
  });
  const frameLabel = `sidereal, ${frame.ayanamsa} ${dms(ayanamsaValue)} on this date · ${frame.nodeType} nodes · ecliptic longitude only, latitude not drawn`;

  /** Built once from the birth Moon; moving the cursor only asks it a new question. */
  const dashas = useMemo(
    () =>
      vimshottari(natal.moonLongitude, natal.birthJd, { levels: 3, yearLength: natal.yearLength }),
    [natal.moonLongitude, natal.birthJd, natal.yearLength],
  );
  /**
   * Open on the mahādaśā running when the page loaded, where a reader always
   * starts. Read once: the timeline's own zoom belongs to the reader after that.
   */
  const [openingJd] = useState(jd);
  const initialMaha = useMemo(() => dashaChainAt(dashas, openingJd)[0], [dashas, openingJd]);
  const strength: DashaStrengthSegment[] = useMemo(() => {
    const most = Math.max(...natal.sarva);
    return saturnBand.map((segment) => ({
      id: `${segment.fromJd}`,
      fromJd: segment.fromJd,
      toJd: segment.toJd,
      value: segment.bindus / most,
      label: `Saturn in ${segment.sign} — ${segment.bindus} sarva bindus`,
      factors: [
        `natal sarvāṣṭakavarga ${segment.bindus} in ${segment.sign} (chart maximum ${most})`,
        segment.enteredRetrograde ? 'entered by retrograde motion' : 'entered direct',
      ],
    }));
  }, [saturnBand, natal.sarva]);

  /** Memoised: the ephemeris panel recomputes when these change identity. */
  const ephemerisFrame = useMemo(() => ({ ...frame, positionBasis }), [frame, positionBasis]);
  const ephemerisNatal = useMemo(
    () =>
      natal.points
        .filter((point) => point.id !== 'Midheaven')
        .map((point) => ({ id: point.id as InstrumentMark['id'], longitude: point.longitude })),
    [natal.points],
  );

  const wheelFocus = selection?.kind === 'graha' ? selection.id : null;

  return (
    <div
      className="flex flex-col gap-5"
      role="region"
      aria-label="Instrument"
      onKeyDown={onKeyDown}
    >
      <InstrumentTimeBar />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_19rem]">
        <section aria-label="Wheel" className="min-w-0">
          <Heading>Wheel · natal inside, transits outside</Heading>
          <Wheel
            points={natal.points}
            aspects={natal.aspects}
            transits={transits}
            ascendant={natal.ascendant}
            ascendantSign={natal.ascendantSign}
            sarva={natal.sarva}
            focus={wheelFocus}
            onFocusChange={(id) =>
              setSelection(id ? { kind: 'graha', id: id as InstrumentMark['id'] } : null)
            }
            size={640}
          />
        </section>

        <section aria-label="Nakṣatra ring" className="min-w-0">
          <Heading>Nakṣatra ring</Heading>
          <NakshatraRing
            natal={natalMarks}
            transits={transitMarks}
            natalMoonLongitude={natal.moonLongitude}
            selection={selection}
            onSelect={setSelection}
            rotation={natal.ascendant}
            frameLabel={`${frame.ayanamsa} · ${frame.nodeType} nodes`}
            ayanamsaValue={ayanamsaValue}
            size={640}
          />
        </section>

        <aside aria-label="Selection" className="min-w-0">
          <SelectionPanel
            selection={selection}
            dashas={dashas}
            natal={natalMarks}
            transits={transitMarks}
            natalMoonLongitude={natal.moonLongitude}
          />
          <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-[var(--ink-faint)]">
            {settingsLabel}
          </p>
          <p className="mt-1 font-mono text-[10px] leading-relaxed text-[var(--ink-muted)]">
            Frame: {frameLabel}
          </p>
        </aside>
      </div>

      <section aria-label="Graphic ephemeris" className="min-w-0">
        <Heading>Graphic ephemeris · transits against natal points</Heading>
        <GraphicEphemerisPanel frame={ephemerisFrame} natal={ephemerisNatal} />
      </section>

      <section aria-label="Aṣṭakavarga" className="min-w-0">
        <Heading>Aṣṭakavarga · where the strength is, and who gives it</Heading>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
          <SarvaProfile
            sarva={natal.sarva}
            rotation={natal.ascendant}
            ascendantSign={natal.ascendantSign}
            selection={selection}
            onSelect={setSelection}
          />
          <ContributorMultiples
            bySource={bySource}
            ascendantSign={natal.ascendantSign}
            selection={selection}
            onSelect={setSelection}
          />
        </div>
        <div className="mt-4">
          <Heading>Kakṣā transits · Saturn and Jupiter</Heading>
          <KakshaBand rows={kakshaRows} range={kakshaWindow} jd={jd} onJd={setJd} />
        </div>
      </section>

      <section aria-label="Daśā timeline" className="min-w-0">
        <Heading>Vimśottarī daśā · Saturn&rsquo;s transit by sarva bindus beneath</Heading>
        <DashaTimeline
          dashas={dashas}
          jd={jd}
          selection={selection}
          onSelect={setSelection}
          onScrub={scrubTo}
          onScrubEnd={(next) => {
            setJd(next);
            endScrub();
          }}
          events={events}
          strength={strength}
          initialWindow={
            initialMaha ? { fromJd: initialMaha.startJd, toJd: initialMaha.endJd } : undefined
          }
          frameLabel="context band: Saturn's sign, height = natal sarva bindus in it"
        />
      </section>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <h2 className="mb-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
      {children}
    </h2>
  );
}

/** Whatever is selected, described — the one panel every view writes into. */
function SelectionPanel({
  selection,
  dashas,
  natal,
  transits,
  natalMoonLongitude,
}: {
  selection: Selection | null;
  dashas: VimshottariResult;
  natal: readonly InstrumentMark[];
  transits: readonly InstrumentMark[];
  natalMoonLongitude: number;
}): React.ReactElement {
  if (!selection) {
    return (
      <div className="border border-dashed border-[var(--rule-strong)] p-4 text-[13px] leading-relaxed text-[var(--ink-muted)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-faint)]">
          Nothing selected
        </p>
        <p className="mt-1.5">
          Select a graha on the wheel, or a nakṣatra or pada on the ring. Every view follows the
          same selection, and the date above moves them all.
        </p>
      </div>
    );
  }

  if (selection.kind === 'nakshatra' || selection.kind === 'pada') {
    return (
      <NakshatraDetail
        index={selection.kind === 'nakshatra' ? selection.index : selection.nakshatra}
        pada={selection.kind === 'pada' ? selection.pada : null}
        natalMoonLongitude={natalMoonLongitude}
      />
    );
  }

  if (selection.kind === 'graha') {
    const describe = (mark: InstrumentMark | undefined): string => {
      if (!mark) return '—';
      const nak = nakshatraOf(mark.longitude);
      return `${dms(mark.longitude % 30)} ${SIGNS[Math.floor(mark.longitude / 30)]} · ${NAKSHATRA_IAST[nak.index]} ${nak.pada}${mark.retrograde ? ' · retrograde' : ''}`;
    };
    return (
      <div className="border border-[var(--accent)] bg-[var(--surface)] p-4">
        <p className="font-display text-2xl leading-none">{selection.id}</p>
        <dl className="mt-3 grid gap-2 text-[13px]">
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Natal
            </dt>
            <dd>{describe(natal.find((mark) => mark.id === selection.id))}</dd>
          </div>
          <div>
            <dt className="font-mono text-[9px] uppercase tracking-[0.13em] text-[var(--ink-faint)]">
              Transit, on this date
            </dt>
            <dd>{describe(transits.find((mark) => mark.id === selection.id))}</dd>
          </div>
        </dl>
      </div>
    );
  }

  if (selection.kind === 'period') {
    const period = findPeriod(dashas, selection.lords);
    return (
      <div className="border border-[var(--accent)] bg-[var(--surface)] p-4">
        <p className="font-display text-2xl leading-none">{selection.lords.join('–')}</p>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.13em] text-[var(--ink-faint)]">
          {['mahādaśā', 'antardaśā', 'pratyantardaśā'][selection.lords.length - 1] ?? 'period'}
        </p>
        {period ? (
          <p className="mt-2 text-[13px]">
            {isoDate(period.startJd)} → {isoDate(period.endJd)} ·{' '}
            {((period.endJd - period.startJd) / 365.25).toFixed(2)} years
          </p>
        ) : null}
        <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
          The ring lights the three nakṣatras {selection.lords[selection.lords.length - 1]} rules.
        </p>
      </div>
    );
  }

  const label = selection.kind === 'sign' ? SIGNS[selection.signIndex] : `House ${selection.house}`;
  return (
    <div className="border border-[var(--accent)] bg-[var(--surface)] p-4">
      <p className="font-display text-2xl leading-none">{label}</p>
    </div>
  );
}

function isoDate(jd: number): string {
  return new Date(unixMsFromJd(jd)).toISOString().slice(0, 10);
}

/** The period in the tree with exactly these lords, outermost first. */
function findPeriod(dashas: VimshottariResult, lords: readonly string[]) {
  let level = dashas.periods;
  let found: (typeof dashas.periods)[number] | undefined;
  for (const lord of lords) {
    found = level.find((period) => period.lord === lord);
    if (!found) return undefined;
    level = found.children ?? [];
  }
  return found;
}

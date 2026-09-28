'use client';

import { useMemo } from 'react';
import {
  ayanamsa,
  jdTtFromJdUt,
  NAKSHATRA_IAST,
  nakshatraOf,
  SIGNS,
  type YearLength,
} from '@jade/astro';
import {
  dms,
  NakshatraDetail,
  NakshatraRing,
  Wheel,
  type InstrumentMark,
  type WheelAspect,
  type WheelPoint,
} from '@jade/ui';
import { InstrumentProvider, useInstrument, type Selection } from '@/lib/instrument';
import { transitRing, type RingFrame } from '@/lib/transitRing';
import { InstrumentTimeBar, useInstrumentKeys } from './InstrumentTimeBar';

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
  /** "Lahiri", "mean nodes", "whole sign" — the settings in words. */
  readonly settingsLabel: string;
}

export function InstrumentWorkspace(props: InstrumentWorkspaceProps): React.ReactElement {
  return (
    <InstrumentProvider todayJd={props.todayJd}>
      <Instrument {...props} />
    </InstrumentProvider>
  );
}

function Instrument({ natal, frame, settingsLabel }: InstrumentWorkspaceProps): React.ReactElement {
  const { jd, selection, setSelection } = useInstrument();
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
  natal,
  transits,
  natalMoonLongitude,
}: {
  selection: Selection | null;
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

  const label =
    selection.kind === 'sign'
      ? SIGNS[selection.signIndex]
      : selection.kind === 'house'
        ? `House ${selection.house}`
        : `${selection.lords.join('–')} period`;
  return (
    <div className="border border-[var(--accent)] bg-[var(--surface)] p-4">
      <p className="font-display text-2xl leading-none">{label}</p>
    </div>
  );
}

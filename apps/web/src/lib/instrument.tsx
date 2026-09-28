'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { createInstrumentStore, type InstrumentStore, type Selection } from './instrumentStore';

export type { InstrumentState, Selection } from './instrumentStore';
export { encodeSelection, parseSelection, sameSelection } from './instrumentStore';

/**
 * The shared instrument: one time cursor and one selection, every view a
 * projection of both.
 *
 * This is the thing the rest of the visual system rests on. The market leader's
 * chart is a static SVG inside an `<object>` that cannot talk to the page it
 * sits on; every good interactive instrument surveyed — Stellarium's reticle,
 * NASA Eyes' scrubber, in-the-sky.org's shared date — has a single piece of
 * global state instead. Clicking a crossing in the ephemeris sets `jd` here,
 * and the wheel, the ring and the daśā timeline all move because they all read
 * it; none of them knows the others exist.
 *
 * ## Both values live in the URL
 *
 * `?t=` (whole days from today) and `?sel=` (`graha:Saturn`, `nak:12`,
 * `pada:12.3`, `period:Saturn.Mercury`). Same three reasons as the wheel's
 * `?g=`: a reload keeps the view, back walks it, and a link carries it.
 *
 * ## A local override during drag
 *
 * Writing the URL at 60 fps would leave a hundred history entries behind one
 * gesture. `scrubTo` holds a live value in memory and `endScrub` commits it
 * once — the same shape `TransitScrubber` already uses.
 *
 * Nothing here reads a clock. `todayJd` is a prop, supplied by the page.
 */

interface InstrumentApi {
  readonly jd: number;
  readonly selection: Selection | null;
  readonly isDragging: boolean;
  readonly todayJd: number;
  setJd(jd: number): void;
  setSelection(selection: Selection | null): void;
  /** Live value during a drag; nothing is written until `endScrub`. */
  scrubTo(jd: number): void;
  endScrub(): void;
}

const InstrumentContext = createContext<InstrumentStore | null>(null);

export function InstrumentProvider({
  todayJd,
  children,
}: {
  /** Today, as a Julian Day, from the page's clock. This component has none. */
  readonly todayJd: number;
  readonly children: ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const params = useSearchParams();

  /**
   * The adapter mirrors the query it last wrote and reads that back, so a
   * selection made and immediately read never sees the old URL for a render.
   */
  const mirror = useRef(params.toString());
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  const store = useMemo(
    () =>
      createInstrumentStore(
        {
          read: () => mirror.current,
          push: (query) => {
            mirror.current = query;
            const path = pathRef.current;
            /*
             * Native history, not `router.push`. Since Next 14.1 `pushState`
             * updates `useSearchParams` without a server round trip; the
             * router would re-render the whole (force-dynamic) page on the
             * server for every click on a nakṣatra — re-running the chart
             * load and handing every view fresh props for nothing. Nothing on
             * the server reads `?t=` or `?sel=`, so there is nothing to fetch.
             * It also never scrolls, which is what a selection must not do.
             */
            window.history.pushState(null, '', query ? `${path}?${query}` : path);
          },
        },
        todayJd,
      ),
    [todayJd],
  );

  // Back, forward and followed links change the URL underneath the store.
  const external = params.toString();
  useEffect(() => {
    if (external !== mirror.current) {
      mirror.current = external;
      store.syncFromUrl();
    }
  }, [external, store]);

  return <InstrumentContext.Provider value={store}>{children}</InstrumentContext.Provider>;
}

export function useInstrument(): InstrumentApi {
  const store = useContext(InstrumentContext);
  if (!store) throw new Error('useInstrument must be used inside <InstrumentProvider>');
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return {
    jd: state.jd,
    selection: state.selection,
    isDragging: state.isDragging,
    todayJd: store.todayJd,
    setJd: store.setJd,
    setSelection: store.setSelection,
    scrubTo: store.scrubTo,
    endScrub: store.endScrub,
  };
}

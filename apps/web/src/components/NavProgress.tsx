'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * A progress bar across the top of the window during navigation.
 *
 * The problem it solves is specific to the App Router. Clicking a `<Link>` to
 * a server-rendered route starts a fetch and paints *nothing* until the server
 * responds — the old page simply sits there. There is no browser tab spinner
 * either, because this is a client-side navigation rather than a document
 * load. So the honest read of the screen is that the click did nothing, and
 * the reasonable response is to click again.
 *
 * `loading.tsx` fixes the body of the page. This fixes the moment before it,
 * and covers server actions too, which navigate without touching a segment
 * boundary at all.
 *
 * Deliberately hand-rolled rather than pulling in nprogress: it is sixty lines
 * of state, and the alternative ships a jQuery-era global singleton that has
 * to be told about React's lifecycle by hand.
 */
export function NavProgress(): React.ReactElement | null {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = (): void => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  };

  // Start on anything that will navigate.
  useEffect(() => {
    const begin = (): void => {
      clearTimers();
      setVisible(true);
      setWidth(8);
      // Ease towards, never reaching, the end. A bar that sits at 100% while
      // the page is still loading is a worse lie than one that sits at 80%.
      const steps: Array<[number, number]> = [
        [90, 20],
        [140, 38],
        [280, 55],
        [520, 68],
        [900, 76],
        [1500, 82],
        [2600, 88],
      ];
      for (const [delay, value] of steps) {
        timers.current.push(setTimeout(() => setWidth(value), delay));
      }
    };

    const onClick = (event: MouseEvent): void => {
      if (event.defaultPrevented) return;
      // Modified clicks open elsewhere; this tab is not going anywhere.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.('a');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#')) return;

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      // Same page, including the same query — nothing will change.
      if (
        destination.pathname === window.location.pathname &&
        destination.search === window.location.search
      ) {
        return;
      }

      begin();
    };

    // Server actions navigate without crossing a segment boundary, so
    // `loading.tsx` never fires for them and this is the only feedback.
    const onSubmit = (event: SubmitEvent): void => {
      if (!event.defaultPrevented) begin();
    };

    document.addEventListener('click', onClick, { capture: true });
    document.addEventListener('submit', onSubmit, { capture: true });
    return () => {
      document.removeEventListener('click', onClick, { capture: true });
      document.removeEventListener('submit', onSubmit, { capture: true });
      clearTimers();
    };
  }, []);

  // Finish when the route actually changes.
  useEffect(() => {
    clearTimers();
    setWidth(100);
    const hide = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 260);
    return () => clearTimeout(hide);
  }, [pathname, searchParams]);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        insetInlineStart: 0,
        top: 0,
        zIndex: 60,
        height: '2px',
        width: `${width}%`,
        background: 'var(--accent)',
        transition: 'width 240ms ease-out, opacity 200ms ease-out',
        opacity: width >= 100 ? 0 : 1,
        pointerEvents: 'none',
      }}
    />
  );
}

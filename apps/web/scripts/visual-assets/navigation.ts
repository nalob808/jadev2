/** Browser-only adapter for the portable asset preview; production uses Next. */
import { useMemo, useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
window.addEventListener('popstate', notify);
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const snapshot = () => window.location.search;
const router = {
  push(url: string) { window.history.pushState(null, '', url); notify(); },
  replace(url: string) { window.history.replaceState(null, '', url); notify(); },
};

export function useRouter() { return router; }
export function usePathname() { return window.location.pathname; }
export function useSearchParams() {
  const query = useSyncExternalStore(subscribe, snapshot, snapshot);
  return useMemo(() => new URLSearchParams(query), [query]);
}

import { useSyncExternalStore } from 'react';

const QUERY = '(max-width: 639px)';

const subscribe = (notify: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => undefined;
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', notify);
  return () => list.removeEventListener('change', notify);
};

const snapshot = () => typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;

/** True under Tailwind's `sm` breakpoint; lists switch from a table to cards there. */
export const useIsPhone = (): boolean => useSyncExternalStore(subscribe, snapshot, () => false);

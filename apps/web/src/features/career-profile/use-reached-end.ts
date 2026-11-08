import { useEffect, useState, type RefObject } from 'react';

/**
 * True once the element (a marker at the end of a section) has come into view, i.e. the reader scrolled to the end of the section (a section
 * shorter than the screen is at its end at once). It starts again when `key` changes (another section). Without an IntersectionObserver
 * (an old browser, a test) the end counts as reached: nobody is locked out by a browser that cannot watch.
 */
export function useReachedEnd(marker: RefObject<Element | null>, key: string): boolean {
  const [reachedFor, setReachedFor] = useState<string | null>(null);
  const watching = typeof IntersectionObserver !== 'undefined';
  useEffect(() => {
    const el = marker.current;
    if (!el || !watching) return;
    const watcher = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setReachedFor(key));
    watcher.observe(el);
    return () => watcher.disconnect();
  }, [marker, key, watching]);
  return !watching || reachedFor === key;
}

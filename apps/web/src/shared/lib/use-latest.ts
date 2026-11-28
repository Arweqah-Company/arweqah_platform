import { useEffect, useRef, type RefObject } from 'react';

/** A box that always holds the newest value, for code that runs later (an upload that ends, a request that answers) and must see what the page holds then, not what it held when the code began. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

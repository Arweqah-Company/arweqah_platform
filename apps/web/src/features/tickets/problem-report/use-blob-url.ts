import { useEffect, useMemo, useRef } from 'react';

/**
 * An object URL for a picture the browser holds, released when the picture goes. In development React runs every effect twice (set up, clean up, set up),
 * so the release waits a tick and is skipped when the picture is still in use: otherwise the address in the page would be released and the picture would not load.
 */
export function useBlobUrl(blob: Blob | null): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  const inUse = useRef(false);
  useEffect(() => {
    inUse.current = true;
    return () => {
      inUse.current = false;
      if (url) setTimeout(() => { if (!inUse.current) URL.revokeObjectURL(url); }, 0);
    };
  }, [url]);
  return url;
}

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ApiError } from './api-client';

/**
 * True after a query failed with a server error (5xx) while it had no earlier data to show, until the person moves to another page or
 * that same query answers well (a refetch, a retry). A 4xx (validation, 403, 404) or a refresh that failed over data already on screen
 * is the page's own business.
 */
export function useServerFailure(): boolean {
  const cache = useQueryClient().getQueryCache();
  const { key } = useLocation();
  const [failed, setFailed] = useState<{ key: string; query: string }>();
  useEffect(
    () =>
      cache.subscribe((event) => {
        if (event.type !== 'updated') return;
        const { state, queryHash } = event.query;
        if (event.action.type === 'success') setFailed((now) => (now?.query === queryHash ? undefined : now));
        else if (event.action.type === 'error' && state.data === undefined && state.error instanceof ApiError && state.error.status >= 500) setFailed({ key, query: queryHash });
      }),
    [cache, key],
  );
  return failed?.key === key;
}

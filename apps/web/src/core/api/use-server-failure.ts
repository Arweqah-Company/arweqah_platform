import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { ApiError } from './api-client';

/**
 * True after a query failed with a server error (5xx) while it had no earlier data to show, until the person moves to another page.
 * A 4xx (validation, 403, 404) or a refresh that failed over data already on screen is the page's own business.
 */
export function useServerFailure(): boolean {
  const cache = useQueryClient().getQueryCache();
  const { key } = useLocation();
  const [failedAt, setFailedAt] = useState<string>();
  useEffect(
    () =>
      cache.subscribe((event) => {
        const { error } = event.query.state;
        if (event.type === 'updated' && event.action.type === 'error' && event.query.state.data === undefined && error instanceof ApiError && error.status >= 500) setFailedAt(key);
      }),
    [cache, key],
  );
  return failedAt === key;
}

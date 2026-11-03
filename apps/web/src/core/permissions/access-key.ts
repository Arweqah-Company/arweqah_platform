import type { QueryClient } from '@tanstack/react-query';

export const ACCESS_KEY = ['access'];

/** Read the permissions again (the next render of every page that gates on them follows). */
export function refreshAccess(client: QueryClient): Promise<void> {
  return client.invalidateQueries({ queryKey: ACCESS_KEY });
}

import type { ListSettingsDto } from '@arweqah-platform/shared';
import { createContext, useContext } from 'react';

const NOTHING_HIDDEN: ReadonlySet<string> = new Set();

const ListSettingsContext = createContext<ListSettingsDto>({});

/** Provided by the app shell from the signed-in person's profile: what an administrator hid in each list. */
export const ListSettingsProvider = ListSettingsContext.Provider;

/** The columns and filters hidden in one list; nothing is hidden for a list without a key. */
export function useHiddenInList(listKey: string | undefined): { columns: ReadonlySet<string>; filters: ReadonlySet<string> } {
  const settings = useContext(ListSettingsContext);
  const entry = listKey ? (settings as Record<string, { hiddenColumns: string[]; hiddenFilters: string[] } | undefined>)[listKey] : undefined;
  return { columns: entry ? new Set(entry.hiddenColumns) : NOTHING_HIDDEN, filters: entry ? new Set(entry.hiddenFilters) : NOTHING_HIDDEN };
}

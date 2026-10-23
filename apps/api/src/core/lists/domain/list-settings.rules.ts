import { LIST_CATALOG, type ListKey } from '@arweqah-platform/shared';
import { InvalidListSettingError } from './lists.errors';

const isListKey = (key: string): key is ListKey => key in LIST_CATALOG;

/** Returns the list's catalog entry, or throws when the list is unknown. */
export function catalogOf(key: string): (typeof LIST_CATALOG)[ListKey] {
  if (!isListKey(key)) throw new InvalidListSettingError(`Unknown list "${key}"`);
  return LIST_CATALOG[key];
}

/** Only the list's own columns and filters may be hidden, and its first column (the name) always stays. */
export function assertHideable(key: string, hiddenColumns: readonly string[], hiddenFilters: readonly string[]): void {
  const catalog = catalogOf(key);
  const columns: readonly string[] = catalog.columns;
  const filters: readonly string[] = catalog.filters;
  const stranger = [...hiddenColumns.filter((c) => !columns.includes(c)), ...hiddenFilters.filter((f) => !filters.includes(f))];
  if (stranger.length) throw new InvalidListSettingError(`Not part of the list: ${stranger.join(', ')}`);
  if (columns[0] && hiddenColumns.includes(columns[0])) throw new InvalidListSettingError('The first column of a list always stays');
}

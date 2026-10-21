import type { Paginated } from '@arweqah-platform/shared';

const PAGE_SIZE = 100;

/** Every row of a paginated list (all pages, in order), up to `max` rows. */
export async function fetchAllPages<T>(fetchPage: (page: number, pageSize: number) => Promise<Paginated<T>>, max: number): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; rows.length < max; page++) {
    const result = await fetchPage(page, PAGE_SIZE);
    rows.push(...result.items);
    if (page * PAGE_SIZE >= result.total || result.items.length === 0) break;
  }
  return rows.slice(0, max);
}

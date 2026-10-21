import type { Paginated } from '@arweqah-platform/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/api-client';
import { MAX_EXPORT_ROWS } from '../data-exchange/types';
import { fetchAllPages } from './fetch-all-pages';
import type { ListPage } from './use-list-page';

type Params = Record<string, string | number | boolean | undefined>;

/** A paginated list from the API for the page's search, filters and paging, plus a loader for "export all results". */
export function useServerList<T>(key: string, path: string, list: ListPage, params: Params) {
  const query = useQuery({
    queryKey: [key, list.page, list.pageSize, params],
    queryFn: () => apiClient.get<Paginated<T>>(path, { ...params, page: list.page, pageSize: list.pageSize }),
    placeholderData: keepPreviousData,
  });
  const loadAll = () => fetchAllPages<T>((page, pageSize) => apiClient.get<Paginated<T>>(path, { ...params, page, pageSize }), MAX_EXPORT_ROWS);
  const table = { rows: query.data?.items, page: query.data, onPageChange: list.setPage, onPageSizeChange: list.setPageSize, isLoading: query.isPending, error: query.error, view: list.view };
  return { query, loadAll, table };
}

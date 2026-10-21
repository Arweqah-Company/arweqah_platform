import { useState } from 'react';
import type { FilterField } from '../ui/list-toolbar';
import { useDebounced } from './use-debounced';
import { useFilters } from './use-filters';
import { usePageSize } from './use-page-size';
import { useViewMode } from './use-view-mode';

/**
 * The state every list page shares: search (debounced), filters, page, rows per page and table / cards.
 * Any change to the search, a filter or the page size goes back to page 1. `toolbar()` is what `ListToolbar` needs.
 */
export function useListPage(id: string) {
  const [search, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize(() => setPage(1));
  const [view, setView] = useViewMode(id);
  const filters = useFilters(() => setPage(1));
  const term = useDebounced(search);
  const setSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };
  return {
    term,
    page,
    setPage,
    pageSize,
    setPageSize,
    view,
    filters,
    /** True when the list is narrowed by a search or a filter. */
    narrowed: term !== '' || Object.keys(filters.values).length > 0,
    toolbar: (search_: { label: string; placeholder?: string; dir?: 'ltr' }, fields: FilterField[]) => ({
      search: { value: search, onChange: setSearch, ...search_ },
      filters: { fields, values: filters.values, onChange: filters.set },
      view: { value: view, onChange: setView },
    }),
  };
}

export type ListPage = ReturnType<typeof useListPage>;

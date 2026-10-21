import { useState } from 'react';

export const DEFAULT_PAGE_SIZE = 15;

/** Rows per page for a list; changing it returns to the first page. */
export function usePageSize(resetPage: () => void): [number, (size: number) => void] {
  const [size, setSize] = useState(DEFAULT_PAGE_SIZE);
  return [size, (next) => { setSize(next); resetPage(); }];
}

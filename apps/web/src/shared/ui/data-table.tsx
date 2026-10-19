import type { Paginated } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../lib/error-message';
import { Alert } from './alert';
import { Button } from './button';

export interface Column<T> {
  /** Stable key; defaults to the header text. */
  id?: string;
  header: string;
  /** Header read by screen readers only (e.g. a row-actions column). */
  hideHeader?: boolean;
  cell: (row: T) => ReactNode;
  className?: string;
}

type PageInfo = Pick<Paginated<unknown>, 'page' | 'pageSize' | 'total'>;

interface DataTableProps<T> {
  caption: string;
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
  isLoading?: boolean;
  /** A failed query: shown instead of the rows, in plain words. */
  error?: unknown;
  empty?: ReactNode;
  page?: PageInfo;
  onPageChange?: (page: number) => void;
}

/** One table for every list: semantic markup, loading/empty states, pagination. */
export function DataTable<T>({ caption, columns, rows, rowKey, isLoading, error, empty, page, onPageChange }: DataTableProps<T>) {
  if (error) return <QueryError error={error} />;
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-navy-50/60 text-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.id ?? c.header} scope="col" className={`px-4 py-3 text-start font-medium ${c.className ?? ''}`}>
                  <span className={c.hideHeader ? 'sr-only' : undefined}>{c.header}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody aria-busy={isLoading}>
            {rows?.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0">
                {columns.map((c) => (
                  <td key={c.id ?? c.header} className={`px-4 py-3 align-middle ${c.className ?? ''}`}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TableState isLoading={isLoading} isEmpty={rows?.length === 0} empty={empty} />
      {page && onPageChange && <Pagination page={page} onPageChange={onPageChange} />}
    </div>
  );
}

function TableState({ isLoading, isEmpty, empty }: { isLoading?: boolean; isEmpty: boolean; empty?: ReactNode }) {
  const { t } = useTranslation();
  if (isLoading) return <div className="h-24 animate-pulse bg-navy-50/40" role="status" />;
  if (isEmpty) return <div className="px-4 py-10 text-center text-muted">{empty ?? t('table.empty')}</div>;
  return null;
}

function Pagination({ page, onPageChange }: { page: PageInfo; onPageChange: (page: number) => void }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label={t('table.page', { page: page.page, pages })} className="flex items-center justify-between border-t border-line px-4 py-2 text-sm text-muted">
      <span>{t('table.page', { page: page.page, pages })}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={page.page <= 1} onClick={() => onPageChange(page.page - 1)}>
          {t('table.previous')}
        </Button>
        <Button size="sm" variant="secondary" disabled={page.page >= pages} onClick={() => onPageChange(page.page + 1)}>
          {t('table.next')}
        </Button>
      </div>
    </nav>
  );
}

function QueryError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return <Alert>{errorMessage(t, error)}</Alert>;
}

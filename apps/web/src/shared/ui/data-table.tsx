import type { Paginated } from '@arweqah-platform/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../lib/error-message';
import { useIsPhone } from '../lib/use-is-phone';
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
  /** When set, the footer offers a rows-per-page choice. */
  onPageSizeChange?: (pageSize: number) => void;
  /** Table or cards; defaults to cards on phones and a table elsewhere. */
  view?: 'table' | 'cards';
  /** Visible title at the start of the panel's top bar (defaults to none; `caption` stays the accessible name). */
  title?: string;
  /** Search and filters, at the end of the top bar. */
  toolbar?: ReactNode;
}

interface RowsProps<T> {
  columns: Column<T>[];
  rows: T[] | undefined;
  rowKey: (row: T) => string;
}

function RowTable<T>({ caption, columns, rows, rowKey, isLoading }: RowsProps<T> & { caption: string; isLoading?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200">
      <table className="w-full text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-neutral-50 text-muted">
          <tr className="border-b border-neutral-200">
            {columns.map((c) => (
              <th key={c.id ?? c.header} scope="col" className={`px-4 py-3 text-start font-medium ${c.className ?? ''}`}>
                <span className={c.hideHeader ? 'sr-only' : undefined}>{c.header}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody aria-busy={isLoading}>
          {rows?.map((row) => (
            <tr key={rowKey(row)} className="border-b border-neutral-200/70 transition-colors duration-150 last:border-0 hover:bg-neutral-50/70">
              {columns.map((c) => (
                <td key={c.id ?? c.header} className={`px-4 py-4 align-middle ${c.className ?? ''}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Phone layout: one card per row, label and value on a line, the actions column at the bottom. */
function RowCards<T>({ columns, rows, rowKey }: RowsProps<T>) {
  const fields = columns.filter((c) => !c.hideHeader);
  const actions = columns.filter((c) => c.hideHeader);
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows?.map((row) => (
        <li key={rowKey(row)} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm shadow-ink/5">
          <dl className="flex flex-col gap-2 text-sm">
            {fields.map((c) => (
              <div key={c.id ?? c.header} className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted">{c.header}</dt>
                <dd className="min-w-0 text-end">{c.cell(row)}</dd>
              </div>
            ))}
          </dl>
          {actions.length > 0 && <div className="mt-3 flex justify-end gap-1 border-t border-neutral-200 pt-3">{actions.map((c) => <span key={c.id ?? c.header}>{c.cell(row)}</span>)}</div>}
        </li>
      ))}
    </ul>
  );
}

/** One table for every list: a rounded panel with a top bar, semantic markup, loading/empty states, pagination. */
export function DataTable<T>({ caption, columns, rows, rowKey, isLoading, error, empty, page, onPageChange, onPageSizeChange, view, title, toolbar }: DataTableProps<T>) {
  const phone = useIsPhone();
  const cards = (view ?? (phone ? 'cards' : 'table')) === 'cards';
  if (error) return <QueryError error={error} />;
  return (
    <div className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm shadow-ink/5">
      <TopBar title={title} toolbar={toolbar} />
      <div className="p-3 sm:p-5">
        {cards ? <RowCards columns={columns} rows={rows} rowKey={rowKey} /> : <RowTable caption={caption} columns={columns} rows={rows} rowKey={rowKey} isLoading={isLoading} />}
      </div>
      <TableState isLoading={isLoading} isEmpty={rows?.length === 0} empty={empty} />
      {page && <TableFooter page={page} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
    </div>
  );
}

function TopBar({ title, toolbar }: { title?: string; toolbar?: ReactNode }) {
  if (!title && !toolbar) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5">
      {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
      {toolbar && <div className="flex flex-1 flex-wrap items-center justify-end gap-3">{toolbar}</div>}
    </div>
  );
}

function TableState({ isLoading, isEmpty, empty }: { isLoading?: boolean; isEmpty: boolean; empty?: ReactNode }) {
  const { t } = useTranslation();
  if (isLoading) return <div className="mx-5 mb-5 h-24 animate-pulse rounded-2xl bg-neutral-50" role="status" />;
  if (isEmpty) return <div className="px-4 pb-10 pt-4 text-center text-muted">{empty ?? t('table.empty')}</div>;
  return null;
}

const PAGE_SIZES = [15, 30, 50];

/** Numbers to show: first, last and the neighbours of the current page, with gaps as null. */
function pageWindow(current: number, pages: number): (number | null)[] {
  const wanted = [...new Set([1, current - 1, current, current + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return wanted.flatMap((n, i) => (i > 0 && n - (wanted[i - 1] as number) > 1 ? [null, n] : [n]));
}

function PageSizeSelect({ value, onChange }: { value: number; onChange: (pageSize: number) => void }) {
  const { t } = useTranslation();
  return (
    <label className="flex items-center gap-2 rounded-xl bg-neutral-50 ps-3 text-muted">
      {t('table.show')}
      <select aria-label={t('table.rows')} className="h-9 cursor-pointer rounded-xl bg-transparent pe-2 text-ink outline-none focus-visible:ring-2 focus-visible:ring-petrol-800" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {[...new Set([...PAGE_SIZES, value])].sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </label>
  );
}

function Pager({ page, pages, onPageChange }: { page: number; pages: number; onPageChange: (page: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5">
      <Button size="sm" variant="soft" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronRight className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
        {t('table.previous')}
      </Button>
      {pageWindow(page, pages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} aria-hidden className="px-1 text-muted">…</span>
        ) : (
          <Button key={n} size="sm" variant={n === page ? 'tint' : 'soft'} className="min-w-9 px-0" aria-label={t('table.pageN', { page: n })} aria-current={n === page ? 'page' : undefined} onClick={() => onPageChange(n)}>
            {n}
          </Button>
        ),
      )}
      <Button size="sm" variant="soft" disabled={page >= pages} onClick={() => onPageChange(page + 1)}>
        {t('table.next')}
        <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" aria-hidden />
      </Button>
    </div>
  );
}

/** Rows-per-page, numbered pages and "From 1 to 15 of 40 results". */
function TableFooter({ page, onPageChange, onPageSizeChange }: { page: PageInfo; onPageChange?: (page: number) => void; onPageSizeChange?: (pageSize: number) => void }) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil(page.total / page.pageSize));
  if (page.total === 0) return null;
  const from = (page.page - 1) * page.pageSize + 1;
  const to = Math.min(page.total, page.page * page.pageSize);
  return (
    <nav aria-label={t('table.page', { page: page.page, pages })} className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5 text-sm text-muted">
      <span>{t('table.range', { from, to, total: page.total })}</span>
      {pages > 1 && onPageChange && <Pager page={page.page} pages={pages} onPageChange={onPageChange} />}
      {onPageSizeChange && <PageSizeSelect value={page.pageSize} onChange={onPageSizeChange} />}
    </nav>
  );
}

function QueryError({ error }: { error: unknown }) {
  const { t } = useTranslation();
  return <Alert>{errorMessage(t, error)}</Alert>;
}

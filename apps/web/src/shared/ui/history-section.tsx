import { History } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from './avatar';
import { Button } from './button';
import { DataTable, type Column } from './data-table';
import { Dialog } from './dialog';

/** Who did it: their picture and name, or «the system» for a step nobody took. */
export function HistoryActor({ name, systemLabel }: { name: string | null; systemLabel: string }) {
  return name ? <span className="inline-flex items-center gap-2"><Avatar name={name} size="sm" />{name}</span> : <span className="text-muted">{systemLabel}</span>;
}

/** The date and time of one step, written for the reader's language. */
export function HistoryWhen({ at }: { at: string }) {
  const { i18n } = useTranslation();
  return <time dateTime={at} className="whitespace-nowrap">{new Date(at).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })}</time>;
}

interface Props<T> {
  /** The section's heading, also the table's caption and the window's title. */
  title: string;
  /** What the window is about (the record's number and title). */
  description: string;
  countText: string;
  openLabel: string;
  rows: T[];
  rowKey: (row: T) => string;
  columns: Column<T>[];
}

/** «History» of a record: a count and a button that opens every step in a table inside a window (a table on desktop, cards on a phone). Shared by tasks and tickets. */
export function HistorySection<T>({ title, description, countText, openLabel, rows, rowKey, columns }: Props<T>) {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label={title} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted">{countText}</p>
      </div>
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}><History className="size-4" aria-hidden />{openLabel}</Button>
      {open && (
        <Dialog open xl onOpenChange={setOpen} title={title} description={description}>
          <DataTable<T> caption={title} columns={columns} rows={rows} rowKey={rowKey} />
        </Dialog>
      )}
    </section>
  );
}

import { useId, type ReactNode } from 'react';

/** A white panel of the cycle page: a title with an optional action beside it, the body and an optional note under it. */
export function CycleCard({ title, action, note, tour, children }: { title: string; action?: ReactNode; note?: string; tour?: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-neutral-200 bg-white p-4" data-tour={tour}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={id} className="font-heading text-base font-bold text-fg">{title}</h2>
        {action}
      </div>
      {children}
      {note && <p className="text-sm text-muted">{note}</p>}
    </section>
  );
}

export interface MiniRow {
  key: string;
  /** The first cell names the row (a row header); the others follow it. */
  cells: ReactNode[];
  action?: ReactNode;
}

/** A small table without a header row, for the short lists inside a card (the dates, the reminders): the first cell of a row is its row header. */
export function MiniTable({ caption, rows, strong }: { caption: string; rows: MiniRow[]; strong?: boolean }) {
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[26rem] text-sm">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-neutral-200 last:border-b-0">
              {row.cells.map((cell, i) => (i === 0 ? <th key={i} scope="row" className={`px-2 py-2 text-start text-fg ${strong ? 'font-bold' : 'font-normal'}`}>{cell}</th> : <td key={i} className="px-2 py-2 text-fg">{cell}</td>))}
              <td className="w-px whitespace-nowrap px-1 py-1 text-end">{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

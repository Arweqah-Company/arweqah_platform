import { Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button';
import { RowAction } from './row-action';

/** A block of an editor: a heading, its rows, and the «add» button beneath them. */
export function EditorBlock({ title, hint, onAdd, addLabel, children }: { title: string; hint?: string; onAdd?: () => void; addLabel?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <div>
        <h3 className="font-heading text-base font-bold text-fg">{title}</h3>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
      {onAdd && <div><Button variant="secondary" size="sm" onClick={onAdd}><Plus className="size-4" aria-hidden />{addLabel}</Button></div>}
    </section>
  );
}

/** One row of an editor: its fields side by side and a remove icon at the end. */
export function EditorRow({ children, onRemove, removeLabel }: { children: ReactNode; onRemove?: () => void; removeLabel?: string }) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
      {onRemove && <RowAction label={removeLabel ?? ''} icon={Trash2} danger onClick={onRemove} />}
    </div>
  );
}

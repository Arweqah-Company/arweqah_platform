import type { ReactNode, Ref } from 'react';
import { cn } from '../lib/cn';

/** One column of a Kanban board: title, count, cards. Fixed width so a phone scrolls the board sideways. */
export function KanbanColumn({ title, count, children, columnRef, highlighted = false }: { title: string; count: number; children: ReactNode; columnRef?: Ref<HTMLElement>; highlighted?: boolean }) {
  return (
    <section ref={columnRef} aria-label={title} className={cn('flex w-72 shrink-0 flex-col gap-3 rounded-3xl bg-neutral-50 p-3 transition-shadow', highlighted && 'ring-2 ring-link')}>
      <h3 className="flex items-center justify-between px-1 text-sm font-bold">
        <span>{title}</span>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-muted" dir="ltr">{count}</span>
      </h3>
      <ul className="flex min-h-16 flex-col gap-2">{children}</ul>
    </section>
  );
}

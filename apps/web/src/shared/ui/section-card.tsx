import type { ReactNode } from 'react';

/** A titled group of fields (one section of a long form); `action` is a button shown beside the title. `id` lets the section menu scroll to it. */
export function SectionCard({ id, title, description, action, children }: { id: string; title: string; description?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-6 shadow-sm shadow-ink/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${id}-title`} className="text-lg font-bold">{title}</h2>
        {action}
      </div>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

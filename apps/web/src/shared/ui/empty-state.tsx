import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** What to show when there is nothing yet: say why, and offer the next step. */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-panel)] border border-dashed border-neutral-700 px-6 py-12 text-center">
      <Icon className="size-8 text-petrol-800" aria-hidden />
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="max-w-[55ch] text-sm text-muted">{description}</p>}
      {action}
    </div>
  );
}

import type { ReactNode } from 'react';
import { Dialog } from './dialog';

/** One record's view as a list of facts, for lists whose rows have no page of their own (a log entry, a sent e-mail). */
export function DetailsDialog({ title, description, rows, onClose }: { title: string; description?: string; rows: [string, ReactNode][]; onClose: () => void }) {
  return (
    <Dialog open wide onOpenChange={(open) => !open && onClose()} title={title} description={description}>
      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="break-words font-medium">{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </Dialog>
  );
}

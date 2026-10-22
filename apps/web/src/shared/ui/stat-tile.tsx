import { cn } from '../lib/cn';

interface StatTileProps {
  label: string;
  value: number | string | undefined;
  hint?: string;
  /** "attention" tints the tile for counts that need action (expiring documents, unplaced employees). */
  tone?: 'neutral' | 'attention';
}

export function StatTile({ label, value, hint, tone = 'neutral' }: StatTileProps) {
  return (
    <div className={cn('rounded-[var(--radius-panel)] border p-5 shadow-sm shadow-ink/5 transition-shadow duration-200 hover:shadow-md hover:shadow-ink/10', tone === 'attention' ? 'border-orange-500 bg-orange-50' : 'border-neutral-200 bg-white')}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-fg" dir="ltr" aria-live="polite">{value ?? '—'}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

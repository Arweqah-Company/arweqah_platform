import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

type Tone = 'danger' | 'warning' | 'success' | 'info';

/**
 * Message colors follow what they say: success green, information yellow, warning orange, error red.
 * Each has an icon and a start rule, so the meaning never rests on color alone; the text stays dark.
 */
const TONES: Record<Tone, { box: string; icon: LucideIcon; iconColor: string }> = {
  success: { box: 'border-green-400 bg-green-50 text-success', icon: CheckCircle2, iconColor: 'text-success' },
  info: { box: 'border-yellow-300 bg-yellow-50 text-fg', icon: Info, iconColor: 'text-fg' },
  warning: { box: 'border-orange-500 bg-orange-50 text-warning', icon: TriangleAlert, iconColor: 'text-warning' },
  danger: { box: 'border-danger-700 bg-danger-50 text-danger-text', icon: AlertCircle, iconColor: 'text-danger-text' },
};

export function Alert({ tone = 'danger', children }: { tone?: Tone; children: ReactNode }) {
  const { box, icon: Icon, iconColor } = TONES[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-[var(--radius-control)] border-s-4 px-4 py-3 text-sm', box)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconColor)} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

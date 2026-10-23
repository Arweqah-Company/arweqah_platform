import { AlertCircle, CheckCircle2, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { MESSAGE_TONES, type MessageTone } from './message-tones';

const ICONS: Record<MessageTone, LucideIcon> = { success: CheckCircle2, info: Info, warning: TriangleAlert, danger: AlertCircle };

/** A message in the page: information blue, warning yellow, error red, success green (see message-tones). */
export function Alert({ tone = 'danger', children }: { tone?: MessageTone; children: ReactNode }) {
  const { box, icon: iconColor } = MESSAGE_TONES[tone];
  const Icon = ICONS[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-3 rounded-[var(--radius-control)] border-s-4 px-4 py-3 text-sm', box)}>
      <Icon className={cn('mt-0.5 size-4 shrink-0', iconColor)} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

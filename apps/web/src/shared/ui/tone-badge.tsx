import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { TONES, type ChartTone } from './chart-tones';

/** The small word that names a kind of thing in a chart color (a type of unit): the color never carries the meaning alone. */
export function ToneBadge({ tone, children, className }: { tone: ChartTone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', TONES[tone].badge, className)}>{children}</span>;
}

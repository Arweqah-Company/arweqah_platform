import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

/** Neutral for plain labels; the other four follow the message colors (information blue, warning yellow, error red, success green). */
const tones = {
  neutral: 'bg-neutral-50 text-fg',
  info: 'bg-petrol-50 text-fg ring-1 ring-petrol-800/30',
  warning: 'bg-yellow-50 text-fg ring-1 ring-yellow-300',
  danger: 'bg-danger-50 text-danger-text',
  success: 'bg-green-50 text-success',
};

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const tones = {
  neutral: 'bg-neutral-50 text-fg',
  success: 'bg-green-50 text-success',
  danger: 'bg-danger-50 text-danger-text',
  highlight: 'bg-yellow-50 text-fg ring-1 ring-yellow-300',
};

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

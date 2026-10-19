import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

const tones = {
  neutral: 'bg-navy-50 text-navy-800',
  success: 'bg-success-50 text-success-700',
  danger: 'bg-danger-50 text-danger-700',
  gold: 'bg-gold-50 text-navy-900 ring-1 ring-gold-200',
};

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>;
}

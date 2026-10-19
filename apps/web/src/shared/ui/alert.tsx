import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'warning' | 'success'; children: ReactNode }) {
  const styles = { danger: 'bg-danger-50 text-danger-700', warning: 'bg-warning-50 text-warning-700', success: 'bg-success-50 text-success-700' };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-[var(--radius-control)] px-4 py-3 text-sm', styles[tone])}>
      {children}
    </div>
  );
}

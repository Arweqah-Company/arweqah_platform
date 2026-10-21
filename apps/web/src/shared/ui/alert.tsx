import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export function Alert({ tone = 'danger', children }: { tone?: 'danger' | 'warning' | 'success' | 'info'; children: ReactNode }) {
  const styles = { danger: 'bg-danger-50 text-danger-700', warning: 'bg-orange-50 text-orange-700', success: 'bg-green-50 text-green-800', info: 'bg-petrol-50 text-petrol-800' };
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('rounded-[var(--radius-control)] px-4 py-3 text-sm', styles[tone])}>
      {children}
    </div>
  );
}

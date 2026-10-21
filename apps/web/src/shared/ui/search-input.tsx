import { Search } from 'lucide-react';
import type { InputHTMLAttributes } from 'react';
import { cn } from '../lib/cn';
import { Input } from './form-field';

/** Search field with the magnifier at the end of the box (follows the reading direction). */
export function SearchInput({ className, dir, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <span dir={dir} className={cn('relative block w-full sm:max-w-xs', className)}>
      <Input type="search" className="pe-11 [&::-webkit-search-cancel-button]:hidden" {...props} />
      <Search aria-hidden className="pointer-events-none absolute end-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

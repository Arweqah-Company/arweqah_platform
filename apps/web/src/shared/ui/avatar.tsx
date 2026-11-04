import { useState } from 'react';
import { cn } from '../lib/cn';

const SIZES = { sm: 'size-7 text-xs', md: 'size-10 text-sm', lg: 'size-24 text-3xl' } as const;

/** A person's picture, or their first letter on the brand color when there is none or it does not load. Decorative: the name is always written beside it. */
export function Avatar({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const [failed, setFailed] = useState<string | null>(null);
  const shown = src && failed !== src;
  return (
    <span aria-hidden className={cn('grid shrink-0 place-items-center overflow-hidden rounded-full bg-petrol-800 font-bold text-cream', SIZES[size], className)}>
      {shown ? <img src={src} alt="" className="size-full object-cover" onError={() => setFailed(src)} /> : name.trim().charAt(0)}
    </span>
  );
}

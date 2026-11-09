import { toast } from 'sonner';
import { cn } from '../lib/cn';
import { Button, type ButtonProps } from './button';

/**
 * A button that cannot act right now. It is never hidden and never silently disabled: it stays in place, dimmed (`aria-disabled`), and pressing it says in a
 * short message why (decision P18). While `blocked` is false it is an ordinary button.
 */
export function GuardedButton({ blocked, reason, onClick, className, ...props }: ButtonProps & { blocked: boolean; reason: string }) {
  return <Button {...props} aria-disabled={blocked || undefined} className={cn('aria-disabled:cursor-not-allowed aria-disabled:opacity-50', className)} onClick={(event) => { if (blocked) { event.preventDefault(); toast.info(reason); } else onClick?.(event); }} />;
}

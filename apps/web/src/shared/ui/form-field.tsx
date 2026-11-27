import { Lock } from 'lucide-react';
import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { control, controlBase } from './control-style';

export { control };
export { Select } from './select';

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** The reason a field cannot be changed: the field is dashed and its label carries a lock that says it (FR-202). */
  locked?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Label, control, hint and error wired together accessibly. */
/** The small lock beside the label of a field the person may not change; the reason is its tooltip and its accessible name. */
export function LockMark({ reason }: { reason: string }) {
  return <Lock role="img" aria-label={reason} className="size-3.5 shrink-0 text-muted"><title>{reason}</title></Lock>;
}

export function FormField({ label, error, hint, locked, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
        </label>
        {locked && <LockMark reason={locked} />}
      </div>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-xs text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />;
}

/** React 19 passes `ref` as a prop, so a caller may reach the element (the mention box reads the caret). */
export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(controlBase, 'py-3', className)} {...props} />;
}

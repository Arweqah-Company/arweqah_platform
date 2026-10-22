import { ChevronDown } from 'lucide-react';
import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

/** Soft controls: gentle hover, a calm focus halo (the border still turns petrol, so focus never relies on the halo alone). */
const controlBase =
  'w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm text-fg outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-muted hover:border-neutral-500 focus:border-link focus:ring-4 focus:ring-link/15 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-muted aria-[invalid=true]:border-danger-700 aria-[invalid=true]:focus:ring-danger-700/15';
export const control = `h-12 ${controlBase}`;

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode;
}

/** Label, control, hint and error wired together accessibly. */
export function FormField({ label, error, hint, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
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

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, 'py-3', className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={cn('relative block h-12 w-full', className)}>
      <select className={cn(controlBase, 'h-full cursor-pointer appearance-none pe-10')} {...props} />
      <ChevronDown aria-hidden className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-link" />
    </span>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

export interface ModeCardOption<T extends string> {
  id: T;
  title: string;
  description: ReactNode;
  /** A card that cannot be chosen (the mode the unit already has). */
  disabled?: boolean;
}

/** The choices of «how the unit is managed» as cards: a radio group where the whole card is the target and the chosen one is outlined. */
export function ManagementModeCards<T extends string>({ name, label, value, onChange, options, error }: { name: string; label: string; value: T | ''; onChange: (id: T) => void; options: ModeCardOption<T>[]; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-fg">{label}</legend>
      <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-2">
        {options.map((o) => (
          <label key={o.id} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border border-neutral-500 bg-white p-3 has-[:checked]:border-link has-[:checked]:bg-petrol-50 has-[:checked]:ring-2 has-[:checked]:ring-link has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-link', o.disabled && 'cursor-not-allowed opacity-60')}>
            <input type="radio" name={name} value={o.id} checked={value === o.id} disabled={o.disabled} onChange={() => onChange(o.id)} className="mt-1 size-5 accent-petrol-800" />
            <span className="flex flex-col gap-0.5">
              <span className="font-bold">{o.title}</span>
              <span className="text-sm text-muted">{o.description}</span>
            </span>
          </label>
        ))}
      </div>
      {error && <p role="alert" className="text-xs text-danger-text">{error}</p>}
    </fieldset>
  );
}

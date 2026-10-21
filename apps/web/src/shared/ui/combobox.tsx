import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { control } from './form-field';

export interface ComboboxOption {
  value: string;
  label: string;
  /** Secondary text shown (and searched) next to the label, e.g. an employee number. */
  hint?: string;
}

interface ComboboxProps {
  /** Accessible name of the control; the visible label comes from FormField. */
  label: string;
  id?: string;
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Shows a clear button when a value is selected. */
  clearable?: boolean;
  /** Server-side search: when set, options are not filtered here and every keystroke calls this. */
  onSearch?: (query: string) => void;
}

/** A select with search, for lists too long for a plain select (units, managers, countries). */
export function Combobox({ label, id, value, onChange, options, placeholder, disabled, invalid, clearable, onSearch }: ComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const pick = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-label={label}
            aria-invalid={invalid || undefined}
            disabled={disabled}
            className={cn(control, 'flex cursor-pointer items-center justify-between gap-2 text-start')}
          >
            <span className={cn('truncate', !selected && 'text-muted')}>{selected?.label ?? placeholder ?? t('combobox.choose')}</span>
            <ChevronDown className={cn('size-4 shrink-0 text-petrol-800 transition-transform duration-150', open && 'rotate-180')} aria-hidden />
          </button>
        </Popover.Trigger>
        {clearable && selected && !disabled && (
          <button type="button" aria-label={t('combobox.clear')} className="absolute end-9 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-neutral-50" onClick={() => onChange(null)}>
            <X className="size-3.5" aria-hidden />
          </button>
        )}
      </div>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="animate-fade-in z-50 w-[var(--radix-popover-trigger-width)] rounded-[var(--radius-control)] border border-neutral-200 bg-white shadow-lg shadow-ink/10">
          <Command shouldFilter={!onSearch}>
            <Command.Input placeholder={t('combobox.search')} onValueChange={onSearch} className="h-10 w-full border-b border-neutral-200 bg-transparent px-3 text-sm outline-none" />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{t('combobox.empty')}</Command.Empty>
              {options.map((o) => (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ''} ${o.value}`}
                  onSelect={() => pick(o.value)}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors data-[selected=true]:bg-petrol-50"
                >
                  <span className="truncate">{o.label}</span>
                  <span className="flex items-center gap-2">
                    {o.hint && <span dir="ltr" className="text-xs text-muted">{o.hint}</span>}
                    {o.value === value && <Check className="size-4 text-petrol-800" aria-hidden />}
                  </span>
                </Command.Item>
              ))}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

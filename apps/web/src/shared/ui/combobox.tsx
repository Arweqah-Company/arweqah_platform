import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { control } from './control-style';

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
  /** Hides the search box (a short fixed list); the popup and keyboard behave the same. Default true. */
  searchable?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
  onBlur?: () => void;
}

/**
 * A select with search, for lists too long for a plain select (units, managers, countries).
 * The popup is at least as wide as the field and grows to fit its longest name (up to 32rem), and a long name wraps instead of being cut.
 */
export function Combobox({ label, id, value, onChange, options, placeholder, disabled, invalid, clearable, onSearch, searchable = true, className, onBlur, ...aria }: ComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const pick = (next: string | null) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative h-12', className)}>
        <ComboTrigger id={id} label={label} open={open} invalid={invalid} disabled={disabled} onBlur={onBlur} text={selected?.label ?? placeholder ?? t('combobox.choose')} placeholderShown={!selected} {...aria} />
        {clearable && selected && !disabled && <ClearButton onClear={() => onChange(null)} />}
      </div>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="animate-fade-in z-50 w-max min-w-[var(--radix-popover-trigger-width)] max-w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-control)] border border-neutral-200 bg-white shadow-lg shadow-ink/10">
          <Command shouldFilter={!onSearch}>
            <Command.Input
              aria-label={label}
              placeholder={t('combobox.search')}
              onValueChange={onSearch}
              className={searchable ? 'h-10 w-full border-b border-neutral-200 bg-transparent px-3 text-sm outline-none transition-colors focus:border-link' : 'sr-only'}
            />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{t('combobox.empty')}</Command.Empty>
              {options.map((o) => <ComboItem key={o.value} option={o} selected={o.value === value} onPick={pick} />)}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ClearButton({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" aria-label={t('combobox.clear')} className="absolute end-9 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:bg-neutral-50" onClick={onClear}>
      <X className="size-3.5" aria-hidden />
    </button>
  );
}

export function ComboItem({ option: o, selected, onPick }: { option: ComboboxOption; selected: boolean; onPick: (value: string) => void }) {
  return (
    <Command.Item
      value={`${o.label} ${o.hint ?? ''} ${o.value}`}
      onSelect={() => onPick(o.value)}
      className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors data-[selected=true]:bg-petrol-50"
    >
      <span className="min-w-0 break-words">{o.label}</span>
      <span className="flex shrink-0 items-center gap-2">
        {o.hint && <span dir="ltr" className="text-xs text-muted">{o.hint}</span>}
        {selected && <Check className="size-4 text-link" aria-hidden />}
      </span>
    </Command.Item>
  );
}

interface TriggerProps extends Pick<ComboboxProps, 'id' | 'label' | 'invalid' | 'disabled' | 'onBlur' | 'aria-describedby' | 'aria-required'> {
  open: boolean;
  text: string;
  placeholderShown: boolean;
}

export function ComboTrigger({ id, label, open, invalid, disabled, onBlur, text, placeholderShown, ...aria }: TriggerProps) {
  return (
    <Popover.Trigger asChild>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-label={label}
        aria-invalid={invalid || undefined}
        aria-describedby={aria['aria-describedby']}
        aria-required={aria['aria-required']}
        onBlur={onBlur}
        disabled={disabled}
        className={cn(control, 'h-full flex cursor-pointer items-center justify-between gap-2 text-start')}
      >
        <span title={placeholderShown ? undefined : text} className={cn('truncate', placeholderShown && 'text-muted')}>{text}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-link transition-transform duration-150', open && 'rotate-180')} aria-hidden />
      </button>
    </Popover.Trigger>
  );
}

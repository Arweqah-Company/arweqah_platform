import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../lib/cn';
import { ComboItem, ComboTrigger, type ComboboxOption } from './combobox';

interface MultiComboboxProps {
  /** Accessible name of the control; the visible label comes from FormField. */
  label: string;
  id?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: ComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
}

/**
 * A select with search where several options are ticked one after the other: the popup stays open, a ticked option shows a check mark and a second click unticks it.
 * The field shows how many are chosen; the popup is as wide as `Combobox`'s.
 */
export function MultiCombobox({ label, id, values, onChange, options, placeholder, disabled, className, ...aria }: MultiComboboxProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const toggle = (value: string) => onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  const text = values.length ? t('combobox.selectedCount', { count: values.length }) : (placeholder ?? t('combobox.choose'));
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <div className={cn('relative h-12', className)}>
        <ComboTrigger id={id} label={label} open={open} disabled={disabled} text={text} placeholderShown={values.length === 0} {...aria} />
      </div>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="animate-fade-in z-50 w-max min-w-[var(--radix-popover-trigger-width)] max-w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-control)] border border-neutral-200 bg-white shadow-lg shadow-ink/10">
          <Command>
            <Command.Input aria-label={label} placeholder={t('combobox.search')} className="h-10 w-full border-b border-neutral-200 bg-transparent px-3 text-sm outline-none transition-colors focus:border-link" />
            <Command.List className="max-h-64 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-muted">{t('combobox.empty')}</Command.Empty>
              {options.map((o) => <ComboItem key={o.value} option={o} selected={values.includes(o.value)} onPick={toggle} />)}
            </Command.List>
          </Command>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

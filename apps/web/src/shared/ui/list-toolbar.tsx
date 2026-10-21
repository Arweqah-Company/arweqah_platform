import * as Popover from '@radix-ui/react-popover';
import { LayoutGrid, SlidersHorizontal, Table2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { FilterValues } from '../lib/use-filters';
import type { ViewMode } from '../lib/use-view-mode';
import { cn } from '../lib/cn';
import { Button } from './button';
import { FormField, Input, Select } from './form-field';
import { SearchInput } from './search-input';

export interface FilterOption {
  value: string;
  label: string;
}

/** One thing a list can be filtered by. `toggle` is a yes/no filter (value "true"). */
export type FilterField = { id: string; label: string } & ({ type: 'select'; options: FilterOption[] } | { type: 'text'; placeholder?: string } | { type: 'date' } | { type: 'toggle' });

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (mode: ViewMode) => void }) {
  const { t } = useTranslation();
  const items: { mode: ViewMode; icon: typeof Table2 }[] = [{ mode: 'table', icon: Table2 }, { mode: 'cards', icon: LayoutGrid }];
  return (
    <div role="group" aria-label={t('view.label')} className="flex rounded-xl border border-neutral-200 bg-neutral-50 p-1">
      {items.map(({ mode, icon: Icon }) => (
        <button
          key={mode}
          type="button"
          aria-pressed={value === mode}
          aria-label={t(`view.${mode}`)}
          title={t(`view.${mode}`)}
          onClick={() => onChange(mode)}
          className={cn('grid size-9 place-items-center rounded-lg transition-colors duration-150', value === mode ? 'bg-white text-petrol-800 shadow-sm' : 'text-muted hover:text-ink')}
        >
          <Icon className="size-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}

function FieldControl({ field, value, onChange }: { field: FilterField; value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  if (field.type === 'toggle') {
    return (
      <label className="flex min-h-12 items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-petrol-800" checked={value === 'true'} onChange={(e) => onChange(e.target.checked ? 'true' : '')} />
        {field.label}
      </label>
    );
  }
  return (
    <FormField label={field.label}>
      {(p) =>
        field.type === 'select' ? (
          <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">{t('filters.all')}</option>
            {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        ) : (
          <Input {...p} type={field.type === 'date' ? 'date' : 'text'} dir={field.type === 'date' ? 'ltr' : undefined} placeholder={field.type === 'text' ? field.placeholder : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
        )
      }
    </FormField>
  );
}

function FilterPanel({ fields, values, onChange }: { fields: FilterField[]; values: FilterValues; onChange: (values: FilterValues) => void }) {
  const { t } = useTranslation();
  const count = Object.keys(values).length;
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button variant="secondary" className="gap-2 border-neutral-200 text-ink">
          <SlidersHorizontal className="size-4" aria-hidden />
          {t('filters.title')}
          {count > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-petrol-800 px-1.5 text-xs font-bold text-cream">{count}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} collisionPadding={16} className="animate-fade-in z-50 max-h-[70vh] w-[min(92vw,30rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl shadow-ink/10">
          <div className="grid gap-4 sm:grid-cols-2">
            {fields.map((f) => <FieldControl key={f.id} field={f} value={values[f.id] ?? ''} onChange={(v) => onChange({ ...values, [f.id]: v })} />)}
          </div>
          {count > 0 && <Button variant="ghost" size="sm" className="mt-4" onClick={() => onChange({})}>{t('filters.clear')}</Button>}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function valueLabel(field: FilterField, value: string, yes: string): string {
  if (field.type === 'select') return field.options.find((o) => o.value === value)?.label ?? value;
  return field.type === 'toggle' ? yes : value;
}

/** What is applied right now, each removable on its own. */
function ActiveFilters({ fields, values, onChange }: { fields: FilterField[]; values: FilterValues; onChange: (values: FilterValues) => void }) {
  const { t } = useTranslation();
  const active = fields.filter((f) => values[f.id]);
  if (!active.length) return null;
  return (
    <ul aria-label={t('filters.active')} className="flex basis-full flex-wrap gap-2">
      {active.map((f) => {
        const text = f.type === 'toggle' ? f.label : `${f.label}: ${valueLabel(f, values[f.id] as string, t('filters.yes'))}`;
        return (
          <li key={f.id} className="inline-flex items-center gap-1 rounded-full bg-petrol-50 py-1 ps-3 pe-1 text-xs font-medium text-petrol-800">
            {text}
            <button type="button" aria-label={t('filters.remove', { name: f.label })} className="grid size-5 place-items-center rounded-full transition-colors hover:bg-petrol-800/10" onClick={() => onChange({ ...values, [f.id]: '' })}>
              <X className="size-3" aria-hidden />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

interface ListToolbarProps {
  search: { value: string; onChange: (value: string) => void; label: string; placeholder?: string; dir?: 'ltr' };
  filters?: { fields: FilterField[]; values: FilterValues; onChange: (values: FilterValues) => void };
  view?: { value: ViewMode; onChange: (mode: ViewMode) => void };
  /** Extra buttons after the view switch, e.g. import and export. */
  actions?: ReactNode;
}

/** Search, the filter panel with its applied-filter chips, and the table / cards switch: the same on every list. */
export function ListToolbar({ search, filters, view, actions }: ListToolbarProps) {
  return (
    <>
      <SearchInput dir={search.dir} aria-label={search.label} placeholder={search.placeholder} value={search.value} onChange={(e) => search.onChange(e.target.value)} />
      {filters && <FilterPanel {...filters} />}
      {actions}
      {view && <ViewToggle {...view} />}
      {filters && <ActiveFilters {...filters} />}
    </>
  );
}

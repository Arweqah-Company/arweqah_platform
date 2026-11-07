import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { matchesText } from '../lib/text-match';
import { cn } from '../lib/cn';
import { ComboTrigger } from './combobox';

export interface TreeSelectItem {
  id: string;
  /** The item above, or null at the top. An item whose parent is not in the list is treated as a top item. */
  parentId: string | null;
  label: string;
  /** Secondary text, searched too (a path, a code). */
  hint?: string;
}

interface TreeSelectProps {
  /** Accessible name; the visible label comes from FormField. */
  label: string;
  id?: string;
  value: string | null | undefined;
  onChange: (id: string) => void;
  items: TreeSelectItem[];
  disabled?: boolean;
  'aria-describedby'?: string;
  'aria-required'?: boolean;
}

/**
 * A pick list for a tree too big for one drop-down: it opens on the top items, a chevron opens what is inside one,
 * a back row climbs up, and typing in the box searches the whole tree at once.
 */
export function TreeSelect({ label, id, value, onChange, items, disabled, ...aria }: TreeSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [parent, setParent] = useState<string | null>(null);
  const index = useMemo(() => buildIndex(items), [items]);
  const selected = items.find((i) => i.id === value);
  const searching = query.trim().length > 0;
  const rows = searching ? items.filter((i) => matchesText([i.label, i.hint], query)) : (index.children.get(parent) ?? []);
  const here = parent ? index.byId.get(parent) : undefined;
  const pick = (itemId: string) => {
    onChange(itemId);
    setOpen(false);
  };
  const toggle = (next: boolean) => {
    setOpen(next);
    if (next) {
      setQuery('');
      setParent(selected && selected.parentId !== null && index.byId.has(selected.parentId) ? selected.parentId : null);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={toggle}>
      <div className="relative h-12">
        <ComboTrigger id={id} label={label} open={open} disabled={disabled} text={selected ? (selected.hint ?? selected.label) : t('combobox.choose')} placeholderShown={!selected} {...aria} />
      </div>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="animate-fade-in z-50 w-max min-w-[var(--radix-popover-trigger-width)] max-w-[min(32rem,calc(100vw-2rem))] rounded-[var(--radius-control)] border border-neutral-200 bg-white shadow-lg shadow-ink/10">
          <input aria-label={label} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('combobox.search')} className="h-10 w-full border-b border-neutral-200 bg-transparent px-3 text-sm outline-none transition-colors focus:border-link" />
          {!searching && here && <BackRow name={here.label} onBack={() => setParent(here.parentId !== null && index.byId.has(here.parentId) ? here.parentId : null)} />}
          <ul className="max-h-64 overflow-y-auto p-1">
            {rows.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">{t('combobox.empty')}</li>}
            {rows.map((row) => (
              <TreeRow key={row.id} item={row} selected={row.id === value} showHint={searching} hasChildren={!searching && index.children.has(row.id)} onPick={pick} onOpen={setParent} />
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function buildIndex(items: TreeSelectItem[]) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const children = new Map<string | null, TreeSelectItem[]>();
  for (const item of items) {
    const key = item.parentId !== null && byId.has(item.parentId) ? item.parentId : null;
    children.set(key, [...(children.get(key) ?? []), item]);
  }
  return { byId, children };
}

function BackRow({ name, onBack }: { name: string; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <button type="button" onClick={onBack} aria-label={t('treeSelect.back', { name })} className="flex w-full items-center gap-2 border-b border-neutral-200 px-3 py-2 text-start text-sm font-medium text-link hover:bg-petrol-50">
      <ChevronRight className="size-4 shrink-0 ltr:hidden" aria-hidden />
      <ChevronLeft className="size-4 shrink-0 rtl:hidden" aria-hidden />
      <span className="min-w-0 break-words">{name}</span>
    </button>
  );
}

interface RowProps {
  item: TreeSelectItem;
  selected: boolean;
  showHint: boolean;
  hasChildren: boolean;
  onPick: (id: string) => void;
  onOpen: (id: string) => void;
}

function TreeRow({ item, selected, showHint, hasChildren, onPick, onOpen }: RowProps) {
  const { t } = useTranslation();
  return (
    <li className="flex items-stretch gap-1">
      <button type="button" onClick={() => onPick(item.id)} className={cn('flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm transition-colors hover:bg-petrol-50', selected && 'bg-petrol-50')}>
        <span className="min-w-0">
          <span className="block break-words">{item.label}</span>
          {showHint && item.hint && <span className="block break-words text-xs text-muted">{item.hint}</span>}
        </span>
        {selected && <Check className="size-4 shrink-0 text-link" aria-hidden />}
      </button>
      {hasChildren && (
        <button type="button" onClick={() => onOpen(item.id)} aria-label={t('treeSelect.open', { name: item.label })} className="flex w-10 shrink-0 items-center justify-center rounded-md text-link hover:bg-petrol-50">
          <ChevronLeft className="size-4 ltr:hidden" aria-hidden />
          <ChevronRight className="size-4 rtl:hidden" aria-hidden />
        </button>
      )}
    </li>
  );
}

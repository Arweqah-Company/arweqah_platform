import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/cn';

export interface TreeItem {
  id: string;
  parentId: string | null;
  label: string;
  /** Short text after the label, e.g. a count. */
  hint?: string;
}

interface TreeViewProps {
  items: TreeItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label: string;
}

/** An expandable tree from a flat list. Every row is a real button, so it works with keyboard and screen readers. */
export function TreeView({ items, selectedId, onSelect, label }: TreeViewProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const children = (parentId: string | null) => items.filter((i) => i.parentId === parentId);
  const toggle = (id: string) => setCollapsed((prev) => { const next = new Set(prev); if (!next.delete(id)) next.add(id); return next; });

  const renderLevel = (parentId: string | null, depth: number) => (
    <ul role={depth === 0 ? 'tree' : 'group'} aria-label={depth === 0 ? label : undefined} className={cn(depth > 0 && 'ms-4 border-s border-neutral-200 ps-2')}>
      {children(parentId).map((item) => {
        const kids = children(item.id).length > 0;
        const open = !collapsed.has(item.id);
        return (
          <li key={item.id} role="treeitem" aria-expanded={kids ? open : undefined} aria-selected={item.id === selectedId}>
            <div className={cn('flex items-center rounded', item.id === selectedId && 'bg-petrol-50')}>
              {kids ? (
                <button type="button" aria-label={item.label} className="p-1" onClick={() => toggle(item.id)}>
                  <ChevronDown className={cn('size-4 transition-transform', !open && 'rtl:rotate-90 ltr:-rotate-90')} aria-hidden />
                </button>
              ) : <span className="w-6" />}
              <button type="button" className="flex flex-1 items-center justify-between gap-2 px-1 py-1.5 text-start text-sm" onClick={() => onSelect(item.id)}>
                <span className={cn(item.id === selectedId && 'font-bold')}>{item.label}</span>
                {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
              </button>
            </div>
            {kids && open && renderLevel(item.id, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return <div>{renderLevel(null, 0)}</div>;
}

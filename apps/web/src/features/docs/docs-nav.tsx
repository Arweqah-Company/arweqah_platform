import { useTranslation } from 'react-i18next';
import { SearchInput } from '@/shared/ui';
import type { ManualSection } from './docs-access';

interface Props {
  groups: string[];
  shown: ManualSection[];
  currentId: string | undefined;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (id: string) => void;
}

/** The search box and the sections the person may read, grouped like the menu. */
export function DocsNav({ groups, shown, currentId, query, onQuery, onSelect }: Props) {
  const { t } = useTranslation('docs');
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <SearchInput value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t('search')} aria-label={t('search')} className="mb-3 sm:max-w-none" />
      <nav aria-label={t('sections')} className="max-h-[60vh] overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-3">
        {groups.map((group, g) => {
          const items = shown.filter((s) => s.group === g);
          return items.length === 0 ? null : (
            <div key={group} className="mb-3 last:mb-0">
              <p className="px-3 py-1 text-xs font-bold text-muted">{group}</p>
              {items.map((s) => (
                <button key={s.id} type="button" onClick={() => onSelect(s.id)} aria-current={s.id === currentId ? 'page' : undefined} className="block w-full rounded-[var(--radius-button)] px-3 py-2 text-start text-sm transition-colors hover:bg-petrol-50 aria-[current=page]:bg-primary aria-[current=page]:text-on-primary">
                  {s.title}
                </button>
              ))}
            </div>
          );
        })}
        {shown.length === 0 && <p className="p-3 text-sm text-muted">{t('noResults')}</p>}
      </nav>
    </aside>
  );
}

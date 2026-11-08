import type { CareerTitleListItemDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/cn';
import { StatusBadge } from './content-columns';

/** The titles as a column of buttons: the name, the code and the state of the path; the open one is marked. */
export function TitleList({ items, selectedId, onSelect }: { items: CareerTitleListItemDto[]; selectedId: string | undefined; onSelect: (id: string) => void }) {
  const { t, i18n } = useTranslation('career-profile');
  return (
    <ul aria-label={t('content.title')} className="flex flex-col gap-0.5 p-2">
      {items.map((x) => (
        <li key={x.id}>
          <button
            type="button"
            aria-current={x.id === selectedId}
            onClick={() => onSelect(x.id)}
            className={cn('flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2 text-start transition-colors hover:bg-petrol-50', x.id === selectedId && 'bg-petrol-50 outline outline-1 outline-link')}
          >
            <b className="text-fg">{(i18n.language === 'ar' ? x.nameAr : x.nameEn) || x.nameAr}</b>
            {x.code && <bdi dir="ltr" className="font-latin text-sm text-muted">{x.code}</bdi>}
            <StatusBadge status={x.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}

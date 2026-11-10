import type { CatalogDeskDto, CatalogTypeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button } from '@/shared/ui';
import { cn } from '@/shared/lib/cn';
import type { Choice } from './use-new-ticket';

export interface TypeEntry {
  desk: CatalogDeskDto;
  type: CatalogTypeDto;
}

/** How many rows show at first and each time «Show more» is pressed: a long catalog never fills the window at once. */
const PAGE = 30;

/** The compact view: one dense line per kind of ticket (name, department, usual time), for a catalog with very many kinds. */
export function TypeList({ entries, onChoose }: { entries: TypeEntry[]; onChoose: (choice: Choice) => void }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const [shown, setShown] = useState(PAGE);
  return (
    <div className="flex flex-col gap-2">
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200">
        {entries.slice(0, shown).map(({ desk, type }) => {
          const blocked = desk.unavailableReason !== null || !type.available;
          return (
            <li key={type.id}>
              <button type="button" disabled={blocked} onClick={() => onChoose({ desk, type })} className={cn('grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-3 py-2 text-start text-sm transition-colors', blocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-petrol-50')}>
                <span className="font-medium">{ar ? type.nameAr : type.nameEn} {type.isPersonal && <Badge>{t('flags.personal')}</Badge>}</span>
                <span className="text-xs text-muted">{t('choose.durationShort', { count: type.dueDays })}</span>
                <span className="text-xs text-muted">{ar ? desk.nameAr : desk.nameEn}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown < entries.length && <Button variant="ghost" size="sm" onClick={() => setShown(shown + PAGE)}>{t('choose.showMore', { count: entries.length - shown })}</Button>}
    </div>
  );
}

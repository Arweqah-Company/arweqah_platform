import type { CatalogDeskDto, CatalogTypeDto, TicketCatalogDto } from '@arweqah-platform/shared';
import { Building2, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, Button, EmptyState } from '@/shared/ui';
import { matchesText } from '@/shared/lib/text-match';
import { cn } from '@/shared/lib/cn';
import type { Choice } from './use-new-ticket';

interface Props {
  catalog: TicketCatalogDto;
  onChoose: (choice: Choice) => void;
}

const REASON_KEY = { paused: 'choose.paused', not_started: 'choose.notStarted', no_manager: 'choose.noManager' } as const;

function TypeRow({ desk, type, onChoose }: { desk: CatalogDeskDto; type: CatalogTypeDto; onChoose: (choice: Choice) => void }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const blocked = desk.unavailableReason !== null || !type.available;
  const description = ar ? type.descriptionAr : type.descriptionEn;
  return (
    <li>
      <button type="button" disabled={blocked} onClick={() => onChoose({ desk, type })} className={cn('flex w-full items-start justify-between gap-3 rounded-2xl border border-neutral-200 p-3 text-start transition-colors', blocked ? 'cursor-not-allowed opacity-60' : 'hover:border-link hover:bg-petrol-50')}>
        <span className="flex flex-col gap-0.5">
          <span className="font-medium">{ar ? type.nameAr : type.nameEn} {type.isPersonal && <Badge>{t('flags.personal')}</Badge>}</span>
          {description && <span className="text-xs text-muted">{description}</span>}
        </span>
        <span className="shrink-0 text-xs text-muted">{t('choose.duration', { count: type.dueDays })}</span>
      </button>
    </li>
  );
}

function DeskGroup({ desk, types, onChoose }: { desk: CatalogDeskDto; types: CatalogTypeDto[]; onChoose: (choice: Choice) => void }) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const note = ar ? desk.descriptionAr : desk.descriptionEn;
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-bold">{ar ? desk.nameAr : desk.nameEn}</h3>
      {desk.unavailableReason && <p className="text-xs text-danger-text">{t(REASON_KEY[desk.unavailableReason])}</p>}
      {note && !desk.unavailableReason && <p className="text-xs text-muted">{note}</p>}
      <ul className="flex flex-col gap-2">{types.map((x) => <TypeRow key={x.id} desk={desk} type={x} onChoose={onChoose} />)}</ul>
    </section>
  );
}

/** A grid of all departments with how many kinds of ticket each takes; picking one narrows the list to it. */
function DeskGrid({ desks, onPick }: { desks: CatalogDeskDto[]; onPick: (deskId: string) => void }) {
  const { t, i18n } = useTranslation('tickets');
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {desks.map((d) => (
        <li key={d.deskId}>
          <button type="button" onClick={() => onPick(d.deskId)} className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 p-3 text-start hover:border-link hover:bg-petrol-50">
            <Building2 className="size-5 text-link" aria-hidden />
            <span className="flex flex-col"><span className="font-medium">{i18n.language === 'ar' ? d.nameAr : d.nameEn}</span><span className="text-xs text-muted">{t('choose.typesCount', { count: d.types.length })}</span></span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Step 1: "what do you need?" filters the kinds of ticket as you type; browsing the departments is one click away. */
export function ChooseStep({ catalog, onChoose }: Props) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const [query, setQuery] = useState('');
  const [browse, setBrowse] = useState(false);
  const [deskId, setDeskId] = useState<string | null>(null);
  const groups = catalog.desks
    .filter((d) => !deskId || d.deskId === deskId)
    .map((d) => ({ desk: d, types: d.types.filter((x) => matchesText([ar ? x.nameAr : x.nameEn, ar ? x.descriptionAr : x.descriptionEn, ar ? d.nameAr : d.nameEn], query)) }))
    .filter((g) => g.types.length > 0);
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('choose.personalNotice')}</Alert>
      <label className="flex h-12 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 focus-within:border-link focus-within:ring-4 focus-within:ring-link/15">
        <Search className="size-4 text-muted" aria-hidden />
        <input className="h-full flex-1 bg-transparent text-sm outline-none" aria-label={t('choose.search')} placeholder={t('choose.search')} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </label>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => setBrowse(!browse)}>{browse ? t('choose.hideBrowse') : t('choose.browse')}</Button>
        {deskId && <Button variant="soft" size="sm" onClick={() => setDeskId(null)}>{t('choose.allDesks')}</Button>}
      </div>
      {browse && <DeskGrid desks={catalog.desks} onPick={(id) => { setDeskId(id); setBrowse(false); }} />}
      {groups.length === 0 ? <EmptyState icon={Search} title={t('choose.noMatches')} /> : groups.map((g) => <DeskGroup key={g.desk.deskId} desk={g.desk} types={g.types} onChoose={onChoose} />)}
    </div>
  );
}

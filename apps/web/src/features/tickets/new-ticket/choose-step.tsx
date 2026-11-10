import type { CatalogDeskDto, CatalogTypeDto, TicketCatalogDto } from '@arweqah-platform/shared';
import { LayoutList, List, Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Badge, EmptyState, Select, ViewSwitch } from '@/shared/ui';
import { useViewMode } from '@/shared/lib/use-view-mode';
import { matchesText } from '@/shared/lib/text-match';
import { cn } from '@/shared/lib/cn';
import { TypeList, type TypeEntry } from './type-list';
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

type Kind = 'all' | 'personal' | 'regular';
type CatalogView = 'groups' | 'list';
const VIEWS = { modes: ['groups', 'list'], phoneDefault: 'list' } as const;

/** The kinds that match the words typed, the department and the kind chosen, each with its department. */
function matching(catalog: TicketCatalogDto, ar: boolean, filter: { query: string; deskId: string; kind: Kind }): TypeEntry[] {
  return catalog.desks
    .filter((d) => !filter.deskId || d.deskId === filter.deskId)
    .flatMap((desk) => desk.types.map((type) => ({ desk, type })))
    .filter(({ desk, type }) => (filter.kind === 'all' || type.isPersonal === (filter.kind === 'personal')) && matchesText([ar ? type.nameAr : type.nameEn, ar ? type.descriptionAr : type.descriptionEn, ar ? desk.nameAr : desk.nameEn], filter.query));
}

function byDesk(entries: TypeEntry[]): { desk: CatalogDeskDto; types: CatalogTypeDto[] }[] {
  const groups = new Map<string, { desk: CatalogDeskDto; types: CatalogTypeDto[] }>();
  for (const { desk, type } of entries) groups.set(desk.deskId, { desk, types: [...(groups.get(desk.deskId)?.types ?? []), type] });
  return [...groups.values()];
}

/** Step 1: «what do you need?» searches the kinds of ticket as you type, narrows them by department and kind, and shows them grouped by department or as one compact list. */
export function ChooseStep({ catalog, onChoose }: Props) {
  const { t, i18n } = useTranslation('tickets');
  const ar = i18n.language === 'ar';
  const [query, setQuery] = useState('');
  const [deskId, setDeskId] = useState('');
  const [kind, setKind] = useState<Kind>('all');
  const [view, setView] = useViewMode<CatalogView>('ticket-types', VIEWS);
  const entries = matching(catalog, ar, { query, deskId, kind });
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="info">{t('choose.personalNotice')}</Alert>
      <label className="flex h-12 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 focus-within:border-link focus-within:ring-4 focus-within:ring-link/15">
        <Search className="size-4 text-muted" aria-hidden />
        <input className="h-full flex-1 bg-transparent text-sm outline-none" aria-label={t('choose.search')} placeholder={t('choose.search')} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label={t('choose.deskFilter')} className="min-w-48 flex-1" searchable value={deskId} onChange={(e) => setDeskId(e.target.value)}>
          <option value="">{t('choose.allDesks')}</option>
          {catalog.desks.map((d) => <option key={d.deskId} value={d.deskId}>{ar ? d.nameAr : d.nameEn}</option>)}
        </Select>
        <Select aria-label={t('choose.kindFilter')} className="min-w-40" value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
          <option value="all">{t('choose.kindAll')}</option>
          <option value="regular">{t('choose.kindRegular')}</option>
          <option value="personal">{t('choose.kindPersonal')}</option>
        </Select>
        <ViewSwitch value={view} onChange={setView} choices={[{ id: 'groups', label: t('choose.viewGroups'), icon: LayoutList }, { id: 'list', label: t('choose.viewList'), icon: List }]} />
      </div>
      <p role="status" className="text-xs text-muted">{t('choose.typesCount', { count: entries.length })}</p>
      {entries.length === 0 && <EmptyState icon={Search} title={t('choose.noMatches')} />}
      {entries.length > 0 && view === 'list' && <TypeList entries={entries} onChoose={onChoose} />}
      {entries.length > 0 && view === 'groups' && byDesk(entries).map((g) => <DeskGroup key={g.desk.deskId} desk={g.desk} types={g.types} onChoose={onChoose} />)}
    </div>
  );
}

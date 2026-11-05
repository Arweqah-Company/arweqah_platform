import { CorePermission, type JobTitleDto } from '@arweqah-platform/shared';
import { IdCard, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Can } from '@/core/permissions/can';
import { AddTitlesDialog, DeleteTitleDialog, EditTitleDialog, TitleCardDialog } from '@/features/job-titles';
import { Badge, Button, RowAction } from '@/shared/ui';
import type { DetailsContext } from './details-tabs';
import { titleName } from './org-model';
import { UnitCode } from './unit-badges';

type Open = { kind: 'add' } | { kind: 'card' | 'edit' | 'delete'; title: JobTitleDto } | null;

function TitleRow({ title, onOpen }: { title: JobTitleDto; onOpen: (open: Open) => void }) {
  const { t, i18n } = useTranslation('job-titles');
  const { t: tc } = useTranslation();
  const name = titleName(title, i18n.language === 'ar');
  return (
    <li className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200 px-3 py-2 text-sm">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-medium"><button type="button" className="rounded text-start text-link underline-offset-4 hover:underline" onClick={() => onOpen({ kind: 'card', title })}>{name}</button>{title.code && <span className="text-xs font-normal text-muted"><UnitCode code={title.code} /></span>}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
          {title.grade !== null && title.track !== null && <Badge>L{title.grade} · {t(`titles.tracks.${title.track}`)}</Badge>}
          <span>{t('titles.employees', { count: title.employeesCount })}</span>
          {title.employeesCount === 0 && <Badge tone="warning">{t('titles.vacant')}</Badge>}
          {!title.isActive && <Badge>{t('status.inactive')}</Badge>}
        </p>
      </div>
      <div className="flex shrink-0">
        <RowAction label={`${t('actions.openCard')}: ${name}`} icon={IdCard} onClick={() => onOpen({ kind: 'card', title })} />
        <Can adminMode permission={CorePermission.JobTitlesUpdate}><RowAction label={`${tc('actions.edit')}: ${name}`} icon={Pencil} onClick={() => onOpen({ kind: 'edit', title })} /></Can>
        <Can adminMode permission={CorePermission.JobTitlesDelete}><RowAction label={`${tc('actions.delete')}: ${name}`} icon={Trash2} danger onClick={() => onOpen({ kind: 'delete', title })} /></Can>
      </div>
    </li>
  );
}

/** The popup open on the titles tab: add titles, rename one, or delete one. */
function TitleDialogs({ open, unitId, onClose }: { open: Open; unitId: string; onClose: () => void }) {
  const close = (isOpen: boolean) => !isOpen && onClose();
  if (open?.kind === 'card') return <TitleCardDialog titleId={open.title.id} onClose={onClose} />;
  if (open?.kind === 'add') return <AddTitlesDialog unitId={unitId} open onOpenChange={close} />;
  if (open?.kind === 'edit') return <EditTitleDialog title={open.title} open onOpenChange={close} />;
  if (open?.kind === 'delete') return <DeleteTitleDialog title={open.title} open onOpenChange={close} />;
  return null;
}

/** The job titles of the selected unit with their employees; add, rename and remove with the titles key. A type that takes no titles says so. */
export function TitlesTab({ node, model }: DetailsContext) {
  const { t } = useTranslation('job-titles');
  const [open, setOpen] = useState<Open>(null);
  const accepts = model.levelById.get(node.levelId)?.acceptsTitles ?? false;
  if (!accepts) return <p className="text-sm text-muted">{t('titles.notAccepted')}</p>;
  return (
    <div className="flex flex-col gap-3">
      {node.titles.length === 0 ? <p className="text-sm text-muted">{t('titles.none')}</p> : <ul className="flex flex-col gap-2">{node.titles.map((x) => <TitleRow key={x.id} title={x} onOpen={setOpen} />)}</ul>}
      <Can adminMode permission={CorePermission.JobTitlesCreate}>
        <Button size="sm" variant="secondary" className="self-start" onClick={() => setOpen({ kind: 'add' })}><Plus className="size-4" aria-hidden />{t('titles.add')}</Button>
      </Can>
      <TitleDialogs open={open} unitId={node.id} onClose={() => setOpen(null)} />
    </div>
  );
}

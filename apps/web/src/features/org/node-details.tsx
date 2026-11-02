import { CorePermission, type OrgNodeDto, type OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, ConfirmDialog } from '@/shared/ui';
import { useDeleteTitle } from './api';
import { NodeActionDialogs, type NodeAction } from './node-action-dialogs';

interface Props {
  tree: OrgTreeDto;
  node: OrgNodeDto;
  onAddTitles: () => void;
  onAddChild: () => void;
  onDeleted: () => void;
}

type Open = NodeAction | null;

function Facts({ node, levelName }: { node: OrgNodeDto; levelName: string | undefined }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-xs text-muted">{t('details.level')}</dt><dd>{levelName}</dd></div>
      <div><dt className="text-xs text-muted">{t('details.manager')}</dt><dd>{node.managerName ?? '—'}</dd></div>
      <div><dt className="text-xs text-muted">{t('details.startDate')}</dt><dd dir="ltr">{node.startDate}</dd></div>
      <div><dt className="text-xs text-muted">{t('details.employees')}</dt><dd dir="ltr">{node.employeesCount}</dd></div>
      <div><dt className="text-xs text-muted">{t('details.status')}</dt><dd><Badge tone={node.isActive ? 'success' : 'neutral'}>{tc(node.isActive ? 'status.active' : 'status.inactive')}</Badge></dd></div>
    </dl>
  );
}

function TitlesList({ node, onAdd, onDelete }: { node: OrgNodeDto; onAdd: () => void; onDelete: (id: string) => void }) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  return (
    <section className="mt-5">
      <h3 className="text-sm font-bold">{t('details.titles')}</h3>
      <ul className="mt-2 flex flex-col gap-1">
        {node.jobTitles.map((j) => (
          <li key={j.id} className="flex items-center justify-between gap-2 text-sm">
            <span>{ar ? j.nameAr : j.nameEn} <span className="text-xs text-muted" dir="ltr">({j.employeesCount})</span></span>
            <Can adminMode permission={CorePermission.OrgTitlesManage}><Button size="sm" variant="ghost" className="text-danger-text" onClick={() => onDelete(j.id)}>{tc('actions.delete')}</Button></Can>
          </li>
        ))}
      </ul>
      <Can adminMode permission={CorePermission.OrgTitlesManage}><Button size="sm" variant="secondary" className="mt-2" onClick={onAdd}>{t('details.addTitle')}</Button></Can>
    </section>
  );
}

/** Deleting a job title, behind its own confirmation. */
function TitleDeleteDialog({ titleToDelete, onClose }: { titleToDelete: string | null; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const removeTitle = useDeleteTitle();
  const confirm = async () => {
    try {
      await removeTitle.mutateAsync(titleToDelete as string);
      toast.success(t('details.titleDeleted'));
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      onClose();
    }
  };
  return <ConfirmDialog open={!!titleToDelete} onOpenChange={(o) => !o && onClose()} tone="danger" title={t('details.deleteTitleTitle')} description={t('details.deleteTitleBody')} confirmLabel={tc('actions.delete')} onConfirm={confirm} />;
}

function Actions({ node, hasChildLevel, onOpen, onAddChild }: { node: OrgNodeDto; hasChildLevel: boolean; onOpen: (open: Open) => void; onAddChild: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  return (
    <div className="mt-5 flex flex-wrap gap-2">
      <Can adminMode permission={CorePermission.OrgUnitUpdate}><Button size="sm" variant="secondary" onClick={() => onOpen('edit')}>{tc('actions.edit')}</Button></Can>
      {hasChildLevel && <Can adminMode permission={CorePermission.OrgUnitCreate}><Button size="sm" variant="secondary" onClick={onAddChild}>{t('details.addChild')}</Button></Can>}
      {node.parentId && <Can adminMode permission={CorePermission.OrgUnitMove}><Button size="sm" variant="secondary" onClick={() => onOpen('move')}>{t('details.move')}</Button></Can>}
      <Can adminMode permission={CorePermission.OrgUnitDelete}><Button size="sm" variant="danger" onClick={() => onOpen('delete')}>{tc('actions.delete')}</Button></Can>
    </div>
  );
}

const localized = (ar: boolean, arabic: string | undefined, english: string | undefined) => (ar ? arabic : english);

/** The selected unit: where it sits, who manages it, its job titles, and what can be done to it. */
export function NodeDetails({ tree, node, onAddTitles, onAddChild, onDeleted }: Props) {
  const { i18n } = useTranslation('org');
  const ar = i18n.language === 'ar';
  const [open, setOpen] = useState<Open>(null);
  const [titleToDelete, setTitleToDelete] = useState<string | null>(null);
  const level = tree.levels.find((l) => l.id === node.levelId);
  const hasChildLevel = !!level && tree.levels.at(-1)?.id !== level.id;

  return (
    <aside aria-label={localized(ar, node.nameAr, node.nameEn)} className="rounded-[var(--radius-panel)] border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-bold">{localized(ar, node.nameAr, node.nameEn)}</h2>
      <p className="mt-1 text-sm text-muted">{localized(ar, node.pathAr, node.pathEn)}</p>
      <Facts node={node} levelName={localized(ar, level?.nameAr, level?.nameEn)} />
      {level?.isAssignable && <TitlesList node={node} onAdd={onAddTitles} onDelete={setTitleToDelete} />}
      <Actions node={node} hasChildLevel={hasChildLevel} onOpen={setOpen} onAddChild={onAddChild} />
      <NodeActionDialogs tree={tree} node={node} action={open} onClose={() => setOpen(null)} onDeleted={onDeleted} />
      <TitleDeleteDialog titleToDelete={titleToDelete} onClose={() => setTitleToDelete(null)} />
    </aside>
  );
}

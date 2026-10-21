import { CorePermission, type OrgNodeDto, type OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Can } from '@/core/permissions/can';
import { errorMessage } from '@/shared/lib/error-message';
import { Badge, Button, ConfirmDialog } from '@/shared/ui';
import { useDeleteNode, useDeleteTitle } from './api';
import { MoveDialog } from './move-dialog';
import { NodeForm } from './node-form';

interface Props {
  tree: OrgTreeDto;
  node: OrgNodeDto;
  onAddTitles: () => void;
  onAddChild: () => void;
  onDeleted: () => void;
}

type Open = 'edit' | 'move' | 'delete' | null;

function Facts({ node, levelName }: { node: OrgNodeDto; levelName: string | undefined }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  return (
    <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
      <div><dt className="text-xs text-muted">{t('details.level')}</dt><dd>{levelName}</dd></div>
      <div><dt className="text-xs text-muted">{t('details.manager')}</dt><dd>{node.managerName ?? '—'}</dd></div>
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
            <Can permission={CorePermission.OrgManage}><Button size="sm" variant="ghost" className="text-danger-700" onClick={() => onDelete(j.id)}>{tc('actions.delete')}</Button></Can>
          </li>
        ))}
      </ul>
      <Can permission={CorePermission.OrgManage}><Button size="sm" variant="secondary" className="mt-2" onClick={onAdd}>{t('details.addTitle')}</Button></Can>
    </section>
  );
}

/** Deleting a unit or a job title, each behind its own confirmation. */
function DeleteDialogs({ node, open, titleToDelete, onClose, onCloseTitle, onDeleted }: { node: OrgNodeDto; open: boolean; titleToDelete: string | null; onClose: () => void; onCloseTitle: () => void; onDeleted: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const remove = useDeleteNode();
  const removeTitle = useDeleteTitle();
  const attempt = async (action: () => Promise<unknown>, message: string) => {
    try {
      await action();
      toast.success(message);
      return true;
    } catch (error) {
      toast.error(errorMessage(tc, error));
      return false;
    }
  };
  return (
    <>
      <ConfirmDialog open={open} onOpenChange={(o) => !o && onClose()} tone="danger" title={t('details.deleteTitle')} description={t('details.deleteBody')} confirmLabel={tc('actions.delete')} onConfirm={async () => { if (await attempt(() => remove.mutateAsync(node.id), t('details.deleted'))) onDeleted(); onClose(); }} />
      <ConfirmDialog open={!!titleToDelete} onOpenChange={(o) => !o && onCloseTitle()} tone="danger" title={t('details.deleteTitleTitle')} description={t('details.deleteTitleBody')} confirmLabel={tc('actions.delete')} onConfirm={async () => { await attempt(() => removeTitle.mutateAsync(titleToDelete as string), t('details.titleDeleted')); onCloseTitle(); }} />
    </>
  );
}

function Actions({ node, hasChildLevel, onOpen, onAddChild }: { node: OrgNodeDto; hasChildLevel: boolean; onOpen: (open: Open) => void; onAddChild: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  return (
    <Can permission={CorePermission.OrgManage}>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => onOpen('edit')}>{tc('actions.edit')}</Button>
        {hasChildLevel && <Button size="sm" variant="secondary" onClick={onAddChild}>{t('details.addChild')}</Button>}
        {node.parentId && <Button size="sm" variant="secondary" onClick={() => onOpen('move')}>{t('details.move')}</Button>}
        <Button size="sm" variant="danger" onClick={() => onOpen('delete')}>{tc('actions.delete')}</Button>
      </div>
    </Can>
  );
}

function NodeDialogs({ tree, node, open, onClose }: { tree: OrgTreeDto; node: OrgNodeDto; open: Open; onClose: () => void }) {
  const close = (o: boolean) => !o && onClose();
  return (
    <>
      {open === 'edit' && <NodeForm tree={tree} editing={node} open onOpenChange={close} />}
      {open === 'move' && <MoveDialog tree={tree} node={node} open onOpenChange={close} />}
    </>
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
      <NodeDialogs tree={tree} node={node} open={open} onClose={() => setOpen(null)} />
      <DeleteDialogs node={node} open={open === 'delete'} titleToDelete={titleToDelete} onClose={() => setOpen(null)} onCloseTitle={() => setTitleToDelete(null)} onDeleted={onDeleted} />
    </aside>
  );
}

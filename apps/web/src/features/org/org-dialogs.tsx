import type { OrgTreeDto } from '@arweqah-platform/shared';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ConfirmDialog } from '@/shared/ui';
import { useDeleteNode } from './api';
import { AddUnitDialog } from './add-unit-dialog';
import { ChangeModeDialog } from './change-mode-dialog';
import { EditUnitDialog } from './edit-unit-dialog';
import { LevelsDialog } from './levels-dialog';
import { MoveDialog } from './move-dialog';
import { SetCodeDialog } from './set-code-dialog';
import type { OrgNode } from './org-model';
import type { OrgPageState, UnitAction } from './use-org-page';

/** Deleting a unit, behind its own confirmation. */
function DeleteUnitDialog({ node, onClose, onDeleted }: { node: OrgNode; onClose: () => void; onDeleted: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const remove = useDeleteNode();
  const confirm = async () => {
    try {
      await remove.mutateAsync(node.id);
      toast.success(t('details.deleted'));
      onDeleted();
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      onClose();
    }
  };
  return <ConfirmDialog open onOpenChange={(open) => !open && onClose()} tone="danger" busy={remove.isPending} title={t('details.deleteTitle')} description={t('details.deleteBody')} confirmLabel={tc('actions.delete')} onConfirm={confirm} />;
}

/** The popup of one action on a unit. */
function UnitDialog({ action, node, tree, page }: { action: UnitAction; node: OrgNode; tree: OrgTreeDto; page: OrgPageState }) {
  const close = () => page.setDialog(null);
  const parent = tree.nodes.find((n) => n.id === node.parentId) ?? null;
  const dialogs: Record<UnitAction, () => ReactNode> = {
    edit: () => <EditUnitDialog node={node} onClose={close} />,
    mode: () => <ChangeModeDialog node={node} parent={parent} onClose={close} />,
    code: () => <SetCodeDialog tree={tree} node={node} onClose={close} />,
    move: () => <MoveDialog tree={tree} node={node} onClose={close} />,
    delete: () => <DeleteUnitDialog node={node} onClose={close} onDeleted={() => page.selectedId === node.id && page.setSelectedId(null)} />,
  };
  return <>{dialogs[action]()}</>;
}

/** The popup the page has open: add a unit, the types window, or one action on a unit. Forms pick their parent from `formsTree` (every unit the person may see). */
export function OrgDialogs({ page, tree }: { page: OrgPageState; tree: OrgTreeDto }) {
  const forms = page.formsTree.data ?? tree;
  const { dialog } = page;
  if (!dialog) return null;
  if (dialog.kind === 'levels') return <LevelsDialog onClose={() => page.setDialog(null)} />;
  if (dialog.kind === 'add') return <AddUnitDialog tree={forms} parentId={dialog.parentId} onClose={() => page.setDialog(null)} />;
  const node = forms.nodes.find((n) => n.id === dialog.nodeId) ?? tree.nodes.find((n) => n.id === dialog.nodeId);
  return node ? <UnitDialog action={dialog.action} node={node} tree={forms} page={page} /> : null;
}

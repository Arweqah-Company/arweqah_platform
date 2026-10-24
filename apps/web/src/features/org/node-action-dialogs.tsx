import type { OrgNodeDto, OrgTreeDto } from '@arweqah-platform/shared';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { ConfirmDialog } from '@/shared/ui';
import { useDeleteNode } from './api';
import { MoveDialog } from './move-dialog';
import { NodeForm } from './node-form';

export type NodeAction = 'edit' | 'move' | 'delete';

interface Props {
  tree: OrgTreeDto;
  node: OrgNodeDto;
  /** Which dialog is open for this unit; null = none. */
  action: NodeAction | null;
  onClose: () => void;
  onDeleted?: () => void;
}

/** What can be done to a unit, each in a popup: edit it (a form), move it (a form), delete it (behind a confirmation). Used by the details panel and by the table's rows. */
export function NodeActionDialogs({ tree, node, action, onClose, onDeleted }: Props) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const remove = useDeleteNode();
  const close = (open: boolean) => !open && onClose();
  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(node.id);
      toast.success(t('details.deleted'));
      onDeleted?.();
    } catch (error) {
      toast.error(errorMessage(tc, error));
    } finally {
      onClose();
    }
  };
  return (
    <>
      {action === 'edit' && <NodeForm tree={tree} editing={node} open onOpenChange={close} />}
      {action === 'move' && <MoveDialog tree={tree} node={node} open onOpenChange={close} />}
      <ConfirmDialog open={action === 'delete'} onOpenChange={close} tone="danger" title={t('details.deleteTitle')} description={t('details.deleteBody')} confirmLabel={tc('actions.delete')} onConfirm={confirmDelete} />
    </>
  );
}

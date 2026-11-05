import { canCreateUnder, ROOT_PARENT, type OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, Dialog, DialogFooter, FormField } from '@/shared/ui';
import { useMoveNode } from './api';
import { inTreeOrder, nodeName, type OrgNode } from './org-model';

const ROOT_VALUE = 'root';

/** The places a unit may move to: the group, or a unit (not itself or anything under it) that the rules table lets hold a unit of this type. */
function destinations(tree: OrgTreeDto, node: OrgNode): { node: OrgNode | null; depth: number }[] {
  const inside = new Set([node.id]);
  const ordered = inTreeOrder(tree.nodes);
  for (const { node: n } of ordered) if (n.parentId && inside.has(n.parentId)) inside.add(n.id);
  const units = ordered.filter(({ node: n }) => !inside.has(n.id) && n.isActive && canCreateUnder(tree.rules, n.levelKey, node.levelKey));
  return [...(canCreateUnder(tree.rules, ROOT_PARENT, node.levelKey) ? [{ node: null, depth: 0 }] : []), ...units];
}

/** Moves a unit under another place the rules allow; the code stays as it was. */
export function MoveDialog({ tree, node, onClose }: { tree: OrgTreeDto; node: OrgNode; onClose: () => void }) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const move = useMoveNode(node.id);
  const [target, setTarget] = useState<string | null>(null);
  const options = destinations(tree, node).map(({ node: n, depth }) => ({ value: n?.id ?? ROOT_VALUE, label: n ? `${'— '.repeat(depth)}${nodeName(n, ar)}` : t('add.underGroup') }));
  const parentId = target === ROOT_VALUE ? null : target;
  const submit = async () => {
    try {
      await move.mutateAsync({ parentId });
      toast.success(t('move.done'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('move.title')} description={t('move.description')}>
      <div className="flex flex-col gap-4">
        {move.isError && <Alert>{errorMessage(tc, move.error)}</Alert>}
        {options.length === 0 && <Alert tone="info">{t('move.nowhere')}</Alert>}
        <FormField label={`${t('move.newParent')} *`}>{(p) => <Combobox id={p.id} label={t('move.newParent')} value={target} options={options} onChange={setTarget} />}</FormField>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={target === null || parentId === node.parentId || move.isPending} onClick={() => void submit()}>{t('move.confirm')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

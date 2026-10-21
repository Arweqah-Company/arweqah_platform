import type { OrgNodeDto, OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { Alert, Button, Combobox, Dialog, FormField } from '@/shared/ui';
import { useMoveNode } from './api';

interface Props {
  tree: OrgTreeDto;
  node: OrgNodeDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Moves a unit under another unit of the division right above its own. */
export function MoveDialog({ tree, node, open, onOpenChange }: Props) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const ar = i18n.language === 'ar';
  const move = useMoveNode(node.id);
  const [parentId, setParentId] = useState<string | null>(node.parentId);
  const levelIndex = tree.levels.findIndex((l) => l.id === node.levelId);
  const above = tree.levels[levelIndex - 1];
  const options = tree.nodes.filter((n) => n.levelId === above?.id && n.isActive).map((n) => ({ value: n.id, label: ar ? n.pathAr : n.pathEn }));

  const submit = async () => {
    try {
      await move.mutateAsync({ parentId });
      toast.success(t('move.done'));
      onOpenChange(false);
    } catch {
      /* shown inside the dialog */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('move.title')} description={t('move.description')}>
      <div className="flex flex-col gap-4">
        {move.isError && <Alert>{errorMessage(tc, move.error)}</Alert>}
        <FormField label={`${t('move.newParent')} *`}>{(p) => <Combobox id={p.id} label={t('move.newParent')} value={parentId} options={options} onChange={setParentId} />}</FormField>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>{tc('actions.cancel')}</Button>
          <Button disabled={!parentId || parentId === node.parentId || move.isPending} onClick={() => void submit()}>{t('move.confirm')}</Button>
        </div>
      </div>
    </Dialog>
  );
}

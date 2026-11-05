import { nextUnitCode, type OrgTreeDto } from '@arweqah-platform/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Dialog, DialogFooter, FormField, Input } from '@/shared/ui';
import { useSetNodeCode } from './api';
import { nodeName, type OrgNode } from './org-model';
import { UnitCode } from './unit-badges';

const CODE = /^[A-Z]{3}\.\d{2}\.\d{2}\.\d{2}$/;

/** The code a unit would get under its parent now, to offer as the default (null when the parent has no code or no slot is free). */
function suggestion(tree: OrgTreeDto, node: OrgNode): string | null {
  const parent = node.parentId ? tree.nodes.find((n) => n.id === node.parentId) : undefined;
  if (!parent?.code) return null;
  const siblingCodes = tree.nodes.filter((n) => n.parentId === parent.id && n.code).map((n) => n.code as string);
  return nextUnitCode({ parentCode: parent.code, parentType: parent.levelKey, childType: node.levelKey, siblingCodes });
}

/** Sets the code of a unit that has none (every unit made before codes existed); a code can be set once. */
export function SetCodeDialog({ tree, node, onClose }: { tree: OrgTreeDto; node: OrgNode; onClose: () => void }) {
  const { t, i18n } = useTranslation('org');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const [code, setCode] = useState('');
  const set = useSetNodeCode(node.id);
  const error = useLiveError(code, rules.pattern(CODE, t('setCode.invalid')));
  const suggested = suggestion(tree, node);
  const submit = async () => {
    try {
      await set.mutateAsync({ code });
      toast.success(t('setCode.saved'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={t('setCode.title')} description={nodeName(node, i18n.language === 'ar')}>
      <div className="flex flex-col gap-4">
        {set.isError && <Alert>{errorMessage(tc, set.error)}</Alert>}
        <Alert tone="info">{t('setCode.once')}</Alert>
        <FormField label={`${t('table.code')} *`} hint={t('setCode.hint')} error={error.error}>{(p) => <Input {...p} dir="ltr" placeholder="OPS.03.03.01" onBlur={error.onBlur} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />}</FormField>
        {suggested && <Button variant="secondary" size="sm" className="self-start" onClick={() => setCode(suggested)}>{t('setCode.use')} <UnitCode code={suggested} /></Button>}
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!CODE.test(code) || set.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

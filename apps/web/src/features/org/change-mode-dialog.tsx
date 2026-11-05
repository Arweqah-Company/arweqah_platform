import type { ChangeManagementModeResultDto, ManagementMode } from '@arweqah-platform/shared';
import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { Alert, Button, Dialog, DialogFooter, FormField, Input } from '@/shared/ui';
import { useChangeMode } from './api';
import { ManagementModeCards, type ModeCardOption } from './management-mode-cards';
import { nodeName, type OrgNode } from './org-model';

type Choice = 'inherit' | ManagementMode;
const MIN_REASON = 3;

/** What the result of the change says: how many units and how many employees of other companies had their manager recomputed. */
function Result({ result, onClose }: { result: ChangeManagementModeResultDto; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  return (
    <div className="flex flex-col gap-4">
      <Alert tone="success">{t('changeMode.result', { units: result.impact.unitsAffected, employees: result.impact.employeesOfOtherCompanies })}</Alert>
      <DialogFooter><Button onClick={onClose}>{tc('actions.close')}</Button></DialogFooter>
    </div>
  );
}

/** The three choices (a unit under the group has nothing to inherit from); the mode the unit has already is shown but cannot be chosen. */
function modeCards(t: TFunction, node: OrgNode, parent: OrgNode | null, current: Choice): ModeCardOption<Choice>[] {
  const inherited = parent ? t(parent.effectiveMode === 'shared' ? 'mode.shared' : 'mode.perCompany') : '';
  return [
    ...(node.parentId ? [{ id: 'inherit' as const, title: t('add.modeInherit'), description: t('add.modeInheritNow', { mode: inherited }), disabled: current === 'inherit' }] : []),
    { id: 'shared' as const, title: t('mode.shared'), description: t('add.modeSharedText'), disabled: current === 'shared' },
    { id: 'per_company' as const, title: t('mode.perCompany'), description: t('add.modePerCompanyText'), disabled: current === 'per_company' },
  ];
}

/** The mode the unit would have after the change: its own choice, or what the parent has. */
function modeAfter(choice: Choice, node: OrgNode, parent: OrgNode | null): ManagementMode {
  return choice === 'inherit' ? (parent?.effectiveMode ?? node.effectiveMode) : choice;
}

function ChangeModeForm({ node, parent, onClose, onDone }: { node: OrgNode; parent: OrgNode | null; onClose: () => void; onDone: (result: ChangeManagementModeResultDto) => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const current: Choice = node.managementMode ?? 'inherit';
  const [choice, setChoice] = useState<Choice>(node.effectiveMode === 'shared' ? 'per_company' : 'shared');
  const [reason, setReason] = useState('');
  const change = useChangeMode(node.id);
  const reasonError = useLiveError(reason, rules.text(MIN_REASON));
  const to = modeAfter(choice, node, parent);
  const mode = (m: ManagementMode) => t(m === 'shared' ? 'mode.shared' : 'mode.perCompany');
  const submit = () => change.mutateAsync({ mode: choice === 'inherit' ? null : choice, reason: reason.trim() }).then(onDone, () => undefined /* shown inside the dialog */);
  return (
    <div className="flex flex-col gap-4">
      {change.isError && <Alert>{errorMessage(tc, change.error)}</Alert>}
      <p>{t('changeMode.direction', { from: mode(node.effectiveMode), to: mode(to) })}</p>
      <ManagementModeCards<Choice> name="change-mode" label={t('table.mode')} value={choice} onChange={setChoice} options={modeCards(t, node, parent, current)} />
      <Alert tone="warning">{t(to === 'per_company' ? 'changeMode.impactToPer' : 'changeMode.impactToShared')}</Alert>
      <FormField label={`${t('changeMode.reason')} *`} hint={t('changeMode.reasonHint')} error={reasonError.error}>{(p) => <Input {...p} onBlur={reasonError.onBlur} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
        <Button disabled={choice === current || reason.trim().length < MIN_REASON || change.isPending} onClick={() => void submit()}>{t('changeMode.confirm')}</Button>
      </DialogFooter>
    </div>
  );
}

/** Changing how a unit is managed (shared or per company): the direction, a reason that goes to the audit log, and, after the change, its impact. */
export function ChangeModeDialog({ node, parent, onClose }: { node: OrgNode; parent: OrgNode | null; onClose: () => void }) {
  const { t, i18n } = useTranslation('org');
  const [result, setResult] = useState<ChangeManagementModeResultDto | null>(null);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} wide title={t('changeMode.title')} description={nodeName(node, i18n.language === 'ar')}>
      {result ? <Result result={result} onClose={onClose} /> : <ChangeModeForm node={node} parent={parent} onClose={onClose} onDone={setResult} />}
    </Dialog>
  );
}

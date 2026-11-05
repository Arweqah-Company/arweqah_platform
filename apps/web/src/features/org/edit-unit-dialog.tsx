import { unitStartDateIsValid } from '@arweqah-platform/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useManagerSearch } from '@/features/employees';
import { errorMessage } from '@/shared/lib/error-message';
import { useLiveError, useRules } from '@/shared/lib/live-validation';
import { useAutoEnglish } from '@/shared/lib/use-auto-english';
import { Alert, Button, Combobox, Dialog, DialogFooter, FormField, Input, Textarea } from '@/shared/ui';
import { todayInRiyadh } from '@/shared/lib/lines';
import { useUpdateNode } from './api';
import { REASON_MIN } from './leader-rules';
import type { OrgNode } from './org-model';

/** A change of the names or of the on/off switch is dated: it needs its reason, and it may start on a later day (a scheduled version). */
export const isDatedChange = (node: OrgNode, edit: { nameAr: string; nameEn: string; isActive: boolean; effectiveFrom: string }, today: string): boolean =>
  edit.nameAr.trim() !== node.nameAr || edit.nameEn.trim() !== node.nameEn || edit.isActive !== node.isActive || edit.effectiveFrom > today;

/** Editing a unit: its names and whether it works (dated, with a reason), who manages it and the day it started. The type, the parent and the code are not changed here. */
export function EditUnitDialog({ node, onClose }: { node: OrgNode; onClose: () => void }) {
  const { t } = useTranslation('org');
  const { t: tc } = useTranslation();
  const rules = useRules();
  const [names, setNames] = useState({ nameAr: node.nameAr, nameEn: node.nameEn });
  const [managerId, setManagerId] = useState<string | null>(node.managerId);
  const [startDate, setStartDate] = useState(node.startDate);
  const [isActive, setIsActive] = useState(node.isActive);
  const today = todayInRiyadh();
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [reason, setReason] = useState('');
  const [search, setSearch] = useState('');
  const managers = useManagerSearch(search);
  const update = useUpdateNode(node.id);
  const nameAr = useLiveError(names.nameAr, rules.text(2));
  const nameEn = useLiveError(names.nameEn, rules.text(2));
  const start = useLiveError(startDate, (v: string) => rules.required(v) ?? (unitStartDateIsValid(v) ? undefined : t('node.startInvalid')));
  useAutoEnglish(names.nameAr, names.nameEn, (value) => setNames({ ...names, nameEn: value }));
  const options = useMemo(() => {
    const found = (managers.data ?? []).map((m) => ({ value: m.id, label: m.fullName, hint: m.employeeNumber }));
    return node.managerId && node.managerName && !found.some((m) => m.value === node.managerId) ? [{ value: node.managerId, label: node.managerName }, ...found] : found;
  }, [managers.data, node.managerId, node.managerName]);
  const dated = isDatedChange(node, { ...names, isActive, effectiveFrom }, today);
  const reasonError = useLiveError(reason, (v: string) => (dated ? rules.text(REASON_MIN)(v) : undefined));
  const dateError = useLiveError(effectiveFrom, (v: string) => (v < today ? t('node.effectivePast') : undefined));
  const valid = names.nameAr.trim().length >= 2 && names.nameEn.trim().length >= 2 && unitStartDateIsValid(startDate) && effectiveFrom >= today && (!dated || reason.trim().length >= REASON_MIN);
  const submit = async () => {
    try {
      await update.mutateAsync({ nameAr: names.nameAr.trim(), nameEn: names.nameEn.trim(), managerId, startDate, isActive, ...(dated ? { effectiveFrom, reason: reason.trim() } : {}) });
      toast.success(t('node.saved'));
      onClose();
    } catch {
      /* shown inside the dialog */
    }
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} wide title={t('node.editTitle')}>
      <div className="flex flex-col gap-4">
        {update.isError && <Alert>{errorMessage(tc, update.error)}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={`${t('node.nameAr')} *`} error={nameAr.error}>{(p) => <Input {...p} onBlur={nameAr.onBlur} value={names.nameAr} onChange={(e) => setNames({ ...names, nameAr: e.target.value })} />}</FormField>
          <FormField label={`${t('node.nameEn')} *`} error={nameEn.error}>{(p) => <Input {...p} dir="ltr" onBlur={nameEn.onBlur} value={names.nameEn} onChange={(e) => setNames({ ...names, nameEn: e.target.value })} />}</FormField>
        </div>
        <FormField label={`${t('node.startDate')} *`} hint={t('node.startHint')} error={start.error}>{(p) => <Input {...p} type="date" dir="ltr" onBlur={start.onBlur} value={startDate} onChange={(e) => setStartDate(e.target.value)} />}</FormField>
        <FormField label={t('node.manager')} hint={t('node.managerHint')}>{(p) => <Combobox id={p.id} label={t('node.manager')} value={managerId} options={options} onSearch={setSearch} onChange={setManagerId} clearable />}</FormField>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5 accent-petrol-800" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />{t('node.active')}</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('node.effectiveFrom')} hint={t('node.effectiveHint')} error={dateError.error}>{(p) => <Input {...p} type="date" dir="ltr" min={today} onBlur={dateError.onBlur} value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />}</FormField>
          <FormField label={dated ? `${t('node.reason')} *` : t('node.reason')} error={reasonError.error}>{(p) => <Textarea {...p} rows={2} onBlur={reasonError.onBlur} value={reason} onChange={(e) => setReason(e.target.value)} />}</FormField>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>{tc('actions.cancel')}</Button>
          <Button disabled={!valid || update.isPending} onClick={() => void submit()}>{tc('actions.save')}</Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
